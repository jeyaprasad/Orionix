import json
import datetime
from typing import Any, Dict

class HTMLRenderer:
    """
    Renders professional, table-based geospatial intelligence briefs.
    This HTML structure is fully compatible with xhtml2pdf for PDF generation:
      - Uses only hex colors and basic HTML tables for layout (no flexbox/grid/CSS vars).
      - Renders mini table cells for progress bars to bypass xhtml2pdf div clipping bugs.
      - Displays dynamic coordinates, weather correlation alerts, temporal deltas,
        and AI-driven insights in a structured, clean executive brief format.
    """
    
    def render(self, analysis: Any, claude_json: Any = None, image_base64: str = None) -> str:
        now_utc = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Defensive check for call pattern from pdf_generator.py:
        # html_renderer.render(analysis, image_base64)
        if isinstance(claude_json, str) and image_base64 is None:
            image_base64 = claude_json
            claude_json = None
            
        if image_base64 and not image_base64.startswith("data:"):
            # Assume JPEG default for raw base64 data
            image_base64 = f"data:image/jpeg;base64,{image_base64}"
            
        # Convert analysis to dictionary if it is a Pydantic model
        if hasattr(analysis, "dict"):
            analysis_dict = analysis.dict()
        elif isinstance(analysis, dict):
            analysis_dict = analysis
        else:
            analysis_dict = {}

        # 1. Extract core semantics
        dominant_cover = analysis_dict.get('dominant_land_cover', 'N/A')
        secondary_cover = analysis_dict.get('secondary_land_cover') or 'None'
        confidence = analysis_dict.get('confidence', 'N/A')
        risk_level = analysis_dict.get('risk_level') or 'Low'
        
        # 2. Derive unique report ID
        report_id = f"ORX-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d')}-{abs(hash(dominant_cover)) % 10000:04d}"

        # 3. Fallback structures for safety
        fallback_json = {
            "executive_dashboard": {
                "overall_status": "Monitored",
                "risk_level": risk_level,
                "scene_type": "Natural"
            },
            "environmental_assessment": {
                "vegetation": "Unknown",
                "urban_density": "Unknown",
                "water_presence": "Unknown",
                "industrial_activity": "Unknown",
                "environmental_risk": "Unknown"
            },
            "key_findings": [
                f"Primary land cover classified as {dominant_cover} with {confidence} confidence.",
                f"Secondary structures indicate {secondary_cover} mix." if secondary_cover and secondary_cover != "None" else "No dominant secondary structures detected.",
                "Stable terrain conditions observed under current geospatial telemetry."
            ],
            "recommendations": [
                "Establish periodic observation schedules to monitor changes.",
                "Verify vegetation index adjustments over the next satellite pass."
            ]
        }

        # Resolve final report JSON
        if isinstance(claude_json, dict):
            ed = {**fallback_json["executive_dashboard"], **claude_json.get("executive_dashboard", {})}
            ea = {**fallback_json["environmental_assessment"], **claude_json.get("environmental_assessment", {})}
            findings = claude_json.get("key_findings", fallback_json["key_findings"])
            recs = claude_json.get("recommendations", fallback_json["recommendations"])
        else:
            ed = fallback_json["executive_dashboard"]
            ea = fallback_json["environmental_assessment"]
            findings = fallback_json["key_findings"]
            recs = fallback_json["recommendations"]

        overall_status = ed.get("overall_status", "Stable")
        risk_level = ed.get('risk_level', risk_level)
        
        # Map risk accent colors (strictly hex values for xhtml2pdf compatibility)
        risk_lower = str(risk_level).lower()
        if 'severe' in risk_lower or 'high' in risk_lower:
            risk_accent_color = '#ff3366'  # Pink/Red
            risk_bg_color = '#2d141e'
        elif 'mod' in risk_lower or 'medium' in risk_lower or 'amber' in risk_lower:
            risk_accent_color = '#ff9d00'  # Amber
            risk_bg_color = '#2d2214'
        else:
            risk_accent_color = '#39d353'  # Emerald Green
            risk_bg_color = '#142d1a'

        # Prose formatter
        findings_prose = " ".join([f.strip() for f in findings])
        recs_prose = " ".join([r.strip() for r in recs])

        # 4. Resolve Location & Weather Correlation Alerts
        lat = analysis_dict.get("latitude")
        lng = analysis_dict.get("longitude")
        bbox_val = analysis_dict.get("bbox")
        advisory_match = analysis_dict.get("external_advisory_match")
        flood_reasoning = analysis_dict.get("flood_risk_reasoning")

        location_text = "N/A"
        if lat is not None and lng is not None:
            lat_dir = "N" if lat >= 0 else "S"
            lng_dir = "E" if lng >= 0 else "W"
            location_text = f"{abs(lat):.4f}° {lat_dir}, {abs(lng):.4f}° {lng_dir}"
        elif bbox_val and len(bbox_val) == 4:
            min_lat, min_lng, max_lat, max_lng = bbox_val
            min_lat_dir = "N" if min_lat >= 0 else "S"
            min_lng_dir = "E" if min_lng >= 0 else "W"
            max_lat_dir = "N" if max_lat >= 0 else "S"
            max_lng_dir = "E" if max_lng >= 0 else "W"
            location_text = f"BBox: [{abs(min_lat):.3f}°{min_lat_dir}, {abs(min_lng):.3f}°{min_lng_dir}] to [{abs(max_lat):.3f}°{max_lat_dir}, {abs(max_lng):.3f}°{max_lng_dir}]"

        advisory_section = ""
        if advisory_match:
            advisory_section = (
                f'<div style="background-color: #2d141e; border-left: 3px solid #ff3366; '
                f'padding: 8px 12px; margin-top: 10px; font-size: 10px; color: #ffcaea; font-family: Courier, monospace;">'
                f'<strong>[ALERT] GDACS REGIONAL INUNDATION WARNING:</strong> Active satellite flood advisory detected for these coordinates.'
                f'</div>'
            )

        # 5. Extract Indicator values (0-100)
        # Vegetation index
        veg_score = analysis_dict.get('vegetation_health_score')
        if veg_score is None:
            for c in analysis_dict.get('classes', []):
                if c.get('label') in ['Forest', 'Vegetation', 'Agriculture']:
                    veg_score = c.get('pct')
                    break
        veg_score = float(veg_score or 0.0)

        # Urban density index
        urb_score = analysis_dict.get('urban_density_percent')
        if urb_score is None:
            for c in analysis_dict.get('classes', []):
                if c.get('label') in ['Residential', 'Industrial']:
                    urb_score = c.get('pct')
                    break
        urb_score = float(urb_score or 0.0)

        # Water coverage
        water_score = float(analysis_dict.get('water_coverage_percent') or 0.0)
        
        # Combined flood risk
        flood_score = float(analysis_dict.get('flood_risk_score') or 0.0)

        # 6. Build the Executive Summary Paragraph
        summary_sentence = analysis_dict.get('summary', '') or ''
        if summary_sentence and not summary_sentence.endswith('.'):
            summary_sentence += '.'
            
        gpt_analysis = analysis_dict.get('gpt_analysis') or ''
        gpt_paragraphs = [p.strip() for p in gpt_analysis.split('\n') if p.strip() and not p.strip().startswith('#')]
        
        if gpt_paragraphs:
            exec_summary_text = gpt_paragraphs[0]
        else:
            exec_summary_text = (
                f"Geospatial telemetry confirms a dominant {dominant_cover.lower()} landscape. "
                f"The overall classification is marked as {overall_status.lower()} with a {risk_level.lower()} risk profile. "
                f"{summary_sentence}"
            )
            
        # Append early warning weather correlation to executive summary if triggered
        if flood_reasoning and "Elevated risk:" in flood_reasoning:
            exec_summary_text += f" <strong>{flood_reasoning}</strong>"

        # 7. Render Temporal Trend Section (if comparative data exists)
        trend_html = ""
        # Check for comparison metrics in the analysis object
        veg_delta = analysis_dict.get('vegetation_delta') or analysis_dict.get('deforestation_delta')
        urb_delta = analysis_dict.get('urban_density_delta')
        water_delta = analysis_dict.get('water_coverage_delta')
        
        if veg_delta is not None or urb_delta is not None or water_delta is not None:
            veg_delta = float(veg_delta or 0.0)
            urb_delta = float(urb_delta or 0.0)
            water_delta = float(water_delta or 0.0)
            
            # Formulate trend visual assets
            veg_arrow, veg_lbl, veg_color = ("↓", "Declining", "#ff3366") if veg_delta > 0 else (("↑", "Improving", "#39d353") if veg_delta < 0 else ("→", "Stable", "#a09cb4"))
            urb_arrow, urb_lbl, urb_color = ("↑", "Sprawl", "#ff3366") if urb_delta > 5.0 else (("↓", "Improving", "#39d353") if urb_delta < -2.0 else ("→", "Stable", "#a09cb4"))
            water_arrow, water_lbl, water_color = ("↑", "Inundation", "#ff3366") if water_delta > 5.0 else (("↓", "Drying", "#ff3366") if water_delta < -5.0 else ("→", "Stable", "#a09cb4"))
            
            # Check for overall trend score
            overall_trend_score = analysis_dict.get('overall_trend_risk')
            overall_trend_lbl = analysis_dict.get('overall_risk_label') or "Low"
            
            overall_trend_row = ""
            if overall_trend_score is not None:
                trend_risk_color = "#ff3366" if overall_trend_lbl.lower() in ["high", "severe"] else ("#ff9d00" if overall_trend_lbl.lower() == "moderate" else "#39d353")
                overall_trend_row = f"""
                <tr style="background-color: #11112e;">
                    <td style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #ffffff;">Overall Cumulative Risk Score</td>
                    <td style="padding: 8px 12px; text-align: center; font-size: 10px; font-weight: bold; color: #ffffff;">{overall_trend_score:.1f} / 100.0</td>
                    <td style="padding: 8px 12px; text-align: center; font-size: 10px; font-weight: bold; color: {trend_risk_color};">{overall_trend_lbl}</td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 8px; font-weight: bold; color: #a09cb4;">HISTORICAL TREND</td>
                </tr>
                """
                
            trend_html = f"""
            <div class="section-title">Observed Temporal Change (Before vs. After)</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; background-color: #0c0c1e; border: 1px solid #22223a;">
                <thead>
                    <tr style="background-color: #11112e; border-bottom: 1px solid #22223a;">
                        <th style="padding: 6px 12px; text-align: left; font-family: monospace; font-size: 8px; color: #a09cb4; width: 35%;">MEASUREMENT INDICATOR</th>
                        <th style="padding: 6px 12px; text-align: center; font-family: monospace; font-size: 8px; color: #a09cb4; width: 25%;">HISTORICAL CHANGE</th>
                        <th style="padding: 6px 12px; text-align: center; font-family: monospace; font-size: 8px; color: #a09cb4; width: 20%;">TREND STATUS</th>
                        <th style="padding: 6px 12px; text-align: right; font-family: monospace; font-size: 8px; color: #a09cb4; width: 20%;">IMPACT</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #22223a;">
                        <td style="padding: 8px 12px; font-size: 10px; color: #ffffff;">Vegetation Canopy Coverage</td>
                        <td style="padding: 8px 12px; text-align: center; font-size: 10px; color: #ffffff;">{-veg_delta:+.1f}%</td>
                        <td style="padding: 8px 12px; text-align: center; font-size: 10px; color: {veg_color}; font-weight: bold;">{veg_arrow} {veg_lbl}</td>
                        <td style="padding: 8px 12px; text-align: right; font-size: 10px; color: {veg_color}; font-weight: bold;">{"CRITICAL" if veg_lbl == "Declining" else "STABLE"}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #22223a;">
                        <td style="padding: 8px 12px; font-size: 10px; color: #ffffff;">Built-up Urban Sprawl</td>
                        <td style="padding: 8px 12px; text-align: center; font-size: 10px; color: #ffffff;">{urb_delta:+.1f}%</td>
                        <td style="padding: 8px 12px; text-align: center; font-size: 10px; color: {urb_color}; font-weight: bold;">{urb_arrow} {urb_lbl}</td>
                        <td style="padding: 8px 12px; text-align: right; font-size: 10px; color: {urb_color}; font-weight: bold;">{"ALERT" if urb_lbl == "Sprawl" else "STABLE"}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #22223a;">
                        <td style="padding: 8px 12px; font-size: 10px; color: #ffffff;">Surface Water Exposure</td>
                        <td style="padding: 8px 12px; text-align: center; font-size: 10px; color: #ffffff;">{water_delta:+.1f}%</td>
                        <td style="padding: 8px 12px; text-align: center; font-size: 10px; color: {water_color}; font-weight: bold;">{water_arrow} {water_lbl}</td>
                        <td style="padding: 8px 12px; text-align: right; font-size: 10px; color: {water_color}; font-weight: bold;">{"HAZARD" if water_lbl in ["Inundation", "Drying"] else "STABLE"}</td>
                    </tr>
                    {overall_trend_row}
                </tbody>
            </table>
            """

        # 8. Render Takeaway sentence
        takeaway_sentence = (
            f"In summary, the telemetry classifies this location as a {dominant_cover.lower()} zone with a {risk_level.lower()} risk classification. "
            f"Continuous monitoring of indicators remains critical for early detection of rapid landscape transformations."
        )

        # 9. Clean image wrapper
        image_html = ""
        if image_base64:
            # Table cell containing preview image
            image_html = f"""
            <td style="width: 28%; text-align: right; vertical-align: top; padding-left: 10px;">
                <img src="{image_base64}" style="width: 160px; height: 160px; border: 2px solid #22223a;" alt="Scene Preview" />
            </td>
            """

        # 10. Assemble limitations list
        standard_limitations = [
            "Zero-shot semantic interpretation — no model fine-tuning on EO labels.",
            "No pixel-level segmentation or object boundary detection.",
            "Interpretation is based solely on image-text similarity and proxy RGB spectral analysis.",
            "Performance may degrade on atypical viewpoints, cloud cover, or low-resolution inputs."
        ]
        limitations_joined = " ".join(standard_limitations)

        # Compile final HTML template (strictly table-based structure for ReportLab compatibility)
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Orionix Geospatial Briefing</title>
    <style>
        @page {{
            size: A4;
            margin: 1.2cm;
            margin-bottom: 1.8cm;
        }}
        body {{
            font-family: Arial, Helvetica, sans-serif;
            background-color: #03030a;
            color: #f0edff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
        }}
        table {{
            border-collapse: collapse;
        }}
        .logo-text {{
            font-family: Courier, monospace;
            font-size: 14px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 2px;
        }}
        h1 {{
            font-size: 18px;
            font-weight: bold;
            color: #ffffff;
            margin: 0;
            padding: 0;
        }}
        h2 {{
            font-size: 10px;
            color: #00f0ff;
            font-family: Courier, monospace;
            font-weight: normal;
            text-transform: uppercase;
            margin: 2px 0 0 0;
            padding: 0;
        }}
        .meta-text {{
            color: #a09cb4;
            font-size: 9px;
            font-family: Courier, monospace;
            margin-top: 5px;
        }}
        .section-title {{
            font-size: 10px;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 6px;
            text-transform: uppercase;
            color: #00f0ff;
            font-family: Courier, monospace;
            border-bottom: 1px solid #22223a;
            padding-bottom: 2px;
        }}
        .summary-box {{
            background-color: #0c0c1e;
            border-left: 4px solid {risk_accent_color};
            padding: 10px 14px;
            margin-bottom: 12px;
        }}
        .metrics-table {{
            width: 100%;
            border: 1px solid #22223a;
            background-color: #0c0c1e;
            margin-bottom: 12px;
        }}
        .metrics-table th {{
            background-color: #11112e;
            color: #a09cb4;
            font-family: Courier, monospace;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 5px 8px;
            border: 1px solid #22223a;
        }}
        .metrics-table td {{
            color: #ffffff;
            font-size: 10px;
            padding: 7px 8px;
            text-align: center;
            border: 1px solid #22223a;
        }}
    </style>
