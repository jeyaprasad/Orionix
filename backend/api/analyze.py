"""
analyze.py
----------
Production endpoint: POST /api/analyze

Accepts a satellite image upload and orchestrates the full EO analysis pipeline:
  Image → RemoteCLIP → EO Interpreter → Prompt Builder → GPT → AnalysisResponse

Error surface:
  - 400  Bad Request    — invalid file type, corrupted image, empty upload
  - 422  Unprocessable  — image passes format check but produces no valid EO context
  - 500  Server Error   — RemoteCLIP model failure or unexpected exception
  - 200  partial_success — vision + EO succeed but GPT fails (non-fatal)
"""

import time
import json
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, status
from typing import Optional
from backend.models.analysis import AnalysisResponse, FloodComparisonResponse, VegetationComparisonResponse
from backend.services.analysis_service import analysis_service
from backend.services.trend_analysis import trend_analysis_service
from backend.utils.logger import logger
from backend.services.vision.water_detection import detect_water_extent
from backend.services.vision.image_loader import validate_and_load_image
from backend.services.vision.vegetation_index import compute_vegetation_index
from backend.services.vision.urban_density import compute_urban_density

router = APIRouter(prefix="/api", tags=["Analysis"])

# Maximum acceptable file size (enforced here as a fast-path guard before
# bytes are read into memory; image_loader also validates internally).
_MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    summary="Earth Observation Image Analysis",
    description=(
        "Upload a satellite image (PNG / JPEG / TIFF). "
        "Returns a comprehensive EO analysis including land-cover classification, "
        "EO scene interpretation, and a GPT-generated analyst report."
    ),
)
async def analyze_image(
    image: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    bbox: Optional[str] = Form(None),
    deforestation_delta: Optional[float] = Form(None),
    vegetation_delta: Optional[float] = Form(None),
    urban_density_delta: Optional[float] = Form(None),
) -> AnalysisResponse:
    """
    POST /api/analyze — production EO analysis endpoint.

    Validates the uploaded image, runs the complete pipeline, and returns
    a structured AnalysisResponse. GPT failure produces a partial_success
    response rather than an error; vision analysis is always returned.
    """
    request_start = time.perf_counter()
    logger.info(
        f"[/api/analyze] Request received. "
        f"Filename: '{image.filename}', Content-Type: {image.content_type}."
    )
    if latitude is not None and longitude is not None:
        logger.info(f"[/api/analyze] Selected Location: Lat={latitude}, Lng={longitude}")
    
    bbox_list = None
    if bbox:
        try:
            bbox_list = json.loads(bbox)
            if isinstance(bbox_list, list) and len(bbox_list) == 4:
                logger.info(f"[/api/analyze] Selected Area Bbox: {bbox_list}")
            else:
                logger.warning(f"[/api/analyze] Invalid bbox format (expected list of 4 floats): {bbox}")
                bbox_list = None
        except Exception as e:
            logger.warning(f"[/api/analyze] Failed to parse bbox JSON string: {e}")
            bbox_list = None

    # ------------------------------------------------------------------
    # 1. Read upload stream
    # ------------------------------------------------------------------
    try:
        image_bytes = await image.read()
    except Exception as e:
        logger.error(f"[/api/analyze] Failed to read upload stream: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read the uploaded file. Ensure the request is multipart/form-data.",
        )

    if not image_bytes:
        logger.warning("[/api/analyze] Empty file received.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(image_bytes) > _MAX_UPLOAD_BYTES:
        logger.warning(f"[/api/analyze] File too large: {len(image_bytes)} bytes.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds the maximum allowed size of 20 MB.",
        )

    logger.info(f"[/api/analyze] File received. Size: {len(image_bytes):,} bytes.")

    # ------------------------------------------------------------------
    # 2. Run analysis pipeline (delegates to AnalysisService)
    # ------------------------------------------------------------------
    try:
        result = await analysis_service.analyze_image(
            image_bytes=image_bytes,
            filename=image.filename or "upload.jpg",
            latitude=latitude,
            longitude=longitude,
            bbox=bbox_list,
            deforestation_delta=deforestation_delta,
            vegetation_delta=vegetation_delta,
            urban_density_delta=urban_density_delta,
        )

    except ValueError as e:
        # Validation or EO interpretation failure — client error
        logger.warning(f"[/api/analyze] Validation / interpretation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except RuntimeError as e:
        # RemoteCLIP model loading failure — server error
        logger.error(f"[/api/analyze] RemoteCLIP model failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vision model error: {e}",
        )

    except Exception as e:
        # Unexpected exception — log and return generic 500
        logger.error(f"[/api/analyze] Unexpected pipeline error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during analysis. Please try again.",
        )

    total_ms = (time.perf_counter() - request_start) * 1000
    logger.info(
        f"[/api/analyze] Response sent. "
        f"Status={result.status}, "
        f"Dominant={result.dominant_land_cover}, "
        f"Total={total_ms:.0f}ms."
    )
    return result


@router.post(
    "/analyze/compare-flood",
    response_model=FloodComparisonResponse,
    summary="Compare before and after images for flooding delta",
    description=(
        "Upload a 'before' satellite image and an 'after' satellite image. "
        "Runs the OpenCV water-extent detector on both and computes the delta."
    ),
)
async def compare_flood(
    before: UploadFile = File(...),
    after: UploadFile = File(...),
) -> FloodComparisonResponse:
    request_start = time.perf_counter()
    logger.info(
        f"[/api/analyze/compare-flood] Request received. "
        f"Before: '{before.filename}', After: '{after.filename}'."
    )

    try:
        # 1. Read before image
        before_bytes = await before.read()
        if not before_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Before image upload is empty.",
            )
        # 2. Read after image
        after_bytes = await after.read()
        if not after_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="After image upload is empty.",
            )
        
        # 3. Validate and load images using unified loader
        try:
            before_pil = validate_and_load_image(before_bytes, before.filename or "before.jpg")
        except ValueError as e:
            logger.warning(f"[/api/analyze/compare-flood] Before image validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Before image error: {e}",
            )

        try:
            after_pil = validate_and_load_image(after_bytes, after.filename or "after.jpg")
        except ValueError as e:
            logger.warning(f"[/api/analyze/compare-flood] After image validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"After image error: {e}",
            )

        # 4. Run water detector on both
        before_pct, before_mask = detect_water_extent(before_pil)
        after_pct, after_mask = detect_water_extent(after_pil)

        # 5. Compute change delta
        delta = after_pct - before_pct

        # 6. Classify
        if delta < 5.0:
            classification = "No significant change"
        elif 5.0 <= delta < 15.0:
            classification = "Minor waterlogging detected"
        elif 15.0 <= delta <= 30.0:
            classification = "Moderate flooding detected"
        else:
            classification = "Severe flooding detected"

        total_ms = (time.perf_counter() - request_start) * 1000
        logger.info(
            f"[/api/analyze/compare-flood] Completed in {total_ms:.0f}ms. "
            f"Before={before_pct}%, After={after_pct}%, Delta={delta:.2f}%, Class={classification}."
        )

        return FloodComparisonResponse(
            before_water_coverage_percent=before_pct,
            after_water_coverage_percent=after_pct,
            water_coverage_change_percent=round(delta, 2),
            classification=classification,
            before_water_mask_base64=before_mask,
            after_water_mask_base64=after_mask,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/api/analyze/compare-flood] Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during flood comparison.",
        )


