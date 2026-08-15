import React from "react";

export interface TimeSeriesDataPoint {
  date: string;
  filename: string;
  vegetation_index_score: number;
  water_coverage_percent: number;
  urban_density_percent: number;
}

export interface TimeSeriesResponse {
  status: string;
  point_count: number;
  data_points: TimeSeriesDataPoint[];
  overall_summary: {
    date_range: string;
    vegetation_delta: number;
    vegetation_trend: string;
    water_coverage_delta: number;
    water_trend: string;
    urban_density_delta: number;
    urban_trend: string;
  };
}

interface RiskTimelineProps {
  data: TimeSeriesResponse | null;
  isLoading?: boolean;
  error?: string | null;
}

export const RiskTimeline: React.FC<RiskTimelineProps> = ({
  data,
  isLoading,
  error
}) => {
  if (isLoading) {
    return (
      <div style={{
        background: 'rgba(13, 13, 36, 0.6)',
        border: '1px solid rgba(120, 100, 255, 0.25)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '140px',
        fontFamily: "'Space Grotesk', sans-serif"
      }}>
        <div style={{ color: '#818cf8', fontSize: '13px' }}>⏳ Loading time-series timeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'rgba(127, 29, 29, 0.2)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '20px',
        fontFamily: "'Space Grotesk', sans-serif"
      }}>
        <div style={{ color: '#fca5a5', fontSize: '13px' }}>⚠️ {error}</div>
      </div>
    );
  }

  if (!data || !data.data_points || data.data_points.length === 0) {
    return null;
  }

  const getRiskContext = (pt: TimeSeriesDataPoint) => {
    // Determine risk based on water coverage (as an example of hazard)
    if (pt.water_coverage_percent > 30) return { risk: "Severe", color: "#fda4af" };
    if (pt.water_coverage_percent > 15) return { risk: "High", color: "#ff9d00" };
    return { risk: "Stable", color: "#00e5c8" };
  };

  const getRiskShadow = (color: string) => `0 0 12px ${color}`;

  const points = data.data_points;

  return (
    <div style={{
      background: 'rgba(13, 13, 36, 0.6)',
      border: '1px solid rgba(120, 100, 255, 0.25)',
      borderRadius: '16px',
      padding: '20px 24px',
      marginBottom: '20px',
      boxShadow: '0 4px 25px rgba(0, 0, 0, 0.4)',
      fontFamily: "'Space Grotesk', sans-serif",
      overflowX: 'auto'
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
        <span style={{ fontSize: '10px', color: '#8b8ba8', fontFamily: 'monospace' }}>
          ℹ️ Derived from {points.length} consecutive satellite captures
        </span>
      </div>

      <div style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '30px 10px 10px 10px',
        margin: '0 10px',
        minWidth: `${Math.max(100, points.length * 150)}px`
      }}>
        {/* Horizontal connecting line */}
        <div style={{
          position: 'absolute',
          left: '5%',
          right: '5%',
          height: '2px',
          background: 'linear-gradient(90deg, #00e5c8 0%, #6c47ff 50%, #fda4af 100%)',
          zIndex: 1
        }} />

        {points.map((p, idx) => {
          const { risk, color } = getRiskContext(p);
          return (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 2,
              flex: 1,
              textAlign: 'center'
            }}>
              {/* Glowing Node circle */}
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: color,
                boxShadow: getRiskShadow(color),
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
                Capture {idx + 1}
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
                {risk} ({p.water_coverage_percent}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
