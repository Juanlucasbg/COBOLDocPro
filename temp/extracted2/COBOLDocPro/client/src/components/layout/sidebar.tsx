import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Upload, 
  FileCode, 
  Database, 
  GitBranch, 
  Layers 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function Sidebar() {
  const [location] = useLocation();

  const { data: stats } = useQuery({
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
      href: "/upload",
      icon: Upload,
      label: "Upload COBOL",
      active: location === "/upload",
    },
    {
      href: "/programs",
      icon: FileCode,
      label: "Programs",
      badge: stats?.totalPrograms,
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
      icon: GitBranch,
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
    "Billing System v2.1",
    "Customer Master",
    "Payroll Legacy"
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <nav className="p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${item.active ? "active" : ""}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Recent Projects
          </h3>
          <div className="space-y-1">
            {recentProjects.map((project) => (
              <Link
                key={project}
                href="/"
                className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {project}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