@router.post(
    "/analyze/compare",
    response_model=VegetationComparisonResponse,
    summary="Compare baseline and current images for vegetation delta",
    description=(
        "Upload a 'baseline' satellite image and a 'current' satellite image. "
        "Runs the Excess Green Index on both and computes the deforestation delta."
    ),
)
async def compare_vegetation(
    baseline: UploadFile = File(...),
    current: UploadFile = File(...),
) -> VegetationComparisonResponse:
    request_start = time.perf_counter()
    logger.info(
        f"[/api/analyze/compare] Request received. "
        f"Baseline: '{baseline.filename}', Current: '{current.filename}'."
    )

    try:
        # 1. Read baseline image
        baseline_bytes = await baseline.read()
        if not baseline_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Baseline image upload is empty.",
            )
        # 2. Read current image
        current_bytes = await current.read()
        if not current_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current image upload is empty.",
            )
        
        # 3. Validate and load images using unified loader
        try:
            baseline_pil = validate_and_load_image(baseline_bytes, baseline.filename or "baseline.jpg")
        except ValueError as e:
            logger.warning(f"[/api/analyze/compare] Baseline image validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Baseline image error: {e}",
            )

        try:
            current_pil = validate_and_load_image(current_bytes, current.filename or "current.jpg")
        except ValueError as e:
            logger.warning(f"[/api/analyze/compare] Current image validation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Current image error: {e}",
            )

        # 4. Compute Excess Green Index on both
        baseline_veg_score = compute_vegetation_index(baseline_pil)
        current_veg_score = compute_vegetation_index(current_pil)
        
        # Compute Urban Built-up Density on both
        baseline_urban_score = compute_urban_density(baseline_pil)
        current_urban_score = compute_urban_density(current_pil)

        # Compute Water Coverage on both
        baseline_water_pct, _ = detect_water_extent(baseline_pil)
        current_water_pct, _ = detect_water_extent(current_pil)

        # 5. Compute deltas
        veg_delta = baseline_veg_score - current_veg_score
        urb_delta = current_urban_score - baseline_urban_score
        water_delta = current_water_pct - baseline_water_pct

        # 6. Classify
        # Deforestation Classification
        if veg_delta <= 5.0:
            deforest_class = "deforestation: stable"
        elif 5.0 < veg_delta <= 15.0:
            deforest_class = "deforestation: declining"
        else:
            deforest_class = "deforestation: critical"

        # Urban Growth Classification
        if urb_delta <= 2.0:
            urban_growth_class = "urban growth: stable"
        elif 2.0 < urb_delta <= 8.0:
            urban_growth_class = "urban growth: moderate"
        else:
            urban_growth_class = "urban growth: rapid"

        # Run Trend Analysis service
        trend_res = trend_analysis_service.analyze_trends(
            vegetation_delta=veg_delta,
            water_coverage_delta=water_delta,
            urban_density_delta=urb_delta
        )

        total_ms = (time.perf_counter() - request_start) * 1000
        logger.info(
            f"[/api/analyze/compare] Completed in {total_ms:.0f}ms. "
            f"VegDelta={veg_delta:.2f}%, UrbanDelta={urb_delta:.2f}%, WaterDelta={water_delta:.2f}%, "
            f"DeforestClass='{deforest_class}', UrbanClass='{urban_growth_class}', "
            f"OverallTrendRisk={trend_res['overall_trend_risk']} ({trend_res['overall_risk_label']})."
        )

        return VegetationComparisonResponse(
            baseline_vegetation_index_score=baseline_veg_score,
            current_vegetation_index_score=current_veg_score,
            deforestation_delta=round(veg_delta, 2),
            classification=deforest_class,
            vegetation_delta=round(veg_delta, 2),
            urban_density_delta=round(urb_delta, 2),
            water_coverage_delta=round(water_delta, 2),
            deforestation_classification=deforest_class,
            urban_growth_classification=urban_growth_class,
            # Trend Analysis fields
            overall_trend_risk=trend_res["overall_trend_risk"],
            overall_risk_label=trend_res["overall_risk_label"],
            vegetation_trend=trend_res["vegetation"]["trend"],
            urban_trend=trend_res["urban_density"]["trend"],
            water_trend=trend_res["water_coverage"]["trend"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/api/analyze/compare] Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during vegetation comparison.",
        )


