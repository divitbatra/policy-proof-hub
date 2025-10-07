import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const AddUsersToGroup = () => {
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState("Admin");
  const [numberOfUsers, setNumberOfUsers] = useState(15);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const { data, error: invokeError } = await supabase.functions.invoke('add-users-to-group', {
        body: { groupName, numberOfUsers }
      });

      if (invokeError) {
        throw invokeError;
      }

      setResult(data);
      toast.success(`Successfully created ${data.users.length} users!`);
    } catch (err: any) {
      console.error('Error adding users:', err);
      setError(err.message || 'An error occurred while adding users');
      toast.error("Failed to add users");
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
              <Users className="h-5 w-5" />
              Add Sample Users to Group
            </CardTitle>
            <CardDescription>
              Create multiple test users and add them to a specific group
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Admin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfUsers">Number of Users</Label>
              <Input
                id="numberOfUsers"
                type="number"
                min="1"
                max="100"
                value={numberOfUsers}
                onChange={(e) => setNumberOfUsers(parseInt(e.target.value) || 15)}
              />
            </div>

            <Button
              onClick={handleAddUsers}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating users...
                </>
              ) : (
                'Add Users to Group'
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
                    <p className="text-sm">Created users:</p>
                    <ul className="text-sm list-disc list-inside max-h-40 overflow-y-auto">
                      {result.users.map((user: any, index: number) => (
                        <li key={index}>{user.email} - {user.fullName}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Default password for all users: Password123!
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

export default AddUsersToGroup;
