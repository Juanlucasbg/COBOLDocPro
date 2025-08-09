import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GitBranch,
  FileCode,
  Search,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Users,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: string;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "System overview and statistics",
    category: "Analysis"
  },
  {
    title: "Dependency Graph",
    href: "/dependencies",
    icon: GitBranch,
    description: "Visual dependency mapping",
    category: "Analysis"
  },
  {
    title: "Code Editor",
    href: "/code-editor",
    icon: FileCode,
    description: "Enhanced COBOL editor",
    category: "Analysis"
  },
  {
    title: "Advanced Search",
    href: "/search",
    icon: Search,
    description: "Search across all systems",
    category: "Analysis"
  },
  {
    title: "Documentation",
    href: "/documentation",
    icon: BookOpen,
    description: "Knowledge base and docs",
    category: "Knowledge"
  },
  {
    title: "Junior Dev Tutorials",
    href: "/tutorials",
    icon: GraduationCap,
    description: "Learning modules and guides",
    category: "Knowledge"
  },
  {
    title: "Annotations",
    href: "/annotations",
    icon: MessageSquare,
    description: "Code comments and notes",
    category: "Knowledge"
  },
  {
    title: "Team Projects",
    href: "/team",
    icon: Users,
    description: "Collaborative workspaces",
    category: "Collaboration"
  },
  {
    title: "Export Maps",
    href: "/exports",
    icon: Download,
    description: "Export documentation",
    category: "Collaboration"
  }
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <div className={cn(
      "bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-72"
    )}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-100">COBOL Navigator Pro</h1>
                <p className="text-xs text-slate-400">Legacy System Mapper</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            {!isCollapsed && (
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
            )}
            <ul className="space-y-1">
              {items.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <a
                        className={cn(
                          "flex items-center px-3 py-2 rounded-lg transition-colors group",
                          isActive 
                            ? "bg-blue-600 text-white" 
                            : "text-slate-300 hover:bg-slate-700 hover:text-white"
                        )}
                      >
                        <Icon className={cn(
                          "w-5 h-5 flex-shrink-0",
                          isCollapsed ? "mx-auto" : "mr-3"
                        )} />
                        {!isCollapsed && (
                          <div className="flex-1">
                            <span className="text-sm font-medium">{item.title}</span>
                            {!isActive && (
                              <p className="text-xs text-slate-400 group-hover:text-slate-300 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        )}
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-700">
        <div className={cn(
          "flex items-center transition-all",
          isCollapsed ? "justify-center" : "space-x-3"
        )}>
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-medium text-sm">JD</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <p className="font-medium text-slate-200 text-sm">Junior Developer</p>
              <p className="text-slate-400 text-xs">Senior Analyst</p>
            </div>
          )}
          {!isCollapsed && (
            <button className="text-slate-400 hover:text-slate-200 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
