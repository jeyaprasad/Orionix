import { useCallback, useRef, useState } from "react";
import imageCompression from "browser-image-compression";

export interface LandCoverClass {
  label: string;
  pct: number;
  color: string;
}

export interface AnalysisResult {
  status: string;
  dominant_land_cover: string;
  secondary_land_cover?: string;
  confidence: string;
  summary: string;
  gpt_analysis?: string;
  professional_report?: string;
  classes: LandCoverClass[];
  flags: { icon: string; label: string; level: "info" | "warning" | "danger" }[];
  insight: string;
  width?: number;
  height?: number;
  title?: string;
  risk_level?: "Low" | "Medium" | "High";
  use_cases?: { name: string; rationale: string }[];
  recommended_actions?: { audience: string; action: string }[];
  mask_image?: string;
  ndvi_heatmap?: string;
  ndvi_score?: number;
  ndvi_min?: number;
  ndvi_max?: number;
  pie_chart?: string;
  bar_chart?: string;
  geo_metadata?: Record<string, unknown>;
  scene_type?: string;
  water_coverage_percent?: number;
  water_mask_base64?: string;
  latitude?: number;
  longitude?: number;
  bbox?: number[];
  flood_risk_score?: number;
  flood_risk_label?: string;
  flood_risk_reasoning?: string;
  external_advisory_match?: boolean;
  external_advisory_summary?: string;
  metadata?: any;
  deforestation_delta?: number;
  vegetation_delta?: number;
  urban_density_delta?: number;
  water_coverage_delta?: number;
  deforestation_classification?: string;
  urban_growth_classification?: string;
  overall_trend_risk?: number;
  overall_risk_label?: string;
  vegetation_trend?: string;
  urban_trend?: string;
  water_trend?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  isReport?: boolean;
}

export interface ChatSession {
  id: number;
  date: Date;
  messages: ChatMessage[];
  result: AnalysisResult | null;
  file: File | null;
  previewUrl: string | null;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

export const PIPELINE_STAGES = [
  { icon: "📤", title: "Uploading Image...", desc: "Transferring file to secure server" },
  { icon: "🛰️", title: "Running RemoteCLIP...", desc: "Extracting vision features" },
  { icon: "🌍", title: "Interpreting EO Context...", desc: "Mapping land cover & vegetation" },
  { icon: "💬", title: "Generating GPT Response...", desc: "Synthesizing AI insights" },
];

const MOCK_DEMO_RESULT: AnalysisResult = {
  status: "success",
  dominant_land_cover: "Forest",
  secondary_land_cover: "Water",
  confidence: "High",
  summary: "The satellite image is interpreted with high relative confidence as a Forest scene. Secondary signals suggest the presence of Water.",
  gpt_analysis: (
    "### Geospatial Assessment Report\n\n" +
    "**1. Landscape Composition**\n" +
    "The region displays a dense, healthy forest canopy cover (64.3% classification confidence). A localized water reservoir occupies the southern bounds.\n\n" +
    "**2. Environmental Risk Assessment**\n" +
    "The high forest canopy indicates low terrain instability. However, seasonal water body expansion warrants observation to prevent agricultural runoff.\n\n" +
    "**3. Strategic Recommendations**\n" +
    "- Implement quarterly imagery passes to track canopy density changes.\n" +
    "- Correlate local rainfall gauges with reservoir level anomalies."
  ),
  classes: [
    { label: "Forest", pct: 64.3, color: "#39d353" },
    { label: "Water", pct: 22.8, color: "#0088ff" },
    { label: "Residential", pct: 8.5, color: "#ff9d00" },
    { label: "Barren", pct: 4.4, color: "#a09cb4" }
  ],
  flags: [
    { icon: "🛰️", label: "Demo Mode Enabled", level: "info" }
  ],
  insight: "The satellite image is interpreted with high relative confidence as a Forest scene with nearby water bodies.",
  title: "Demo Forest Landscape Assessment",
  risk_level: "Low",
  water_coverage_percent: 12.5,
  flood_risk_score: 18.0,
  flood_risk_label: "Low",
  flood_risk_reasoning: "Low risk: Surface water is contained within normal reservoir boundaries.",
  latitude: 13.0827,
  longitude: 80.2707,
  metadata: {
    vision_model: "RemoteCLIP ViT-L-14 (Demo)",
    llm_model: "openai/gpt-oss-20b (Demo)",
    processing_time_ms: 120.0,
    timestamp: new Date().toISOString(),
    version: "1.0"
  }
};

const MOCK_DEMO_COMPARE = {
  baseline_vegetation_index_score: 45.2,
  current_vegetation_index_score: 32.1,
  deforestation_delta: 13.1,
  classification: "deforestation: declining",
  vegetation_delta: 13.1,
  urban_density_delta: 6.5,
  water_coverage_delta: 2.1,
  deforestation_classification: "deforestation: declining",
  urban_growth_classification: "urban growth: moderate",
  overall_trend_risk: 41.5,
  overall_risk_label: "Moderate",
  vegetation_trend: "Deteriorating",
  urban_trend: "Deteriorating",
  water_trend: "Stable"
};

export function useAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [stageIndex, setStageIndex] = useState(-1);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [bbox, setBbox] = useState<{ minLat: number; minLng: number; maxLat: number; maxLng: number } | null>(null);

