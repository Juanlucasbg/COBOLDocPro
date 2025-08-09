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
  Zap
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
    <aside className="w-80 bg-[hsl(var(--sidebar-bg))] border-r border-border flex flex-col overflow-hidden">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Code2 className="text-[hsl(var(--primary-foreground))]" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              COBOL ClarityEngine
            </h1>
            <p className="text-xs text-muted-foreground">
              Legacy Documentation Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-8">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Navigation
          </h3>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${item.active ? "active" : ""}`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-auto bg-primary/20 text-primary border-primary/30"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Recent Projects
          </h3>
          <div className="space-y-2">
            {recentProjects.map((project) => (
              <Link
                key={project.name}
                href="/programs"
                className="flex items-center justify-between p-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-hover))] transition-all duration-200"
                data-testid={`recent-project-${project.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="text-sm font-medium">{project.name}</span>
                </div>
                {project.status === "active" && <Activity size={14} className="text-primary" />}
                {project.status === "processing" && <Zap size={14} className="text-warning animate-pulse" />}
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
