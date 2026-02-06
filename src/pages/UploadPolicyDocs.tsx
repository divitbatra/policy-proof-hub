// src/pages/UploadPolicyDocs.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import * as mammoth from "mammoth";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";

const sanitize = DOMPurify.sanitize;
const PDF_FOOTER_RESERVED_MM = 12; // reserve space for footer on every page
const HEADER_BRAND_COL_MM = 60;    // width of logo/brand column in header table
const FOOTER_TEXT = "Classification: Protected B";
const FOOTER_BLUE_RGB: [number, number, number] = [0, 135, 190]; // same blue you used in header text
const BRANCH_TEXT = "Community Corrections Branch";

function stripLegacyGovHeader(html: string) {
  let out = html;

  // Remove a header table that contains SECTION/NUMBER/SUBJECT/PAGE near the top
  out = out.replace(/<table[\s\S]*?<\/table>/gi, (tbl, _m, offset) => {
    if (offset > 6000) return tbl;
    const t = tbl.toLowerCase();
    if (t.includes("section") && t.includes("number") && t.includes("subject") && t.includes("page")) return "";
    return tbl;
  });

  // Remove common GoA header lines near the top
  out = out.replace(
    /<p[^>]*>\s*(alberta|government of alberta|public safety and emergency services)[\s\S]*?<\/p>/gi,
    (p, _g, offset) => (offset < 6000 ? "" : p)
  );

  // Remove an initial logo image if it’s part of the old header
  out = out.replace(/^\s*(?:<p[^>]*>\s*)?<img[^>]*>\s*(?:<\/p>)?/i, "");

  return out;
}

const ALBERTA_LOGO_URL = "/alberta-logo.png"; // put logo in /public
const DRAW_DEPARTMENT_TEXT = false;

const PDF_BASE_MARGIN_MM = 15;
const PDF_HEADER_RESERVED_MM = 30; // space at top of every page for the header
const META_TABLE_WIDTH_MM = 110;
const META_NARROW_COL_MM = 30;
const PDF_HEADER_GAP_MM = 6; // extra breathing room below the header on every page


const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
async function waitForIframeAssets(iframe: HTMLIFrameElement) {
  const doc = iframe.contentDocument;
  if (!doc) return;

  // Wait for fonts (if supported)
  // @ts-ignore
  if (doc.fonts?.ready) {
    try {
      // @ts-ignore
      await doc.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  // Wait for images
  const imgs = Array.from(doc.images || []);
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

async function getImageAspect(dataUrl: string): Promise<number> {
  return await new Promise<number>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 3);
    img.onerror = () => resolve(3);
    img.src = dataUrl;
  });
}
function ensureBlankLineAfterPolicyStatement(html: string) {
  const re = /<h2>\s*Policy Statement\s*<\/h2>/i;
  const m = html.match(re);
  if (!m) return html;

  const start = html.search(re);
  if (start < 0) return html;

  const end = start + m[0].length;
  const after = html.slice(end);
  const afterTrim = after.replace(/^\s+/, "");

  // If the very next thing is already a blank paragraph, do nothing
  const blankP = /^<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/i;
  if (blankP.test(afterTrim)) return html;

  // Otherwise insert a single blank line
  return html.slice(0, end) + "<p>&nbsp;</p>" + after;
}

function normalizeListTypes(html: string) {
  let out = html;

  // Ensure all <ol> that look numbered or lettered stay as <ol>
  out = out.replace(/<ol\b[^>]*>/gi, (match) => {
    if (/type\s*=\s*["']?[1aAiI]["']?/i.test(match)) return match; // already typed
    if (/list-style-type\s*:\s*(decimal|lower-alpha|upper-alpha|lower-roman|upper-roman)/i.test(match)) return match;
    return match.replace(/<ol/i, '<ol type="1"'); // default numeric type
  });

  // Only convert <ol> to <ul> if it has no numbering or markers
  out = out.replace(/<ol\b([^>]*)>/gi, (m, attrs) => {
    if (/list-style-type|type\s*=/i.test(attrs)) return `<ol${attrs}>`;
    return `<ul${attrs}>`;
  });

  // Clean up double-empty list items
  out = out.replace(/<li>\s*<\/li>/g, '');

  return out;
}

function applyIndentBasedLists(html: string) {
  return html.replace(
    /<p([^>]*)style="([^"]*)"([^>]*)>(.*?)<\/p>/gi,
    (full, pre, style, post, content) => {
      const marginMatch = style.match(/margin-left:\s*([\d.]+)(px|pt|in|cm|mm)/i);
      if (!marginMatch) return full;

      const value = parseFloat(marginMatch[1]);

      let level = 0;
      if (value >= 80) level = 2;
      else if (value >= 40) level = 1;

      return `<p class="policy-li level-${level}">${content}</p>`;
    }
  );
}

