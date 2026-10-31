"""
convert_reports_to_pdf.py — Executive PDF Generator for Cynbit Assessment Deliverables
Converts Markdown reports to high-fidelity, publication-grade PDFs via Playwright Chromium.
"""

import sys
import os
import re
from pathlib import Path
import markdown
from playwright.sync_api import sync_playwright

WORKSPACE_DIR = Path(__file__).resolve().parent.parent
DOCS_DIR = WORKSPACE_DIR / "docs"

REPORTS = [
    {
        "md": "AI_OPPORTUNITY_REPORT.md",
        "pdf": "AI_OPPORTUNITY_REPORT.pdf",
        "title": "Cynbit Assessment — Deliverable 1: AI Opportunity Report",
        "subtitle": "Unlocking Operational Efficiency, Brand Protection, and Scalable Customer Intelligence in Revio & TenantEase",
        "badge": "DELIVERABLE 1 • AI OPPORTUNITY REPORT",
    },
    {
        "md": "PROOF_OF_CONCEPT_POC_REPORT.md",
        "pdf": "PROOF_OF_CONCEPT_POC_REPORT.pdf",
        "title": "Cynbit Assessment — Deliverable 2: Proof of Concept (PoC) Report",
        "subtitle": "Production Working Demo, Source Code Architecture, and User Journey Verification",
        "badge": "DELIVERABLE 2 • PROOF OF CONCEPT (POC)",
    },
    {
        "md": "TECHNICAL_APPROACH_REPORT.md",
        "pdf": "TECHNICAL_APPROACH_REPORT.pdf",
        "title": "Cynbit Assessment — Deliverable 3: Technical Approach Report",
        "subtitle": "Production Machine Learning Architecture, Mathematical Methodology, and Serverless Systems Engineering",
        "badge": "DELIVERABLE 3 • TECHNICAL APPROACH REPORT",
    },
]

CSS_STYLES = """
@page {
    size: A4;
    margin: 22mm 16mm 22mm 16mm;
}

*, *::before, *::after {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 9.8pt;
    line-height: 1.55;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

/* Header Banner */
.doc-header-banner {
    border-bottom: 2px solid #6366f1;
    padding-bottom: 16px;
    margin-bottom: 24px;
}

.doc-badge {
    display: inline-block;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #4338ca;
    background-color: #e0e7ff;
    padding: 3px 10px;
    border-radius: 4px;
    margin-bottom: 10px;
}

.doc-title {
    font-size: 20pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.25;
    margin: 0 0 8px 0;
    letter-spacing: -0.02em;
}

.doc-subtitle {
    font-size: 11pt;
    font-weight: 500;
    color: #475569;
    line-height: 1.4;
    margin: 0 0 14px 0;
}

.doc-metadata {
    display: flex;
    gap: 20px;
    font-size: 8.5pt;
    color: #64748b;
    border-top: 1px solid #f1f5f9;
    padding-top: 10px;
}

.doc-metadata-item strong {
    color: #334155;
}

/* Typography Hierarchy */
h1 {
    display: none; /* Rendered in header banner */
}

h2 {
    font-size: 13pt;
    font-weight: 700;
    color: #0f172a;
    margin-top: 26px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
    page-break-after: avoid;
    break-after: avoid;
    letter-spacing: -0.01em;
}

h3 {
    font-size: 11.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 20px;
    margin-bottom: 8px;
    page-break-after: avoid;
    break-after: avoid;
}

h4 {
    font-size: 10pt;
    font-weight: 700;
    color: #334155;
    margin-top: 16px;
    margin-bottom: 6px;
    page-break-after: avoid;
    break-after: avoid;
}

p {
    margin-top: 0;
    margin-bottom: 10px;
    text-align: justify;
}

ul, ol {
    margin-top: 0;
    margin-bottom: 12px;
    padding-left: 22px;
}

li {
    margin-bottom: 4px;
}

/* Tables */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 18px 0;
    font-size: 8.8pt;
    line-height: 1.4;
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #cbd5e1;
}

th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    border-bottom: 2px solid #94a3b8;
}

td {
    padding: 6.5px 10px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
}

tr:nth-child(even) {
    background-color: #f8fafc;
}

tr {
    page-break-inside: avoid;
    break-inside: avoid;
}

/* Pre / Code Blocks & ASCII Diagrams */
pre {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #6366f1;
    border-radius: 4px;
    padding: 9px 12px;
    font-family: "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 7.4pt;
    line-height: 1.35;
    color: #0f172a;
    overflow: hidden;
    white-space: pre;
    margin: 14px 0;
    page-break-inside: avoid;
    break-inside: avoid;
}

code {
    font-family: "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 8.5pt;
    background-color: #f1f5f9;
    color: #334155;
    padding: 1.5px 4px;
    border-radius: 3px;
    border: 1px solid #e2e8f0;
}

pre code {
    background-color: transparent;
    padding: 0;
    border: none;
    font-size: 7.4pt;
}

/* Blockquotes */
blockquote {
    border-left: 3.5px solid #6366f1;
    background-color: #f5f3ff;
    padding: 8px 14px;
    margin: 12px 0;
    border-radius: 0 4px 4px 0;
    color: #312e81;
    page-break-inside: avoid;
    break-inside: avoid;
}

blockquote p {
    margin: 0;
}

/* Horizontal Rules */
hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 22px 0;
}

/* Links */
a {
    color: #4f46e5;
    text-decoration: none;
    font-weight: 600;
}

/* KaTeX equations */
.katex-display {
    margin: 10px 0 !important;
    page-break-inside: avoid;
    break-inside: avoid;
}

.katex {
    font-size: 1.05em !important;
}

/* Highlighting and Strong */
strong {
    color: #0f172a;
    font-weight: 700;
}
"""

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <!-- KaTeX for mathematical notation -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
    <style>
{css}
    </style>
