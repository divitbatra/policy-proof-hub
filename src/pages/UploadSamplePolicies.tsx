import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const UploadSamplePolicies = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const { data, error: invokeError } = await supabase.functions.invoke('upload-sample-policies');

      if (invokeError) {
        throw invokeError;
      }

      setResult(data);
      toast.success(`Successfully uploaded ${data.uploadedCount} policy documents!`);
    } catch (err: any) {
      console.error('Error uploading policies:', err);
      setError(err.message || 'An error occurred while uploading policies');
      toast.error("Failed to upload policies");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Sample Policy Documents
            </CardTitle>
            <CardDescription>
              Upload sample PDF documents for existing policies in the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                This will upload sample policy documents (Code of Conduct, Data Security, Expense Reimbursement, Remote Work) 
                to the storage bucket and link them to matching policies.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleUpload}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading documents...
                </>
              ) : (
                'Upload Sample Policies'
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{result.message}</p>
                    <p className="text-sm">
                      You can now view and download these policies from the Policies page.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UploadSamplePolicies;
