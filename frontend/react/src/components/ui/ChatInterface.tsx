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
  runAnalysis: (prompt: string, source?: string) => void;
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
  ingestBhuvanScene?: (sceneId: string, source: string) => Promise<void>;
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
  runAnalysis,
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
  const [activeTab, setActiveTab] = useState<"upload" | "map" | "bhuvan">("upload");
  const [selectedBhuvanScene, setSelectedBhuvanScene] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, stageIndex]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleTabChange = (tab: "upload" | "map" | "bhuvan") => {
    if (tab !== activeTab) {
      handleResetChat();
      setActiveTab(tab);
      setSelectedBhuvanScene(null);
    }
  };

  const handleUnifiedAnalyze = () => {
    const prompt = chatInput.trim() || "Analyze this scene.";
    
    if (activeTab === "upload") {
      runAnalysis(prompt, "Upload Image");
      setChatInput("");
    } else if (activeTab === "map") {
      let source = "Map Selection";
      if (coordinates) {
        source += ` — ${coordinates.lat.toFixed(2)}°N, ${coordinates.lng.toFixed(2)}°E`;
      }
      runAnalysis(prompt, source);
      setChatInput("");
    } else if (activeTab === "bhuvan") {
      if (selectedBhuvanScene && ingestBhuvanScene) {
        ingestBhuvanScene(selectedBhuvanScene, `ISRO Bhuvan Sample — ${selectedBhuvanScene}`);
        setChatInput("");
      }
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

      {!showHistory && !result && messages.length === 0 && (
        <div style={{ padding: '0 20px', marginBottom: '20px' }}>
          {/* Top-Level Input Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(120, 100, 255, 0.2)' }}>
            {[
              { id: "upload", label: "Upload Image", icon: "📤" },
              { id: "map", label: "Select on Map", icon: "🗺️" },
              { id: "bhuvan", label: "ISRO Bhuvan Sample", icon: "🛰️" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                style={{
                  background: activeTab === tab.id ? 'rgba(120, 100, 255, 0.15)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #6c47ff' : '2px solid transparent',
                  padding: '12px 20px',
                  color: activeTab === tab.id ? '#ffffff' : '#a09cb4',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {/* Analysis Mode Selector Tabs */}
          {activeTab !== "bhuvan" && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
          )}

          {/* Tab Content */}
          <div style={{ marginBottom: '20px' }}>
            {activeTab === "upload" && (
              <div style={{ padding: '20px', border: '1px dashed #334155', borderRadius: '12px', background: 'rgba(13, 13, 36, 0.4)' }}>
                {mode === "deforestation" ? (
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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
                            width: '100%', height: '100px', borderRadius: '8px', border: '1px dashed #475569',
                            background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                          }}
                        >
                          <span>➕ Upload Baseline GeoTIFF/JPG</span>
                        </button>
                      )}
                      <input
                        id="file-upload-baseline" type="file" accept="image/png, image/jpeg, image/tiff, image/x-tiff, image/tif, .tif, .tiff"
                        style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0] || null)}
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
                            width: '100%', height: '100px', borderRadius: '8px', border: '1px dashed #475569',
                            background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                          }}
                        >
                          <span>➕ Upload Current GeoTIFF/JPG</span>
                        </button>
                      )}
                      <input
                        id="file-upload-current" type="file" accept="image/png, image/jpeg, image/tiff, image/x-tiff, image/tif, .tif, .tiff"
                        style={{ display: "none" }} onChange={(e) => handleSecondFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    {file ? (
                      <div className="cb-attachment-preview">
                        <img src={previewUrl!} alt="Preview" />
                        <div className="cb-attachment-info">
                          <span className="cb-attachment-name">{file.name}</span>
                          <span className="cb-attachment-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <button className="cb-attachment-remove" onClick={() => handleFile(null)}>×</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => document.getElementById("file-upload")?.click()}
                        style={{
                          width: '100%', height: '120px', borderRadius: '8px', border: '1px dashed #475569',
                          background: 'transparent', color: '#94a3b8', fontSize: '13px', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>📤</span>
                        <span>Click to upload a GeoTIFF or JPG</span>
                      </button>
                    )}
                    <input
                      id="file-upload" type="file" accept="image/png, image/jpeg, image/tiff, image/x-tiff, image/tif, .tif, .tiff"
                      style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === "map" && (
              <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', position: 'relative' }}>
                <MapSelector
                  onConfirm={(capturedFile, coords, bboxVal) => {
                    handleFile(capturedFile);
                    setCoordinates(coords);
                    setBbox(bboxVal);
                  }}
                  onCancel={() => {}}
                  waterMaskBase64={undefined}
                  analyzedBbox={null}
                />
              </div>
            )}

            {activeTab === "bhuvan" && (
              <div style={{ padding: '20px', border: '1px solid rgba(120, 100, 255, 0.2)', borderRadius: '12px', background: 'rgba(13, 13, 36, 0.4)' }}>
                <p style={{ fontSize: '12px', color: '#a09cb4', marginBottom: '16px', lineHeight: '1.5' }}>
                  Select a curated offline reference scene from the ISRO Bhuvan/MOSDAC catalog.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    {
                      id: "isro-liss4-kerala-2023",
                      title: "Kerala Backwaters Flood Inundation",
                      sat: "ResourceSat-2 (LISS-IV)",
                      badge: "Flood Monitoring",
                      color: "#00e5c8"
                    },
                    {
                      id: "isro-cartosat-blr-2024",
                      title: "Whitefield Bengaluru Sprawl",
                      sat: "Cartosat-2E (PAN/MX)",
                      badge: "Urban Density",
                      color: "#a78bfa"
                    },
                    {
                      id: "isro-liss4-ghats-deforest",
                      title: "Western Ghats Deforestation",
                      sat: "ResourceSat-2 (LISS-IV)",
                      badge: "Canopy Loss",
                      color: "#fda4af"
                    }
                  ].map((scene) => (
                    <div 
                      key={scene.id}
                      onClick={() => setSelectedBhuvanScene(scene.id)}
                      style={{
                        background: selectedBhuvanScene === scene.id ? '#16163b' : '#11112e',
                        border: selectedBhuvanScene === scene.id ? `1px solid ${scene.color}` : '1px solid rgba(120, 100, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#ffffff' }}>{scene.title}</h3>
                        <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>{scene.sat}</div>
                      </div>
                      <span style={{ fontSize: '10px', background: 'rgba(120, 100, 255, 0.15)', color: scene.color, padding: '4px 8px', borderRadius: '12px', border: `1px solid ${scene.color}33` }}>
                        {scene.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Unified Action Area */}
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            {activeTab !== "bhuvan" && (
              <textarea
                placeholder="Describe what you want to analyze..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  background: 'rgba(13, 13, 36, 0.8)',
                  border: '1px solid rgba(120, 100, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#ffffff',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            )}
            
            <button
              onClick={handleUnifiedAnalyze}
              disabled={
                status === "running" ||
                (activeTab === "upload" && mode === "deforestation" && (!file || !secondFile)) ||
                (activeTab === "upload" && mode !== "deforestation" && !file) ||
                (activeTab === "map" && !coordinates) ||
                (activeTab === "bhuvan" && !selectedBhuvanScene)
              }
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #6c47ff, #00e5c8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: (status === "running" || 
                         (activeTab === "upload" && mode === "deforestation" && (!file || !secondFile)) ||
                         (activeTab === "upload" && mode !== "deforestation" && !file) ||
                         (activeTab === "map" && !coordinates) ||
                         (activeTab === "bhuvan" && !selectedBhuvanScene)) ? 0.5 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {status === "running" ? "Analyzing..." : "Analyze Source"}
            </button>
          </div>
        </div>
      )}

      {/* Render Chat History / Results */}
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
      
      {/* Follow up chat input if result exists */}
      {result && !showHistory && (
        <div className="cb-input-area" style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <button
              className="cb-attach-btn"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', fontSize: '12px', padding: '6px 12px', height: '32px' }}
              onClick={handleResetChat}
            >
              🔄 Start New Analysis
            </button>
          </div>
          <div className="cb-input-box">
            <textarea
              id="chat-input-textarea"
              placeholder="Ask a follow-up question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (chatInput.trim() && status !== "running") {
                    askInsight(chatInput.trim());
                    setChatInput("");
                  }
                }
              }}
              rows={Math.min(chatInput.split("\n").length, 5) || 1}
            />
            {isStreaming || status === "running" ? (
              <button className="cb-submit-btn cb-stop-btn" onClick={abortRequest} title="Stop generation">
                ⏹
              </button>
            ) : (
              <button
                className="cb-submit-btn"
                onClick={() => {
                  if (chatInput.trim() && status !== "running") {
                    askInsight(chatInput.trim());
                    setChatInput("");
                  }
                }}
                disabled={!chatInput.trim() || status === "running"}
              >
                ↑
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
