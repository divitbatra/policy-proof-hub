import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

const PopulateTestData = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const handlePopulate = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('populate-test-data', {
        body: {}
      });

      if (error) throw error;

      setResult(data);
      toast.success('Test data populated successfully!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to populate test data');
      console.error('Population error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Populate Test Data</h1>
          <p className="text-muted-foreground">
            Generate sample users, groups, and policies for testing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Data Generator</CardTitle>
            <CardDescription>
              This will create 798 policies and 296 users across 5 groups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold">Groups to be created:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Admin (10 users)</li>
                    <li>• Directors (10 users)</li>
                    <li>• Executive Directors (5 users)</li>
                    <li>• Supervisor Probation Officers (50 users)</li>
                    <li>• Probation Officers (221 users)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Data to be generated:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• 798 Policies</li>
                    <li>• 296 Users</li>
                    <li>• 5 Groups</li>
                    <li>• Group assignments</li>
                  </ul>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> All test users will have the password: <code className="font-mono bg-muted px-1 py-0.5 rounded">Demo123!</code>
                  <br />
                  Email format: user1@apex-demo.com, user2@apex-demo.com, etc.
                </AlertDescription>
              </Alert>
            </div>

            <Button
              onClick={handlePopulate}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Populating Data... This may take a few minutes
                </>
              ) : (
                <>
                  <Database className="h-5 w-5 mr-2" />
                  Populate Test Data
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Success! Data populated:</p>
                    <ul className="text-sm space-y-1">
                      <li>• {result.stats.groups} groups created</li>
                      <li>• {result.stats.users} users created</li>
                      <li>• {result.stats.policies} policies created</li>
                    </ul>
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="font-semibold text-sm mb-2">Sample login credentials:</p>
                      <div className="text-xs space-y-1 font-mono">
                        {result.loginInfo.exampleUsers.map((user: string, i: number) => (
                          <div key={i}>{user}</div>
                        ))}
                      </div>
                      <p className="text-xs mt-2">Password for all users: <code>Demo123!</code></p>
                    </div>
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

export default PopulateTestData;
