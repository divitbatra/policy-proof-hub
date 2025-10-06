import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Policies from "./pages/Policies";
import PolicyDetail from "./pages/PolicyDetail";
import Groups from "./pages/Groups";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import UploadPolicyDocs from "./pages/UploadPolicyDocs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/policies" element={<Policies />} />
          <Route path="/dashboard/policies/:id" element={<PolicyDetail />} />
          <Route path="/dashboard/groups" element={<Groups />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/upload-docs" element={<UploadPolicyDocs />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
