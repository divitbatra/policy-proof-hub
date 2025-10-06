import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PendingAttestationsWidget = () => {
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

      // Get policy assignments for the user
      const { data: assignments, error: assignmentsError } = await supabase
        .from("policy_assignments")
        .select(`
          *,
          policy:policies(
            id,
            title,
            description,
            current_version_id
          )
        `)
        .eq("user_id", user.id)
        .limit(3);

      if (assignmentsError) throw assignmentsError;

      // Check which ones don't have attestations
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

  const handleViewAll = () => {
    navigate("/dashboard/attestations");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Attestations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pending Attestations</CardTitle>
            <CardDescription>
              Policies awaiting your review and signature
            </CardDescription>
          </div>
          {pendingPolicies.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleViewAll}>
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pendingPolicies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No pending attestations
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPolicies.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {assignment.policy.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {assignment.policy.description}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewPolicy(assignment.policy.id)}
                >
                  Review
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingAttestationsWidget;