  const [mode, setMode] = useState<"auto" | "flood" | "deforestation" | "urban" | "agriculture">("auto");
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [secondPreviewUrl, setSecondPreviewUrl] = useState<string | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleFile = useCallback(async (f: File | null) => {
    setError(null);
    if (!f) return;

    const isTiff = f.name.toLowerCase().endsWith(".tif") || f.name.toLowerCase().endsWith(".tiff");
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/tiff", "image/x-tiff", "image/tif", "image/geotiff", ""];
    if (!validTypes.includes(f.type) && !isTiff) {
      setError(`Invalid file type. Please upload a PNG, JPG, or GeoTIFF image.`);
      return;
    }

    if (isTiff) {
      if (f.size > 20 * 1024 * 1024) {
        setError(`File is too large. Max size for GeoTIFF is 20MB.`);
        return;
      }
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      return;
    }

    try {
      // Client-side image compression
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(f, options);
      setFile(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
    } catch (err) {
      console.error("Image compression error", err);
      // Fallback to uncompressed if it fails
      if (f.size > 10 * 1024 * 1024) {
        setError(`File is too large. Max size is 10MB.`);
        return;
      }
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  }, []);

  const handleSecondFile = useCallback(async (f: File | null) => {
    setError(null);
    if (!f) {
      setSecondFile(null);
      setSecondPreviewUrl(null);
      return;
    }

    const isTiff = f.name.toLowerCase().endsWith(".tif") || f.name.toLowerCase().endsWith(".tiff");
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/tiff", "image/x-tiff", "image/tif", "image/geotiff", ""];
    if (!validTypes.includes(f.type) && !isTiff) {
      setError(`Invalid file type. Please upload a PNG, JPG, or GeoTIFF image.`);
      return;
    }

    if (isTiff) {
      if (f.size > 20 * 1024 * 1024) {
        setError(`File is too large. Max size for GeoTIFF is 20MB.`);
        return;
      }
      setSecondFile(f);
      setSecondPreviewUrl(URL.createObjectURL(f));
      return;
    }

    try {
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(f, options);
      setSecondFile(compressedFile);
      setSecondPreviewUrl(URL.createObjectURL(compressedFile));
    } catch (err) {
      console.error("Image compression error", err);
      if (f.size > 10 * 1024 * 1024) {
        setError(`File is too large. Max size is 10MB.`);
        return;
      }
      setSecondFile(f);
      setSecondPreviewUrl(URL.createObjectURL(f));
    }
  }, []);

  const handleReset = useCallback(() => {
    if (messages.length > 0 || result || file) {
      setSessions((prev) => [{
        id: Date.now(),
        date: new Date(),
        messages,
        result,
        file,
        previewUrl
      }, ...prev]);
    }
    setMessages([]);
    setFile(null);
    setPreviewUrl(null);
    setSecondFile(null);
    setSecondPreviewUrl(null);
    setMode("auto");
    setCoordinates(null);
    setBbox(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    setStageIndex(-1);
    abortController?.abort();
    setAbortController(null);
    setIsStreaming(false);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, [messages, result, file, previewUrl, abortController]);

  const restoreSession = useCallback((s: ChatSession) => {
    setMessages(s.messages);
    setResult(s.result);
    setFile(s.file);
    setPreviewUrl(s.previewUrl);
    setStatus(s.result || s.messages.length > 0 ? "done" : "idle");
  }, []);

  const runAnalysis = useCallback(async (prompt: string) => {
    if (mode === "deforestation") {
      if (!file || !secondFile) {
        setError("Both Baseline and Current images are required for Deforestation Compare mode.");
        return;
      }
    } else {
      if (!file) return;
    }
    if (!prompt.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setStatus("running");
    setResult(null);
    setError(null);
    setStageIndex(0);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    [1, 2, 3].forEach((i) => {
      const t = setTimeout(() => setStageIndex(i), i * 350);
      timers.current.push(t);
    });
    const minDuration = new Promise((resolve) => {
      const t = setTimeout(resolve, PIPELINE_STAGES.length * 350);
      timers.current.push(t);
    });

    if (demoMode) {
      await minDuration;
      let simulatedData = { ...MOCK_DEMO_RESULT };
      if (mode === "deforestation") {
        simulatedData = {
          ...simulatedData,
          deforestation_delta: MOCK_DEMO_COMPARE.deforestation_delta,
          vegetation_delta: MOCK_DEMO_COMPARE.vegetation_delta,
          urban_density_delta: MOCK_DEMO_COMPARE.urban_density_delta,
          water_coverage_delta: MOCK_DEMO_COMPARE.water_coverage_delta,
          deforestation_classification: MOCK_DEMO_COMPARE.deforestation_classification,
          urban_growth_classification: MOCK_DEMO_COMPARE.urban_growth_classification,
          overall_trend_risk: MOCK_DEMO_COMPARE.overall_trend_risk,
          overall_risk_label: MOCK_DEMO_COMPARE.overall_risk_label as any,
          vegetation_trend: MOCK_DEMO_COMPARE.vegetation_trend,
          urban_trend: MOCK_DEMO_COMPARE.urban_trend,
          water_trend: MOCK_DEMO_COMPARE.water_trend,
        };
      }
      setResult(simulatedData);
      setStatus("done");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: simulatedData.professional_report || simulatedData.gpt_analysis || simulatedData.insight, isReport: true }
      ]);
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    try {
      const controller = new AbortController();
      setAbortController(controller);
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let deforestDelta: number | null = null;
      if (mode === "deforestation" && file && secondFile) {
        const compFormData = new FormData();
        compFormData.append("baseline", file, file.name || "baseline.jpeg");
        compFormData.append("current", secondFile, secondFile.name || "current.jpeg");

        const compRes = await fetch(`${API_BASE}/api/analyze/compare`, {
          method: "POST",
          body: compFormData,
          signal: controller.signal
        });
        if (!compRes.ok) {
          throw new Error("Deforestation baseline/current analysis comparison failed.");
        }
        const compData = await compRes.json();
        deforestDelta = compData.deforestation_delta;
      }

      const formData = new FormData();
      const targetImage = mode === "deforestation" && secondFile ? secondFile : file;
      formData.append("image", targetImage!, targetImage!.name || "image.jpeg");

      if (coordinates) {
        formData.append("latitude", coordinates.lat.toString());
        formData.append("longitude", coordinates.lng.toString());
      }
      if (bbox) {
        formData.append("min_latitude", bbox.minLat.toString());
        formData.append("min_longitude", bbox.minLng.toString());
        formData.append("max_latitude", bbox.maxLat.toString());
        formData.append("max_longitude", bbox.maxLng.toString());
        formData.append("bbox", JSON.stringify([bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng]));
      }
      if (deforestDelta !== null) {
        formData.append("deforestation_delta", deforestDelta.toString());
      }

      const fetchAnalysis = fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: formData,
        signal: controller.signal
      }).then(async (res) => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          if (res.status === 413) throw new Error("Image too large for the backend to process.");
          if (res.status === 415) throw new Error("Unsupported image format.");

          let backendErrorStr = "";
          try {
            const errData = await res.json();
            backendErrorStr = errData.detail || "";
          } catch (e) { }

          if (res.status === 400 || res.status === 422) {
            throw new Error(backendErrorStr ? backendErrorStr : "Invalid image or request.");
          }
          if (res.status >= 500) throw new Error("The backend encountered an unexpected error.");
          throw new Error(`Analysis failed due to an unknown error (${res.status}).`);
        }
        return (await res.json()) as AnalysisResult;
      }).catch(err => {
        clearTimeout(timeoutId);
        throw err;
      });

      const [data] = await Promise.all([fetchAnalysis, minDuration]);
      setResult(data);
      setStatus("done");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.professional_report || data.gpt_analysis || data.insight, isReport: true }
      ]);
      setFile(null);
      setPreviewUrl(null);

    } catch (err: any) {
      setStatus("idle");
      setStageIndex(-1);

      let friendlyMsg = "Something went wrong while analyzing the image.";
      if (err.name === "AbortError") friendlyMsg = "The request timed out. The server took too long to respond.";
      else if (err instanceof TypeError) friendlyMsg = "Network failure. Could not connect to the backend server.";
      else if (err instanceof Error) friendlyMsg = err.message;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `⚠️ Error: ${friendlyMsg}` }
      ]);
      setError(friendlyMsg);
    }
  }, [file, coordinates, bbox]);

  const askInsight = useCallback(async (question: string) => {
    if (!question.trim() || !result || insightLoading) return;

    setMessages((m) => [...m, { role: "user", text: question }]);
    
    if (demoMode) {
      setInsightLoading(true);
      await new Promise(r => setTimeout(r, 600));
      setInsightLoading(false);
      let reply = "Based on the cached scene assessment, water coverage remains stable and no immediate flood hazards are detected.";
      if (question.toLowerCase().includes("risk") || question.toLowerCase().includes("hazard")) {
        reply = "Observed risk is classified as low for vegetation degradation, moderate for urban sprawl, and stable for surface water levels.";
      } else if (question.toLowerCase().includes("vegetation") || question.toLowerCase().includes("ndvi")) {
        reply = "Vegetation Index displays a mean NDVI proxy of 0.42, which corresponds to healthy, active green cover.";
      }
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      return;
    }

    setInsightLoading(true);

    try {
      const controller = new AbortController();
      setAbortController(controller);
      const res = await fetch(`${API_BASE}/api/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          eo_context: {
            dominant_land_cover: result.dominant_land_cover,
            secondary_land_cover: result.secondary_land_cover,
            confidence: result.confidence,
            summary: result.summary,
          }
        }),
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`Insights request failed (${res.status})`);

      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((m) => [...m, { role: "assistant", text: `Insight generation is temporarily unavailable.` }]);
      }
    } finally {
      setInsightLoading(false);
      setAbortController(null);
    }
  }, [result, insightLoading]);

  const abortRequest = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
      setStatus("done");
    }
  }, [abortController]);

  return {
    file,
    previewUrl,
    secondFile,
    secondPreviewUrl,
    mode,
    status,
    stageIndex,
    result,
    error,
    messages,
    sessions,
    isStreaming,
    insightLoading,
    coordinates,
    setCoordinates,
    bbox,
    setBbox,
    setMode,
    handleFile,
    handleSecondFile,
    handleReset,
    restoreSession,
    runAnalysis,
    askInsight,
    abortRequest,
    demoMode,
    setDemoMode
  };
}
