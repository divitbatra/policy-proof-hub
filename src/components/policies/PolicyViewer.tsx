import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface PolicyViewerProps {
  policy: any;
}

const PolicyViewer = ({ policy }: PolicyViewerProps) => {
  const [fileUrl, setFileUrl] = useState<string>("");
  const [fileError, setFileError] = useState<boolean>(false);
  
  const currentVersion = policy.policy_versions?.find(
    (v: any) => v.id === policy.current_version_id
  );

  useEffect(() => {
    const getSignedUrl = async () => {
      if (!currentVersion?.file_url) return;
      
      // Extract the file path from the full URL
      const urlParts = currentVersion.file_url.split('/policy-documents/');
      if (urlParts.length < 2) {
        setFileError(true);
        return;
      }
      
      const filePath = urlParts[1];
      
      const { data, error } = await supabase.storage
        .from('policy-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error getting signed URL:', error);
        setFileError(true);
        toast.error('Policy document not found in storage');
        return;
      }
      
      if (data?.signedUrl) {
        setFileUrl(data.signedUrl);
        setFileError(false);
      }
    };
    
    getSignedUrl();
  }, [currentVersion]);

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.click();
      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "default";
      case "draft": return "secondary";
      case "review": return "outline";
      case "archived": return "destructive";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{policy.title}</CardTitle>
              <CardDescription className="text-base">
                {policy.description}
              </CardDescription>
            </div>
            <Badge variant={getStatusColor(policy.status)} className="text-sm">
              {policy.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created by:</span>
              <span className="font-medium">{policy.created_by_profile?.full_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{format(new Date(policy.created_at), "PPP")}</span>
            </div>
            {policy.category && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{policy.category}</span>
              </div>
            )}
            {currentVersion && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Version:</span>
                <span className="font-medium">{currentVersion.version_number}</span>
              </div>
            )}
          </div>

          {currentVersion && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Current Version Document</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(fileUrl, currentVersion.file_name)}
                    disabled={!fileUrl || fileError}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{currentVersion.file_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{(currentVersion.file_size / 1024).toFixed(2)} KB</span>
                        {currentVersion.published_at && (
                          <span>Published: {format(new Date(currentVersion.published_at), "PPP")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* PDF Viewer */}
                  <div className="border rounded-lg overflow-hidden bg-background">
                    {fileError ? (
                      <div className="w-full h-[800px] flex items-center justify-center">
                        <div className="text-center space-y-4 p-8">
                          <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                          <div>
                            <p className="font-medium text-lg">Document Not Found</p>
                            <p className="text-muted-foreground mt-2">
                              This policy document file doesn't exist in storage.
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Please upload a new version using the Edit tab.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : fileUrl ? (
                      <iframe
                        src={fileUrl}
                        className="w-full h-[800px]"
                        title="Policy Document Viewer"
                      />
                    ) : (
                      <div className="w-full h-[800px] flex items-center justify-center">
                        <p className="text-muted-foreground">Loading document...</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {currentVersion.change_summary && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Change Summary:</p>
                    <p className="text-sm text-muted-foreground">{currentVersion.change_summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicyViewer;
