import React, { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, AnalysisResult } from "../../hooks/useAnalysis";
import { PipelineVisualizer } from "./PipelineVisualizer";
import { AnalysisResults } from "./AnalysisResults";
import { MapSelector } from "./MapSelector";
import { TimeSeriesUploader } from "./TimeSeriesUploader";

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
  ingestBhuvanScene?: (sceneId: string) => Promise<void>;
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
  setBbox,
  ingestBhuvanScene
}: ChatInterfaceProps) => {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isBhuvanCatalogOpen, setIsBhuvanCatalogOpen] = useState(false);
  const [isTimeSeriesOpen, setIsTimeSeriesOpen] = useState(false);
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

          {/* Time-Series & Weather Correlation Demo Call-to-Action Banner */}
          <button 
            onClick={() => setIsMapOpen(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.12), rgba(108, 71, 255, 0.12))',
              border: '1px solid rgba(120, 100, 255, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              color: '#ffffff',
              cursor: 'pointer',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'inherit',
              textAlign: 'left',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.25s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid rgba(0, 229, 200, 0.5)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 229, 200, 0.18), rgba(108, 71, 255, 0.18))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid rgba(120, 100, 255, 0.3)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 229, 200, 0.12), rgba(108, 71, 255, 0.12))'; }}
          >
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#00e5c8', fontWeight: 'bold' }}>⚡ Time-Series & Weather Correlation Demo</h4>
              <p style={{ margin: 0, fontSize: '11px', color: '#a09cb4', lineHeight: '1.4' }}>Compare baseline vs current satellite scenes and correlate with live Open-Meteo rainfall</p>
            </div>
            <div style={{ fontSize: '18px', color: '#00e5c8', marginLeft: '12px' }}>➜</div>
          </button>

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
            <button
              className="cb-attach-btn"
              onClick={() => setIsBhuvanCatalogOpen(true)}
              title="Ingest from ISRO Bhuvan Catalog"
              type="button"
              style={{ borderLeft: 'none' }}
            >
              <span style={{ fontSize: "1.1rem" }}>🛰️</span>
              <span className="cb-attach-text">Bhuvan</span>
            </button>
            <button
              className="cb-attach-btn"
              onClick={() => setIsTimeSeriesOpen(true)}
              title="Multi-Point Time-Series Analysis"
              type="button"
              style={{ borderLeft: 'none' }}
            >
              <span style={{ fontSize: "1.1rem" }}>📈</span>
              <span className="cb-attach-text">Time-Series</span>
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

      {isBhuvanCatalogOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 3, 10, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setIsBhuvanCatalogOpen(false)}
        >
          <div 
            style={{
              background: '#0d0d24',
              border: '1px solid rgba(120, 100, 255, 0.3)',
              borderRadius: '16px',
              maxWidth: '650px',
              width: '100%',
              padding: '28px',
              position: 'relative',
              boxShadow: '0 0 40px rgba(108, 71, 255, 0.25)',
              fontFamily: "Space Grotesk, sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsBhuvanCatalogOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: '#a09cb4',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '10px', color: '#00e5c8', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              ISRO Satellite Catalog Ingestion
            </h2>
            <h1 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
              Select Bundled Bhuvan/MOSDAC Reference Scene
            </h1>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#a09cb4', margin: '0 0 20px 0', textAlign: 'justify' }}>
              This module is <strong>designed to plug directly into ISRO's live Bhuvan/MOSDAC Web Coverage Service (WCS) data feeds</strong>. 
              Because live production access requires registered organization credentials not available in this environment, 
              this demo runs on a curated catalog of manually-sourced reference scenes bundled locally for offline testing.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  id: "isro-liss4-kerala-2023",
                  title: "Kerala Backwaters Flood Inundation",
                  sat: "ResourceSat-2 (LISS-IV)",
                  desc: "True-color multispectral tile capturing active flood extents and waterlogging along the coastal backwaters of Alappuzha (Aug 2023).",
                  badge: "Flood Monitoring",
                  color: "#00e5c8"
                },
                {
                  id: "isro-cartosat-blr-2024",
                  title: "Whitefield Bengaluru Sprawl",
                  sat: "Cartosat-2E (PAN/MX)",
                  desc: "High-resolution pan-sharpened frame depicting rapid residential expansion and industrial zoning clusters (Mar 2024).",
                  badge: "Urban Density",
                  color: "#a78bfa"
                },
                {
                  id: "isro-liss4-ghats-deforest",
                  title: "Western Ghats Deforestation",
                  sat: "ResourceSat-2 (LISS-IV)",
                  desc: "Multispectral tile showing structural canopy loss and degradation within protected forest zones in Karnataka (May 2024).",
                  badge: "Canopy Loss",
                  color: "#fda4af"
                }
              ].map((scene) => (
                <div 
                  key={scene.id}
                  onClick={() => {
                    setIsBhuvanCatalogOpen(false);
                    if (ingestBhuvanScene) ingestBhuvanScene(scene.id);
                  }}
                  style={{
                    background: '#11112e',
                    border: '1px solid rgba(120, 100, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid rgba(120, 100, 255, 0.4)'; e.currentTarget.style.background = '#16163b'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid rgba(120, 100, 255, 0.15)'; e.currentTarget.style.background = '#11112e'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#ffffff', fontWeight: 'bold' }}>{scene.title}</h3>
                    <span style={{ fontSize: '10px', background: 'rgba(120, 100, 255, 0.15)', color: scene.color, padding: '2px 8px', borderRadius: '10px', border: `1px solid ${scene.color}33` }}>
                      {scene.badge}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#8b8ba8', lineHeight: '1.4' }}>{scene.desc}</p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                    <span>ID: {scene.id}</span>
                    <span>SATELLITE: {scene.sat}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {isTimeSeriesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div style={{ position: 'relative', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setIsTimeSeriesOpen(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
              }}
            >✕</button>
            <TimeSeriesUploader />
          </div>
        </div>
      )}
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
