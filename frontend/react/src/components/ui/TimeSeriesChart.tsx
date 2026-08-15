import React, { useMemo } from "react";

interface DataPoint {
  date: string;
  vegetation_index_score: number;
  water_coverage_percent: number;
  urban_density_percent: number;
}

interface TimeSeriesChartProps {
  dataPoints: DataPoint[];
  overallSummary?: {
    date_range: string;
    vegetation_delta: number;
    vegetation_trend: string;
    water_coverage_delta: number;
    water_trend: string;
    urban_density_delta: number;
    urban_trend: string;
  };
}

const SERIES = [
  { key: "vegetation_index_score" as const, label: "Vegetation (NDVI proxy)", color: "#10b981", dasharray: "" },
  { key: "water_coverage_percent" as const, label: "Water Coverage %", color: "#0ea5e9", dasharray: "6,3" },
  { key: "urban_density_percent" as const, label: "Urban Density %", color: "#a855f7", dasharray: "2,3" },
];

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ dataPoints, overallSummary }) => {
  const chartW = 600;
  const chartH = 220;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 50;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const { yMin, yMax, xPositions, yScale } = useMemo(() => {
    let allValues: number[] = [];
    for (const p of dataPoints) {
      allValues.push(p.vegetation_index_score, p.water_coverage_percent, p.urban_density_percent);
    }
    const mn = Math.max(0, Math.floor(Math.min(...allValues) - 5));
    const mx = Math.min(100, Math.ceil(Math.max(...allValues) + 5));
    const n = dataPoints.length;
    const xs = dataPoints.map((_, i) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2));
    const scale = (v: number) => padT + plotH - ((v - mn) / (mx - mn || 1)) * plotH;
    return { yMin: mn, yMax: mx, xPositions: xs, yScale: scale };
  }, [dataPoints]);

  const gridLines = useMemo(() => {
    const lines: number[] = [];
    const step = Math.max(5, Math.round((yMax - yMin) / 4));
    for (let v = yMin; v <= yMax; v += step) lines.push(v);
    if (!lines.includes(yMax)) lines.push(yMax);
    return lines;
  }, [yMin, yMax]);

  const getTrendColor = (trend: string) => {
    const t = trend.toLowerCase();
    if (t.includes("critical") || t.includes("rapid") || t.includes("rising")) return "#fda4af";
    if (t.includes("declining") || t.includes("moderate")) return "#ff9d00";
    return "#00e5c8";
  };

  return (
    <div style={{
      background: 'rgba(13, 13, 36, 0.6)',
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
        📊 Multi-Point Time-Series Environmental Trends
      </h3>
      {overallSummary && (
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#8b8ba8' }}>
          Range: {overallSummary.date_range}
        </p>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {SERIES.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#a09cb4' }}>
            <div style={{ width: '16px', height: '3px', background: s.color, borderRadius: '2px' }} />
            {s.label}
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        style={{ width: '100%', maxWidth: `${chartW}px`, height: 'auto' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {gridLines.map((v) => (
          <g key={v}>
            <line
              x1={padL} y1={yScale(v)} x2={chartW - padR} y2={yScale(v)}
              stroke="rgba(120, 100, 255, 0.1)" strokeWidth="1"
            />
            <text
              x={padL - 6} y={yScale(v) + 4}
              fill="#64748b" fontSize="9" textAnchor="end"
              fontFamily="'Space Mono', monospace"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Date labels on X axis */}
        {dataPoints.map((p, i) => (
          <text
            key={i}
            x={xPositions[i]} y={chartH - padB + 16}
            fill="#8b8ba8" fontSize="9" textAnchor="middle"
            fontFamily="'Space Mono', monospace"
          >
            {p.date.slice(5)}
          </text>
        ))}

        {/* Series lines + dots */}
        {SERIES.map((s) => {
          const points = dataPoints.map((p, i) => `${xPositions[i]},${yScale(p[s.key])}`);
          return (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeDasharray={s.dasharray}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points.join(" ")}
              />
              {dataPoints.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={xPositions[i]} cy={yScale(p[s.key])}
                    r="4" fill="#0d0d24" stroke={s.color} strokeWidth="2"
                  />
                  <title>{`${s.label}: ${p[s.key]}  (${p.date})`}</title>
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      {/* Trend Summary Cards */}
      {overallSummary && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          {[
            { label: "Vegetation", delta: overallSummary.vegetation_delta, trend: overallSummary.vegetation_trend, color: "#10b981", unit: "pts", invert: true },
            { label: "Water", delta: overallSummary.water_coverage_delta, trend: overallSummary.water_trend, color: "#0ea5e9", unit: "%", invert: false },
            { label: "Urban", delta: overallSummary.urban_density_delta, trend: overallSummary.urban_trend, color: "#a855f7", unit: "%", invert: false },
          ].map((m) => (
            <div key={m.label} style={{
              flex: 1,
              minWidth: '140px',
              background: '#090918',
              border: '1px solid rgba(120, 100, 255, 0.12)',
              borderRadius: '10px',
              padding: '12px 14px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Space Mono', monospace", marginBottom: '6px' }}>
                {m.label}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: m.color }}>
                {m.delta > 0 ? (m.invert ? "↓" : "↑") : m.delta < 0 ? (m.invert ? "↑" : "↓") : "—"} {Math.abs(m.delta).toFixed(1)}{m.unit}
              </div>
              <div style={{
                fontSize: '11px',
                color: getTrendColor(m.trend),
                marginTop: '4px',
                fontWeight: 'bold'
              }}>
                {m.trend}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
