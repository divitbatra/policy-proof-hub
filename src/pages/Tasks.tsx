import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import TaskKPIHeader from "@/components/tasks/TaskKPIHeader";
import TaskGrid from "@/components/tasks/TaskGrid";
import TaskBoard from "@/components/tasks/TaskBoard";
import TaskTimeline from "@/components/tasks/TaskTimeline";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, Columns, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type TaskView = "grid" | "board" | "timeline";

// Task view management
const Tasks = () => {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<TaskView>("grid");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      setUserRole(profile?.role || "employee");
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const canManageTasks = userRole !== null; // Show for all authenticated users

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ListTodo className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tasks</h1>
              <p className="text-muted-foreground">Manage and track team tasks</p>
            </div>
          </div>

          {canManageTasks && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          )}
        </div>

        {/* KPIs */}
        <TaskKPIHeader />

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView("grid")}
            className="flex items-center gap-2"
          >
            <ListTodo className="h-4 w-4" />
            Grid
          </Button>
          <Button
            variant={currentView === "board" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView("board")}
            className="flex items-center gap-2"
          >
            <Columns className="h-4 w-4" />
            Board
          </Button>
          <Button
            variant={currentView === "timeline" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView("timeline")}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Timeline
          </Button>
        </div>

        {/* Task Views */}
        {currentView === "grid" && <TaskGrid />}
        {currentView === "board" && <TaskBoard />}
        {currentView === "timeline" && <TaskTimeline />}

        {/* Create Dialog */}
        <CreateTaskDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
