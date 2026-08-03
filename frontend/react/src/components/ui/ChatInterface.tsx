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
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSubmit: () => void;
  handleFile: (f: File | null) => void;
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
  chatInput,
  setChatInput,
  handleSubmit,
  handleFile,
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
          {file && (
            <div className="cb-attachment-preview">
              <img src={previewUrl!} alt="Preview" />
              <div className="cb-attachment-info">
                <span className="cb-attachment-name">{file.name}</span>
                <span className="cb-attachment-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button className="cb-attachment-remove" onClick={() => handleFile(null)}>×</button>
            </div>
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
              accept="image/png, image/jpeg"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <textarea
              id="chat-input-textarea"
              placeholder={file || result ? "Ask a follow-up question..." : "Describe what you want to analyze..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={Math.min(chatInput.split("\\n").length, 5) || 1}
            />
            {isStreaming || status === "running" ? (
              <button className="cb-submit-btn cb-stop-btn" onClick={abortRequest} title="Stop generation">
                ⏹
              </button>
            ) : (
              <button
                className="cb-submit-btn"
                onClick={handleSubmit}
                disabled={(!chatInput.trim() && !file) || status === "running"}
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
