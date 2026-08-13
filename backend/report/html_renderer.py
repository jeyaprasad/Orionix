import json
import datetime

class HTMLRenderer:
    def render(self, analysis: any, claude_json: any = None, image_base64: str = None) -> str:
        now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Defensive check for call pattern from pdf_generator.py:
        # html_renderer.render(analysis, image_base64)
        if isinstance(claude_json, str) and image_base64 is None:
            image_base64 = claude_json
            claude_json = None
            
        if image_base64 and not image_base64.startswith("data:"):
            image_base64 = f"data:image/jpeg;base64,{image_base64}"
            
        # Simplified image tag for xhtml2pdf compatibility
        img_tag = f'<img src="{image_base64}" class="satellite-preview" alt="Satellite Preview" />' if image_base64 else ''
        
        # Convert analysis to dictionary if it is a Pydantic model
        if hasattr(analysis, "dict"):
            analysis_dict = analysis.dict()
        elif isinstance(analysis, dict):
            analysis_dict = analysis
        else:
            analysis_dict = {}

        # Extract core semantics
        dominant_cover = analysis_dict.get('dominant_land_cover', 'N/A')
        secondary_cover = analysis_dict.get('secondary_land_cover') or 'None'
        confidence = analysis_dict.get('confidence', 'N/A')
        risk_level = analysis_dict.get('risk_level') or 'Low'

        # Fallback structures for absolute safety
        fallback_json = {
            "executive_dashboard": {
                "overall_status": "Stable",
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

        # Resolve final dashboard parameters
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
        scene_type = ed.get("scene_type", "Natural")

        # Convert lists to flowing prose paragraphs
        findings_prose = " ".join([f.strip() for f in findings])
        recs_prose = " ".join([r.strip() for r in recs])

        # Badges helper
        def badge_color(val):
            val = str(val).lower()
            if 'high' in val: return 'bg-red'
            if 'medium' in val: return 'bg-yellow'
            if 'low' in val: return 'bg-green'
            if 'not detected' in val or 'none' in val: return 'bg-gray'
            if 'detected' in val: return 'bg-blue'
            return 'bg-gray'
            
        def status_display(val):
            val_lower = str(val).lower()
            if 'high' in val_lower: return 'HIGH'
            if 'medium' in val_lower: return 'MEDIUM'
            if 'low' in val_lower: return 'LOW'
            if 'detected' in val_lower and 'not' not in val_lower: return 'DETECTED'
            return 'NONE'

        def get_bar_metrics(val):
            val_lower = str(val).lower()
            if 'high' in val_lower:
                return 90, '#ff3366'
            if 'medium' in val_lower:
                return 60, '#ff9d00'
            if 'low' in val_lower:
                return 30, '#39d353'
            if 'detected' in val_lower and 'not' not in val_lower:
                return 80, '#0088ff'
            return 5, '#475466'

        veg_status = status_display(ea.get("vegetation", "Unknown"))
        urban_density = status_display(ea.get("urban_density", "Unknown"))
        water_presence = status_display(ea.get("water_presence", "Unknown"))
        industrial_activity = status_display(ea.get("industrial_activity", "Unknown"))
        environmental_risk = status_display(ea.get("environmental_risk", "Unknown"))

        veg_color = badge_color(ea.get("vegetation", "Unknown"))
        urban_color = badge_color(ea.get("urban_density", "Unknown"))
        water_color = badge_color(ea.get("water_presence", "Unknown"))
        industrial_color = badge_color(ea.get("industrial_activity", "Unknown"))
        environmental_color = badge_color(ea.get("environmental_risk", "Unknown"))

        veg_pct, veg_bar_color = get_bar_metrics(ea.get("vegetation", "Unknown"))
        urban_pct, urban_bar_color = get_bar_metrics(ea.get("urban_density", "Unknown"))
        water_pct, water_bar_color = get_bar_metrics(ea.get("water_presence", "Unknown"))
        industrial_pct, industrial_bar_color = get_bar_metrics(ea.get("industrial_activity", "Unknown"))
        environmental_pct, environmental_bar_color = get_bar_metrics(ea.get("environmental_risk", "Unknown"))

        # Construct lead paragraph narrative
        summary_sentence = analysis_dict.get('summary', '') or ''
        if summary_sentence and not summary_sentence.endswith('.'):
            summary_sentence += '.'
        
        lead_text = f"Geospatial telemetry confirms a {dominant_cover.lower()} layout. {summary_sentence} The status is currently flagged as {overall_status.lower()} with a {risk_level.lower()} risk rating."

        # Construct closing summary block takeaway
        top_rec = recs[0] if recs else "maintain standard monitoring frequency"
        top_rec_clean = top_rec.strip().rstrip('.')
        summary_block_text = (
            f"<strong>In summary, the telemetry classifies this location as a {dominant_cover.lower()} zone with a {risk_level.lower()} risk classification.</strong> "
            f"To optimize environmental stability and mitigate potential hazards, analysts should {top_rec_clean.lower()}. "
            "Continuous monitoring of indicators remains critical for early detection of rapid landscape transformations."
        )

        # Construct Location row if coordinates/bbox are present
        location_html = ""
        lat = analysis_dict.get("latitude")
        lng = analysis_dict.get("longitude")
        bbox_val = analysis_dict.get("bbox")
        advisory_match = analysis_dict.get("external_advisory_match")

        advisory_text = ""
        if advisory_match is not None:
            if advisory_match:
                advisory_text = '<div style="color: #ff3366; font-size: 10px; font-family: Arial, sans-serif; margin-top: 2px; font-weight: bold;">Matches an active GDACS flood advisory for this region</div>'
            else:
                advisory_text = '<div style="color: #a09cb4; font-size: 10px; font-family: Arial, sans-serif; margin-top: 2px;">No matching external advisory &mdash; localized detection only.</div>'

        if lat is not None and lng is not None:
            lat_dir = "N" if lat >= 0 else "S"
            lng_dir = "E" if lng >= 0 else "W"
            location_html = f'<div class="gen-date" style="margin-top: 4px;">Location: {abs(lat):.4f}&deg; {lat_dir}, {abs(lng):.4f}&deg; {lng_dir}</div>{advisory_text}'
        elif bbox_val and len(bbox_val) == 4:
            min_lat, min_lng, max_lat, max_lng = bbox_val
            min_lat_dir = "N" if min_lat >= 0 else "S"
            min_lng_dir = "E" if min_lng >= 0 else "W"
            max_lat_dir = "N" if max_lat >= 0 else "S"
            max_lng_dir = "E" if max_lng >= 0 else "W"
            location_html = (
                f'<div class="gen-date" style="margin-top: 4px;">'
                f'Location Box: [{abs(min_lat):.4f}&deg; {min_lat_dir}, {abs(min_lng):.4f}&deg; {min_lng_dir}] to '
                f'[{abs(max_lat):.4f}&deg; {max_lat_dir}, {abs(max_lng):.4f}&deg; {max_lng_dir}]'
                f'</div>{advisory_text}'
            )

        # Determine single accent color matching risk level
        risk_lower = str(risk_level).lower()
        if 'severe' in risk_lower or 'high' in risk_lower:
            risk_accent_color = '#ff3366' # red
        elif 'mod' in risk_lower or 'medium' in risk_lower or 'amber' in risk_lower:
            risk_accent_color = '#ff9d00' # amber
        else:
            risk_accent_color = '#39d353' # green

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Orionix Geospatial Dashboard</title>
    <style>
        body {{
            font-family: Arial, Helvetica, sans-serif;
            background-color: #03030a;
            color: #f0edff;
            margin: 0;
            padding: 10px 15px;
            font-size: 12px;
        }}
        
        .container {{
            width: 100%;
        }}

        .logo-text {{
            font-family: Courier, monospace;
            font-size: 14px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 4px;
        }}

        h1 {{
            font-size: 20px;
            font-weight: bold;
            color: #ffffff;
            margin: 2px 0 0 0;
        }}

        h2 {{
            font-size: 11px;
            color: #00f0ff;
            font-family: Courier, monospace;
            font-weight: normal;
            text-transform: uppercase;
            margin: 2px 0 0 0;
        }}

        .gen-date {{
            color: #a09cb4;
            font-size: 9px;
            font-family: Courier, monospace;
            margin: 4px 0 0 0;
        }}
        
        .satellite-preview {{
            border: 2px solid #22223a;
            width: 180px;
            height: auto;
        }}
        
        .section-title {{
            font-size: 11px;
            font-weight: bold;
            margin-top: 14px;
            margin-bottom: 8px;
            text-transform: uppercase;
            color: #f0edff;
            font-family: Courier, monospace;
            border-bottom: 1px solid #22223a;
            padding-bottom: 3px;
        }}

        /* Lead Block Styling */
        .lead-block {{
            border-left: 4px solid {risk_accent_color};
            background-color: #0d0d21;
            padding: 10px 14px;
            margin-bottom: 12px;
            border-radius: 0 4px 4px 0;
        }}
        .lead-text-p {{
            margin: 0;
            font-size: 11px;
            line-height: 1.5;
            color: #d2cffd;
            font-style: italic;
        }}

        /* Redesigned Three-tier Layout */
        .headline-table {{
            width: 100%;
            border: 1px solid #22223a;
            background-color: #11112e;
            margin-bottom: 8px;
            border-collapse: collapse;
        }}
        .headline-label {{
            font-size: 8px;
            color: #a09cb4;
            text-transform: uppercase;
            font-family: Courier, monospace;
            margin-bottom: 2px;
        }}
        .headline-val {{
            font-size: 15px;
            font-weight: bold;
            color: #ffffff;
        }}
        
        .detail-table {{
            width: 100%;
            border: 1px solid #22223a;
            background-color: #0c0c1e;
            margin-bottom: 8px;
            border-collapse: collapse;
        }}
        .detail-label {{
            font-size: 8px;
            color: #a09cb4;
            font-family: Courier, monospace;
            text-transform: uppercase;
        }}
        .detail-val {{
            font-size: 10px;
            font-weight: bold;
            color: #ffffff;
            margin-left: 4px;
        }}

        .indicator-table {{
            width: 100%;
            border: 1px solid #22223a;
            background-color: #11112e;
            border-collapse: collapse;
            margin-bottom: 12px;
        }}
        .indicator-row {{
            border-bottom: 1px solid #22223a;
        }}
        .indicator-row:last-child {{
            border-bottom: none;
        }}
        .indicator-name {{
            padding: 6px 12px;
            font-family: Courier, monospace;
            font-size: 9px;
            color: #a09cb4;
            text-transform: uppercase;
        }}
        .indicator-value {{
            padding: 6px 12px;
            text-align: right;
        }}
        
        .badge {{
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
            font-family: Courier, monospace;
        }}
        
        /* Hardcoded Hex Badge Backgrounds */
        .bg-red {{ background-color: #361c20; color: #fca5a5; border: 1px solid #5c2a30; }}
        .bg-yellow {{ background-color: #3b2c14; color: #fcd34d; border: 1px solid #61471d; }}
        .bg-green {{ background-color: #183624; color: #a7f3d0; border: 1px solid #275c3d; }}
        .bg-blue {{ background-color: #162a4a; color: #bfdbfe; border: 1px solid #2a4c80; }}
        .bg-gray {{ background-color: #2d3540; color: #cbd5e1; border: 1px solid #475466; }}
        
        @media print {{
            body {{ background-color: #ffffff; color: #000000; }}
            .headline-table, .detail-table, .indicator-table {{ background-color: #f8f9fa; border: 1px solid #dee2e6; }}
            h1, .logo-text {{ color: #000000; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        
        <!-- HEADER LAYOUT TABLE (Replaces Grid/Flexbox for xhtml2pdf) -->
        <table style="width: 100%; border-bottom: 1px solid #22223a; padding-bottom: 10px; margin-bottom: 15px;">
            <tr>
                <td style="width: 70%; vertical-align: middle;">
                    <div class="logo-text"><span style="color: #00f0ff;">●</span> Orionix</div>
                    <h1>Geospatial Intelligence Report</h1>
                    <h2>Satellite Interpretation Framework</h2>
                    <div class="gen-date">Generated: {now}</div>
                    {location_html}
                </td>
                <td style="width: 30%; text-align: right; vertical-align: middle;">
                    {img_tag}
                </td>
            </tr>
        </table>

        <!-- LEAD PARAGRAPH BLOCK -->
        <div class="lead-block">
            <p class="lead-text-p">{lead_text}</p>
        </div>

        <!-- TOP TIER: HEADLINE SUMMARY -->
        <table class="headline-table">
            <tr>
                <td style="padding: 10px 12px; width: 50%; border-right: 1px solid #22223a; vertical-align: middle;">
                    <div class="headline-label">Overall Status</div>
                    <div class="headline-val">{overall_status}</div>
                </td>
                <td style="padding: 10px 12px; width: 50%; text-align: right; vertical-align: middle;">
                    <div class="headline-label">Risk Level</div>
                    <div class="headline-val" style="color: {risk_accent_color};">{risk_level}</div>
                </td>
            </tr>
        </table>

        <!-- MIDDLE TIER: SUPPORTING METRICS -->
        <table class="detail-table">
            <tr>
                <td style="padding: 6px 12px; width: 33.3%; border-right: 1px solid #22223a; vertical-align: middle;">
                    <span class="detail-label">Primary:</span>
                    <span class="detail-val">{dominant_cover}</span>
                </td>
                <td style="padding: 6px 12px; width: 33.3%; border-right: 1px solid #22223a; text-align: center; vertical-align: middle;">
                    <span class="detail-label">Secondary:</span>
                    <span class="detail-val">{secondary_cover}</span>
                </td>
                <td style="padding: 6px 12px; width: 33.3%; text-align: right; vertical-align: middle;">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-val">{confidence}</span>
                </td>
            </tr>
        </table>

        <!-- BOTTOM TIER: ENVIRONMENTAL INDICATORS TABLE WITH BARS -->
        <div class="section-title">Environmental Indicators</div>
        <table class="indicator-table">
            <tr class="indicator-row">
                <td class="indicator-name" style="width: 30%;">Vegetation Health</td>
                <td style="width: 50%; vertical-align: middle; padding: 0 10px;">
                    <div style="background-color: #1a1a3a; height: 6px; border-radius: 3px; width: 100%; overflow: hidden;">
                        <div style="background-color: {veg_bar_color}; width: {veg_pct}%; height: 100%; border-radius: 3px;"></div>
                    </div>
                </td>
                <td class="indicator-value" style="width: 20%;"><span class="badge {veg_color}">{veg_status}</span></td>
            </tr>
            <tr class="indicator-row">
                <td class="indicator-name" style="width: 30%;">Urban / Built-up Density</td>
                <td style="width: 50%; vertical-align: middle; padding: 0 10px;">
                    <div style="background-color: #1a1a3a; height: 6px; border-radius: 3px; width: 100%; overflow: hidden;">
                        <div style="background-color: {urban_bar_color}; width: {urban_pct}%; height: 100%; border-radius: 3px;"></div>
                    </div>
                </td>
                <td class="indicator-value" style="width: 20%;"><span class="badge {urban_color}">{urban_density}</span></td>
            </tr>
            <tr class="indicator-row">
                <td class="indicator-name" style="width: 30%;">Water Presence</td>
                <td style="width: 50%; vertical-align: middle; padding: 0 10px;">
                    <div style="background-color: #1a1a3a; height: 6px; border-radius: 3px; width: 100%; overflow: hidden;">
                        <div style="background-color: {water_bar_color}; width: {water_pct}%; height: 100%; border-radius: 3px;"></div>
                    </div>
                </td>
                <td class="indicator-value" style="width: 20%;"><span class="badge {water_color}">{water_presence}</span></td>
            </tr>
            <tr class="indicator-row">
                <td class="indicator-name" style="width: 30%;">Industrial Activity</td>
                <td style="width: 50%; vertical-align: middle; padding: 0 10px;">
                    <div style="background-color: #1a1a3a; height: 6px; border-radius: 3px; width: 100%; overflow: hidden;">
                        <div style="background-color: {industrial_bar_color}; width: {industrial_pct}%; height: 100%; border-radius: 3px;"></div>
                    </div>
                </td>
                <td class="indicator-value" style="width: 20%;"><span class="badge {industrial_color}">{industrial_activity}</span></td>
            </tr>
            <tr class="indicator-row">
                <td class="indicator-name" style="width: 30%;">Environmental Risk</td>
                <td style="width: 50%; vertical-align: middle; padding: 0 10px;">
                    <div style="background-color: #1a1a3a; height: 6px; border-radius: 3px; width: 100%; overflow: hidden;">
                        <div style="background-color: {environmental_bar_color}; width: {environmental_pct}%; height: 100%; border-radius: 3px;"></div>
                    </div>
                </td>
                <td class="indicator-value" style="width: 20%;"><span class="badge {environmental_color}">{environmental_risk}</span></td>
            </tr>
        </table>

        <!-- KEY FINDINGS & AI RECOMMENDATIONS TABLE (Prose paragraphs) -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
            <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 12px;">
                    <div class="section-title">Key Findings</div>
                    <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #a09cb4;">{findings_prose}</p>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 12px;">
                    <div class="section-title">AI Recommendations</div>
                    <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #a09cb4;">{recs_prose}</p>
                </td>
            </tr>
        </table>

        <!-- CLOSING SUMMARY BLOCK -->
        <div style="border-top: 1px solid #22223a; padding-top: 10px; margin-top: 15px;">
            <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #f0edff;">
                {summary_block_text}
            </p>
        </div>

    </div>
</body>
</html>"""
        return html

html_renderer = HTMLRenderer()
