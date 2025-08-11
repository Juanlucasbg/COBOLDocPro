import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/Sidebar";
import Overview from "@/pages/Overview";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/editor" component={() => <div className="p-8 text-white">Editor - Coming Soon</div>} />
      <Route path="/analytics" component={() => <div className="p-8 text-white">Analytics - Coming Soon</div>} />
      <Route path="/settings" component={() => <div className="p-8 text-white">Settings - Coming Soon</div>} />
      <Route path="/search" component={() => <div className="p-8 text-white">Knowledge Base Search - Coming Soon</div>} />
      <Route path="/auth" component={() => <div className="p-8 text-white">Authentication - Coming Soon</div>} />
      <Route path="/mcp" component={() => <div className="p-8 text-white">MCP Server - Coming Soon</div>} />
      <Route path="/addons" component={() => <div className="p-8 text-white">Add-ons - Coming Soon</div>} />
      <Route>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-white">Page Not Found</h1>
            <p className="text-gray-400">The requested page could not be found.</p>
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
        <div className="min-h-screen bg-black flex">
          <Sidebar />
          <Router />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
