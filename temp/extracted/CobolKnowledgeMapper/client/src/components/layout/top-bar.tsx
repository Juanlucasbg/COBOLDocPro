import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Bell,
  Upload,
  HelpCircle,
  User,
  Settings,
  LogOut,
  GraduationCap,
  Menu
} from "lucide-react";
import { useLocation } from "wouter";

interface Notification {
  id: number;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export default function TopBar() {
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [location, navigate] = useLocation();

  // Mock notifications - in real app this would come from API
  const notifications: Notification[] = [
    {
      id: 1,
      type: 'warning',
      title: 'Circular Dependency Detected',
      message: 'Found circular dependency in INVOICE-PROC.cbl',
      timestamp: '2 minutes ago',
      isRead: false
    },
    {
      id: 2,
      type: 'success',
      title: 'Analysis Complete',
      message: 'PAYROLL.cbl dependency analysis finished',
      timestamp: '15 minutes ago',
      isRead: false
    },
    {
      id: 3,
      type: 'info',
      title: 'Tutorial Progress',
      message: 'Sarah completed Module 3: Data Structures',
      timestamp: '1 hour ago',
      isRead: true
    }
  ];

  // Mock tutorial progress - in real app this would come from API
  const tutorialProgress = {
    currentModule: 3,
    totalModules: 8,
    progress: 37.5
  };

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(globalSearchQuery)}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-slate-400 hover:text-slate-200"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Global Search */}
          <form onSubmit={handleGlobalSearch} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <Input
              type="text"
              placeholder="Search programs, dependencies, documentation..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className="w-96 pl-10 pr-4 py-2 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Tutorial Progress */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-700 rounded-lg px-3 py-2">
            <GraduationCap className="w-4 h-4 text-teal-400" />
            <span className="text-sm text-slate-300">
              Tutorial: {tutorialProgress.currentModule}/{tutorialProgress.totalModules}
            </span>
            <div className="w-16 h-1 bg-slate-600 rounded-full">
              <div 
                className="h-1 bg-teal-500 rounded-full transition-all"
                style={{ width: `${tutorialProgress.progress}%` }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => navigate('/upload')}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload COBOL
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative text-slate-400 hover:text-slate-200"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 bg-slate-800 border-slate-700" align="end">
              <div className="p-3 border-b border-slate-700">
                <h3 className="font-medium text-slate-100">Notifications</h3>
                <p className="text-sm text-slate-400">{unreadNotifications} unread</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id}
                    className={`p-3 cursor-pointer ${!notification.isRead ? 'bg-slate-700/50' : ''}`}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-slate-100">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {notification.timestamp}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              <div className="p-3 border-t border-slate-700">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-slate-400 hover:text-slate-200"
                >
                  View All Notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-400 hover:text-slate-200"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center space-x-2 text-slate-300 hover:text-slate-100"
              >
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">JD</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">Junior Developer</p>
                  <p className="text-xs text-slate-400">Senior Analyst</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end">
              <div className="p-3 border-b border-slate-700">
                <p className="font-medium text-slate-100">Junior Developer</p>
                <p className="text-sm text-slate-400">junior.dev@company.com</p>
              </div>
              
              <DropdownMenuItem className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              
              <DropdownMenuItem className="cursor-pointer">
                <GraduationCap className="w-4 h-4 mr-2" />
                Learning Progress
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-slate-700" />
              
              <DropdownMenuItem className="cursor-pointer text-red-400 hover:text-red-300">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