function drawAlbertaFooter(pdf: any, text: string) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const marginX = PDF_BASE_MARGIN_MM;

  // top of reserved footer area
  const footerTopY = pageH - (PDF_BASE_MARGIN_MM + PDF_FOOTER_RESERVED_MM);

  const yLine = footerTopY + 2.2;
  const yText = yLine + 5.5;

  pdf.setDrawColor(...FOOTER_BLUE_RGB);
  pdf.setLineWidth(0.6);
  pdf.line(marginX, yLine, pageW - marginX, yLine);

  pdf.setFont("times", "normal");
  pdf.setFontSize(10.5);
  pdf.setTextColor(20, 20, 20);
  pdf.text(text, marginX, yText);
}

function drawAlbertaHeader(
  pdf: any,
  pageNum: number,
  total: number,
  meta: { section: string; number: string; subject: string },
  logo?: { dataUrl: string; aspect: number } | null
) {
  const pageW = pdf.internal.pageSize.getWidth();

  const marginX = PDF_BASE_MARGIN_MM;
  const topY = PDF_BASE_MARGIN_MM;

  // Total usable content width (matches your 180mm "doc" width on A4 with 15mm margins)
  const contentW = pageW - marginX * 2;

  // Keep your existing meta sizing
  const narrowW = META_NARROW_COL_MM;     // right-most column (NUMBER / PAGE)
  const metaW = META_TABLE_WIDTH_MM;      // middle+right combined width (SECTION + NUMBER)
  const midW = metaW - narrowW;           // SECTION column width
  const brandW = Math.max(35, contentW - metaW); // left logo/brand column width

  const rowH = 15;
  const tableH = rowH * 2;

  const tableX = marginX;
  const tableY = topY + 2;

  // Column boundaries
  const xBrandEnd = tableX + brandW;
  const xNarrowStart = tableX + brandW + midW; // start of NUMBER/PAGE col

  // ---- Borders (full-width header table) ----
    // ---- Borders (full-width header table) ----
  pdf.setDrawColor(120, 120, 120);
  pdf.setLineWidth(0.2);

  const x0 = tableX;
  const x1 = tableX + contentW;
  const y0 = tableY;
  const y1 = tableY + tableH;

  // ✅ TOP border: start at SECTION cell (not above logo)
  pdf.line(xBrandEnd, y0, x1, y0);

  // ✅ RIGHT border: full height
  pdf.line(x1, y0, x1, y1);

  // ✅ BOTTOM border: full width (keeps SUBJECT row boxed at bottom)
  pdf.line(x0, y1, x1, y1);

  // ✅ Row divider (between top row and SUBJECT row): full width
  pdf.line(x0, y0 + rowH, x1, y0 + rowH);

  // ✅ Divider before NUMBER/PAGE column: full height
  pdf.line(xNarrowStart, y0, xNarrowStart, y1);

  // ✅ Divider between logo col and SECTION col: ONLY top row
  // (SUBJECT spans under logo)
  pdf.line(xBrandEnd, y0, xBrandEnd, y0 + rowH);
  // ✅ Left border ONLY for the SUBJECT row (do NOT draw beside the logo in top row)
  pdf.line(x0, y0 + rowH, x0, y1);



  // ---- Logo + Dept text in TOP-LEFT cell ----
  const cellPad = 2;

  let logoH = 12.5;
  let logoW = 0;

  if (logo?.dataUrl) {
    const aspect = logo.aspect || 3;
    logoW = logoH * aspect;

    // Reserve some space for dept text in the brand cell (tuned for this layout)
    const deptBlockW = DRAW_DEPARTMENT_TEXT ? 34 : 0;
    const gapAfterLogo = DRAW_DEPARTMENT_TEXT ? 2.5 : 0;

    const maxLogoW = Math.max(16, brandW - cellPad * 2 - deptBlockW - gapAfterLogo);
    if (logoW > maxLogoW) {
      const s = maxLogoW / logoW;
      logoW = maxLogoW;
      logoH = logoH * s;
    }

    const logoX = tableX + cellPad;
    const logoY = tableY + (rowH - logoH) / 2;

    try {
      pdf.addImage(logo.dataUrl, "PNG", logoX, logoY, logoW, logoH);
    } catch {
      // ignore
    }

    if (DRAW_DEPARTMENT_TEXT) {
      const deptX = logoX + logoW + 2.5;

      // baseline inside the cell (keep within rowH=15)
      const deptY = tableY + 6.2;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(0, 135, 190);
      pdf.text("Public Safety and", deptX, deptY);
      pdf.text("Emergency Services", deptX, deptY + 4.1);

      // Branch line (grey)
      pdf.setFontSize(7.5);
      pdf.setTextColor(140, 140, 140);
      pdf.text("Community Corrections Branch", deptX, deptY + 8.1);
    }
  }

  // ---- Labels ----
  const labelY = 4.2;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(60, 60, 60);

  // SECTION label in middle cell (top row)
  pdf.text("SECTION", xBrandEnd + 2, tableY + labelY);

  // NUMBER label in narrow cell (top row)
  pdf.text("NUMBER", xNarrowStart + narrowW / 2, tableY + labelY, { align: "center" });

  // SUBJECT label spans under logo (bottom row, left+middle)
  pdf.text("SUBJECT", tableX + 2, tableY + rowH + labelY);

  // PAGE label in narrow cell (bottom row)
  pdf.text("PAGE", xNarrowStart + narrowW / 2, tableY + rowH + labelY, { align: "center" });

  // ---- Values (pushed down so they never overlap labels) ----
  const valueY = 10.6;
  const lineGap = 4.3;

  const sectionText = (meta.section || "").trim();
  const numberText = (meta.number || "").trim();
  const subjectText = (meta.subject || "").trim();

  // Section / Subject in grey
  pdf.setFont("times", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(110, 110, 110);

  const sectionLines = pdf.splitTextToSize(sectionText, midW - 4).slice(0, 2);
  sectionLines.forEach((ln: string, idx: number) => {
    pdf.text(ln, xBrandEnd + 2, tableY + valueY + idx * lineGap);
  });

  const subjectSpanW = brandW + midW;
  const subjectLines = pdf.splitTextToSize(subjectText, subjectSpanW - 4).slice(0, 2);
  subjectLines.forEach((ln: string, idx: number) => {
    pdf.text(ln, tableX + 2, tableY + rowH + valueY + idx * lineGap);
  });

  // Number in black (top-right cell)
  pdf.setFont("times", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(20, 20, 20);
  pdf.text(numberText, xNarrowStart + narrowW / 2, tableY + valueY, { align: "center" });

  // Page X of Y in black (bottom-right cell)
  pdf.setFont("times", "normal");
  pdf.setFontSize(10.5);
  pdf.setTextColor(20, 20, 20);
  pdf.text(`${pageNum} of ${total}`, xNarrowStart + narrowW / 2, tableY + rowH + valueY, { align: "center" });
}


// ------------------------------
// Helpers
// Helpers
// ------------------------------
function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]!)
  );
}

