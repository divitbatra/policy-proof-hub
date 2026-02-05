import { useState, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Plus, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { loginRequest } from "@/lib/msalConfig";
import { useMicrosoftGraph } from "@/hooks/useMicrosoftGraph";

interface OneDriveFile {
  id: string;
  name: string;
  webUrl: string;
}

const WordOnlineEmbed = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { createWordDocument, listWordDocuments } = useMicrosoftGraph();
  
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<OneDriveFile[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<OneDriveFile | null>(null);
  const [newDocName, setNewDocName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
      toast.success("Signed in successfully");
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Failed to sign in");
    }
  };

  const handleLogout = () => {
    instance.logoutPopup();
    setSelectedDoc(null);
    setDocuments([]);
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await listWordDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocName.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    setIsCreating(true);
    try {
      const doc = await createWordDocument(newDocName.trim());
      if (doc) {
        setDocuments((prev) => [doc, ...prev]);
        setSelectedDoc(doc);
        setNewDocName("");
        toast.success("Document created");
      }
    } catch (error) {
      console.error("Failed to create document:", error);
      toast.error("Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  const getEmbedUrl = (webUrl: string) => {
    // Convert OneDrive web URL to embed URL
    return webUrl.replace("view.aspx", "embed");
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <FileText className="h-6 w-6" />
            PPDU Brief Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Sign in with your Microsoft account to create and edit Word documents online.
          </p>
          <Button onClick={handleLogin} size="lg">
            Sign in with Microsoft
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">PPDU Brief Editor</h1>
          <span className="text-sm text-muted-foreground">
            ({accounts[0]?.username})
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadDocuments} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {!selectedDoc ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Create New Document */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Document name"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateDocument()}
              />
              <Button onClick={handleCreateDocument} disabled={isCreating} className="w-full">
                {isCreating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Document
              </Button>
            </CardContent>
          </Card>

          {/* Document List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No documents found. Create one to get started.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="truncate">{doc.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)}>
              ← Back to documents
            </Button>
            <span className="font-medium">{selectedDoc.name}</span>
          </div>
          
          <Card className="overflow-hidden">
            <iframe
              src={getEmbedUrl(selectedDoc.webUrl)}
              className="w-full h-[700px] border-0"
              title="Word Online Editor"
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default WordOnlineEmbed;