@router.post(
    "/analyze/timeseries",
    summary="Multi-image time-series environmental analysis",
    description=(
        "Upload 3-6 satellite images with associated ISO-8601 dates. "
        "Runs vegetation, water, and urban detectors on each image in chronological order "
        "and returns per-date metrics plus consecutive-point trend deltas."
    ),
)
async def analyze_timeseries(
    images: list[UploadFile] = File(...),
    dates: list[str] = Form(...),
):
    """
    POST /api/analyze/timeseries

    Accepts multipart form with:
      - images: 3-6 satellite image files
      - dates: matching ISO date strings (YYYY-MM-DD), one per image

    Returns an array of per-date metrics and computed deltas between consecutive points.
    """
    request_start = time.perf_counter()
    logger.info(f"[/api/analyze/timeseries] Request received. {len(images)} images, {len(dates)} dates.")

    if len(images) < 2 or len(images) > 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected 2-6 images, received {len(images)}.",
        )
    if len(images) != len(dates):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Number of images ({len(images)}) must match number of dates ({len(dates)}).",
        )

    # Parse and validate dates
    from datetime import date as dt_date
    parsed_dates = []
    for d in dates:
        try:
            parsed_dates.append(dt_date.fromisoformat(d.strip()))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: '{d}'. Expected YYYY-MM-DD.",
            )

    # Sort images by date
    paired = list(zip(parsed_dates, images))
    paired.sort(key=lambda x: x[0])

    # Process each image
    data_points = []
    for idx, (img_date, img_file) in enumerate(paired):
        try:
            img_bytes = await img_file.read()
            if not img_bytes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Image #{idx+1} (date={img_date}) is empty.",
                )

            pil_image = validate_and_load_image(img_bytes, img_file.filename or f"ts_{idx}.jpg")

            veg_score = compute_vegetation_index(pil_image)
            water_pct, _ = detect_water_extent(pil_image)
            urban_pct = compute_urban_density(pil_image)

            data_points.append({
                "date": img_date.isoformat(),
                "filename": img_file.filename or f"image_{idx}.jpg",
                "vegetation_index_score": round(veg_score, 2),
                "water_coverage_percent": round(water_pct, 2),
                "urban_density_percent": round(urban_pct, 2),
            })

            logger.info(
                f"[/api/analyze/timeseries] Point {idx+1}/{len(paired)}: "
                f"date={img_date}, veg={veg_score:.2f}, water={water_pct:.2f}%, urban={urban_pct:.2f}%"
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image #{idx+1} (date={img_date}) validation failed: {e}",
            )
        except Exception as e:
            logger.error(f"[/api/analyze/timeseries] Error processing image #{idx+1}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process image #{idx+1}.",
            )

    # Compute consecutive deltas
    deltas = []
    for i in range(1, len(data_points)):
        prev = data_points[i - 1]
        curr = data_points[i]
        deltas.append({
            "from_date": prev["date"],
            "to_date": curr["date"],
            "vegetation_delta": round(prev["vegetation_index_score"] - curr["vegetation_index_score"], 2),
            "water_coverage_delta": round(curr["water_coverage_percent"] - prev["water_coverage_percent"], 2),
            "urban_density_delta": round(curr["urban_density_percent"] - prev["urban_density_percent"], 2),
        })

    # Compute overall trend from first to last
    first = data_points[0]
    last = data_points[-1]
    overall_veg_delta = round(first["vegetation_index_score"] - last["vegetation_index_score"], 2)
    overall_water_delta = round(last["water_coverage_percent"] - first["water_coverage_percent"], 2)
    overall_urban_delta = round(last["urban_density_percent"] - first["urban_density_percent"], 2)

    # Classify overall trends
    def classify_trend(delta, metric_type):
        if metric_type == "vegetation":
            if delta <= 2.0: return "Stable"
            elif delta <= 10.0: return "Declining"
            else: return "Critical Loss"
        elif metric_type == "water":
            if abs(delta) <= 3.0: return "Stable"
            elif delta > 3.0: return "Rising"
            else: return "Receding"
        else:  # urban
            if delta <= 2.0: return "Stable"
            elif delta <= 8.0: return "Moderate Growth"
            else: return "Rapid Expansion"

    total_ms = (time.perf_counter() - request_start) * 1000
    logger.info(f"[/api/analyze/timeseries] Completed {len(data_points)} points in {total_ms:.0f}ms.")

    return {
        "status": "success",
        "point_count": len(data_points),
        "data_points": data_points,
        "consecutive_deltas": deltas,
        "overall_summary": {
            "date_range": f"{first['date']} → {last['date']}",
            "vegetation_delta": overall_veg_delta,
            "vegetation_trend": classify_trend(overall_veg_delta, "vegetation"),
            "water_coverage_delta": overall_water_delta,
            "water_trend": classify_trend(overall_water_delta, "water"),
            "urban_density_delta": overall_urban_delta,
            "urban_trend": classify_trend(overall_urban_delta, "urban"),
        },
        "processing_time_ms": round(total_ms, 1),
    }