function extractPolicyMeta(rawText: string) {
  const grab = (label: string) => {
    const re = new RegExp(`^\\s*${label}\\s*\\n?\\s*(.+)$`, "im");
    const m = rawText.match(re);
    return m?.[1]?.trim() ?? "";
  };
  const section = grab("SECTION");
  const number = grab("NUMBER");
  const subject = grab("SUBJECT");
  return { section, number, subject };
}

function normalizePolicyHtml(html: string) {
  let clean = html;

  clean = stripLegacyGovHeader(clean);

  // ✅ keep real <ul>/<ol>/<li> from Mammoth (and normalize ordered list types)
  clean = normalizeListTypes(clean);

  clean = clean.replace(/Classification:\s*Protected\s+[AB]\s*/gi, "");
  clean = clean.replace(/(<p>\s*<\/p>){2,}/g, "<p>&nbsp;</p>");
  clean = clean.replace(
    /<p>(POLICY STATEMENT|DEFINITIONS|STANDARDS|PROCEDURES|SCOPE|PURPOSE|BACKGROUND|RESPONSIBILITIES):?\s*<\/p>/gi,
    (_, cap: string) => `<h2>${toTitleCase(cap)}</h2>`
  );
  clean = ensureBlankLineAfterPolicyStatement(clean);
  clean = clean.replace(/<ul>([\s\S]*?)<\/ul>/g, (m) => m.replace(/<p>\s*<\/p>/g, ""));
  clean = sanitize(clean, { USE_PROFILES: { html: true } });
  return clean;
}