</head>
<body>
    <div class="doc-header-banner">
        <div class="doc-badge">{badge}</div>
        <h1 class="doc-title">{title}</h1>
        <div class="doc-subtitle">{subtitle}</div>
        <div class="doc-metadata">
            <div class="doc-metadata-item"><strong>Platform:</strong> Revio &bull; TenantEase</div>
            <div class="doc-metadata-item"><strong>Deployment:</strong> Vercel Serverless Edge</div>
            <div class="doc-metadata-item"><strong>Production Status:</strong> Live &amp; Verified</div>
            <div class="doc-metadata-item"><strong>Date:</strong> October 2026</div>
        </div>
    </div>
    
    <div class="doc-content">
{content}
    </div>

    <script>
        document.addEventListener("DOMContentLoaded", function() {{
            renderMathInElement(document.body, {{
                delimiters: [
                    {{left: "$$", right: "$$", display: true}},
                    {{left: "$", right: "$", display: false}}
                ],
                throwOnError: false
            }});
        }});
    </script>
</body>
</html>
"""

def generate_pdf(report_info: dict, playwright_instance):
    md_path = DOCS_DIR / report_info["md"]
    pdf_path = DOCS_DIR / report_info["pdf"]
    temp_html_path = DOCS_DIR / f"_temp_{report_info['md']}.html"

    print(f"\nProcessing {report_info['md']} -> {report_info['pdf']}...")
    
    if not md_path.exists():
        raise FileNotFoundError(f"Missing markdown report: {md_path}")
    
    raw_md = md_path.read_text(encoding="utf-8")
    
    # Strip the leading H1 and H2 from markdown body if they match the title/subtitle to avoid duplication
    lines = raw_md.splitlines()
    body_lines = []
    skipped_h1 = False
    skipped_h2 = False
    for line in lines:
        if not skipped_h1 and line.startswith("# "):
            skipped_h1 = True
            continue
        if not skipped_h2 and line.startswith("## "):
            skipped_h2 = True
            continue
        body_lines.append(line)
        
    cleaned_md = "\n".join(body_lines)
    
    # Convert markdown to HTML with tables, code, and attributes
    md_extensions = ["tables", "fenced_code", "toc", "sane_lists"]
    html_content = markdown.markdown(cleaned_md, extensions=md_extensions)
    
    # Populate template
    full_html = HTML_TEMPLATE.format(
        title=report_info["title"],
        subtitle=report_info["subtitle"],
        badge=report_info["badge"],
        css=CSS_STYLES,
        content=html_content
    )
    
    temp_html_path.write_text(full_html, encoding="utf-8")
    
    # Launch browser and print to PDF
    browser = playwright_instance.chromium.launch()
    page = browser.new_page()
    
    # Open local file
    file_url = temp_html_path.as_uri()
    page.goto(file_url, wait_until="networkidle")
    
    # Wait for KaTeX to finish rendering
    page.wait_for_timeout(1000)
    
    # Configure header and footer
    header_html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 7.5pt; color: #94a3b8; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
        <span><strong>Cynbit Assessment</strong> &bull; Revio Operational Intelligence</span>
        <span>{report_info['badge']}</span>
    </div>
    """
    
    footer_html = """
    <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 7.5pt; color: #94a3b8; width: 100%; padding: 0 16mm; display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 4px;">
        <span>Revio &bull; TenantEase Production SaaS &bull; <a style="color: #6366f1; text-decoration: none;" href="https://revio-taupe.vercel.app">revio-taupe.vercel.app</a></span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
    """
    
    page.pdf(
        path=str(pdf_path),
        format="A4",
        print_background=True,
        display_header_footer=True,
        header_template=header_html,
        footer_template=footer_html,
        margin={
            "top": "22mm",
            "bottom": "22mm",
            "left": "16mm",
            "right": "16mm"
        }
    )
    
    browser.close()
    
    # Cleanup temporary HTML
    if temp_html_path.exists():
        temp_html_path.unlink()
        
    size_kb = pdf_path.stat().st_size / 1024
    print(f"Generated {pdf_path.name} ({size_kb:.1f} KB)")
    return pdf_path, size_kb

def main():
    print("Starting Executive PDF generation for Cynbit Assessment deliverables...")
    with sync_playwright() as p:
        results = []
        for report in REPORTS:
            pdf_path, size_kb = generate_pdf(report, p)
            results.append((pdf_path, size_kb))
            
    print("\n" + "="*70)
    print("ALL 3 DELIVERABLE PDFS GENERATED SUCCESSFULLY:")
    for path, size in results:
        print(f"  - {path.name:35} {size:8.1f} KB  [{path}]")
    print("="*70)

if __name__ == "__main__":
    main()
