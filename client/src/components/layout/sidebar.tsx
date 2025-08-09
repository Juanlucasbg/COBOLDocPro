import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Upload, 
  FileCode, 
  Database, 
  GitBranch, 
  Layers,
  Code2,
  Activity,
  Zap,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Statistics } from "@shared/schema";

export default function Sidebar() {
  const [location] = useLocation();

  const { data: stats } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const navItems = [
    {
      href: "/",
      icon: LayoutDashboard,
      label: "Dashboard",
      active: location === "/",
    },
    {
      href: "/repositories",
      icon: GitBranch,
      label: "Repositories",
      badge: stats?.repositories || 0,
      active: location === "/repositories",
    },
    {
      href: "/repository-analysis",
      icon: Search,
      label: "Repository Analysis",
      active: location === "/repository-analysis",
    },
    {
      href: "/upload",
      icon: Upload,
      label: "Upload COBOL",
      active: location === "/upload",
    },
    {
      href: "/programs",
      icon: FileCode,
      label: "Programs",
      badge: stats?.totalPrograms || 0,
      active: location.startsWith("/program"),
    },
    {
      href: "/data-dictionary",
      icon: Database,
      label: "Data Dictionary",
      active: location === "/data-dictionary",
    },
    {
      href: "/visualizations",
      icon: Layers,
      label: "Visualizations",
      active: location === "/visualizations",
    },
    {
      href: "/business-rules",
      icon: Layers,
      label: "Business Rules",
      active: location === "/business-rules",
    },
  ];

  const recentProjects = [
    { name: "Billing System v2.1", status: "active" },
    { name: "Customer Master", status: "processing" },
    { name: "Payroll Legacy", status: "completed" }
  ];

  return (
    <aside className="w-64 ultra-minimal flex flex-col overflow-hidden">
      {/* Logo and Brand */}
      <div className="px-4 py-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 ultra-minimal-button flex items-center justify-center">
            <Code2 className="text-black" size={16} />
          </div>
          <div>
            <h1 className="text-sm font-semibold ultra-minimal-text">
              COBOL Docs AI
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-6">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm transition-colors ${
                item.active 
                  ? "ultra-minimal-button" 
                  : "ultra-minimal-text"
              }`}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon size={16} className="mr-3" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-xs font-medium text-muted-foreground px-3 mb-2">
            Actions
          </h3>
          <div className="space-y-1">
            <Link
              href="/repositories"
              className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-hover))] rounded-md transition-colors"
            >
              <GitBranch size={16} className="mr-3" />
              Knowledge Base Search
            </Link>
            <Link
              href="/upload"
              className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-hover))] rounded-md transition-colors"
            >
              <Upload size={16} className="mr-3" />
              Authentication
            </Link>
          </div>
        </div>
        
        <div className="border-t border-border pt-4">
          <h3 className="text-xs font-medium text-muted-foreground px-3 mb-2">
            Workspaces
          </h3>
          <div className="space-y-1">
            {recentProjects.map((project) => (
              <Link
                key={project.name}
                href="/programs"
                className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-hover))] rounded-md transition-colors"
                data-testid={`recent-project-${project.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-2 h-2 rounded-full bg-primary mr-3"></div>
                <span className="font-medium truncate">{project.name}</span>
                {project.status === "active" && <Activity size={12} className="text-primary ml-auto" />}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer Stats */}
      <div className="p-6 border-t border-border/30">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{stats?.totalPrograms || 0}</div>
            <div className="text-xs text-muted-foreground">Programs</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{stats?.documentedPrograms || 0}</div>
            <div className="text-xs text-muted-foreground">Documented</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
