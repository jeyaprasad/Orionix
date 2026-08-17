import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAnalysis } from "../hooks/useAnalysis";
import { ChatInterface } from "../components/ui/ChatInterface";
import "./aichat.css";

export const Route = createFileRoute("/aichat")({
  component: OrionixDemo,
});

function OrionixDemo() {
  const {
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
    handleFile,
    handleSecondFile,
    handleReset,
    restoreSession,
    runAnalysis,
    askInsight,
    insightLoading,
    abortRequest,
    coordinates,
    setCoordinates,
    bbox,
    setBbox,
    setMode,
    demoMode,
    setDemoMode,
    ingestBhuvanScene
  } = useAnalysis();

  const [chatInput, setChatInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);

  // handleSubmit moved to ChatInterface for better tab integration

  const handleResetChat = () => {
    handleReset();
    setChatInput("");
    setShowHistory(false);
  };

  return (
    <div className="cb-root" style={{ paddingTop: '80px' }}>
      <div id="stars"></div>

      <nav className="orionix-nav">
        <div className="orionix-logo">
          <div className="orionix-dot" style={{ background: demoMode ? "#ff9d00" : "#00e5c8", boxShadow: demoMode ? "0 0 12px #ff9d00" : "0 0 12px #00e5c8" }} />
          Orionix
          <span className="orionix-live" style={{ color: demoMode ? "#ff9d00" : "#00e5c8" }}>
            {demoMode ? "● DEMO MODE" : "● LIVE"}
          </span>
        </div>
        <ul className="orionix-links" style={{ display: 'flex', alignItems: 'center', gap: '16px', listStyle: 'none', margin: 0, padding: 0 }}>
          <li><Link to="/">Home</Link></li>
          <li>
            <button 
              onClick={() => setIsArchModalOpen(true)}
              style={{ background: 'none', border: 'none', color: '#f0edff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
            >
              Architecture
            </button>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
            <label style={{ fontSize: '11px', color: '#a09cb4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                type="checkbox" 
                checked={demoMode} 
                onChange={(e) => setDemoMode(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Demo Mode
            </label>
          </li>
        </ul>
        <div className="orionix-tag">SIH25170</div>
      </nav>

      <div className="cb-layout">
        {/* MAIN AREA */}
        <main className="cb-main">

          {showHistory ? (
            <div className="cb-history-view">
              <h2 className="cb-history-title">Session History</h2>
              {sessions.length === 0 ? (
                <div className="cb-history-empty">No past sessions found.</div>
              ) : (
                <div className="cb-history-list">
                  {sessions.map(s => (
                    <div key={s.id} className="cb-history-card" onClick={() => { restoreSession(s); setShowHistory(false); }}>
                      {s.previewUrl && <img src={s.previewUrl} alt="Thumbnail" className="cb-history-thumb" />}
                      <div className="cb-history-info">
                        <div className="cb-history-date">{s.date.toLocaleString()}</div>
                        <div className="cb-history-desc">
                          {s.result?.insight?.slice(0, 60) || s.messages[0]?.text?.slice(0, 60) || "Unfinished Session"}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {error && (
                <div style={{ padding: '0 24px' }}>
                  <div className="cb-input-error">{error}</div>
                </div>
              )}

              <ChatInterface
                messages={messages}
                status={status}
                stageIndex={stageIndex}
                result={result}
                file={file}
                previewUrl={previewUrl}
                secondFile={secondFile}
                secondPreviewUrl={secondPreviewUrl}
                mode={mode}
                setMode={setMode}
                chatInput={chatInput}
                setChatInput={setChatInput}
                runAnalysis={runAnalysis}
                handleFile={handleFile}
                handleSecondFile={handleSecondFile}
                isStreaming={isStreaming}
                abortRequest={abortRequest}
                showHistory={showHistory}
                askInsight={askInsight}
                insightLoading={insightLoading}
                handleResetChat={handleResetChat}
                coordinates={coordinates}
                setCoordinates={setCoordinates}
                bbox={bbox}
                setBbox={setBbox}
                ingestBhuvanScene={ingestBhuvanScene}
              />
            </>
          )}
        </main>
      </div>

      {isArchModalOpen && (
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
          onClick={() => setIsArchModalOpen(false)}
        >
          <div 
            style={{
              background: '#0d0d24',
              border: '1px solid rgba(120, 100, 255, 0.3)',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              padding: '28px',
              position: 'relative',
              boxShadow: '0 0 40px rgba(108, 71, 255, 0.25)',
              fontFamily: "Space Grotesk, sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsArchModalOpen(false)}
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
              System Architecture
            </h2>
            <h1 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>
              The Vision-Reasoning Bridge
            </h1>
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#d2cffd', margin: '0 0 20px 0', textAlign: 'justify' }}>
              GPT-OSS is a text-only reasoning model with no native vision capability. Orionix bridges this gap by running 
              <strong> RemoteCLIP</strong> as a vision front-end, converting zero-shot land-cover classifications and calculated 
              spectral metrics (NDVI proxy, urban density, waterlogging index) into structured text via 
              <code> prompt_builder.py</code>. This structured context is then passed to <strong>GPT-OSS</strong> for natural-language 
              reasoning, hazard assessment, and professional report generation. This effectively gives GPT-OSS high-fidelity multimodal 
              vision capabilities without retraining or fine-tuning the model.
            </p>
            <div 
              style={{
                background: '#11112e',
                border: '1px solid rgba(120, 100, 255, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#a09cb4',
                lineHeight: '1.5'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#00e5c8', fontWeight: 'bold' }}>[INPUT] Satellite Imagery</span>
                <span>(Bhuvan GeoTIFF / Upload)</span>
              </div>
              <div style={{ textAlign: 'center', color: '#6c47ff', margin: '4px 0' }}>↓</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>[VISION] RemoteCLIP ViT-L-14</span>
                <span>(Zero-Shot Classification)</span>
              </div>
              <div style={{ textAlign: 'center', color: '#6c47ff', margin: '4px 0' }}>↓</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fda4af', fontWeight: 'bold' }}>[BRIDGE] Telemetry Extraction</span>
                <span>(NDVI / Urban / OpenCV Water)</span>
              </div>
              <div style={{ textAlign: 'center', color: '#6c47ff', margin: '4px 0' }}>↓</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#ffffff', fontWeight: 'bold' }}>[REASONING] GPT-OSS</span>
                <span>(Constrained Synthesis)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
