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

        # Clean bullet lists for findings & recommendations (single-line bullet each, no split)
        findings_html = '<ul class="bullet-list">'
        for f in findings:
            clean_f = f.strip()
            findings_html += f'<li class="bullet-item">{clean_f}</li>'
        findings_html += '</ul>'

        recs_html = '<ul class="bullet-list">'
        for r in recs:
            clean_r = r.strip()
            recs_html += f'<li class="bullet-item">{clean_r}</li>'
        recs_html += '</ul>'

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
            padding: 20px;
            font-size: 12px;
        }}
        
        .container {{
            width: 100%;
        }}

        .logo-text {{
            font-family: Courier, monospace;
            font-size: 16px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 8px;
        }}

        h1 {{
            font-size: 24px;
            font-weight: bold;
            color: #ffffff;
            margin: 5px 0 0 0;
        }}

        h2 {{
            font-size: 12px;
            color: #00f0ff;
            font-family: Courier, monospace;
            font-weight: normal;
            text-transform: uppercase;
            margin: 3px 0 0 0;
        }}

        .gen-date {{
            color: #a09cb4;
            font-size: 10px;
            font-family: Courier, monospace;
            margin: 8px 0 0 0;
        }}
        
        .satellite-preview {{
            border: 2px solid #22223a;
            width: 180px;
            height: auto;
        }}
        
        .section-title {{
            font-size: 12px;
            font-weight: bold;
            margin-top: 20px;
            margin-bottom: 12px;
            text-transform: uppercase;
            color: #f0edff;
            font-family: Courier, monospace;
            border-bottom: 1px solid #22223a;
            padding-bottom: 4px;
        }}

        /* KPI Cards styled without variables */
        .kpi-card {{
            background-color: #11112e;
            border-bottom: 1px solid #22223a;
            border-left: 1px solid #22223a;
            border-right: 1px solid #22223a;
            padding: 12px;
            text-align: center;
        }}
        
        .kpi-label {{
            font-size: 9px;
            color: #a09cb4;
            text-transform: uppercase;
            font-family: Courier, monospace;
            margin-bottom: 4px;
        }}
        
        .kpi-val {{
            font-size: 12px;
            font-weight: bold;
            color: #ffffff;
            text-transform: capitalize;
        }}
        
        /* Environmental Indicator Cards */
        .env-card {{
            background-color: #11112e;
            border-bottom: 1px solid #22223a;
            border-left: 1px solid #22223a;
            border-right: 1px solid #22223a;
            padding: 12px;
            text-align: center;
        }}
        
        .env-title {{
            font-size: 9px;
            color: #a09cb4;
            text-transform: uppercase;
            font-family: Courier, monospace;
            margin-bottom: 8px;
        }}
        
        .badge {{
            padding: 4px 8px;
            border-radius: 10px;
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

        /* Clean Bullet Styling */
        .bullet-list {{
            margin: 0;
            padding-left: 15px;
        }}
        
        .bullet-item {{
            margin-bottom: 6px;
            color: #a09cb4;
            line-height: 1.4;
        }}
        
        @media print {{
            body {{ background-color: #ffffff; color: #000000; }}
            .kpi-card, .env-card {{ background-color: #f8f9fa; border: 1px solid #dee2e6; }}
            h1, .logo-text {{ color: #000000; }}
            .bullet-item {{ color: #333333; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        
        <!-- HEADER LAYOUT TABLE (Replaces Grid/Flexbox for xhtml2pdf) -->
        <table style="width: 100%; border-bottom: 1px solid #22223a; padding-bottom: 15px; margin-bottom: 20px;">
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

        <!-- SCENE OVERVIEW TABLE -->
        <div class="section-title">Scene Overview</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="width: 33.3%; padding: 4px;">
                    <div class="kpi-card" style="border-top: 2px solid #0088ff;">
                        <div class="kpi-label">Primary Cover</div>
                        <div class="kpi-val">{dominant_cover}</div>
                    </div>
                </td>
                <td style="width: 33.3%; padding: 4px;">
                    <div class="kpi-card" style="border-top: 2px solid #39d353;">
                        <div class="kpi-label">Secondary Cover</div>
                        <div class="kpi-val">{secondary_cover}</div>
                    </div>
                </td>
                <td style="width: 33.3%; padding: 4px;">
                    <div class="kpi-card" style="border-top: 2px solid #00f0ff;">
                        <div class="kpi-label">Confidence</div>
                        <div class="kpi-val">{confidence}</div>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="width: 33.3%; padding: 4px;">
                    <div class="kpi-card" style="border-top: 2px solid #ae52ff;">
                        <div class="kpi-label">Overall Status</div>
                        <div class="kpi-val">{overall_status}</div>
                    </div>
                </td>
                <td style="width: 33.3%; padding: 4px;">
                    <div class="kpi-card" style="border-top: 2px solid #ff3366;">
                        <div class="kpi-label">Risk Level</div>
                        <div class="kpi-val">{risk_level}</div>
                    </div>
                </td>
                <td style="width: 33.3%; padding: 4px;">
                    <div class="kpi-card" style="border-top: 2px solid #ff9d00;">
                        <div class="kpi-label">Scene Type</div>
                        <div class="kpi-val">{scene_type}</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- ENVIRONMENTAL INDICATORS TABLE -->
        <div class="section-title">Environmental Indicators</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="width: 20%; padding: 4px;">
                    <div class="env-card" style="border-top: 2px solid #39d353;">
                        <div class="env-title">Vegetation</div>
                        <span class="badge {veg_color}">{veg_status}</span>
                    </div>
                </td>
                <td style="width: 20%; padding: 4px;">
                    <div class="env-card" style="border-top: 2px solid #ae52ff;">
                        <div class="env-title">Urban Density</div>
                        <span class="badge {urban_color}">{urban_density}</span>
                    </div>
                </td>
                <td style="width: 20%; padding: 4px;">
                    <div class="env-card" style="border-top: 2px solid #0088ff;">
                        <div class="env-title">Water Presence</div>
                        <span class="badge {water_color}">{water_presence}</span>
                    </div>
                </td>
                <td style="width: 20%; padding: 4px;">
                    <div class="env-card" style="border-top: 2px solid #ff9d00;">
                        <div class="env-title">Industrial Activity</div>
                        <span class="badge {industrial_color}">{industrial_activity}</span>
                    </div>
                </td>
                <td style="width: 20%; padding: 4px;">
                    <div class="env-card" style="border-top: 2px solid #ff3366;">
                        <div class="env-title">Environmental Risk</div>
                        <span class="badge {environmental_color}">{environmental_risk}</span>
                    </div>
                </td>
            </tr>
        </table>

        <!-- KEY FINDINGS & AI RECOMMENDATIONS TABLE -->
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 12px;">
                    <div class="section-title">Key Findings</div>
                    {findings_html}
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 12px;">
                    <div class="section-title">AI Recommendations</div>
                    {recs_html}
                </td>
            </tr>
        </table>

    </div>
</body>
</html>"""
        return html

html_renderer = HTMLRenderer()
