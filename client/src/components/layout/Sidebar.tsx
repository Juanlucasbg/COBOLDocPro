import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Edit, 
  BarChart3, 
  Settings,
  Search,
  Shield,
  Server,
  Puzzle,
  ChevronRight,
  Circle
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface Workspace {
  name: string;
  color: 'green' | 'blue' | 'purple';
}

const mainNavItems: NavItem[] = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Editor", href: "/editor", icon: Edit },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const actionItems: NavItem[] = [
  { name: "Knowledge Base Search", href: "/search", icon: Search },
  { name: "Authentication", href: "/auth", icon: Shield },
  { name: "MCP Server", href: "/mcp", icon: Server },
  { name: "Add-ons", href: "/addons", icon: Puzzle },
];

const workspaces: Workspace[] = [
  { name: "Payment Services", color: "green" },
  { name: "Loan Services", color: "blue" },
  { name: "Customer Services", color: "purple" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [expandedSection, setExpandedSection] = useState<string | null>("main");

  const isActiveLink = (href: string) => {
    return location === href || (href !== "/" && location.startsWith(href));
  };

  const getWorkspaceIndicator = (color: Workspace['color']) => {
    const colorClasses = {
      green: "bg-green-500",
      blue: "bg-blue-500", 
      purple: "bg-purple-500"
    };
    return colorClasses[color];
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
            <span className="text-black font-bold text-sm">GS</span>
          </div>
          <span className="text-white font-medium">Goldman Sachs</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="p-4">
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = isActiveLink(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer",
                      isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    )}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto bg-green-600 text-white text-xs px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Actions Section */}
        <div className="p-4">
          <div 
            className="flex items-center justify-between mb-3 cursor-pointer"
            onClick={() => toggleSection("actions")}
          >
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</h3>
            <ChevronRight 
              className={cn(
                "w-4 h-4 text-gray-500 transition-transform",
                expandedSection === "actions" && "rotate-90"
              )}
            />
          </div>
          {expandedSection === "actions" && (
            <nav className="space-y-1">
              {actionItems.map((item) => {
                const isActive = isActiveLink(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors cursor-pointer",
                        isActive
                          ? "bg-gray-800 text-white"
                          : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                      )}
                      data-testid={`action-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Workspaces Section */}
        <div className="p-4">
          <div 
            className="flex items-center justify-between mb-3 cursor-pointer"
            onClick={() => toggleSection("workspaces")}
          >
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Workspaces</h3>
            <ChevronRight 
              className={cn(
                "w-4 h-4 text-gray-500 transition-transform",
                expandedSection === "workspaces" && "rotate-90"
              )}
            />
          </div>
          {expandedSection === "workspaces" && (
            <nav className="space-y-1">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.name}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
                  data-testid={`workspace-${workspace.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Circle className={cn("w-2 h-2 fill-current", getWorkspaceIndicator(workspace.color))} />
                  <span>{workspace.name}</span>
                </div>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          COBOL ClarityEngine v1.0
        </div>
      </div>
    </div>
  );
}