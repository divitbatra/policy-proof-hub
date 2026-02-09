import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Calendar, User, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProjectIntakeForm {
  id: string;
  title: string;
  project_name: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  profiles?: {
    full_name: string;
  } | null;
}

const ProjectLibrary = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectIntakeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    fetchProjects();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (data) setUserRole(data.role);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("project_intake_forms")
        .select(`
          *,
          profiles:created_by(full_name)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setProjects((data as any) || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("project_intake_forms")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Project deleted successfully");
      fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Project Library</h1>
            <p className="text-muted-foreground">
              View and manage saved project intake forms
            </p>
          </div>

          <Button onClick={() => navigate("/dashboard/project-intake")}>
            <Plus className="h-4 w-4 mr-2" />
            New Project Form
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse">Loading projects...</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {searchTerm
                  ? "No projects found matching your search"
                  : "No projects yet. Create your first project intake form!"}
              </p>
              {!searchTerm && (
                <Button
                  className="mt-4"
                  onClick={() => navigate("/dashboard/project-intake")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project Form
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1"
                      onClick={() => navigate(`/dashboard/project-library/${project.id}`)}
                    >
                      <CardTitle className="text-xl hover:text-primary transition-colors">
                        {project.project_name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {project.title}
                      </CardDescription>
                    </div>
                    {(userRole === "admin" || currentUserId === project.created_by) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id, project.project_name);
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{project.profiles?.full_name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Created {format(new Date(project.created_at), "PPP")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Updated {format(new Date(project.updated_at), "PPP")}</span>
                    </div>
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

export default ProjectLibrary;
