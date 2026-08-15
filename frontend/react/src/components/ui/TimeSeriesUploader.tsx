import React, { useState, useRef } from "react";
import { TimeSeriesChart } from "./TimeSeriesChart";

interface TimeSeriesEntry {
  file: File;
  date: string;
  previewUrl: string;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";

export const TimeSeriesUploader: React.FC = () => {
  const [entries, setEntries] = useState<TimeSeriesEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newEntries: TimeSeriesEntry[] = [];
    const total = entries.length + files.length;
    if (total > 6) {
      setError("Maximum 6 images allowed for time-series analysis.");
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const isTiff = f.name.toLowerCase().endsWith(".tif") || f.name.toLowerCase().endsWith(".tiff");
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/tiff", ""];
      if (!validTypes.includes(f.type) && !isTiff) continue;

      newEntries.push({
        file: f,
        date: new Date().toISOString().split("T")[0],
        previewUrl: URL.createObjectURL(f),
      });
    }
    setEntries((prev) => [...prev, ...newEntries]);
    setError(null);
  };

  const updateDate = (idx: number, date: string) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, date } : e)));
  };

  const removeEntry = (idx: number) => {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const runTimeSeries = async () => {
    if (entries.length < 2) {
      setError("At least 2 images are required for time-series analysis.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      for (const entry of entries) {
        formData.append("images", entry.file, entry.file.name);
        formData.append("dates", entry.date);
      }

      const res = await fetch(`${API_BASE}/api/analyze/timeseries`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Time-series analysis failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Time-series analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(13, 13, 36, 0.5)',
      border: '1px solid rgba(120, 100, 255, 0.2)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '20px',
      fontFamily: "'Space Grotesk', sans-serif"
    }}>
      <h3 style={{
        margin: '0 0 6px 0',
        fontSize: '11px',
        color: '#00e5c8',
        fontFamily: "'Space Mono', monospace",
        textTransform: 'uppercase',
        letterSpacing: '0.08em'
      }}>
        🕰️ Multi-Point Time-Series Analysis
      </h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#a09cb4', lineHeight: 1.4 }}>
        Upload 2–6 satellite images of the same location at different dates. Each image will be analyzed for vegetation, water, and urban metrics to compute environmental trends over time.
      </p>

      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/tiff,.tif,.tiff"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Image cards grid */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {entries.map((entry, idx) => (
          <div key={idx} style={{
            width: '140px',
            background: '#090918',
            border: '1px solid rgba(120, 100, 255, 0.15)',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <img
              src={entry.previewUrl}
              alt={`Scene ${idx + 1}`}
              style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }}
            />
            <button
              onClick={() => removeEntry(idx)}
              style={{
                position: 'absolute', top: '4px', right: '4px',
                background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fca5a5',
                borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer',
                fontSize: '11px', lineHeight: '20px', textAlign: 'center', padding: 0
              }}
            >✕</button>
            <div style={{ padding: '6px 8px' }}>
              <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', fontFamily: "'Space Mono', monospace" }}>
                Scene {idx + 1}
              </div>
              <input
                type="date"
                value={entry.date}
                onChange={(e) => updateDate(idx, e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d24',
                  border: '1px solid rgba(120, 100, 255, 0.2)',
                  borderRadius: '4px',
                  color: '#ffffff',
                  fontSize: '10px',
                  padding: '3px 4px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        ))}

        {/* Add button */}
        {entries.length < 6 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '140px',
              height: '130px',
              background: 'transparent',
              border: '2px dashed rgba(120, 100, 255, 0.25)',
              borderRadius: '10px',
              color: '#6c47ff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              gap: '4px',
              transition: 'border-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(120, 100, 255, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(120, 100, 255, 0.25)'}
          >
            +
            <span style={{ fontSize: '10px', color: '#8b8ba8' }}>Add Image</span>
          </button>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={runTimeSeries}
          disabled={isAnalyzing || entries.length < 2}
          style={{
            background: entries.length >= 2 ? '#6c47ff' : '#334155',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            cursor: entries.length >= 2 ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            fontFamily: 'inherit',
            fontSize: '13px',
            transition: 'background 0.2s'
          }}
        >
          {isAnalyzing ? "Analyzing..." : `Analyze ${entries.length} Scene${entries.length !== 1 ? "s" : ""}`}
        </button>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          {entries.length}/6 images selected
        </span>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          fontSize: '12px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {result && result.data_points && (
        <div style={{ marginTop: '20px' }}>
          <TimeSeriesChart
            dataPoints={result.data_points}
            overallSummary={result.overall_summary}
          />
        </div>
      )}
    </div>
  );
};
