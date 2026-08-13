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

export function useAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(f.type)) {
      setError(`Invalid file type. Please upload a PNG or JPG image.`);
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

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(f.type)) {
      setError(`Invalid file type. Please upload a PNG or JPG image.`);
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
    abortRequest
  };
}
