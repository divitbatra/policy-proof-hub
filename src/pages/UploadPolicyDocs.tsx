// src/pages/UploadPolicyDocs.tsx
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import * as mammoth from "mammoth";
import html2pdf from "html2pdf.js";
import DOMPurify from "dompurify";
// optional: pull out the function
const { sanitize } = DOMPurify;
import { supabase } from "@/integrations/supabase/client";

// ------------------------------
// Small helpers (inlined)
// ------------------------------
function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]!));
}

/** Pull SECTION / NUMBER / SUBJECT from raw text, if present. */
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

/** Clean up Word-y HTML: headings, spacing, remove repeated footers, sanitize. */
function normalizePolicyHtml(html: string) {
  let clean = html;

  // Remove typical classification footers/headers
  clean = clean.replace(/Classification:\s*Protected\s+[AB]\s*/gi, "");

  // Collapse multiple empty paragraphs
  clean = clean.replace(/(<p>\s*<\/p>){2,}/g, "<p>&nbsp;</p>");

  // Convert ALL-CAPS lines that look like section headings
  clean = clean.replace(
    /<p>(POLICY STATEMENT|DEFINITIONS|STANDARDS|PROCEDURES|SCOPE|PURPOSE|BACKGROUND|RESPONSIBILITIES):?\s*<\/p>/gi,
    (_, cap: string) => `<h2>${toTitleCase(cap)}</h2>`
  );

  // Tighten list spacing
  clean = clean.replace(/<ul>([\s\S]*?)<\/ul>/g, (m) => m.replace(/<p>\s*<\/p>/g, ""));

  // Sanitize to be safe
  clean = sanitize(clean, { USE_PROFILES: { html: true } });
  return clean;
}

/** Wraps body HTML with a consistent policy header + print styles + footer page numbers. */
function wrapWithPolicyTemplate(opts: {
  section?: string;
  number?: string;
  subject?: string;
  bodyHtml: string;
}) {
  const { section, number, subject, bodyHtml } = opts;

  const css = `
    <style>
      @page { margin: 22mm; }
      html, body { height: 100%; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif;
        color: #111827;
      }
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

  const footerHtml = `<footer>Page <span class="page-number"></span></footer>`;

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docHtml, setDocHtml] = useState<string>("");
  const [section, setSection] = useState("");
  const [number, setNumber] = useState("");
  const [subject, setSubject] = useState("");

  // Optional: attach the upload to a policy/policy_versions row
  const [policyId, setPolicyId] = useState<string>("");
  const [versionNumber, setVersionNumber] = useState<number>(1);

  const previewRef = useRef<HTMLDivElement>(null);

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
      const arrayBuffer = await f.arrayBuffer();

      // Convert DOCX -> HTML (structure-focused)
      const { value: html, messages } = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: ["p[style-name='List Paragraph'] => ul > li:fresh"],
          includeDefaultStyleMap: true,
        }
      );

      // Extract raw text for metadata detection
      const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
      const meta = extractPolicyMeta(rawText);
      setSection(meta.section);
      setNumber(meta.number);
      setSubject(meta.subject);

      const normalized = normalizePolicyHtml(html);
      setDocHtml(normalized);

      if (messages?.length) {
        console.info("Mammoth messages:", messages);
      }

      toast.success("Document parsed. Review the preview, tweak header fields, then Convert & Upload.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to read the .docx file");
    }
  };

  const buildPdfHtml = () =>
    wrapWithPolicyTemplate({
      section,
      number,
      subject,
      bodyHtml: docHtml || "<p>(No content parsed)</p>",
    });

  /** Generate a PDF Blob by rendering the formatted HTML into a hidden iframe for html2pdf. */
  const generatePdfBlob = async (): Promise<Blob> => {
    const html = buildPdfHtml();

    // Render HTML into a hidden iframe so html2pdf can capture it accurately
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-99999px";
    iframe.style.top = "-99999px";
    document.body.appendChild(iframe);
    iframe.contentDocument?.open();
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();

    const target = iframe.contentDocument?.body as HTMLElement;

    // Use literals to reduce TS friction; cast shape at call site
    const opt = {
      margin: [10, 10, 15, 10], // top, left, bottom, right
      filename: makePdfName(file?.name ?? "policy.docx", number, subject),
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    };

    const worker = html2pdf().from(target).set(opt as any);
    const pdfBlob: Blob = await worker.outputPdf("blob");

    // cleanup
    document.body.removeChild(iframe);
    return pdfBlob;
  };

  const handleConvertAndUpload = async () => {
    if (!file) {
      toast.error("Please select a .docx file first");
      return;
    }
    if (!docHtml) {
      toast.error("Nothing to convert (failed to parse?)");
      return;
    }

    setIsUploading(true);
    setUploadComplete(false);

    try {
      // 1) Generate PDF
      const pdfBlob = await generatePdfBlob();
      const pdfName = makePdfName(file.name, number, subject);

      // 2) Upload to Supabase Storage
      const path = `formatted/${Date.now()}_${pdfName}`;
      const { error: upErr } = await supabase.storage
        .from("policy-documents")
        .upload(path, pdfBlob, { contentType: "application/pdf", upsert: false });

      if (upErr) throw upErr;

      // 3) Get public URL
      const { data: pub } = supabase.storage.from("policy-documents").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;

      // 4) (Optional) Insert a policy_versions row
      if (policyId && publicUrl) {
        const { error: dbErr } = await supabase.from("policy_versions").insert({
          policy_id: policyId,
          version_number: versionNumber,
          file_name: pdfName,
          file_size: pdfBlob.size,
          file_url: publicUrl,
          published_at: new Date().toISOString(),
        });
        if (dbErr) throw dbErr;
      }

      setUploadComplete(true);
      toast.success("Converted to PDF and uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.message ?? "Failed to convert/upload");
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
            Upload & Format Policy (.docx → PDF)
          </CardTitle>
          <CardDescription>
            Select a Word document. We’ll clean the layout, standardize the header (Section/Number/Subject),
            render a preview, convert to PDF, and upload it to Supabase Storage. Optionally, create a new
            policy version record.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="docx">Word Document (.docx)</Label>
              <Input id="docx" type="file" accept=".docx" onChange={onPickFile} />
              <p className="text-xs text-muted-foreground">
                We’ll normalize headings, lists, spacing, and apply a consistent header.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Policy ID (optional)</Label>
              <Input
                placeholder="UUID of policy (to create a policy_versions row)"
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
              />
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
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g., 8.01.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Reporting and Supervision Standards"
              />
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
            <Button
              onClick={handleConvertAndUpload}
              disabled={!file || !docHtml || isUploading}
              size="lg"
              className="w-full sm:w-auto"
            >
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

          {/* Live HTML preview (before PDF) */}
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
