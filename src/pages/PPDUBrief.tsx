import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import mammoth from "mammoth";
import loadHTMLToDOCX from "@/utils/htmlToDocx";

import PPDUEditor from "@/components/ppdu/PPDUEditor";
import PPDUToolbar from "@/components/ppdu/PPDUToolbar";
import { PPDU_BRIEF_TEMPLATE, generateDownloadHtml } from "@/components/ppdu/ppduTemplates";

const PPDUBrief = () => {
  const [documentTitle, setDocumentTitle] = useState("PPDU Brief");
  const [content, setContent] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved content on mount
  useEffect(() => {
    const savedContent = localStorage.getItem("ppdu-brief-content");
    const savedTitle = localStorage.getItem("ppdu-brief-title");
    if (savedContent) {
      setContent(savedContent);
    }
    if (savedTitle) {
      setDocumentTitle(savedTitle);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("ppdu-brief-content", content);
    localStorage.setItem("ppdu-brief-title", documentTitle);
    toast.success("Document saved locally");
  };

  const handleDownload = async () => {
    try {
      const htmlContent = generateDownloadHtml(documentTitle, content);
      const convert = await loadHTMLToDOCX();
      const docxBlob = await convert(htmlContent, undefined, {
        table: { row: { cantSplit: true } },
        font: "Calibri",
        fontSize: 22,
      });
      const url = URL.createObjectURL(docxBlob as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${documentTitle.replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Document downloaded as DOCX");
    } catch (error) {
      console.error("Error generating DOCX:", error);
      toast.error("Failed to download document");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      toast.error("Please select a .docx file");
      return;
    }

    setIsImporting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      setContent(result.value);
      
      // Set document title from filename
      const fileName = file.name.replace(/\.docx$/i, "");
      setDocumentTitle(fileName);

      if (result.messages.length > 0) {
        console.log("Mammoth conversion messages:", result.messages);
      }

      toast.success("Document imported successfully");
    } catch (error) {
      console.error("Error importing document:", error);
      toast.error("Failed to import document");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleNewDocument = () => {
    setDocumentTitle("PPDU Brief");
    setContent(PPDU_BRIEF_TEMPLATE);
    toast.success("New PPDU Brief template created");
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileImport}
          className="hidden"
        />
        
        <PPDUToolbar
          documentTitle={documentTitle}
          onTitleChange={setDocumentTitle}
          onSave={handleSave}
          onDownload={handleDownload}
          onImport={handleImportClick}
          onNewDocument={handleNewDocument}
          isImporting={isImporting}
        />

        <Card className="shadow-lg">
          <CardContent className="p-0">
            <PPDUEditor
              content={content}
              onContentChange={setContent}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PPDUBrief;
