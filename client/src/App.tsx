import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Programs from "@/pages/programs";
import BusinessRules from "@/pages/business-rules";
import DataDictionary from "@/pages/data-dictionary";
import Visualizations from "@/pages/visualizations";
import ProgramDetail from "@/pages/program-detail";
import Repositories from "@/pages/repositories";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/repositories" component={Repositories} />
      <Route path="/programs" component={Programs} />
      <Route path="/business-rules" component={BusinessRules} />
      <Route path="/data-dictionary" component={DataDictionary} />
      <Route path="/visualizations" component={Visualizations} />
      <Route path="/upload" component={Upload} />
      <Route path="/program/:id" component={ProgramDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground dark">
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto">
                <Router />
              </main>
            </div>
          </div>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
