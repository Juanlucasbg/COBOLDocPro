import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileCode, 
  GitBranch, 
  AlertTriangle, 
  BookOpen, 
  Plus, 
  GraduationCap, 
  Search, 
  Download,
  Upload,
  Settings,
  Users,
  Database,
  TrendingUp
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalPrograms: number;
  dependencies: number;
  criticalIssues: number;
  documentationProgress: number;
  recentActivity: Array<{
    id: number;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      // For now, return mock data until backend stats endpoint is implemented
      return {
        totalPrograms: 247,
        dependencies: 1432,
        criticalIssues: 8,
        documentationProgress: 67,
        recentActivity: [
          {
            id: 1,
            type: 'analysis',
            message: 'PAYROLL.COB dependencies analyzed',
            timestamp: '2 hours ago'
          },
          {
            id: 2,
            type: 'documentation',
            message: 'Documentation updated for CUSTOMER-DB',
            timestamp: '4 hours ago'
          },
          {
            id: 3,
            type: 'tutorial',
            message: 'Sarah Chen completed tutorial module 3',
            timestamp: 'Yesterday'
          },
          {
            id: 4,
            type: 'warning',
            message: 'Circular dependency detected in INVOICE-PROC',
            timestamp: '2 days ago'
          }
        ]
      };
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'analysis': return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'documentation': return <BookOpen className="w-4 h-4 text-teal-400" />;
      case 'tutorial': return <GraduationCap className="w-4 h-4 text-purple-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <FileCode className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">System Overview</h1>
        <p className="text-slate-400">Monitor your COBOL legacy systems and track knowledge retention progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Programs</p>
                <p className="text-3xl font-bold text-slate-100">{stats?.totalPrograms || 0}</p>
                <p className="text-green-400 text-sm mt-1">+12 this month</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileCode className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Dependencies</p>
                <p className="text-3xl font-bold text-slate-100">{stats?.dependencies || 0}</p>
                <p className="text-teal-400 text-sm mt-1">85% mapped</p>
              </div>
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Critical Issues</p>
                <p className="text-3xl font-bold text-slate-100">{stats?.criticalIssues || 0}</p>
                <p className="text-red-400 text-sm mt-1">Needs attention</p>
              </div>
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Documentation</p>
                <p className="text-3xl font-bold text-slate-100">{stats?.documentationProgress || 0}%</p>
                <p className="text-yellow-400 text-sm mt-1">In progress</p>
              </div>
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Architecture Preview */}
        <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100">System Architecture Map</CardTitle>
              <Link href="/dependencies">
                <Button variant="ghost" className="text-blue-400 hover:text-blue-300">
                  View Full Graph
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-80 bg-slate-900 rounded-lg border border-slate-600 flex items-center justify-center relative overflow-hidden">
              {/* SVG Dependency Graph Preview */}
              <svg width="100%" height="100%" viewBox="0 0 400 300" className="absolute inset-0">
                {/* Central node */}
                <circle cx="200" cy="150" r="25" fill="#2563eb" className="dependency-node" />
                <text x="200" y="155" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
                  MAIN-SYS
                </text>
                
                {/* Connected modules */}
                <circle cx="120" cy="100" r="18" fill="#14b8a6" className="dependency-node" />
                <text x="120" y="105" textAnchor="middle" fill="white" fontSize="8">AUTH</text>
                
                <circle cx="280" cy="100" r="18" fill="#14b8a6" className="dependency-node" />
                <text x="280" y="105" textAnchor="middle" fill="white" fontSize="8">DB-MGR</text>
                
                <circle cx="120" cy="200" r="18" fill="#8b5cf6" className="dependency-node" />
                <text x="120" y="205" textAnchor="middle" fill="white" fontSize="8">REPORT</text>
                
                <circle cx="280" cy="200" r="18" fill="#ef4444" className="dependency-node" />
                <text x="280" y="205" textAnchor="middle" fill="white" fontSize="8">LEGACY</text>
                
                {/* Dependency lines */}
                <line x1="175" y1="130" x2="138" y2="118" stroke="#14b8a6" className="dependency-edge" />
                <line x1="225" y1="130" x2="262" y2="118" stroke="#14b8a6" className="dependency-edge" />
                <line x1="175" y1="170" x2="138" y2="182" stroke="#8b5cf6" className="dependency-edge" />
                <line x1="225" y1="170" x2="262" y2="182" stroke="#ef4444" className="dependency-edge" strokeWidth="3" />
              </svg>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                <span className="text-slate-300">Data Flow</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-slate-300">Control Flow</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-slate-300">Critical Path</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-slate-100">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {stats?.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{activity.message}</p>
                    <p className="text-xs text-slate-400">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            asChild
            className="p-4 h-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left justify-start group"
          >
            <Link href="/upload">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 group-hover:bg-blue-500 rounded-lg flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-100">New Analysis</p>
                  <p className="text-sm text-slate-400">Start fresh mapping</p>
                </div>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            className="p-4 h-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left justify-start group"
          >
            <Link href="/tutorials">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-teal-600 group-hover:bg-teal-500 rounded-lg flex items-center justify-center transition-colors">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-100">Start Tutorial</p>
                  <p className="text-sm text-slate-400">Learn the basics</p>
                </div>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            className="p-4 h-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left justify-start group"
          >
            <Link href="/search">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 group-hover:bg-purple-500 rounded-lg flex items-center justify-center transition-colors">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-100">Advanced Search</p>
                  <p className="text-sm text-slate-400">Find anything</p>
                </div>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            className="p-4 h-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left justify-start group"
          >
            <Link href="/exports">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-600 group-hover:bg-yellow-500 rounded-lg flex items-center justify-center transition-colors">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-slate-100">Export Report</p>
                  <p className="text-sm text-slate-400">Generate docs</p>
                </div>
              </div>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
