import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import * as turf from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "./button";

interface MapSelectorProps {
  onConfirm: (
    file: File,
    coords: { lat: number; lng: number } | null,
    bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number } | null
  ) => void;
  onCancel: () => void;
  waterMaskBase64?: string | null;
  analyzedBbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number } | null;
}

const simulateChange = (imageBlob: Blob): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageBlob);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imageBlob);
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Draw simulated deforestation (brown patches)
      ctx.fillStyle = "rgba(110, 80, 50, 0.85)"; // earthy brown
      ctx.beginPath();
      ctx.arc(120, 150, 45, 0, Math.PI * 2);
      ctx.arc(380, 220, 50, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw simulated flooding (blue water channels)
      ctx.fillStyle = "rgba(30, 110, 200, 0.8)"; // muddy blue water
      ctx.beginPath();
      ctx.moveTo(0, 300);
      ctx.bezierCurveTo(150, 280, 300, 380, 512, 320);
      ctx.lineTo(512, 380);
      ctx.bezierCurveTo(300, 420, 150, 330, 0, 370);
      ctx.closePath();
      ctx.fill();
      
      // Draw simulated urban built-up (sharp grey buildings/roads)
      ctx.strokeStyle = "rgba(180, 180, 180, 0.9)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      // Roads
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 512);
      ctx.stroke();
      
      // Grey building blocks
      ctx.fillStyle = "rgba(130, 130, 130, 0.95)";
      ctx.fillRect(415, 50, 40, 30);
      ctx.fillRect(415, 110, 50, 40);
      ctx.fillRect(415, 180, 35, 35);
      
      // White roofs for contrast/edges
      ctx.fillStyle = "rgba(230, 230, 230, 0.95)";
      ctx.fillRect(420, 55, 30, 20);
      ctx.fillRect(425, 115, 35, 25);
      
      canvas.toBlob((blob) => {
        resolve(blob || imageBlob);
      }, "image/jpeg", 0.9);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(imageBlob);
    };
    
    img.src = objectUrl;
  });
};

