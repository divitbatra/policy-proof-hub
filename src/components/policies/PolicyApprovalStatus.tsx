import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PolicyApprovalStatusProps {
  policyId: string;
}

const PolicyApprovalStatus = ({ policyId }: PolicyApprovalStatusProps) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attestations, setAttestations] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovalStatus();
  }, [policyId]);

  const fetchApprovalStatus = async () => {
    try {
      // Get policy details
      const { data: policy } = await supabase
        .from("policies")
        .select("current_version_id")
        .eq("id", policyId)
        .maybeSingle();

      if (!policy?.current_version_id) {
        setLoading(false);
        return;
      }

      // Get all assignments
      const { data: assignmentsData } = await supabase
        .from("policy_assignments")
        .select(`
          *,
          assigned_user:profiles!policy_assignments_user_id_fkey(id, full_name, email)
        `)
        .eq("policy_id", policyId);

      // Get all attestations for current version
      const { data: attestationsData } = await supabase
        .from("attestations")
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq("policy_version_id", policy.current_version_id);

      setAssignments(assignmentsData || []);
      setAttestations(attestationsData || []);

      // Calculate unique assigned users
      const uniqueUsersMap = new Map<string, { dueDate: Date | null, profile?: any }>();
      const attestedUsers = new Set(attestationsData?.map(a => a.user_id) || []);

      // Process assignments to get unique users
      for (const assignment of assignmentsData || []) {
        if (assignment.user_id) {
          // Direct user assignment - fetch user profile
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("id, full_name, email, department")
            .eq("id", assignment.user_id)
            .single();
          
          if (!uniqueUsersMap.has(assignment.user_id)) {
            uniqueUsersMap.set(assignment.user_id, {
              dueDate: assignment.due_date ? new Date(assignment.due_date) : null,
              profile: userProfile
            });
          }
        } else if (assignment.group_id) {
          // Group assignment - fetch group members
          const { data: groupMembers } = await supabase
            .from("group_members")
            .select(`
              user_id,
              profiles(id, full_name, email, department)
            `)
            .eq("group_id", assignment.group_id);
          
          groupMembers?.forEach(member => {
            if (!uniqueUsersMap.has(member.user_id)) {
              uniqueUsersMap.set(member.user_id, {
                dueDate: assignment.due_date ? new Date(assignment.due_date) : null,
                profile: member.profiles
              });
            }
          });
        }
      }

      const totalAssigned = uniqueUsersMap.size;
      
      // Count completed (users who have attested)
      const completed = Array.from(uniqueUsersMap.keys()).filter(userId => 
        attestedUsers.has(userId)
      ).length;
      
      // Pending is total minus completed
      const pending = totalAssigned - completed;

      // Calculate overdue and build pending users list
      const now = new Date();
      let overdue = 0;
      const pendingUsersList: any[] = [];
      
      uniqueUsersMap.forEach((data, userId) => {
        // User hasn't attested
        if (!attestedUsers.has(userId)) {
          const isPastDue = data.dueDate && data.dueDate < now;
          if (isPastDue) {
            overdue++;
          }
          pendingUsersList.push({
            userId,
            profile: data.profile,
            dueDate: data.dueDate,
            isOverdue: isPastDue
          });
        }
      });

      setPendingUsers(pendingUsersList);
      setStats({ totalAssigned, completed, pending, overdue });
    } catch (error) {
      console.error("Failed to fetch approval status:", error);
    } finally {
      setLoading(false);
    }
  };

  const completionPercentage = stats.totalAssigned > 0 
    ? Math.round((stats.completed / stats.totalAssigned) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Approval Overview</CardTitle>
          <CardDescription>
            Track who has acknowledged and signed this policy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion Progress</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {stats.completed} of {stats.totalAssigned} users have signed
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div className="text-2xl font-bold">{stats.completed}</div>
                  <p className="text-xs text-muted-foreground text-center">Completed</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-2">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <p className="text-xs text-muted-foreground text-center">Pending</p>
                </div>
              </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Attestations</CardTitle>
          <CardDescription>Users who have not yet signed this policy</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              All assigned users have signed
            </p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((pendingUser) => (
                <div 
                  key={pendingUser.userId} 
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    pendingUser.isOverdue ? 'border-red-300 bg-red-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className={`h-5 w-5 ${pendingUser.isOverdue ? 'text-red-500' : 'text-yellow-500'}`} />
                    <div>
                      <p className="font-medium">{pendingUser.profile?.full_name || 'Unknown User'}</p>
                      <p className="text-xs text-muted-foreground">
                        {pendingUser.profile?.email}
                      </p>
                      {pendingUser.profile?.department && (
                        <p className="text-xs text-muted-foreground">
                          {pendingUser.profile.department}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {pendingUser.dueDate ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Due: {format(pendingUser.dueDate, "PP")}
                        </p>
                        {pendingUser.isOverdue && (
                          <Badge variant="destructive" className="mt-1">
                            Overdue
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="secondary">No due date</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-2">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div className="text-2xl font-bold">{stats.overdue}</div>
                  <p className="text-xs text-muted-foreground text-center">Overdue</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Signatures</CardTitle>
          <CardDescription>Latest policy acknowledgments</CardDescription>
        </CardHeader>
        <CardContent>
          {attestations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No signatures yet
            </p>
          ) : (
            <div className="space-y-3">
              {attestations.slice(0, 10).map((attestation) => (
                <div key={attestation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{attestation.profiles?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {attestation.profiles?.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(attestation.signed_at), "PPp")}
                    </p>
                    {attestation.assessment_passed !== null && (
                      <Badge variant={attestation.assessment_passed ? "default" : "destructive"} className="mt-1">
                        {attestation.assessment_passed ? "Passed" : "Failed"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicyApprovalStatus;
