import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PolicyList = () => {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserRole(profile?.role || "");

      const isAdminOrPublisher = profile?.role === "admin" || profile?.role === "publisher";

      let query = supabase
        .from("policies")
        .select(`
          *,
          created_by_profile:profiles!policies_created_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (!isAdminOrPublisher) {
        query = query.eq("status", "published");
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // For each policy, fetch the version count from policy_versions table
      const policiesWithVersions = await Promise.all(
        (data || []).map(async (policy) => {
          const { count } = await supabase
            .from("policy_versions")
            .select("*", { count: "exact", head: true })
            .eq("policy_id", policy.id);
          
          return {
            ...policy,
            versionCount: count || 0
          };
        })
      );

      setPolicies(policiesWithVersions);
    } catch (error: any) {
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
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

  if (loading) {
    return <div className="animate-pulse">Loading policies...</div>;
  }

  if (policies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No policies found. Create your first policy to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {policies.map((policy) => (
        <Card key={policy.id} className="hover:border-primary transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {policy.title}
                </CardTitle>
                <CardDescription>{policy.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={getStatusColor(policy.status)}>
                  {policy.status}
                </Badge>
                {policy.versionCount > 0 && (
                  <Badge variant="outline">
                    {policy.versionCount} version{policy.versionCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Created by: {policy.created_by_profile?.full_name}</p>
                <p>Created: {format(new Date(policy.created_at), "PPP")}</p>
                {policy.category && <p>Category: {policy.category}</p>}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/dashboard/policies/${policy.id}`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PolicyList;