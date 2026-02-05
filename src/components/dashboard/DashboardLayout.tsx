import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, FileText, Users, BarChart, Settings, LogOut, FileCheck, Hexagon, ListTodo, FileTextIcon } from "lucide-react";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const navItems = [
    { icon: BarChart, label: "Dashboard", href: "/dashboard" },
    { icon: FileText, label: "Policies", href: "/dashboard/policies" },
    { icon: FileCheck, label: "Pending Attestations", href: "/dashboard/attestations" },
    { icon: ListTodo, label: "Tasks", href: "/dashboard/tasks" },
    { icon: Users, label: "Groups", href: "/dashboard/groups" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-primary to-primary-light flex items-center justify-center shadow-lg">
              <Hexagon className="h-7 w-7 text-primary-foreground fill-primary-foreground/20" strokeWidth={2} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary-foreground">A</span>
            </div>
            <span className="text-xl font-bold tracking-tight">APEX</span>
          </Link>
          
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="w-64 space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button variant="ghost" className="w-full justify-start">
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </aside>

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;