</head>
<body>
    <!-- Running Page Footer for PDF -->
    <div id="pdf-footer" style="position: fixed; bottom: -30px; left: 0px; right: 0px; height: 30px; font-family: Arial, Helvetica, sans-serif;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="text-align: left; font-size: 8px; color: #718096; border: none; background: none;">CONFIDENTIAL - ORIONIX GEOSPATIAL BRIEFING</td>
                <td style="text-align: right; font-size: 8px; color: #718096; border: none; background: none;">Page <pdf:pagenumber /> of <pdf:pagecount /></td>
            </tr>
        </table>
    </div>

    <div style="width: 100%;">
        
        <!-- HEADER PANEL -->
        <table style="width: 100%; border-bottom: 1px solid #22223a; padding-bottom: 10px; margin-bottom: 15px;">
            <tr>
                <td style="width: 72%; vertical-align: top;">
                    <div class="logo-text"><span style="color: #00f0ff;">●</span> Orionix</div>
                    <h1>Geospatial Intelligence Briefing</h1>
                    <h2>Remote Sensing Telemetry Analysis</h2>
                    <div class="meta-text">
                        <div>Report ID: {report_id}</div>
                        <div>Generated: {now_utc}</div>
                        <div>Coordinates: {location_text}</div>
                        {f"<div>Provenance: Sourced from ISRO portal ({analysis_dict.get('isro_source')})</div>" if analysis_dict.get('isro_sourced') else ""}
                    </div>
                </td>
                {image_html}
            </tr>
        </table>

        <!-- GDACS ADVISORY IF ACTIVE -->
        {advisory_section}

        <!-- EXECUTIVE SUMMARY -->
        <div class="section-title">Executive Summary</div>
        <div class="summary-box">
            <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #d2cffd; text-align: justify;">
                {exec_summary_text}
            </p>
        </div>

        <!-- KEY METRICS TABLE -->
        <table class="metrics-table">
            <thead>
                <tr>
                    <th style="width: 25%;">Primary Classification</th>
                    <th style="width: 25%;">Secondary Classification</th>
                    <th style="width: 25%;">Confidence Assessment</th>
                    <th style="width: 25%;">Assessed Risk Level</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{dominant_cover}</td>
                    <td>{secondary_cover}</td>
                    <td>{confidence}</td>
                    <td style="color: {risk_accent_color}; font-weight: bold; background-color: {risk_bg_color};">{risk_level.upper()}</td>
                </tr>
            </tbody>
        </table>

        <!-- ENVIRONMENTAL INDICATORS -->
        <div class="section-title">Environmental Indicators</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; background-color: #0c0c1e; border: 1px solid #22223a;">
            <thead>
                <tr style="background-color: #11112e; border-bottom: 1px solid #22223a;">
                    <th style="padding: 6px 12px; text-align: left; font-family: monospace; font-size: 8px; color: #a09cb4; width: 30%;">INDICATOR</th>
                    <th style="padding: 6px 12px; text-align: left; font-family: monospace; font-size: 8px; color: #a09cb4; width: 50%;">TELEMETRY METRIC</th>
                    <th style="padding: 6px 12px; text-align: right; font-family: monospace; font-size: 8px; color: #a09cb4; width: 20%;">VALUE</th>
                </tr>
            </thead>
            <tbody>
                <!-- Row 1: Vegetation -->
                <tr style="border-bottom: 1px solid #22223a;">
                    <td style="padding: 8px 12px; font-size: 10px; color: #ffffff;">Vegetation Health Proxy</td>
                    <td style="padding: 8px 12px; vertical-align: middle;">
                        <table style="width: 100%; border-collapse: collapse; height: 8px; background-color: #1a1a3a;">
                            <tr>
                                <td style="width: {int(veg_score)}%; background-color: #39d353; height: 8px; font-size: 0; line-height: 0; padding: 0;">&nbsp;</td>
                                <td style="width: {100 - int(veg_score)}%; background-color: #1a1a3a; height: 8px; font-size: 0; line-height: 0; padding: 0;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 10px; color: #ffffff; font-weight: bold;">{veg_score:.1f}%</td>
                </tr>
                <!-- Row 2: Urban -->
                <tr style="border-bottom: 1px solid #22223a;">
                    <td style="padding: 8px 12px; font-size: 10px; color: #ffffff;">Urban / Built-up Density</td>
                    <td style="padding: 8px 12px; vertical-align: middle;">
                        <table style="width: 100%; border-collapse: collapse; height: 8px; background-color: #1a1a3a;">
                            <tr>
                                <td style="width: {int(urb_score)}%; background-color: #ff9d00; height: 8px; font-size: 0; line-height: 0; padding: 0;">&nbsp;</td>
                                <td style="width: {100 - int(urb_score)}%; background-color: #1a1a3a; height: 8px; font-size: 0; line-height: 0; padding: 0;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 10px; color: #ffffff; font-weight: bold;">{urb_score:.1f}%</td>
                </tr>
                <!-- Row 3: Water -->
                <tr style="border-bottom: 1px solid #22223a;">
                    <td style="padding: 8px 12px; font-size: 10px; color: #ffffff;">Surface Water Exposure</td>
                    <td style="padding: 8px 12px; vertical-align: middle;">
                        <table style="width: 100%; border-collapse: collapse; height: 8px; background-color: #1a1a3a;">
                            <tr>
                                <td style="width: {int(water_score)}%; background-color: #0088ff; height: 8px; font-size: 0; line-height: 0; padding: 0;">&nbsp;</td>
                                <td style="width: {100 - int(water_score)}%; background-color: #1a1a3a; height: 8px; font-size: 0; line-height: 0; padding: 0;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 10px; color: #ffffff; font-weight: bold;">{water_score:.1f}%</td>
                </tr>
                <!-- Row 4: Combined Flood Risk -->
                <tr>
                    <td style="padding: 8px 12px; font-size: 10px; color: #ffffff;">Combined Flood Hazard Risk</td>
                    <td style="padding: 8px 12px; vertical-align: middle;">
                        <table style="width: 100%; border-collapse: collapse; height: 8px; background-color: #1a1a3a;">
                            <tr>
                                <td style="width: {int(flood_score)}%; background-color: {risk_accent_color}; height: 8px; font-size: 0; line-height: 0; padding: 0;">&nbsp;</td>
                                <td style="width: {100 - int(flood_score)}%; background-color: #1a1a3a; height: 8px; font-size: 0; line-height: 0; padding: 0;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                    <td style="padding: 8px 12px; text-align: right; font-size: 10px; color: #ffffff; font-weight: bold;">{flood_score:.1f}%</td>
                </tr>
            </tbody>
        </table>

        <!-- TEMPORAL TRENDS IF APPLICABLE -->
        {trend_html}

        <!-- FINDINGS & RECOMMENDATIONS -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
                <td style="width: 48%; vertical-align: top; padding-right: 2%;">
                    <div class="section-title">Key Findings</div>
                    <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #a09cb4; text-align: justify;">
                        {findings_prose}
                    </p>
                </td>
                <td style="width: 48%; vertical-align: top; padding-left: 2%;">
                    <div class="section-title">AI Recommendations</div>
                    <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #a09cb4; text-align: justify;">
                        {recs_prose}
                    </p>
                </td>
            </tr>
        </table>

        <!-- CLOSING TAKEAWAY SUMMARY -->
        <div style="border-top: 1px solid #22223a; padding-top: 10px; margin-top: 15px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #ffffff; font-weight: bold;">
                {takeaway_sentence}
            </p>
        </div>

        <!-- BRIEFING FOOTER & DISCLAIMERS -->
        <div style="border-top: 1px solid #22223a; padding-top: 10px; margin-top: 20px; font-size: 8px; color: #718096; text-align: center; line-height: 1.4;">
            <div><strong>DATA SOURCES:</strong> Sentinel-2 / Landsat telemetry via Esri imagery endpoints, ISRO Bhuvan/VEDAS EO imagery portals (where flagged)</div>
            <div style="margin-top: 3px; font-style: italic;"><strong>LIMITATIONS DISCLAIMER:</strong> {limitations_joined}</div>
            <div style="margin-top: 5px; font-weight: bold; color: #a09cb4;">Generated by Orionix — GPT-OSS + RemoteCLIP Vision Bridge</div>
        </div>

    </div>
</body>
</html>"""
        return html

html_renderer = HTMLRenderer()
