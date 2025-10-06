import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadPolicyDocuments } from "@/utils/uploadPolicyDocuments";
import { toast } from "sonner";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

const UploadPolicyDocs = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadComplete(false);
    
    try {
      await uploadPolicyDocuments();
      setUploadComplete(true);
      toast.success("All policy documents uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload policy documents");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Upload Policy Documents
          </CardTitle>
          <CardDescription>
            This utility will upload sample policy documents to the storage bucket
            and update all policy versions in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will upload the following documents:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Remote Work Policy (3 versions)</li>
              <li>Data Security Policy (3 versions)</li>
              <li>Code of Conduct (2 versions)</li>
              <li>Expense Reimbursement (3 versions)</li>
            </ul>
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
              <p>After uploading, you can delete this page and the utility script as they're only needed once.</p>
            </div>
          </div>
          
          <Button 
            onClick={handleUpload} 
            disabled={isUploading}
            size="lg"
            className="w-full"
          >
            {isUploading ? "Uploading..." : "Upload All Policy Documents"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadPolicyDocs;
