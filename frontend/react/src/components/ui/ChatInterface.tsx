import React, { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, AnalysisResult } from "../../hooks/useAnalysis";
import { PipelineVisualizer } from "./PipelineVisualizer";
import { AnalysisResults } from "./AnalysisResults";
import { MapSelector } from "./MapSelector";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  status: string;
  stageIndex: number;
  result: AnalysisResult | null;
  file: File | null;
  previewUrl: string | null;
  secondFile: File | null;
  secondPreviewUrl: string | null;
  mode: "auto" | "flood" | "deforestation" | "urban" | "agriculture";
  setMode: (val: "auto" | "flood" | "deforestation" | "urban" | "agriculture") => void;
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSubmit: () => void;
  handleFile: (f: File | null) => void;
  handleSecondFile: (f: File | null) => void;
  isStreaming: boolean;
  abortRequest: () => void;
  showHistory: boolean;
  askInsight: (q: string) => void;
  insightLoading: boolean;
  handleResetChat: () => void;
  coordinates: { lat: number; lng: number } | null;
  setCoordinates: (val: { lat: number; lng: number } | null) => void;
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number } | null;
  setBbox: (val: { minLat: number; minLng: number; maxLat: number; maxLng: number } | null) => void;
}

export const ChatInterface = memo(({
  messages,
  status,
  stageIndex,
  result,
  file,
  previewUrl,
  secondFile,
  secondPreviewUrl,
  mode,
  setMode,
  chatInput,
  setChatInput,
  handleSubmit,
  handleFile,
  handleSecondFile,
  isStreaming,
  abortRequest,
  showHistory,
  askInsight,
  insightLoading,
  handleResetChat,
  coordinates,
  setCoordinates,
  bbox,
  setBbox
}: ChatInterfaceProps) => {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, stageIndex]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="cb-chat-container">
      {/* On-screen architecture indicator for judges */}
      <div className="cb-arch-banner">
        <span className="cb-arch-step vision">📷 Vision: RemoteCLIP</span>
        <span className="cb-arch-arrow">➔</span>
        <span className="cb-arch-step bridge">⚙️ Telemetry Bridge</span>
        <span className="cb-arch-arrow">➔</span>
        <span className="cb-arch-step reasoning">🧠 Reasoning: GPT-OSS</span>
      </div>

      {messages.length === 0 && status === "idle" && !showHistory ? (
        <div className="cb-welcome orionix-reveal orionix-in">
          <div className="cb-hero-orb orb1"></div>
          <div className="cb-hero-orb orb2"></div>
          <h2>Analyze Satellite Imagery</h2>
          <h1><span className="nebula-text">Earth Observation</span> Assistant</h1>
          <div className="cb-suggestions">
            <button onClick={() => setChatInput("Identify bodies of water and calculate total area.")}>
              <div className="sg-icon">💧</div>
              <div className="sg-text">
                <h4>Water Detection</h4>
                <p>Map lakes and rivers</p>
              </div>
            </button>
            <button onClick={() => setChatInput("Detect urban encroachment into forest regions.")}>
              <div className="sg-icon">🏙️</div>
              <div className="sg-text">
                <h4>Urban Sprawl</h4>
                <p>Track city expansion</p>
              </div>
            </button>
            <button onClick={() => setChatInput("Assess vegetation health and calculate NDVI.")}>
              <div className="sg-icon">🌿</div>
              <div className="sg-text">
                <h4>Agriculture</h4>
                <p>Analyze crop vitality</p>
              </div>
            </button>
            <button onClick={() => setChatInput("Analyze road networks, buildings, and industrial infrastructure in the scene.")}>
              <div className="sg-icon">🏗️</div>
              <div className="sg-text">
                <h4>Infrastructure</h4>
                <p>Map built-up zones</p>
              </div>
            </button>
            <button onClick={() => setChatInput("Assess possible geological, flooding, or environmental hazards in the area.")}>
              <div className="sg-icon">⚠️</div>
              <div className="sg-text">
                <h4>Risk Assessment</h4>
                <p>Identify hazards</p>
              </div>
            </button>
          </div>
        </div>
      ) : !showHistory ? (
        <div className="cb-chat-history">
          {messages.map((m, i) => (
            <div key={i} className={`cb-msg-wrapper ${m.role} ${m.isReport ? 'report-msg' : ''}`}>
              {m.role === "assistant" && (
                <div className="cb-msg-avatar">
                  <div className="cb-dot small"></div>
                </div>
              )}
              <div className={`cb-msg-bubble ${m.role}`}>
                {m.role === "assistant" && (
                  <button className="cb-copy-btn" onClick={() => copyToClipboard(m.text)} title="Copy to clipboard">
                    📋
                  </button>
                )}
                {m.role === "user" ? (
                  <div className="cb-msg-text">{m.text}</div>
                ) : m.isReport && result ? (
                  <>
                    <AnalysisResults result={result} askInsight={askInsight} insightLoading={insightLoading} />
                  </>
                ) : (
                  <div className="cb-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {status === "running" && <PipelineVisualizer stageIndex={stageIndex} status={status} />}
          <div ref={chatEndRef} />
        </div>
      ) : null}

      {!showHistory && (
        <div className="cb-input-area">
          {/* Analysis Mode Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
            {[
              { id: "auto", label: "Auto-Detect", icon: "🌐" },
              { id: "flood", label: "Flood Monitoring", icon: "💧" },
              { id: "deforestation", label: "Deforestation Compare", icon: "🪵" },
              { id: "urban", label: "Urban Density", icon: "🏙️" },
              { id: "agriculture", label: "Vegetation Health", icon: "🌿" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  background: mode === t.id ? '#1e293b' : 'transparent',
                  border: mode === t.id ? '1px solid #475569' : '1px solid transparent',
                  color: mode === t.id ? '#f8fafc' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {mode === "deforestation" ? (
            <div style={{ display: 'flex', gap: '15px', marginBottom: '12px', width: '100%', flexWrap: 'wrap' }}>
              {/* Baseline Image Upload Block */}
              <div style={{ flex: 1, minWidth: '150px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px', fontFamily: 'monospace' }}>BASELINE IMAGE (BEFORE)</span>
                {file ? (
                  <div className="cb-attachment-preview">
                    <img src={previewUrl!} alt="Baseline Preview" />
                    <div className="cb-attachment-info">
                      <span className="cb-attachment-name">{file.name}</span>
                    </div>
                    <button className="cb-attachment-remove" onClick={() => handleFile(null)}>×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => document.getElementById("file-upload-baseline")?.click()}
                    style={{
                      width: '100%',
                      height: '50px',
                      borderRadius: '8px',
                      border: '1px dashed #334155',
                      background: 'transparent',
                      color: '#94a3b8',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>➕ Upload Baseline</span>
                  </button>
                )}
                <input
                  id="file-upload-baseline"
                  type="file"
                  accept="image/png, image/jpeg, image/tiff, image/x-tiff, image/tif, .tif, .tiff"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Current Image Upload Block */}
              <div style={{ flex: 1, minWidth: '150px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px', fontFamily: 'monospace' }}>CURRENT IMAGE (AFTER)</span>
                {secondFile ? (
                  <div className="cb-attachment-preview">
                    <img src={secondPreviewUrl!} alt="Current Preview" />
                    <div className="cb-attachment-info">
                      <span className="cb-attachment-name">{secondFile.name}</span>
                    </div>
                    <button className="cb-attachment-remove" onClick={() => handleSecondFile(null)}>×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => document.getElementById("file-upload-current")?.click()}
                    style={{
                      width: '100%',
                      height: '50px',
                      borderRadius: '8px',
                      border: '1px dashed #334155',
                      background: 'transparent',
                      color: '#94a3b8',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>➕ Upload Current</span>
                  </button>
                )}
                <input
                  id="file-upload-current"
                  type="file"
                  accept="image/png, image/jpeg, image/tiff, image/x-tiff, image/tif, .tif, .tiff"
                  style={{ display: "none" }}
                  onChange={(e) => handleSecondFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          ) : (
            file && (
              <div className="cb-attachment-preview" style={{ marginBottom: '12px' }}>
                <img src={previewUrl!} alt="Preview" />
                <div className="cb-attachment-info">
                  <span className="cb-attachment-name">{file.name}</span>
                  <span className="cb-attachment-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <button className="cb-attachment-remove" onClick={() => handleFile(null)}>×</button>
              </div>
            )
          )}
          {result && !file && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <button
                className="cb-attach-btn"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: '12px', padding: '6px 12px', height: '32px' }}
                onClick={handleResetChat}
              >
                🔄 Start New Analysis
              </button>
            </div>
          )}

          <div className="cb-input-box">
            <button
              className="cb-attach-btn"
              onClick={() => document.getElementById("file-upload")?.click()}
              title="Attach Image"
              type="button"
            >
              <span style={{ fontSize: "1.1rem" }}>+</span>
              <span className="cb-attach-text">Attach</span>
            </button>
            <button
              className="cb-attach-btn"
              onClick={() => setIsMapOpen(true)}
              title="Select Area on Map"
              type="button"
              style={{ borderLeft: 'none' }}
            >
              <span style={{ fontSize: "1.1rem" }}>🗺️</span>
              <span className="cb-attach-text">Map</span>
            </button>
            <input
              id="file-upload"
              type="file"
              accept="image/png, image/jpeg, image/tiff, image/x-tiff, image/tif, .tif, .tiff"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <textarea
              id="chat-input-textarea"
              placeholder={
                mode === "deforestation"
                  ? "Describe baseline comparison context..."
                  : file || result
                  ? "Ask a follow-up question..."
                  : "Describe what you want to analyze..."
              }
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={Math.min(chatInput.split("\n").length, 5) || 1}
            />
            {isStreaming || status === "running" ? (
              <button className="cb-submit-btn cb-stop-btn" onClick={abortRequest} title="Stop generation">
                ⏹
              </button>
            ) : (
              <button
                className="cb-submit-btn"
                onClick={handleSubmit}
                disabled={
                  (!chatInput.trim()) ||
                  (mode === "deforestation" ? (!file || !secondFile) : (!file)) ||
                  status === "running"
                }
              >
                ↑
              </button>
            )}
          </div>
          <div className="cb-footer-text">
            Orionix can make mistakes. Verify critical intelligence.
          </div>
        </div>
      )}
      {isMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <MapSelector
            onConfirm={(capturedFile, coords, bboxVal) => {
              handleFile(capturedFile);
              setCoordinates(coords);
              setBbox(bboxVal);
              setIsMapOpen(false);
            }}
            onCancel={() => setIsMapOpen(false)}
            waterMaskBase64={result?.water_mask_base64}
            analyzedBbox={
              result?.bbox && result.bbox.length === 4
                ? {
                    minLat: result.bbox[0],
                    minLng: result.bbox[1],
                    maxLat: result.bbox[2],
                    maxLng: result.bbox[3],
                  }
                : null
            }
          />
        </div>
      )}
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
