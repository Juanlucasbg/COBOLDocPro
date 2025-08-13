import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/Sidebar";
import Overview from "@/pages/Overview";
import RepositoryDetail from "@/pages/RepositoryDetail";
import ProgramDetail from "@/pages/ProgramDetail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/repository/:id" component={RepositoryDetail} />
      <Route path="/program/:id" component={ProgramDetail} />
      <Route path="/editor" component={() => <div className="p-8">Editor - Coming Soon</div>} />
      <Route path="/analytics" component={() => <div className="p-8">Analytics - Coming Soon</div>} />
      <Route path="/settings" component={() => <div className="p-8">Settings - Coming Soon</div>} />
      <Route path="/search" component={() => <div className="p-8">Knowledge Base Search - Coming Soon</div>} />
      <Route path="/auth" component={() => <div className="p-8">Authentication - Coming Soon</div>} />
      <Route path="/mcp" component={() => <div className="p-8">MCP Server - Coming Soon</div>} />
      <Route path="/addons" component={() => <div className="p-8">Add-ons - Coming Soon</div>} />
      <Route>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
            <p>The requested page could not be found.</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen ultra-minimal flex">
          <Sidebar />
          <Router />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