function wrapWithPolicyTemplate(opts: {
  section?: string;
  number?: string;
  subject?: string;
  bodyHtml: string;
  mode?: "pdf" | "preview";
  drawDepartmentText?: boolean;
}) {
  const drawDept = opts.drawDepartmentText ?? true;
  const { section, number, subject, bodyHtml } = opts;
  const mode = opts.mode ?? "pdf";

  // In PDF mode, we use a fixed header and reserve space for it via html2pdf top margin.
  // The header is "pulled up" into the reserved margin using a negative top offset.
  const headerPositionCss =
    mode === "pdf"
      ? `position: fixed; top: -${PDF_HEADER_RESERVED_MM}mm; left: 50%; transform: translateX(-50%); width: 180mm; z-index: 50;`
      : `position: sticky; top: 0; width: 100%; z-index: 50; background: white;`;

  const css = `
    <style>
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Times New Roman", Times, serif;
        color: #111827;
        background: white;
      }
      /* A4 width is 210mm; we render to 180mm content (with 15mm margins). */
      .doc { width: 180mm; margin: 0 auto; }

      /* Header (Alberta-style) */
      .gov-brand { display: flex; align-items: flex-start; gap: 4mm; }
      .gov-brand img { height: 16mm; width: auto; display: block; }

      .gov-brand .dept {
        font-size: 11px;
        line-height: 1.12;
        color: #0ea5e9;
        font-weight: 500;
        white-space: nowrap;
      }
      .gov-brand .branch {
        margin-top: 1.2mm;
        font-size: 9px;
        color: #6b7280;
        font-weight: 500;
      }

      .gov-meta { flex: 0 0 auto; }
      table.meta-table {
        width: ${META_TABLE_WIDTH_MM}mm;
        border-collapse: collapse;
        border: 1px solid #6b7280;
        font-family: "Times New Roman", Times, serif;
        background: white;
      }
      table.meta-table td {
        border: 1px solid #6b7280;
        padding: 1.6mm 2.4mm;
        vertical-align: top;
      }
      td.wide { width: ${META_TABLE_WIDTH_MM - META_NARROW_COL_MM}mm; }
      td.narrow { width: ${META_NARROW_COL_MM}mm; text-align: center; }
      table.header-table {
        width: 180mm;
        border-collapse: collapse;
        border: 1px solid #6b7280;
        font-family: "Times New Roman", Times, serif;
        background: white;
      }
      table.header-table td {
        border: 1px solid #6b7280;
        padding: 1.6mm 2.4mm;
        vertical-align: top;
      }
      td.brand-td { padding: 1.8mm 2.4mm; }

      .cell-label {
        font-family: "Times New Roman", Times, serif;
        font-size: 9px;
        font-weight: 700;
        color: #374151;
        letter-spacing: 0.02em;
      }
      .cell-value {
        margin-top: 1.2mm;
        font-size: 12px;
        font-weight: 700;
        color: #6b7280; /* grey like your screenshot */
        line-height: 1.15;
      }
      .cell-value.number { color: #111827; font-weight: 600; }
      .cell-value.page { color: #111827; font-weight: 500; min-height: 4mm; }

      /* Give the preview a little breathing room */
      body.preview .doc { padding: 8mm 0; }

      /* Main content typography */
      h1, h2, h3 { color: #0f172a; }
      h1 { font-size: 22px; margin: 18px 0 10px; }
      h2 { font-size: 18px; margin: 16px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
      h3 { font-size: 16px; margin: 12px 0 6px; }
      p { line-height: 1.5; margin: 8px 0; }
      /* ===== PDF-SAFE LIST MARKERS (html2canvas drops native ::marker) ===== */
      ul, ol {
        margin: 8px 0 8px 22px;
        padding-left: 0;
        list-style: none;              /* prevent double markers in browser */
        list-style-position: outside;
      }

      li {
        margin: 3px 0;
        position: relative;
        padding-left: 1.45em;          /* room for our marker */
        line-height: 1.5;
      }

      /* Bullets */
      ul > li::before {
        content: "•";
        position: absolute;
        left: 0;
        top: 0;
      }

      /* Ordered lists: level 1 = 1., 2., 3. */
      ol { counter-reset: ol1; }
      ol > li { counter-increment: ol1; }
      ol > li::before {
        content: counter(ol1) ". ";
        position: absolute;
        left: 0;
        top: 0;
        font-weight: 600;
      }

      /* Ordered lists: level 2 = a., b., c. */
      ol ol { counter-reset: ol2; margin-left: 22px; }
      ol ol > li { counter-increment: ol2; }
      ol ol > li::before {
        content: counter(ol2, lower-alpha) ". ";
        position: absolute;
        left: 0;
        top: 0;
        font-weight: 400;
      }

      /* Ordered lists: level 3 = i., ii., iii. */
      ol ol ol { counter-reset: ol3; margin-left: 22px; }
      ol ol ol > li { counter-increment: ol3; }
      ol ol ol > li::before {
        content: counter(ol3, lower-roman) ". ";
        position: absolute;
        left: 0;
        top: 0;
        font-weight: 400;
      }

      /* If Mammoth ever sets explicit types, respect them at top level */
      ol[type="a"] { counter-reset: ola; }
      ol[type="a"] > li { counter-increment: ola; }
      ol[type="a"] > li::before { content: counter(ola, lower-alpha) ". "; }

      ol[type="A"] { counter-reset: olA; }
      ol[type="A"] > li { counter-increment: olA; }
      ol[type="A"] > li::before { content: counter(olA, upper-alpha) ". "; }

      ol[type="i"] { counter-reset: oli; }
      ol[type="i"] > li { counter-increment: oli; }
      ol[type="i"] > li::before { content: counter(oli, lower-roman) ". "; }

      ol[type="I"] { counter-reset: olI; }
      ol[type="I"] > li { counter-increment: olI; }
      ol[type="I"] > li::before { content: counter(olI, upper-roman) ". "; }


      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
      img { max-width: 100%; height: auto; }

      /* Pagination controls */
      /* Pagination controls: allow flowing text/lists; protect headings + table rows */
      h2, h3, table, thead, tbody, tr, td, th {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      /* Allow lists to split across pages */
      ul, ol {
        break-inside: auto;
        page-break-inside: auto;
      }

      /* But avoid splitting a single list item across pages */
      li {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .page-break {
        break-before: page;
        page-break-before: always;
        height: 0; border: 0; margin: 0; padding: 0;
      }
    </style>
  `;

    const headerHtml = `
    <div class="gov-header">
      <div class="doc">
        <table class="header-table" role="presentation" aria-hidden="true">
          <colgroup>
            <col style="width:${HEADER_BRAND_COL_MM}mm;" />
            <col style="width:${180 - HEADER_BRAND_COL_MM - META_NARROW_COL_MM}mm;" />
            <col style="width:${META_NARROW_COL_MM}mm;" />
          </colgroup>

          <tr>
            <td class="brand-td">
              <div class="gov-brand">
                <img src="${escapeHtml(ALBERTA_LOGO_URL)}" alt="Alberta" crossorigin="anonymous" />
                ${
                  drawDept
                    ? `<div class="dept">
                        Public Safety and<br/>Emergency Services
                        <div class="branch">${escapeHtml(BRANCH_TEXT)}</div>
                      </div>`
                    : ``
                }
              </div>
            </td>

            <td class="wide">
              <div class="cell-label">SECTION</div>
              <div class="cell-value">${escapeHtml(section || "")}</div>
            </td>

            <td class="narrow">
              <div class="cell-label">NUMBER</div>
              <div class="cell-value number">${escapeHtml(number || "")}</div>
            </td>
          </tr>

          <tr>
            <!-- ✅ SUBJECT spans under logo by using colspan=2 -->
            <td class="wide" colspan="2">
              <div class="cell-label">SUBJECT</div>
              <div class="cell-value">${escapeHtml(subject || "")}</div>
            </td>

            <td class="narrow">
              <div class="cell-label">PAGE</div>
              <div class="cell-value page">&nbsp;</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;


  const showHeader = mode === "preview";

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" />${css}</head>
  <body class="${mode}">
    ${showHeader ? headerHtml : ""}   <!-- IMPORTANT -->
    <div class="doc policy-content">
      ${bodyHtml}
    </div>
  </body>
</html>`;
}

