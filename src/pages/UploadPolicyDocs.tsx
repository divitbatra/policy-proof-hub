// src/pages/UploadPolicyDocs.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import * as mammoth from "mammoth";
import html2pdf from "html2pdf.js";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";

const sanitize = DOMPurify.sanitize;

// ------------------------------
// Helpers
// ------------------------------
function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]!));
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
  clean = clean.replace(/Classification:\s*Protected\s+[AB]\s*/gi, "");
  clean = clean.replace(/(<p>\s*<\/p>){2,}/g, "<p>&nbsp;</p>");
  clean = clean.replace(
    /<p>(POLICY STATEMENT|DEFINITIONS|STANDARDS|PROCEDURES|SCOPE|PURPOSE|BACKGROUND|RESPONSIBILITIES):?\s*<\/p>/gi,
    (_, cap: string) => `<h2>${toTitleCase(cap)}</h2>`
  );
  clean = clean.replace(/<ul>([\s\S]*?)<\/ul>/g, (m) => m.replace(/<p>\s*<\/p>/g, ""));
  clean = sanitize(clean, { USE_PROFILES: { html: true } });
  return clean;
}

function wrapWithPolicyTemplate(opts: { section?: string; number?: string; subject?: string; bodyHtml: string }) {
  const { section, number, subject, bodyHtml } = opts;

  const css = `
    <style>
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      @page { margin: 15mm; }
      html, body { height: 100%; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif;
        color: #111827;
      }

      /* A4 210mm: content width = 210 - 2*15 = 180mm */
      .doc { width: 180mm; margin: 0 auto; }

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
      img { max-width: 100%; height: auto; }

      footer { position: fixed; bottom: 10mm; left: 0; right: 0; text-align: right; font-size: 11px; color: #6b7280; }
      .page-number:before { content: counter(page); }

      /* Pagination controls */
      h2, h3, p, ul, ol, li, table, thead, tbody, tr, td, th {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .page-break, .html2pdf__page-break {
        break-before: page;
        page-break-before: always;
        height: 0; border: 0; margin: 0; padding: 0;
      }
    </style>
  `;

  const headerHtml = `
    <div class="header">
      <div class="header-left">
        <div class="label">Section</div><div class="value">${escapeHtml(section || "—")}</div>
        <div class="label">Number</div><div class="value">${escapeHtml(number || "—")}</div>
        <div class="label">Subject</div><div class="value title">${escapeHtml(subject || "—")}</div>
      </div>
      <div style="text-align:right; font-size:12px; color:#6b7280;">Policy Proof Hub</div>
    </div>
  `;

  const footerHtml = `<footer>Page <span class="page-number"></span></footer>`;

  return `<!doctype html>
  <html>
    <head><meta charset="utf-8" />${css}</head>
    <body>
      <div class="doc">
        ${headerHtml}
        ${bodyHtml}
      </div>
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
  const navigate = useNavigate();

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
      const arrayBuffer = await f.arrayBuffer();

      const { value: html, messages } = await mammoth.convertToHtml(
        { arrayBuffer },
        { styleMap: ["p[style-name='List Paragraph'] => ul > li:fresh"], includeDefaultStyleMap: true }
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
    } catch (err) {
      console.error("[UploadPolicyDocs] DOCX parse error:", err);
      toast.error("Failed to read the .docx file");
    }
  };

  const buildPdfHtml = () =>
    wrapWithPolicyTemplate({ section, number, subject, bodyHtml: docHtml || "<p>(No content parsed)</p>" });

  const generatePdfBlob = async (): Promise<Blob> => {
    console.log("[UploadPolicyDocs] Generating PDF…");
    const html = buildPdfHtml();

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-99999px";
    iframe.style.top = "-99999px";
    document.body.appendChild(iframe);
    try {
      iframe.contentDocument?.open();
      iframe.contentDocument?.write(html);
      iframe.contentDocument?.close();
    } catch (err) {
      console.error("[UploadPolicyDocs] Iframe write error:", err);
      document.body.removeChild(iframe);
      throw err;
    }

    const target = iframe.contentDocument?.body as HTMLElement;

    const margin: [number, number, number, number] = [10, 10, 12, 10];
    const opt = {
      margin,
      filename: makePdfName(file?.name ?? "policy.docx", number, subject),
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      pagebreak: { mode: ["css", "legacy"], avoid: ["h2", "h3", "p", "ul", "ol", "li", "table"] },
    };

    let pdfBlob: Blob | null = null;

    try {
      // Some builds expose outputPdf
     
      const w1 = html2pdf().from(target).set(opt as any);
  
      if (typeof w1.outputPdf === "function") {
 
        pdfBlob = await w1.outputPdf("blob");
        console.log("[UploadPolicyDocs] PDF generated via outputPdf");
      }
    } catch (e) {
      console.warn("[UploadPolicyDocs] outputPdf failed/absent:", e);
    }

    if (!pdfBlob) {
      try {
        // Canonical path
        const pdf = await (html2pdf() as any).from(target).set(opt as any).toPdf().get("pdf");
        pdfBlob = pdf.output("blob");
        console.log("[UploadPolicyDocs] PDF generated via toPdf().get('pdf').output('blob')");
      } catch (e) {
        console.error("[UploadPolicyDocs] Fallback PDF generation failed:", e);
      }
    }

    document.body.removeChild(iframe);

    if (!pdfBlob || !pdfBlob.size) throw new Error("PDF generation produced an empty blob");
    console.log("[UploadPolicyDocs] PDF size(bytes):", pdfBlob.size);
    return pdfBlob;
  };

  const handleConvertAndUpload = async () => {
    if (!file) toast.error("Please select a .docx file first");
    if (!docHtml) toast.error("Nothing to convert (failed to parse?)");
    if (!file || !docHtml) return;

    setIsUploading(true);
    setUploadComplete(false);

    try {
      console.log("[UploadPolicyDocs] Begin convert & upload flow");
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("You must be signed in to upload.");

      // 0) Create a policy if none provided (per your schema: no 'number' column)
      let ensuredPolicyId = policyId?.trim();
      if (!ensuredPolicyId) {
        const title = (subject?.trim() || file.name.replace(/\.docx$/i, "").trim()).slice(0, 200);
        const description = section?.trim() || null;
        const category = "General";

        const { data: created, error: cErr } = await supabase
          .from("policies")
          .insert({
            title,
            description,
            category,
            status: "draft", // must exist in your policy_status enum
            created_by: user.id,
          })
          .select("id")
          .single();

        if (cErr) throw new Error(`Failed to create policy: ${cErr.message}`);
        ensuredPolicyId = created!.id;
        console.log("[UploadPolicyDocs] Created policy", ensuredPolicyId);
      } else {
        console.log("[UploadPolicyDocs] Using existing policy", ensuredPolicyId);
      }

      // 1) Generate PDF
      const pdfBlob = await generatePdfBlob();
      const pdfName = makePdfName(file.name, number, subject);

      // 2) Upload PDF to Storage
      const path = `formatted/${Date.now()}_${pdfName}`;
      console.log("[UploadPolicyDocs] Uploading to Storage path:", path);
      const { error: upErr } = await supabase.storage
        .from("policy-documents")
        .upload(path, pdfBlob, { contentType: "application/pdf", upsert: false });
      if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

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
    } catch (error: any) {
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
            Upload & Format Policy (.docx → PDF)
          </CardTitle>
          <CardDescription>
            Select a Word document. We’ll clean the layout, standardize the header (Section/Number/Subject),
            render a preview, convert to PDF, and upload it to Supabase Storage. If no Policy ID is provided,
            we’ll create a new policy automatically, attach this file as a version, and publish it.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-xs text-muted-foreground">
            Debug: file={String(!!file)}, htmlLen={docHtml.length}, btnDisabled={(!file || !docHtml || isUploading) ? "yes" : "no"}
          </div>

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
                placeholder="Leave blank to auto-create a Policy"
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
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g., 8.01.01" />
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
