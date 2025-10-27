import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import PolicyViewer from "@/components/policies/PolicyViewer";
import PolicyAttestation from "@/components/policies/PolicyAttestation";
import PolicyAssignment from "@/components/policies/PolicyAssignment";
import PolicyVersionComparison from "@/components/policies/PolicyVersionComparison";
import PolicyEdit from "@/components/policies/PolicyEdit";
import PolicyApprovalStatus from "@/components/policies/PolicyApprovalStatus";
import PolicySettings from "@/components/policies/PolicySettings";

const PolicyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [policy, setPolicy] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [isAssigned, setIsAssigned] = useState(false);
  const [hasAttested, setHasAttested] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicyDetails();
  }, [id]);

  const fetchPolicyDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserRole(profile?.role || "");

      // Get policy details with versions
      const { data: policyData, error: policyError } = await supabase
        .from("policies")
        .select(`
          *,
          created_by_profile:profiles!policies_created_by_fkey(full_name),
          policy_versions!policy_versions_policy_id_fkey(*)
        `)
        .eq("id", id)
        .single();

      if (policyError) throw policyError;
      setPolicy(policyData);

      // Check if policy is assigned to user (either directly or through a group)
      // First check direct user assignments
      const { data: directAssignments } = await supabase
        .from("policy_assignments")
        .select("*")
        .eq("policy_id", id)
        .eq("user_id", user.id);

      // Then check group assignments
      const { data: userGroups } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      const groupIds = userGroups?.map(g => g.group_id) || [];
      
      let groupAssignments = [];
      if (groupIds.length > 0) {
        const { data } = await supabase
          .from("policy_assignments")
          .select("*")
          .eq("policy_id", id)
          .in("group_id", groupIds);
        groupAssignments = data || [];
      }

      const totalAssignments = (directAssignments?.length || 0) + groupAssignments.length;
      setIsAssigned(totalAssignments > 0);

      // Check if user has attested
      if (policyData.current_version_id) {
        const { data: attestation } = await supabase
          .from("attestations")
          .select("id")
          .eq("user_id", user.id)
          .eq("policy_version_id", policyData.current_version_id)
          .single();

        setHasAttested(!!attestation);
      }
    } catch (error: any) {
      toast.error("Failed to load policy details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">Loading policy...</div>
      </DashboardLayout>
    );
  }

  if (!policy) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Policy not found</p>
          <Button onClick={() => navigate("/dashboard/policies")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Policies
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isAdminOrPublisher = userRole === "admin" || userRole === "publisher";
  const canEdit = isAdminOrPublisher;
  const canAssign = isAdminOrPublisher;
  const needsAttestation = isAssigned && !hasAttested && policy.status === "published";
  
  // Determine default tab based on URL parameter
  const actionParam = searchParams.get("action");
  const defaultTab = actionParam === "sign" && needsAttestation ? "sign" : "view";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard/policies")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Policies
          </Button>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="view">View</TabsTrigger>
            {needsAttestation && <TabsTrigger value="sign">Sign</TabsTrigger>}
            {canAssign && <TabsTrigger value="assign">Assign</TabsTrigger>}
            {canEdit && <TabsTrigger value="edit">Edit</TabsTrigger>}
            <TabsTrigger value="approval">Approval Status</TabsTrigger>
            <TabsTrigger value="compare">Compare Versions</TabsTrigger>
            {canEdit && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="view" className="space-y-4">
            <PolicyViewer policy={policy} />
          </TabsContent>

          {needsAttestation && (
            <TabsContent value="sign" className="space-y-4">
              <PolicyAttestation 
                policy={policy} 
                userId={userId}
                onAttestationComplete={fetchPolicyDetails}
              />
            </TabsContent>
          )}

          {canAssign && (
            <TabsContent value="assign" className="space-y-4">
              <PolicyAssignment policyId={policy.id} />
            </TabsContent>
          )}

          {canEdit && (
            <TabsContent value="edit" className="space-y-4">
              <PolicyEdit 
                policy={policy} 
                onSave={fetchPolicyDetails}
              />
            </TabsContent>
          )}

          <TabsContent value="approval" className="space-y-4">
            <PolicyApprovalStatus policyId={policy.id} />
          </TabsContent>

          <TabsContent value="compare" className="space-y-4">
            <PolicyVersionComparison 
              policyId={policy.id}
              versions={policy.policy_versions || []}
            />
          </TabsContent>

          {canEdit && (
            <TabsContent value="settings" className="space-y-4">
              <PolicySettings 
                policy={policy}
                canEdit={canEdit}
                onUpdate={fetchPolicyDetails}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PolicyDetail;