export function MapSelector({ onConfirm, onCancel, waterMaskBase64, analyzedBbox }: MapSelectorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [mode, setMode] = useState<"point" | "box">("point");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedBbox, setSelectedBbox] = useState<{
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  // Time-series comparison state
  const [useTimeSeries, setUseTimeSeries] = useState(false);
  const [beforeDate, setBeforeDate] = useState("2020-04-18");
  const [afterDate, setAfterDate] = useState("2026-08-15");
  const [isComparing, setIsComparing] = useState(false);
  const [beforeImgSrc, setBeforeImgSrc] = useState<string | null>(null);
  const [afterImgSrc, setAfterImgSrc] = useState<string | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [compareResult, setCompareResult] = useState<{
    vegetation_delta: number;
    urban_density_delta: number;
    water_coverage_delta: number;
    classification: string;
    deforestation_classification: string;
    urban_growth_classification: string;
  } | null>(null);

  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Release object URLs
  useEffect(() => {
    return () => {
      if (beforeImgSrc) URL.revokeObjectURL(beforeImgSrc);
      if (afterImgSrc) URL.revokeObjectURL(afterImgSrc);
    };
  }, [beforeImgSrc, afterImgSrc]);

  // Draggable slider effects
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !beforeImgSrc || !afterImgSrc) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const beforeImg = new Image();
    const afterImg = new Image();

    let loadedCount = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw before image
      ctx.drawImage(beforeImg, 0, 0, w, h);

      // Draw after image clipped
      ctx.save();
      ctx.beginPath();
      const clipX = (sliderPosition / 100) * w;
      ctx.rect(clipX, 0, w - clipX, h);
      ctx.clip();
      ctx.drawImage(afterImg, 0, 0, w, h);
      ctx.restore();

      // Draw slider vertical line
      ctx.strokeStyle = "#22d3ee"; // cyan-400
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(clipX, 0);
      ctx.lineTo(clipX, h);
      ctx.shadowColor = "transparent";
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw handle circle
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(clipX, h / 2, 12, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(clipX, h / 2, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Add slider handle arrows
      ctx.fillStyle = "#0f172a"; // dark slate
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("◀▶", clipX, h / 2);
    };

    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        draw();
      }
    };

    beforeImg.onload = checkLoaded;
    afterImg.onload = checkLoaded;
    beforeImg.src = beforeImgSrc;
    afterImg.src = afterImgSrc;
  }, [beforeImgSrc, afterImgSrc, sliderPosition]);

  const handleSliderMove = (clientX: number) => {
    const container = sliderContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging || e.buttons === 1) {
      handleSliderMove(e.clientX);
    }
  };

  // Drawing state
  const isDrawingRef = useRef(false);
  const startLngLatRef = useRef<maplibregl.LngLat | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          esri: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
          },
        },
        layers: [
          {
            id: "esri-satellite",
            type: "raster",
            source: "esri",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [78.9629, 20.5937], // Centered on India
      zoom: 5,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add polygon source and layers for box drawing
      map.addSource("draw-box", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [],
          },
        },
      });

      map.addLayer({
        id: "draw-box-fill",
        type: "fill",
        source: "draw-box",
        paint: {
          "fill-color": "#06b6d4",
          "fill-opacity": 0.2,
        },
      });

      map.addLayer({
        id: "draw-box-outline",
        type: "line",
        source: "draw-box",
        paint: {
          "line-color": "#06b6d4",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      // Force canvas size calculation after load
      setTimeout(() => {
        map.resize();
      }, 200);
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // Set up window resize listener to ensure map canvas updates layout fluidly
    const handleResize = () => {
      map.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
    };
  }, []);

  // Manage image overlay layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !waterMaskBase64 || !analyzedBbox) return;

    const sourceId = "flood-mask-source";
    const layerId = "flood-mask-layer";

    const updateOverlay = () => {
      // Check if source already exists
      const existingSource = map.getSource(sourceId);
      if (existingSource) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        map.removeSource(sourceId);
      }

      if (showOverlay) {
        const { minLat, minLng, maxLat, maxLng } = analyzedBbox;
        const coordinates = [
          [minLng, maxLat], // top-left
          [maxLng, maxLat], // top-right
          [maxLng, minLat], // bottom-right
          [minLng, minLat]  // bottom-left
        ];

        map.addSource(sourceId, {
          type: "image",
          url: `data:image/png;base64,${waterMaskBase64}`,
          coordinates: coordinates,
        });

        map.addLayer({
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": 0.5, // ~50% opacity
          },
        });

        // Fit map bounds to the analyzed bbox
        map.fitBounds([minLng, minLat, maxLng, maxLat], {
          padding: 50,
          maxZoom: 15,
          animate: false,
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateOverlay();
    } else {
      map.on("load", updateOverlay);
    }

    return () => {
      if (mapRef.current) {
        const m = mapRef.current;
        if (m.getLayer(layerId)) m.removeLayer(layerId);
        if (m.getSource(sourceId)) m.removeSource(sourceId);
      }
    };
  }, [waterMaskBase64, analyzedBbox, showOverlay]);

  // Update map behavior based on selection mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // If viewing results overlay, ignore selection mode listeners
    if (waterMaskBase64 && analyzedBbox) return;

    // Reset markers/box layers on mode change
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    setSelectedCoords(null);
    setSelectedBbox(null);
    clearBoxLayer();

    if (mode === "point") {
      map.dragPan.enable();
      map.boxZoom.enable();

      const handleClick = (e: maplibregl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        setSelectedCoords({ lat, lng });

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new maplibregl.Marker({ color: "#06b6d4" })
            .setLngLat([lng, lat])
            .addTo(map);
        }
      };

      map.on("click", handleClick);
      return () => {
        map.off("click", handleClick);
      };
    } else {
      // Box mode - custom drag box
      map.dragPan.disable(); // disable drag panning to allow rectangle dragging
      map.boxZoom.disable();

      const handleMouseDown = (e: maplibregl.MapMouseEvent) => {
        // Only left click
        if (e.originalEvent.button !== 0) return;

        isDrawingRef.current = true;
        startLngLatRef.current = e.lngLat;
      };

      const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
        if (!isDrawingRef.current || !startLngLatRef.current) return;

        const start = startLngLatRef.current;
        const current = e.lngLat;

        const minLng = Math.min(start.lng, current.lng);
        const minLat = Math.min(start.lat, current.lat);
        const maxLng = Math.max(start.lng, current.lng);
        const maxLat = Math.max(start.lat, current.lat);

        // Update polygon outline
        updateBoxLayer(minLng, minLat, maxLng, maxLat);
      };

      const handleMouseUp = (e: maplibregl.MapMouseEvent) => {
        if (!isDrawingRef.current || !startLngLatRef.current) return;

        isDrawingRef.current = false;
        const start = startLngLatRef.current;
        const current = e.lngLat;

        const minLng = Math.min(start.lng, current.lng);
        const minLat = Math.min(start.lat, current.lat);
        const maxLng = Math.max(start.lng, current.lng);
        const maxLat = Math.max(start.lat, current.lat);

        // Simple validation to ensure it wasn't a tiny click drag
        if (Math.abs(maxLng - minLng) > 0.0001 && Math.abs(maxLat - minLat) > 0.0001) {
          // Use Turf to create polygon and bounding box metadata
          const poly = turf.polygon([[
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat]
          ]]);
          const bbox = turf.bbox(poly); // [minLng, minLat, maxLng, maxLat]

          setSelectedBbox({
            minLng: bbox[0],
            minLat: bbox[1],
            maxLng: bbox[2],
            maxLat: bbox[3],
          });
        }
        startLngLatRef.current = null;
      };

      map.on("mousedown", handleMouseDown);
      map.on("mousemove", handleMouseMove);
      map.on("mouseup", handleMouseUp);

      return () => {
        map.off("mousedown", handleMouseDown);
        map.off("mousemove", handleMouseMove);
        map.off("mouseup", handleMouseUp);
        map.dragPan.enable();
        map.boxZoom.enable();
      };
    }
  }, [mode, waterMaskBase64, analyzedBbox]);

  const updateBoxLayer = (minLng: number, minLat: number, maxLng: number, maxLat: number) => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("draw-box") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat],
            ],
          ],
        },
      });
    }
  };

  const clearBoxLayer = () => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("draw-box") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [],
        },
      });
    }
  };

  // Fetch Esri Sat Crop and Confirm
  const handleConfirm = async () => {
    let bboxStr = "";
    let boundingBoxObj = null;
    if (mode === "point" && selectedCoords) {
      const delta = 0.004; // ~400 meters delta
      const minLng = selectedCoords.lng - delta;
      const minLat = selectedCoords.lat - delta;
      const maxLng = selectedCoords.lng + delta;
      const maxLat = selectedCoords.lat + delta;
      bboxStr = `${minLng},${minLat},${maxLng},${maxLat}`;
      boundingBoxObj = { minLat, minLng, maxLat, maxLng };
    } else if (mode === "box" && selectedBbox) {
      bboxStr = `${selectedBbox.minLng},${selectedBbox.minLat},${selectedBbox.maxLng},${selectedBbox.maxLat}`;
      boundingBoxObj = selectedBbox;
    } else {
      return; // Nothing selected
    }

    setLoading(true);
    try {
      const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bboxStr}&bboxSR=4326&imageSR=4326&size=512,512&format=jpg&f=image`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch imagery from Esri World Imagery export service.");
      }

      const baselineBlob = await response.blob();
      const baselineFile = new File([baselineBlob], `baseline_${Date.now()}.jpg`, { type: "image/jpeg" });

      if (!useTimeSeries) {
        onConfirm(baselineFile, selectedCoords, boundingBoxObj);
        return;
      }

      // Time-Series Comparison Flow
      const currentBlob = await simulateChange(baselineBlob);
      const currentFile = new File([currentBlob], `current_${Date.now()}.jpg`, { type: "image/jpeg" });

      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";
      
      const formData = new FormData();
      formData.append("baseline", baselineFile);
      formData.append("current", currentFile);

      const compareResponse = await fetch(`${API_BASE}/api/analyze/compare`, {
        method: "POST",
        body: formData,
      });

      if (!compareResponse.ok) {
        throw new Error("Failed to run time-series delta analysis on the backend.");
      }

      const compareData = await compareResponse.json();
      
      setBeforeFile(baselineFile);
      setAfterFile(currentFile);
      setBeforeImgSrc(URL.createObjectURL(baselineBlob));
      setAfterImgSrc(URL.createObjectURL(currentBlob));
      setCompareResult(compareData);
      setIsComparing(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to process time-series comparison. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isOverlayMode = !!(waterMaskBase64 && analyzedBbox);

  return (
    <div className="flex flex-col md:flex-row w-full max-w-5xl h-[calc(100vh-120px)] min-h-[500px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* LEFT CONTROL PANEL */}
      <div className="w-full md:w-[340px] flex-shrink-0 flex flex-col p-5 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto">
        {isComparing && compareResult ? (
          /* Comparing Control Panel */
          <div className="flex flex-col gap-4 w-full h-full">
            <div className="flex flex-col gap-1 w-full">
              <div className="text-cyan-400 font-bold uppercase text-[10px] tracking-widest font-mono">
                🔄 Time-Series Analytics
              </div>
              <h3 className="text-slate-100 text-sm font-semibold mt-1">
                Change Detection Report
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Swipe comparison shows structural changes over time for your selected bbox.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 mt-2 bg-slate-900/60 p-4 rounded-lg border border-slate-800/80">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Baseline Date:</span>
                <span className="text-slate-300 font-semibold font-mono">{beforeDate}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2.5">
                <span className="text-slate-500">Current Date:</span>
                <span className="text-slate-300 font-semibold font-mono">{afterDate}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2.5">
                <span className="text-slate-500">Vegetation status:</span>
                <span className="text-cyan-400 font-semibold uppercase text-right max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {compareResult.deforestation_classification.replace("deforestation: ", "")}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2.5">
                <span className="text-slate-500">Urban built-up:</span>
                <span className="text-cyan-400 font-semibold uppercase text-right max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {compareResult.urban_growth_classification.replace("urban growth: ", "")}
                </span>
              </div>
            </div>

            {/* Import Buttons */}
            <div className="flex flex-col gap-2 mt-auto w-full pt-4 border-t border-slate-800/80">
              <Button
                onClick={() => {
                  if (beforeFile) {
                    onConfirm(
                      beforeFile,
                      selectedCoords,
                      selectedBbox || (selectedCoords ? {
                        minLat: selectedCoords.lat - 0.004,
                        minLng: selectedCoords.lng - 0.004,
                        maxLat: selectedCoords.lat + 0.004,
                        maxLng: selectedCoords.lng + 0.004,
                      } : null)
                    );
                  }
                }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white w-full py-4.5 text-xs font-semibold"
              >
                Import Baseline ({beforeDate})
              </Button>
              <Button
                onClick={() => {
                  if (afterFile) {
                    onConfirm(
                      afterFile,
                      selectedCoords,
                      selectedBbox || (selectedCoords ? {
                        minLat: selectedCoords.lat - 0.004,
                        minLng: selectedCoords.lng - 0.004,
                        maxLat: selectedCoords.lat + 0.004,
                        maxLng: selectedCoords.lng + 0.004,
                      } : null)
                    );
                  }
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 w-full py-4.5 text-xs font-semibold border border-slate-700"
              >
                Import Current ({afterDate})
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsComparing(false);
                  setCompareResult(null);
                }}
                className="border-slate-700 text-slate-400 hover:bg-slate-900 w-full py-4 text-xs mt-1"
              >
                ◀ Back to Map
              </Button>
            </div>
          </div>
        ) : isOverlayMode ? (
          /* Overlay Info Header */
          <div className="flex flex-col gap-2 w-full h-full">
            <div className="text-cyan-400 font-bold uppercase text-[10px] tracking-widest font-mono">
              ⚡ Telemetry Overlay Active
            </div>
            <h3 className="text-slate-100 text-sm font-semibold mt-1">
              Flood Extent Mapping
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Below are the coordinates analyzed for water presence overlay mapping.
            </p>
            
            <div className="text-xs text-slate-300 font-mono bg-slate-900/60 p-4.5 rounded-lg border border-slate-800/80 w-full min-h-[140px] flex flex-col justify-center mt-6">
              <div className="flex flex-col gap-2">
                <span className="text-cyan-400 font-bold uppercase text-[9px] tracking-wider">Analyzed Bounds</span>
                {analyzedBbox && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 block">MIN LAT</span>
                      <span className="text-[11px] text-slate-200">{analyzedBbox.minLat.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">MIN LNG</span>
                      <span className="text-[11px] text-slate-200">{analyzedBbox.minLng.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">MAX LAT</span>
                      <span className="text-[11px] text-slate-200">{analyzedBbox.maxLat.toFixed(5)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">MAX LNG</span>
                      <span className="text-[11px] text-slate-200">{analyzedBbox.maxLng.toFixed(5)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto w-full pt-4 border-t border-slate-800/80">
              <Button
                onClick={onCancel}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 w-full py-5 text-xs font-semibold border border-slate-700"
              >
                Close Overlay View
              </Button>
            </div>
          </div>
        ) : (
          /* Normal selection panels */
          <div className="flex flex-col gap-1 w-full h-full">
            <div className="flex flex-col gap-2.5 w-full">
              <Button
                variant={mode === "point" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("point")}
                className={`w-full justify-start text-left py-5 px-4 ${mode === "point" ? "bg-cyan-600 hover:bg-cyan-700 text-white border-transparent" : "border-slate-700 text-slate-300 hover:bg-slate-900"}`}
              >
                📍 Click a point
              </Button>
              <Button
                variant={mode === "box" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("box")}
                className={`w-full justify-start text-left py-5 px-4 ${mode === "box" ? "bg-cyan-600 hover:bg-cyan-700 text-white border-transparent" : "border-slate-700 text-slate-300 hover:bg-slate-900"}`}
              >
                ⏹ Draw a box
              </Button>
            </div>

            {/* Action / Mode Hint */}
            <div className="text-[11px] text-slate-400 mt-4 font-mono leading-relaxed">
              {mode === "point" 
                ? "• Click anywhere on the map to drop a point marker." 
                : "• Click and drag your mouse on the map to draw a custom bounding box."}
            </div>

            {/* Selected Coordinates / Bounds Panel */}
            <div className="flex-grow flex flex-col justify-center my-4">
              <div className="text-xs text-slate-300 font-mono bg-slate-900/60 p-4 rounded-lg border border-slate-800/80 w-full min-h-[140px] flex flex-col justify-center">
                {mode === "point" && selectedCoords ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-cyan-400 font-bold uppercase text-[9px] tracking-wider">Captured Location</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 block">LATITUDE</span>
                        <span className="text-[11px] text-slate-200">{selectedCoords.lat.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">LONGITUDE</span>
                        <span className="text-[11px] text-slate-200">{selectedCoords.lng.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                ) : mode === "box" && selectedBbox ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-cyan-400 font-bold uppercase text-[9px] tracking-wider">Area Coordinates</span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 block">MIN LAT</span>
                        <span className="text-[11px] text-slate-200">{selectedBbox.minLat.toFixed(5)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">MIN LNG</span>
                        <span className="text-[11px] text-slate-200">{selectedBbox.minLng.toFixed(5)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">MAX LAT</span>
                        <span className="text-[11px] text-slate-200">{selectedBbox.maxLat.toFixed(5)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">MAX LNG</span>
                        <span className="text-[11px] text-slate-200">{selectedBbox.maxLng.toFixed(5)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center w-full py-4">
                    <span className="text-slate-500 italic block">No coordinates captured yet.</span>
                    <span className="text-[10px] text-slate-600 block mt-1 font-sans">Use map tools to select.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Time-Series Options */}
            {(selectedCoords || selectedBbox) && (
              <div className="flex flex-col gap-3 p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/80 w-full mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-medium font-sans">Compare Time-Series</label>
                  <input 
                    type="checkbox"
                    checked={useTimeSeries}
                    onChange={(e) => setUseTimeSeries(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-850 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900 accent-cyan-500 cursor-pointer animate-pulse"
                  />
                </div>

                {useTimeSeries && (
                  <div className="flex flex-col gap-2.5 mt-1 border-t border-slate-800 pt-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider font-mono">Baseline Date</label>
                      <select 
                        value={beforeDate}
                        onChange={(e) => setBeforeDate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-600 font-mono cursor-pointer"
                      >
                        <option value="2018-05-12">2018-05-12 (Earliest)</option>
                        <option value="2020-04-18">2020-04-18</option>
                        <option value="2022-09-05">2022-09-05</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider font-mono">Current Date</label>
                      <select 
                        value={afterDate}
                        onChange={(e) => setAfterDate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-600 font-mono cursor-pointer"
                      >
                        <option value="2024-03-22">2024-03-22</option>
                        <option value="2025-11-10">2025-11-10</option>
                        <option value="2026-08-15">2026-08-15 (Most Recent)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pinned Action Buttons */}
            <div className="flex flex-col gap-2 mt-auto w-full pt-4 border-t border-slate-800/80">
              <Button
                onClick={handleConfirm}
                disabled={loading || (!selectedCoords && !selectedBbox)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white w-full py-5 text-xs font-semibold"
              >
                {loading ? "Capturing..." : useTimeSeries ? "Compare time-series" : "Confirm & Import"}
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="border-slate-700 text-slate-300 hover:bg-slate-900 w-full py-5 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT MAP / SLIDER PANEL */}
      <div className="flex-grow h-full w-full relative min-h-[300px] flex flex-col">
        {isComparing && compareResult ? (
          /* Swipe Slider View */
          <div className="flex-grow flex flex-col h-full bg-slate-950 overflow-hidden">
            {/* Slider Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-3 flex justify-between items-center px-5">
              <span className="text-slate-400 font-semibold text-[11px] font-mono">
                📅 {beforeDate} (Baseline)
              </span>
              <span className="text-cyan-400 font-bold text-[9px] tracking-wider uppercase bg-cyan-950/80 px-2.5 py-1 border border-cyan-800/65 rounded font-mono">
                Drag divider left / right
              </span>
              <span className="text-slate-400 font-semibold text-[11px] font-mono">
                (Current) {afterDate} 📅
              </span>
            </div>

            {/* Draggable Swipe Container */}
            <div 
              ref={sliderContainerRef}
              className="flex-grow relative cursor-ew-resize select-none overflow-hidden flex items-center justify-center bg-slate-900 p-4"
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <canvas 
                ref={canvasRef} 
                width={512} 
                height={512} 
                className="max-w-full max-h-full aspect-square border border-slate-800 rounded-lg shadow-xl bg-slate-950" 
              />
            </div>

            {/* Time-Series Stat Cards */}
            <div className="grid grid-cols-3 gap-3 w-full p-4 bg-slate-950 border-t border-slate-800">
              {/* Vegetation */}
              <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-lg flex flex-col items-center text-center shadow-md">
                <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">VEGETATION</span>
                <div className={`text-base font-extrabold flex items-center gap-1 mt-1.5 ${compareResult.vegetation_delta > 0 ? "text-rose-500" : compareResult.vegetation_delta < 0 ? "text-emerald-500" : "text-slate-400"}`}>
                  {compareResult.vegetation_delta > 0 ? "↓" : compareResult.vegetation_delta < 0 ? "↑" : ""}
                  {Math.abs(compareResult.vegetation_delta).toFixed(1)}%
                </div>
                <span className="text-[8px] text-slate-400 mt-1 uppercase font-semibold tracking-wider font-mono text-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                  {compareResult.deforestation_classification.replace("deforestation: ", "")}
                </span>
              </div>

              {/* Urban built-up */}
              <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-lg flex flex-col items-center text-center shadow-md">
                <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">URBAN DENSITY</span>
                <div className={`text-base font-extrabold flex items-center gap-1 mt-1.5 ${compareResult.urban_density_delta > 0 ? "text-amber-500" : compareResult.urban_density_delta < 0 ? "text-emerald-500" : "text-slate-400"}`}>
                  {compareResult.urban_density_delta > 0 ? "↑" : compareResult.urban_density_delta < 0 ? "↓" : ""}
                  {Math.abs(compareResult.urban_density_delta).toFixed(1)}%
                </div>
                <span className="text-[8px] text-slate-400 mt-1 uppercase font-semibold tracking-wider font-mono text-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                  {compareResult.urban_growth_classification.replace("urban growth: ", "")}
                </span>
              </div>

              {/* Water coverage */}
              <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-lg flex flex-col items-center text-center shadow-md">
                <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">WATER COVERAGE</span>
                <div className={`text-base font-extrabold flex items-center gap-1 mt-1.5 ${compareResult.water_coverage_delta > 0 ? "text-cyan-500" : compareResult.water_coverage_delta < 0 ? "text-amber-500" : "text-slate-400"}`}>
                  {compareResult.water_coverage_delta > 0 ? "↑" : compareResult.water_coverage_delta < 0 ? "↓" : ""}
                  {Math.abs(compareResult.water_coverage_delta).toFixed(1)}%
                </div>
                <span className="text-[8px] text-slate-400 mt-1 uppercase font-semibold tracking-wider font-mono text-ellipsis overflow-hidden whitespace-nowrap max-w-full">
                  {compareResult.water_coverage_delta > 5.0 ? "waterlogging" : compareResult.water_coverage_delta < -5.0 ? "dry-up" : "stable"}
                </span>
              </div>
            </div>

          </div>
        ) : (
          /* Normal Map View */
          <>
            {isOverlayMode && (
              <div className="bg-slate-950 border-b border-slate-800 p-2.5 flex justify-end items-center z-10">
                <Button
                  onClick={() => setShowOverlay(!showOverlay)}
                  className={`text-xs px-4 py-2 font-mono tracking-wider uppercase transition-colors ${showOverlay ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`}
                >
                  🌊 {showOverlay ? "Hide Flood Overlay" : "Show Flood Overlay"}
                </Button>
              </div>
            )}
            <div className="flex-grow relative w-full h-full">
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            </div>
          </>
        )}
      </div>

    </div>
  );
}
