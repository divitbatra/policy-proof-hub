import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save,
  Download,
  Upload,
  FileText,
  Loader2,
  FilePlus,
} from "lucide-react";

interface PPDUToolbarProps {
  documentTitle: string;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onDownload: () => void;
  onImport: () => void;
  onNewDocument: () => void;
  isImporting: boolean;
}

const PPDUToolbar = ({
  documentTitle,
  onTitleChange,
  onSave,
  onDownload,
  onImport,
  onNewDocument,
  isImporting,
}: PPDUToolbarProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <Input
          value={documentTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-xl font-semibold border-none bg-transparent px-0 focus-visible:ring-0 w-auto"
          style={{ width: `${Math.max(200, documentTitle.length * 12)}px` }}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onNewDocument}>
          <FilePlus className="h-4 w-4 mr-2" />
          New PPDU Brief
        </Button>
        <Button variant="outline" onClick={onImport} disabled={isImporting}>
          {isImporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Import .docx
        </Button>
        <Button variant="outline" onClick={onSave}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
};

export default PPDUToolbar;
