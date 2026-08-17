import React from "react";

interface FloodSeverityBadgeProps {
  riskLabel: "Low" | "Moderate" | "High" | "Severe" | string;
  riskScore: number;
  externalAdvisoryMatch?: boolean;
  waterCoveragePercent?: number;
}

export function FloodSeverityBadge({
  riskLabel,
  riskScore,
  externalAdvisoryMatch,
  waterCoveragePercent,
}: FloodSeverityBadgeProps) {
  const label = riskLabel.trim().toLowerCase();
  
  let badgeStyle: React.CSSProperties = {};

  if (label === "low") {
    badgeStyle = {
      color: "#00e5a0",
      backgroundColor: "#00e5a026",
      border: "1px solid #00e5a04d",
    };
  } else if (label === "moderate") {
    badgeStyle = {
      color: "#fbbf24", // amber-400
      backgroundColor: "#fbbf2426",
      border: "1px solid #fbbf244d",
    };
  } else if (label === "high") {
    badgeStyle = {
      color: "#f97316", // orange-500
      backgroundColor: "#f9731626",
      border: "1px solid #f973164d",
    };
  } else if (label === "severe") {
    badgeStyle = {
      color: "#ff4e6a",
      backgroundColor: "#ff4e6a26",
      border: "1px solid #ff4e6a4d",
    };
  } else {
    badgeStyle = {
      color: "#38bdf8",
      backgroundColor: "#38bdf826",
      border: "1px solid #38bdf84d",
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        {/* Pill Badge */}
        <div
          style={{
            borderRadius: "9999px",
            padding: "6px 14px",
            fontFamily: "Space Mono, monospace",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            width: "fit-content",
            ...badgeStyle,
          }}
        >
          {riskLabel} Risk
        </div>

        {/* Subtitle / Risk Score */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.68rem", color: "#f8fafc8c", textTransform: "uppercase", fontFamily: "Space Mono, monospace", letterSpacing: "0.05em" }}>
            Flood Severity Score
          </span>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc", fontFamily: "Space Mono, monospace" }}>
            {riskScore.toFixed(1)} / 100
          </span>
        </div>
      </div>

      {/* External Advisory Line */}
      {externalAdvisoryMatch && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "#ff4e6a", // muted red matching the theme's danger color
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontFamily: "system-ui, sans-serif",
            marginTop: "2px",
          }}
        >
          ⚠ Matches active GDACS advisory
        </div>
      )}

      {/* Thin Progress Bar-style fill */}
      {waterCoveragePercent !== undefined && waterCoveragePercent !== null && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", maxWidth: "250px", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.68rem", color: "#f8fafc8c", textTransform: "uppercase", fontFamily: "Space Mono, monospace" }}>
              Water Coverage Fill
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "4px",
              backgroundColor: "#ffffff1a",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(waterCoveragePercent, 100)}%`,
                height: "100%",
                backgroundColor: "#00e5c8", // Cyan/aurora color matching the theme
                borderRadius: "2px",
                transition: "width 0.4s ease-out",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
