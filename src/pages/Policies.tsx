import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PolicyList from "@/components/policies/PolicyList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom"; // ⬅️ add
import { useState } from "react";
import CreatePolicyDialog from "@/components/policies/CreatePolicyDialog";

const Policies = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Policies</h1>
            <p className="text-muted-foreground">Manage your organization's policies</p>
          </div>

          {/* Change: route to /upload-docs */}
          <Button asChild>
            <Link to="/upload-docs">
              <Plus className="h-4 w-4 mr-2" />
              Upload & Create from .docx
            </Link>
          </Button>
        </div>

        <PolicyList />

        {/* Optional: keep the manual create dialog for other use-cases */}
        <CreatePolicyDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    </DashboardLayout>
  );
};

export default Policies;
