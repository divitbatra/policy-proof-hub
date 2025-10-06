import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const PendingAttestations = () => {
  const navigate = useNavigate();
  const [pendingPolicies, setPendingPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingAttestations();
  }, []);

  const fetchPendingAttestations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all policy assignments for the user
      const { data: assignments, error: assignmentsError } = await supabase
        .from("policy_assignments")
        .select(`
          *,
          policy:policies(
            id,
            title,
            description,
            category,
            current_version_id
          )
        `)
        .eq("user_id", user.id);

      if (assignmentsError) throw assignmentsError;

      // For each assignment, check if there's an attestation
      const policiesWithAttestationStatus = await Promise.all(
        (assignments || []).map(async (assignment) => {
          const { data: attestation } = await supabase
            .from("attestations")
            .select("*")
            .eq("user_id", user.id)
            .eq("policy_version_id", assignment.policy.current_version_id)
            .maybeSingle();

          return {
            ...assignment,
            hasAttestation: !!attestation
          };
        })
      );

      // Filter to only show policies without attestations
      const pending = policiesWithAttestationStatus.filter(p => !p.hasAttestation);
      setPendingPolicies(pending);
    } catch (error: any) {
      console.error("Error fetching pending attestations:", error);
      toast.error("Failed to load pending attestations");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPolicy = (policyId: string) => {
    navigate(`/dashboard/policies/${policyId}?action=sign`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">Loading pending attestations...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pending Attestations</h1>
          <p className="text-muted-foreground">
            Policies awaiting your review and signature
          </p>
        </div>

        {pendingPolicies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Attestations</h3>
              <p className="text-sm text-muted-foreground">
                You're all caught up! No policies require your signature at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingPolicies.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle>{assignment.policy.title}</CardTitle>
                      </div>
                      <CardDescription>
                        {assignment.policy.description}
                      </CardDescription>
                    </div>
                    <Badge variant="destructive">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6 text-sm">
                    {assignment.policy.category && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-medium">{assignment.policy.category}</span>
                      </div>
                    )}
                    {assignment.due_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Due:</span>
                        <span className="font-medium">
                          {format(new Date(assignment.due_date), "PPP")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleViewPolicy(assignment.policy.id)}>
                      Review & Sign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PendingAttestations;
