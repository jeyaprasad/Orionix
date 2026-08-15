import React from "react";

interface RiskTimelineProps {
  beforeRisk: string;
  beforeValue?: string | number;
  beforeDate?: string;
  
  currentRisk: string;
  currentValue?: string | number;
  currentDate?: string;
  
  forecastRisk: string;
  forecastValue?: string | number;
  forecastDate?: string;
  forecastReason?: string;
}

export const RiskTimeline: React.FC<RiskTimelineProps> = ({
  beforeRisk,
  beforeValue,
  beforeDate = "Baseline / Past",
  currentRisk,
  currentValue,
  currentDate = "Current / Observation",
  forecastRisk,
  forecastValue,
  forecastDate = "Forecast / Early-Warning",
  forecastReason
}) => {
  const getRiskColor = (risk: string) => {
    const r = risk.toLowerCase();
    if (r.includes("high") || r.includes("severe") || r.includes("deteriorating")) return "#fda4af"; // light red
    if (r.includes("mod") || r.includes("med") || r.includes("stable") || r.includes("declin")) return "#ff9d00"; // orange
    return "#00e5c8"; // emerald/aurora
  };

  const getRiskShadow = (risk: string) => {
    const color = getRiskColor(risk);
    return `0 0 12px ${color}`;
  };

  const points = [
    { label: "Past Context", date: beforeDate, risk: beforeRisk, value: beforeValue },
    { label: "Present Observation", date: currentDate, risk: currentRisk, value: currentValue },
    { label: "Early-Warning Forecast", date: forecastDate, risk: forecastRisk, value: forecastValue }
  ];

  return (
    <div style={{
      background: 'rgba(13, 13, 36, 0.6)',
      border: '1px solid rgba(120, 100, 255, 0.25)',
      borderRadius: '16px',
      padding: '20px 24px',
      marginBottom: '20px',
      boxShadow: '0 4px 25px rgba(0, 0, 0, 0.4)',
      fontFamily: "'Space Grotesk', sans-serif"
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{
          margin: 0,
          fontSize: '11px',
          color: '#00e5c8',
          fontFamily: "'Space Mono', monospace",
          textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>
          📈 Dynamic Risk & Hazard Trajectory Timeline
        </h3>
        {forecastReason && (
          <span style={{ fontSize: '10px', color: '#8b8ba8', fontFamily: 'monospace' }}>
            ℹ️ {forecastReason}
          </span>
        )}
      </div>

      <div style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '30px 10px 10px 10px',
        margin: '0 10px'
      }}>
        {/* Horizontal connecting line */}
        <div style={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          height: '2px',
          background: 'linear-gradient(90deg, #00e5c8 0%, #6c47ff 50%, #fda4af 100%)',
          zIndex: 1
        }} />

        {points.map((p, idx) => {
          const color = getRiskColor(p.risk);
          return (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 2,
              width: '30%',
              textAlign: 'center'
            }}>
              {/* Glowing Node circle */}
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: color,
                boxShadow: getRiskShadow(p.risk),
                border: '3px solid #0d0d24',
                marginBottom: '12px',
                transition: 'all 0.3s ease'
              }} />

              {/* Title / Description */}
              <span style={{
                fontSize: '10px',
                color: '#8b8ba8',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {p.label}
              </span>

              {/* Date / Metadata */}
              <span style={{
                fontSize: '12px',
                color: '#ffffff',
                fontWeight: 500,
                marginTop: '4px'
              }}>
                {p.date}
              </span>

              {/* Risk Level Badge */}
              <span style={{
                fontSize: '11px',
                color: color,
                background: `${color}15`,
                border: `1px solid ${color}33`,
                borderRadius: '12px',
                padding: '2px 8px',
                marginTop: '8px',
                fontWeight: 'bold',
                display: 'inline-block'
              }}>
                {p.risk} {p.value ? `(${p.value})` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
