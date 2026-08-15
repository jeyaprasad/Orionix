import React, { memo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { AnalysisResult } from "../../hooks/useAnalysis";
import { FloodSeverityBadge } from "./FloodSeverityBadge";
import { RiskTimeline } from "./RiskTimeline";

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="cb-input-error" role="alert" style={{ marginTop: '20px' }}>
      <p>Something went wrong rendering the analysis results:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
      <button className="cb-attach-btn" onClick={resetErrorBoundary} style={{ marginTop: '10px' }}>Try again</button>
    </div>
  );
}

interface AnalysisResultsProps {
  result: AnalysisResult;
  setChatInput: (q: string) => void;
  insightLoading: boolean;
}

export const AnalysisResults = memo(({ result, setChatInput, insightLoading }: AnalysisResultsProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  // Early Warning Alert Dispatcher state variables
  const [contact, setContact] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setIsSubscribing(true);
    setSubscriptionStatus(null);
    try {
      const res = await fetch(`http://localhost:8000/api/alert/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: result.latitude || 0.0,
          longitude: result.longitude || 0.0,
          contact: contact,
          alert_type: "flood"
        })
      });
      if (!res.ok) throw new Error("Subscription failed");
      const data = await res.json();
      setSubscriptionStatus(`Successfully subscribed ${contact} for this coordinate grid!`);
      setContact("");
    } catch (err: any) {
      setSubscriptionStatus(`Error: ${err.message || "Failed to subscribe"}`);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSimulateCheck = async () => {
    setIsChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(`http://localhost:8000/api/alert/simulate-check`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();
      setCheckResult(data);
    } catch (err: any) {
      setCheckResult({ error: err.message });
    } finally {
      setIsChecking(false);
    }
  };

  const htmlContent = result.professional_report || "<p>No unified report available.</p>";

  // Derive RiskTimeline props
  const isCompareMode = result.deforestation_delta !== undefined || result.vegetation_delta !== undefined;
  
  const beforeRisk = isCompareMode ? "Stable" : "Low Risk";
  const beforeValue = isCompareMode 
    ? (result.vegetation_delta !== undefined ? `${(32.1 + result.vegetation_delta).toFixed(1)} NDVI` : "45.2 NDVI")
    : "No Hazard";
  const beforeDate = isCompareMode ? "Baseline Scene" : "Historical Base";

  const currentRisk = isCompareMode 
    ? (result.vegetation_trend || "Deteriorating")
    : (result.risk_level || result.flood_risk_label || "Low");
  const currentValue = isCompareMode 
    ? "32.1 NDVI"
    : (result.water_coverage_percent !== undefined ? `${result.water_coverage_percent.toFixed(1)}% Surface Water` : undefined);
  const currentDate = isCompareMode ? "Current Scene" : "Observed Scene";

  const forecastRisk = isCompareMode 
    ? (result.overall_risk_label || "Moderate")
    : (result.flood_risk_label || "Low");
  const forecastValue = isCompareMode 
    ? (result.overall_trend_risk !== undefined ? `${result.overall_trend_risk.toFixed(1)}/100 Risk` : "41.5/100 Risk")
    : (result.flood_risk_score !== undefined ? `${result.flood_risk_score.toFixed(0)}/100 Hazard` : undefined);
  const forecastReason = isCompareMode 
    ? "Canopy loss trajectory indicates continuing degradation risk"
    : (result.flood_risk_reasoning || "Surface water is stable; no high rainfall warnings.");

  const downloadReport = async () => {
    setIsDownloading(true);
    try {
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Orionix_Geospatial_Intelligence_Report_${new Date().toISOString().replace(/[:.]/g, "-")}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Report Download error", err);
      alert("Failed to download HTML report");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {isFullscreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0f1115',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem', fontFamily: 'Space Mono, monospace' }}>Orionix Unified Report</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="cb-attach-btn"
                onClick={downloadReport}
                disabled={isDownloading}
                style={{ height: '36px' }}
              >
                {isDownloading ? "Generating..." : "📄 Download HTML"}
              </button>
              <button
                className="cb-attach-btn"
                style={{ background: '#7f1d1d', borderColor: '#ef4444', color: '#fca5a5', height: '36px' }}
                onClick={() => setIsFullscreen(false)}
              >
                ✕ Close Fullscreen
              </button>
            </div>
          </div>
          <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
            <iframe
              srcDoc={htmlContent}
              style={{ width: '100%', height: '100%', border: 'none', background: '#0f1115' }}
              title="Unified HTML Report Fullscreen"
            />
          </div>
        </div>
      )}

      <div className="cb-report-card orionix-reveal orionix-in" style={{ padding: "10px", width: "100%", maxWidth: "1200px", margin: "0 auto" }}>

        {/* Request Provenance Banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          marginBottom: '14px',
          borderRadius: '8px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          fontFamily: "'Space Mono', monospace",
          fontSize: '11px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ color: '#a5b4fc' }}>
            📋 Source: <strong style={{ color: '#ffffff' }}>{result.input_source || "Manual Upload"}</strong>
          </span>
          <span style={{ color: '#64748b' }}>
            Request ID: <code style={{ color: '#818cf8' }}>{result.request_id || "demo-" + Date.now().toString(36)}</code>
          </span>
        </div>

        {/* Dynamic Risk Trajectory Timeline */}
        <RiskTimeline
          beforeRisk={beforeRisk}
          beforeValue={beforeValue}
          beforeDate={beforeDate}
          currentRisk={currentRisk}
          currentValue={currentValue}
          currentDate={currentDate}
          forecastRisk={forecastRisk}
          forecastValue={forecastValue}
          forecastReason={forecastReason}
        />

        {result.flood_risk_label && (
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '14px' }}>
            <FloodSeverityBadge
              riskLabel={result.flood_risk_label}
              riskScore={result.flood_risk_score ?? 0}
              externalAdvisoryMatch={result.external_advisory_match}
              waterCoveragePercent={result.water_coverage_percent}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '10px' }}>
          <button
            className="cb-attach-btn"
            onClick={() => setIsFullscreen(true)}
            style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🔍 Toggle Fullscreen
          </button>
          <button
            className="cb-attach-btn"
            onClick={downloadReport}
            disabled={isDownloading}
            style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isDownloading ? "Generating..." : "📄 Download Report (HTML)"}
          </button>
        </div>

        <div style={{ width: '100%', height: '800px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #334155' }}>
          <iframe
            srcDoc={htmlContent}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Unified HTML Report"
          />
        </div>

        {/* Collapsible Reasoning Trace Panel */}
        {result.reasoning_trace && (
          <div style={{ marginTop: '20px', border: '1px solid rgba(0, 229, 200, 0.25)', borderRadius: '12px', background: 'rgba(13, 13, 36, 0.7)', overflow: 'hidden' }}>
            <button 
              onClick={() => setShowReasoning(!showReasoning)}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'rgba(13, 13, 36, 0.9)',
                border: 'none',
                color: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: "'Space Mono', monospace",
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.05em'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧠 GPT-OSS Harmony Chain-of-Thought Reasoning Trace
              </span>
              <span style={{ transition: 'transform 0.2s', transform: showReasoning ? 'rotate(180deg)' : 'rotate(0deg)', color: '#00e5c8' }}>
                {showReasoning ? "▲ Hide Trace" : "▼ Show Trace"}
              </span>
            </button>
            {showReasoning && (
              <div 
                style={{ 
                  padding: '20px', 
                  borderTop: '1px solid rgba(0, 229, 200, 0.15)', 
                  color: '#d2cffd', 
                  fontSize: '12px', 
                  fontFamily: "'Space Mono', monospace", 
                  lineHeight: '1.6', 
                  whiteSpace: 'pre-wrap', 
                  maxHeight: '300px', 
                  overflowY: 'auto', 
                  background: '#090918',
                  textAlign: 'left'
                }}
              >
                {result.reasoning_trace}
              </div>
            )}
          </div>
        )}

        {/* Early Warning Alert Dispatcher Card */}
        <div style={{
          marginTop: '24px',
          border: '1px solid rgba(120, 100, 255, 0.2)',
          borderRadius: '16px',
          padding: '24px',
          background: 'rgba(13, 13, 36, 0.4)',
          fontFamily: "'Space Grotesk', sans-serif"
        }}>
          <h4 style={{
            margin: '0 0 6px 0',
            fontSize: '11px',
            color: '#fda4af',
            fontFamily: "'Space Mono', monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            🔔 Early Warning SMS / Email Dispatcher
          </h4>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#ffffff' }}>
            Monitor and Alert Local Grid
          </h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#a09cb4', lineHeight: '1.4' }}>
            Subscribe local emergency coordinators to receive automatic SMS alerts if risk thresholds crossing into 
            <strong> High / Severe</strong> are detected at coordinate grid <strong>({result.latitude?.toFixed(4) ?? "0.0000"}, {result.longitude?.toFixed(4) ?? "0.0000"})</strong>.
          </p>

          <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Enter mobile number or email address..." 
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                background: '#0d0d24',
                border: '1px solid rgba(120, 100, 255, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#ffffff',
                fontFamily: 'inherit',
                fontSize: '13px'
              }}
            />
            <button 
              type="submit" 
              disabled={isSubscribing || !contact.trim()}
              style={{
                background: '#6c47ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                fontSize: '13px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#8b5cf6'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#6c47ff'}
            >
              {isSubscribing ? "Registering..." : "Subscribe"}
            </button>
          </form>

          {subscriptionStatus && (
            <div style={{
              fontSize: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '16px',
              background: subscriptionStatus.startsWith("Error") ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 229, 200, 0.1)',
              border: subscriptionStatus.startsWith("Error") ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(0, 229, 200, 0.3)',
              color: subscriptionStatus.startsWith("Error") ? '#fca5a5' : '#00e5c8'
            }}>
              {subscriptionStatus}
            </div>
          )}

          <div style={{
            borderTop: '1px solid rgba(120, 100, 255, 0.15)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <button 
                type="button"
                onClick={handleSimulateCheck}
                disabled={isChecking}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(0, 229, 200, 0.4)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#00e5c8',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 229, 200, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {isChecking ? "Simulating daily checks..." : "⚡ Simulate Daily Risk Check"}
              </button>
              <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                * Alert delivery not wired to a real SMS/email provider in this demo — architecture ready for Twilio/SES integration.
              </span>
            </div>

            {checkResult && (
              <div style={{
                background: '#090918',
                border: '1px solid rgba(120, 100, 255, 0.15)',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '11px',
                maxHeight: '200px',
                overflowY: 'auto',
                color: '#a09cb4'
              }}>
                <div style={{ color: '#00e5c8', fontWeight: 'bold', marginBottom: '8px' }}>
                  [System Cron Simulation Log] - Running Scheduled Checks:
                </div>
                {checkResult.checked_count === 0 ? (
                  <div>No active subscriptions registered in this session. Register a contact above first.</div>
                ) : (
                  <div>
                    {checkResult.results.map((res: any, idx: number) => (
                      <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < checkResult.results.length - 1 ? '1px solid rgba(120, 100, 255, 0.08)' : 'none' }}>
                        <div>• Active Location: ({res.location.lat.toFixed(4)}, {res.location.lng.toFixed(4)}) ➔ Subscribed: {res.contact}</div>
                        <div>  Current Risk Level: <span style={{ color: res.alert_sent ? '#fda4af' : '#00e5c8', fontWeight: 'bold' }}>{res.risk_label} ({res.risk_score}/100)</span></div>
                        <div>  Reasoning: {res.reasoning}</div>
                        <div style={{ color: res.alert_sent ? '#fda4af' : '#a09cb4', fontWeight: 'bold', marginTop: '4px' }}>
                          {res.alert_sent 
                            ? `📢 DISPATCHED: "ALERT! High hazard risk detected at coordinates. Status: ${res.reasoning}"`
                            : `💤 STANDBY: Risk remains below alert threshold. No dispatch needed.`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* QUICK AI QUESTIONS */}
        <div className="dashboard-section" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <h4 className="cb-section-title" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: '0 0 12px', fontFamily: 'Space Mono, monospace' }}>💬 Quick AI Questions</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {[
              { label: "🌱 Explain the environment", q: "Explain the environment" },
              { label: "🏗 Analyze infrastructure", q: "Analyze infrastructure" },
              { label: "⚠ Assess possible risks", q: "Assess possible risks" },
              { label: "📈 Future land use", q: "Future land use" },
              { label: "🧠 Explain like I'm 10", q: "Explain like I'm 10" }
            ].map((btn, idx) => (
              <button
                key={idx}
                className="cb-attach-btn"
                disabled={insightLoading}
                onClick={() => {
                  setChatInput(btn.q);
                  document.getElementById("chat-input-textarea")?.focus();
                }}
                style={{ fontSize: '13px', padding: '8px 16px', height: 'auto', display: 'flex', alignItems: 'center' }}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {insightLoading && (
            <div className="cb-insight-loading" style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="cb-dot small pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--aurora)' }} /> Generating Insight...
            </div>
          )}
        </div>

      </div>
    </ErrorBoundary>
  );
});

AnalysisResults.displayName = "AnalysisResults";
