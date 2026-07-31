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
}

export function MapSelector({ onConfirm, onCancel }: MapSelectorProps) {
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

  // Update map behavior based on selection mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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
  }, [mode]);

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
    if (mode === "point" && selectedCoords) {
      const delta = 0.004; // ~400 meters delta
      const minLng = selectedCoords.lng - delta;
      const minLat = selectedCoords.lat - delta;
      const maxLng = selectedCoords.lng + delta;
      const maxLat = selectedCoords.lat + delta;
      bboxStr = `${minLng},${minLat},${maxLng},${maxLat}`;
    } else if (mode === "box" && selectedBbox) {
      bboxStr = `${selectedBbox.minLng},${selectedBbox.minLat},${selectedBbox.maxLng},${selectedBbox.maxLat}`;
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

      const blob = await response.blob();
      const filename = `esri_satellite_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: "image/jpeg" });

      onConfirm(file, selectedCoords, selectedBbox);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to capture satellite image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full max-w-5xl h-[calc(100vh-120px)] min-h-[500px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* LEFT CONTROL PANEL */}
      <div className="w-full md:w-[340px] flex-shrink-0 flex flex-col p-5 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800">
        
        {/* Toggle Mode Buttons Stacked */}
        <div className="flex flex-col gap-2.5 w-full">
          <Button
            variant={mode === "point" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("point")}
            className={`w-full justify-start text-left py-5 px-4 ${mode === "point" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border-slate-700 text-slate-300 hover:bg-slate-900"}`}
          >
            📍 Click a point
          </Button>
          <Button
            variant={mode === "box" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("box")}
            className={`w-full justify-start text-left py-5 px-4 ${mode === "box" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border-slate-700 text-slate-300 hover:bg-slate-900"}`}
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
        <div className="flex-grow flex flex-col justify-center my-6">
          <div className="text-xs text-slate-300 font-mono bg-slate-900/60 p-4.5 rounded-lg border border-slate-800/80 w-full min-h-[140px] flex flex-col justify-center">
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
                <span className="text-[10px] text-slate-600 block mt-1">Use map tools to select.</span>
              </div>
            )}
          </div>
        </div>

        {/* Pinned Action Buttons */}
        <div className="flex flex-col gap-2 mt-auto w-full pt-4 border-t border-slate-800/80">
          <Button
            onClick={handleConfirm}
            disabled={loading || (!selectedCoords && !selectedBbox)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white w-full py-5 text-xs font-semibold"
          >
            {loading ? "Capturing..." : "Confirm & Import"}
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

      {/* RIGHT MAP PANEL */}
      <div className="flex-grow h-full w-full relative min-h-[300px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      </div>

    </div>
  );
}
