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
from backend.schemas.analysis import AnalysisResponse, FloodComparisonResponse, VegetationComparisonResponse
from backend.services.analysis_service import analysis_service
from backend.utils.logger import logger
from backend.vision.water_detection import detect_water_extent
from backend.vision.image_loader import validate_and_load_image
from backend.vision.vegetation_index import compute_vegetation_index

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
        baseline_score = compute_vegetation_index(baseline_pil)
        current_score = compute_vegetation_index(current_pil)

        # 5. Compute deforestation delta (percentage-point drop: baseline - current)
        delta = baseline_score - current_score

        # 6. Classify
        if delta < 5.0:
            classification = "No significant canopy loss"
        elif 5.0 <= delta < 15.0:
            classification = "Minor deforestation / canopy degradation"
        elif 15.0 <= delta <= 30.0:
            classification = "Moderate deforestation detected"
        else:
            classification = "Severe deforestation detected"

        if delta < 0.0:
            classification = "Vegetation growth / recovery detected"

        total_ms = (time.perf_counter() - request_start) * 1000
        logger.info(
            f"[/api/analyze/compare] Completed in {total_ms:.0f}ms. "
            f"Baseline={baseline_score:.2f}%, Current={current_score:.2f}%, Delta={delta:.2f}%, Class={classification}."
        )

        return VegetationComparisonResponse(
            baseline_vegetation_index_score=baseline_score,
            current_vegetation_index_score=current_score,
            deforestation_delta=round(delta, 2),
            classification=classification,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[/api/analyze/compare] Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during vegetation comparison.",
        )