function makePdfName(originalName: string, number?: string, subject?: string) {
  const base = (subject?.trim() || originalName.replace(/\.docx$/i, "")).replace(/[^\w\s-]+/g, "");
  const num = (number || "").replace(/[^\w.-]+/g, "");
  const safe = `${num ? num + "_" : ""}${base}`.trim().replace(/\s+/g, "_");
  return `${safe || "policy"}.pdf`;
}

// ------------------------------
// Component
// ------------------------------
const UploadPolicyDocs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const policyIdFromUrl = (searchParams.get("policyId") || "").trim();
  const lockedToPolicy = !!policyIdFromUrl;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docHtml, setDocHtml] = useState<string>("");
  const [section, setSection] = useState("");
  const [number, setNumber] = useState("");
  const [subject, setSubject] = useState("");

  // Optional: attach to existing policy; if empty we auto-create one
  const [policyId, setPolicyId] = useState<string>("");
  const [versionNumber, setVersionNumber] = useState<number>(1);

  const previewRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    if (!policyIdFromUrl) return;

    if (!isUuid(policyIdFromUrl)) {
      toast.error("Invalid policyId in URL");
      return;
    }

    (async () => {
      // Verify policy exists, then prepopulate Policy ID
      const { data: pol, error: polErr } = await supabase
        .from("policies")
        .select("id")
        .eq("id", policyIdFromUrl)
        .maybeSingle();

      if (polErr || !pol) {
        toast.error("Target policy not found.");
        return;
      }

      setPolicyId(pol.id);

      // Set next version number
      const { data, error } = await supabase
        .from("policy_versions")
        .select("version_number")
        .eq("policy_id", pol.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) setVersionNumber((data?.version_number ?? 0) + 1);
    })();
  }, [policyIdFromUrl]);

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".docx")) {
      toast.error("Please select a .docx file");
      return;
    }
    setFile(f);
    setUploadComplete(false);

    try {
      console.log("[UploadPolicyDocs] Reading .docx…");
      console.log("[UploadPolicyDocs] Reading .docx…");
      const arrayBuffer = await f.arrayBuffer();

      const { value: html, messages } = await mammoth.convertToHtml(
        { arrayBuffer },
        { includeDefaultStyleMap: true }
      );
      const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
      const meta = extractPolicyMeta(rawText);
      setSection(meta.section);
      setNumber(meta.number);
      setSubject(meta.subject);

      const normalized = normalizePolicyHtml(html);
      setDocHtml(normalized);

      if (messages?.length) console.info("[UploadPolicyDocs] Mammoth messages:", messages);
      toast.success("Document parsed. Review header fields, then Convert & Upload.");
      if (messages?.length) console.info("[UploadPolicyDocs] Mammoth messages:", messages);
      toast.success("Document parsed. Review header fields, then Convert & Upload.");
    } catch (err) {
      console.error("[UploadPolicyDocs] DOCX parse error:", err);
      console.error("[UploadPolicyDocs] DOCX parse error:", err);
      toast.error("Failed to read the .docx file");
    }
  };

  const buildPdfHtml = () =>
    wrapWithPolicyTemplate({
      section,
      number,
      subject,
      bodyHtml: docHtml || "<p>(No content parsed)</p>",
      mode: "pdf",
    });

  const generatePdfBlob = async (): Promise<Blob> => {
    console.log("[UploadPolicyDocs] Generating PDF…");
    const PDF_FOOTER_RESERVED_MM = 12;
    const html = wrapWithPolicyTemplate({
      section,
      number,
      subject,
      bodyHtml: docHtml || "<p>(No content parsed)</p>",
      mode: "pdf",
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-99999px";
    iframe.style.top = "-99999px";
    document.body.appendChild(iframe);

    try {
      iframe.contentDocument?.open();
      iframe.contentDocument?.write(html);
      iframe.contentDocument?.close();

      await waitForIframeAssets(iframe);

      const target = iframe.contentDocument?.body as HTMLElement;
      const PDF_FOOTER_RESERVED_MM = 12;

      const margin: [number, number, number, number] = [
        PDF_BASE_MARGIN_MM + PDF_HEADER_RESERVED_MM + PDF_HEADER_GAP_MM,
        PDF_BASE_MARGIN_MM,
        PDF_BASE_MARGIN_MM + PDF_FOOTER_RESERVED_MM,
        PDF_BASE_MARGIN_MM,
      ];


      // Render HTML to canvas using html2canvas
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Create jsPDF instance
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Calculate content area dimensions
      const contentW = pageW - margin[1] - margin[3]; // left + right margins
      const contentH = pageH - margin[0] - margin[2]; // top + bottom margins

      // Scale canvas to fit the content width
      const imgW = contentW;
      const imgH = (canvas.height * contentW) / canvas.width;

      // Calculate how many pages are needed
      const totalPages = Math.ceil(imgH / contentH);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();

        // Calculate the portion of the canvas for this page
        const sourceY = (i * contentH / imgH) * canvas.height;
        const sourceH = Math.min((contentH / imgH) * canvas.height, canvas.height - sourceY);

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceH;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceH,
            0, 0, canvas.width, sourceH
          );
        }

        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.98);
        const sliceH = (sourceH / canvas.height) * imgH;
        pdf.addImage(pageImgData, "JPEG", margin[3], margin[0], imgW, sliceH);
      }

      const total = totalPages;

      // Load logo once and reuse
      const logoDataUrl = await fetchAsDataUrl(ALBERTA_LOGO_URL);
      const logoAspect = logoDataUrl ? await getImageAspect(logoDataUrl) : 3;
      const logo = logoDataUrl ? { dataUrl: logoDataUrl, aspect: logoAspect } : null;

      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        drawAlbertaHeader(pdf, i, total, { section: section || "", number: number || "", subject: subject || "" }, logo);
        drawAlbertaFooter(pdf, "Classification: Protected B");
      }

      const pdfBlob = pdf.output("blob");
      if (!pdfBlob || !pdfBlob.size) throw new Error("PDF generation produced an empty blob");
      return pdfBlob;
    } finally {
      document.body.removeChild(iframe);
    }
  };

  const handleConvertAndUpload = async () => {
    if (!file) toast.error("Please select a .docx file first");
    if (!docHtml) toast.error("Nothing to convert (failed to parse?)");
    if (!file || !docHtml) return;
    if (!file) toast.error("Please select a .docx file first");
    if (!docHtml) toast.error("Nothing to convert (failed to parse?)");
    if (!file || !docHtml) return;

    setIsUploading(true);
    setUploadComplete(false);

    try {
      console.log("[UploadPolicyDocs] Begin convert & upload flow");
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("You must be signed in to upload.");

      // 0) Decide which policy to attach to
      let ensuredPolicyId = (policyIdFromUrl || policyId || "").trim();

      if (lockedToPolicy) {
        // In locked mode, do NOT create a new policy.
        if (!ensuredPolicyId) throw new Error("Missing policyId in URL.");
        if (!isUuid(ensuredPolicyId)) throw new Error("Invalid Policy ID");

        const { data: existing, error: exErr } = await supabase
          .from("policies")
          .select("id")
          .eq("id", ensuredPolicyId)
          .maybeSingle();

        if (exErr) throw exErr;
        if (!existing) throw new Error("Target policy not found.");
      } else {
        if (ensuredPolicyId) {
          if (!isUuid(ensuredPolicyId)) throw new Error("Invalid Policy ID");

          const { data: existing, error: exErr } = await supabase
            .from("policies")
            .select("id")
            .eq("id", ensuredPolicyId)
            .maybeSingle();

          if (exErr) throw exErr;
          if (!existing) throw new Error("Target policy not found.");
        } else {
          // Only create a new policy when there is truly no policyId
          const title = (subject?.trim() || file.name.replace(/\.docx$/i, "").trim()).slice(0, 200);
          const description = section?.trim() || null;
          const category = "General";

          const { data: created, error: cErr } = await supabase
            .from("policies")
            .insert({
              title,
              description,
              category,
              status: "draft",
              created_by: user.id,
            })
            .select("id")
            .single();

          if (cErr) throw new Error(`Failed to create policy: ${cErr.message}`);
          ensuredPolicyId = created!.id;
        }
      }

      // 1) Generate PDF
      const pdfBlob = await generatePdfBlob();
      const pdfName = makePdfName(file.name, number, subject);

      // 2) Upload PDF to Storage
      // 2) Upload PDF to Storage
      const path = `formatted/${Date.now()}_${pdfName}`;
      console.log("[UploadPolicyDocs] Uploading to Storage path:", path);
      console.log("[UploadPolicyDocs] Uploading to Storage path:", path);
      const { error: upErr } = await supabase.storage
        .from("policy-documents")
        .upload(path, pdfBlob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

      // 3) Public URL (use signed URLs instead if your bucket is private)
      // 3) Public URL (use signed URLs instead if your bucket is private)
      const { data: pub } = supabase.storage.from("policy-documents").getPublicUrl(path);
      const publicUrl = pub?.publicUrl ?? null;
      console.log("[UploadPolicyDocs] Public URL:", publicUrl);
      if (!publicUrl) throw new Error("Could not obtain a public URL for the uploaded PDF. Is the bucket public?");
      // 4) Insert policy_versions
      const { data: inserted, error: insErr } = await supabase
        .from("policy_versions")
        .insert({
          policy_id: ensuredPolicyId,
          version_number: versionNumber,
          file_name: pdfName,
          file_size: pdfBlob.size,
          file_url: publicUrl,
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      
      if (insErr) throw new Error(`Failed to create policy version: ${insErr.message}`);
      const versionId = inserted!.id;

      // 5) Update policies.current_version_id (+ publish if allowed)
      const { error: updErr } = await supabase
        .from("policies")
        .update({ current_version_id: versionId, status: "published" })
        .eq("id", ensuredPolicyId);
      if (updErr) {
        // Fallback if 'published' isn't a valid enum value in your DB
        const { error: fallback } = await supabase
          .from("policies")
          .update({ current_version_id: versionId })
          .eq("id", ensuredPolicyId);
        if (fallback) throw new Error(`Failed to set current version on policy: ${fallback.message}`);
      }

      setUploadComplete(true);
      toast.success("Policy created, converted to PDF, and linked!");
      console.log("[UploadPolicyDocs] All done → redirect to detail");
      navigate(`/dashboard/policies/${ensuredPolicyId}`);
      toast.success("Policy created, converted to PDF, and linked!");
      console.log("[UploadPolicyDocs] All done → redirect to detail");
      navigate(`/dashboard/policies/${ensuredPolicyId}`);
    } catch (error: any) {
      console.error("[UploadPolicyDocs] Convert/Upload error:", error);
      toast.error(error?.message ?? "Failed to convert and upload");
      console.error("[UploadPolicyDocs] Convert/Upload error:", error);
      toast.error(error?.message ?? "Failed to convert and upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <Card className="max-w-4xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Upload &amp; Format Policy (.docx → PDF)
          </CardTitle>
          <CardDescription>
            Select a Word document. We’ll clean the layout, standardize the header (Section/Number/Subject), render a
            preview, convert to PDF, and upload it to Supabase Storage. If no Policy ID is provided, we’ll create a new
            policy automatically, attach this file as a version, and publish it.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-xs text-muted-foreground">
            Debug: file={String(!!file)}, htmlLen={docHtml.length}, btnDisabled=
            {(!file || !docHtml || isUploading) ? "yes" : "no"}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="docx">Word Document (.docx)</Label>
              <Input id="docx" type="file" accept=".docx" onChange={onPickFile} />
              <p className="text-xs text-muted-foreground">We’ll normalize headings, lists, spacing, and apply a consistent header.</p>
            </div>

            <div className="space-y-2">
              <Label>Policy ID {lockedToPolicy ? "" : "(optional)"}</Label>
              <Input
                placeholder={lockedToPolicy ? "" : "Leave blank to auto-create a Policy"}
                value={policyId}
                disabled={lockedToPolicy}
                onChange={(e) => setPolicyId(e.target.value)}
              />
              {lockedToPolicy && <p className="text-xs text-muted-foreground">Uploading a new version for this policy.</p>}

              <Label className="mt-2">Version Number</Label>
              <Input
                type="number"
                min={1}
                value={versionNumber}
                onChange={(e) => setVersionNumber(parseInt(e.target.value || "1", 10))}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Section</Label>
              <Input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g., Electronic Supervision – Mobile Monitoring Unit"
              />
            </div>
            <div className="space-y-2">
              <Label>Number</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g., 8.01.01" />
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g., 8.01.01" />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Reporting and Supervision Standards" />
            </div>
          </div>

          {uploadComplete && (
            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Upload completed successfully!</span>
            </div>
          )}

          <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 rounded-lg">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Note:</p>
              <p>You can remove this page later; it’s a one-time utility for converting legacy Word files.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleConvertAndUpload} disabled={!file || !docHtml || isUploading} size="lg" className="w-full sm:w-auto">
              {isUploading ? "Converting & Uploading..." : "Convert to PDF & Upload"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const w = window.open();
                if (!w) return;
                w.document.open();
                w.document.write(buildPdfHtml());
                w.document.close();
              }}
              disabled={!docHtml}
              className="w-full sm:w-auto"
            >
              <FileText className="h-4 w-4 mr-2" />
              Preview PDF (print view)
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Formatted Preview</h3>
            <div
              ref={previewRef}
              className="border rounded-lg p-5 max-h-[60vh] overflow-auto bg-white dark:bg-zinc-900"
              dangerouslySetInnerHTML={{
                __html: wrapWithPolicyTemplate({
                  section,
                  number,
                  subject,
                  bodyHtml: docHtml || "<p>(No content parsed)</p>",
                  mode: "preview",
                  drawDepartmentText: DRAW_DEPARTMENT_TEXT,
                }),
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadPolicyDocs;
