#!/usr/bin/env python3
"""Convert Security_Hardening_Report.md to a styled PDF using markdown2 + weasyprint."""

from pathlib import Path

import markdown2
from weasyprint import HTML

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
MD_FILE = PROJECT_ROOT / "Delivery_3_Security_Hardening_(DevSecOps)" / "Security_Hardening_Report.md"
PDF_FILE = MD_FILE.with_suffix(".pdf")

# ── Convert Markdown → HTML ───────────────────────────────────────────────
md_text = MD_FILE.read_text(encoding="utf-8")
body_html = markdown2.markdown(
    md_text,
    extras=["fenced-code-blocks", "tables", "header-ids", "code-friendly"],
)

# ── CSS Styling (matches Delivery 2 style) ─────────────────────────────────
CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Fira+Code:wght@400&display=swap');

@page {
    size: Letter;
    margin: 2.2cm 2.4cm;

    @bottom-center {
        content: counter(page);
        font-family: 'Inter', sans-serif;
        font-size: 9px;
        color: #9ca3af;
    }
}

body {
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #1f2937;
    -webkit-font-smoothing: antialiased;
}

/* ── Headings ─────────────────────────────────────── */
h1 {
    font-size: 22pt;
    font-weight: 700;
    color: #111827;
    margin-top: 0;
    margin-bottom: 4px;
    padding-bottom: 10px;
    border-bottom: 3px solid #6366f1;
}

h2 {
    font-size: 15pt;
    font-weight: 700;
    color: #312e81;
    margin-top: 28px;
    margin-bottom: 8px;
    padding-bottom: 5px;
    border-bottom: 1.5px solid #e0e7ff;
}

h3 {
    font-size: 12pt;
    font-weight: 600;
    color: #4338ca;
    margin-top: 20px;
    margin-bottom: 6px;
}

h4 {
    font-size: 11pt;
    font-weight: 600;
    color: #4f46e5;
    margin-top: 16px;
    margin-bottom: 4px;
}

/* ── Paragraphs & lists ───────────────────────────── */
p {
    margin: 0 0 10px 0;
    text-align: justify;
    hyphens: auto;
}

ul, ol {
    margin: 6px 0 12px 0;
    padding-left: 22px;
}

li {
    margin-bottom: 5px;
}

/* ── Bold & inline code ───────────────────────────── */
strong {
    font-weight: 600;
    color: #111827;
}

code {
    font-family: 'Fira Code', 'SF Mono', 'Menlo', monospace;
    font-size: 9.5pt;
    background-color: #f1f5f9;
    color: #7c3aed;
    padding: 1.5px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
}

/* ── Code blocks ──────────────────────────────────── */
pre {
    background-color: #1e1b4b;
    color: #e0e7ff;
    padding: 16px 20px;
    border-radius: 8px;
    font-size: 9pt;
    line-height: 1.55;
    overflow-x: auto;
    margin: 12px 0 16px 0;
    border-left: 4px solid #6366f1;
}

pre code {
    background: none;
    color: #c7d2fe;
    padding: 0;
    border: none;
    border-radius: 0;
    font-size: 9pt;
}

/* ── Tables ───────────────────────────────────────── */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 18px 0;
    font-size: 9.5pt;
    line-height: 1.5;
}

thead {
    background-color: #312e81;
}

th {
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 10px 14px;
    border: 1px solid #4338ca;
}

td {
    padding: 8px 14px;
    border: 1px solid #e5e7eb;
    color: #374151;
}

tr:nth-child(even) {
    background-color: #f5f3ff;
}

tr:nth-child(odd) {
    background-color: #ffffff;
}

/* ── Horizontal rules ─────────────────────────────── */
hr {
    border: none;
    border-top: 1.5px solid #e5e7eb;
    margin: 28px 0;
}

/* ── Metadata block (project/date/authors) ────────── */
p:nth-of-type(1),
p:nth-of-type(2),
p:nth-of-type(3) {
    font-size: 10pt;
    color: #6b7280;
}

/* ── Blockquotes ──────────────────────────────────── */
blockquote {
    border-left: 4px solid #a5b4fc;
    padding: 8px 16px;
    margin: 12px 0;
    background: #eef2ff;
    border-radius: 0 6px 6px 0;
    color: #3730a3;
    font-style: italic;
}

/* ── Links ────────────────────────────────────────── */
a {
    color: #4f46e5;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}
"""

# ── Compose full HTML document ─────────────────────────────────────────────
html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>{CSS}</style>
</head>
<body>
{body_html}
</body>
</html>
"""

# ── Render PDF ─────────────────────────────────────────────────────────────
HTML(string=html_doc).write_pdf(str(PDF_FILE))
print(f"✅  PDF generated: {PDF_FILE}")
