// src/utils/formatPolicy.ts
import DOMPurify from "dompurify";

/**
 * Try to pull out SECTION / NUMBER / SUBJECT from the raw text
 * Fallback gracefully if not present.
 */
export function extractPolicyMeta(rawText: string) {
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

/**
 * Normalize heading levels and bullet spacing, remove repeated "Classification" footers, etc.
 */
export function normalizePolicyHtml(html: string) {
  let clean = html;

  // Remove redundant "Classification: Protected ..." spam blocks (common in exported docs)
  clean = clean.replace(/Classification:\s*Protected\s+[AB]\s*/gi, "");

  // Normalize multiple empty paragraphs
  clean = clean.replace(/(<p>\s*<\/p>){2,}/g, "<p>&nbsp;</p>");

  // Convert ALL-CAPS headings to h2/h3 if they look like headings
  clean = clean.replace(
    /<p>(POLICY STATEMENT|DEFINITIONS|STANDARDS|PROCEDURES|SCOPE|PURPOSE):?\s*<\/p>/gi,
    (_, cap: string) => `<h2>${toTitleCase(cap)}</h2>`
  );

  // Tighten list spacing that Word sometimes explodes
  clean = clean.replace(/<ul>([\s\S]*?)<\/ul>/g, (m) =>
    m.replace(/<p>\s*<\/p>/g, "")
  );

  // Sanitize
  clean = DOMPurify.sanitize(clean, { USE_PROFILES: { html: true } });
  return clean;
}

/**
 * Wrap the sanitized body with a standardized header block.
 * Page numbering will be handled by CSS when printing.
 */
export function wrapWithPolicyTemplate(opts: {
  section?: string;
  number?: string;
  subject?: string;
  bodyHtml: string;
}) {
  const { section, number, subject, bodyHtml } = opts;

  // CSS is embedded so the PDF looks the same everywhere.
  const css = `
    <style>
      @page { margin: 22mm; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif; color: #111827; }
      .header {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: end;
        border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 18px;
      }
      .header-left { display: grid; grid-template-columns: 120px 1fr; row-gap: 6px; column-gap: 10px; }
      .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
      .value { font-weight: 600; font-size: 14px; color: #0f172a; }
      .title { font-weight: 700; font-size: 18px; color: #0f172a; }
      h1, h2, h3 { color: #0f172a; }
      h1 { font-size: 22px; margin: 18px 0 10px; }
      h2 { font-size: 18px; margin: 16px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
      h3 { font-size: 16px; margin: 12px 0 6px; }
      p { line-height: 1.5; margin: 8px 0; }
      ul, ol { margin: 8px 0 8px 22px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
      footer { position: fixed; bottom: 10mm; left: 0; right: 0; text-align: right; font-size: 11px; color: #6b7280; }
      .page-number:before { content: counter(page); }
    </style>
  `;

  const headerHtml = `
    <div class="header">
      <div class="header-left">
        <div class="label">Section</div><div class="value">${escapeHtml(section || "—")}</div>
        <div class="label">Number</div><div class="value">${escapeHtml(number || "—")}</div>
        <div class="label">Subject</div><div class="value title">${escapeHtml(subject || "—")}</div>
      </div>
      <div style="text-align:right; font-size:12px; color:#6b7280;">
        Policy Proof Hub
      </div>
    </div>
  `;

  const footerHtml = `
    <footer>Page <span class="page-number"></span></footer>
  `;

  return `<!doctype html>
  <html>
    <head><meta charset="utf-8" />${css}</head>
    <body>
      ${headerHtml}
      ${bodyHtml}
      ${footerHtml}
    </body>
  </html>`;
}

function toTitleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]!));
}
