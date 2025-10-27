import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PolicySettingsProps {
  policy: any;
  canEdit: boolean;
  onUpdate: () => void;
}

const PolicySettings = ({ policy, canEdit, onUpdate }: PolicySettingsProps) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(policy.status);
  const [category, setCategory] = useState(policy.category || "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!canEdit) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("policies")
        .update({ status: newStatus as "draft" | "review" | "published" | "archived" })
        .eq("id", policy.id);

      if (error) throw error;
      
      setStatus(newStatus);
      toast.success("Policy status updated");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to update status");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (!canEdit) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("policies")
        .update({ category: newCategory })
        .eq("id", policy.id);

      if (error) throw error;
      
      setCategory(newCategory);
      toast.success("Policy category updated");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to update category");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete policy assignments first
      await supabase
        .from("policy_assignments")
        .delete()
        .eq("policy_id", policy.id);

      // Delete attestations related to this policy's versions
      if (policy.policy_versions?.length > 0) {
        const versionIds = policy.policy_versions.map((v: any) => v.id);
        await supabase
          .from("attestations")
          .delete()
          .in("policy_version_id", versionIds);
      }

      // Delete policy versions
      await supabase
        .from("policy_versions")
        .delete()
        .eq("policy_id", policy.id);

      // Finally delete the policy
      const { error } = await supabase
        .from("policies")
        .delete()
        .eq("id", policy.id);

      if (error) throw error;

      toast.success("Policy deleted successfully");
      navigate("/dashboard/policies");
    } catch (error: any) {
      toast.error("Failed to delete policy");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Policy Settings</CardTitle>
          <CardDescription>Manage basic policy settings and metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={status} 
              onValueChange={handleStatusChange}
              disabled={!canEdit || isUpdating}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={category} 
              onValueChange={handleCategoryChange}
              disabled={!canEdit || isUpdating}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for this policy</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Policy
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the policy
                    "{policy.title}" and all associated versions, assignments, and attestations.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PolicySettings;
