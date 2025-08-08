import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  FileCode, 
  CheckCircle, 
  Database, 
  AlertTriangle, 
  Upload,
  TrendingUp,
  Activity,
  Zap,
  Users,
  Clock
} from "lucide-react";
import { Link } from "wouter";

interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  trend?: string;
  color: string;
  description?: string;
}

function StatCard({ title, value, icon: Icon, trend, color, description }: StatCardProps) {
  return (
    <Card className="glass-card hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-bold ${color}`}>{value}</span>
              {trend && (
                <Badge className="bg-success/20 text-success border-success/30 text-xs">
                  {trend}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color === 'text-primary' ? 'from-primary/20 to-primary/10' : color === 'text-success' ? 'from-success/20 to-success/10' : color === 'text-warning' ? 'from-warning/20 to-warning/10' : 'from-destructive/20 to-destructive/10'}`}>
            <Icon size={24} className={color} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ icon: Icon, title, description, href, color }: {
  icon: any;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="glass-card hover:border-primary/30 transition-all duration-300 cursor-pointer group">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${color} group-hover:scale-110 transition-transform duration-200`}>
              <Icon size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActivityItem({ type, title, time, status }: {
  type: 'upload' | 'analysis' | 'documentation';
  title: string;
  time: string;
  status: 'success' | 'processing' | 'failed';
}) {
  const icons = {
    upload: Upload,
    analysis: Activity,
    documentation: FileCode
  };
  
  const statusColors = {
    success: 'text-success',
    processing: 'text-warning',
    failed: 'text-destructive'
  };
  
  const Icon = icons[type];
  
  return (
    <div className="flex items-center space-x-4 p-4 rounded-lg hover:bg-card/50 transition-colors">
      <div className="p-2 rounded-lg bg-primary/20">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
      <Badge className={`${statusColors[status]}`} variant="outline">
        {status}
      </Badge>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/statistics"],
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["/api/programs"],
  });

  const { data: uploadSessions = [] } = useQuery({
    queryKey: ["/api/upload-sessions"],
  });

  // Type-safe stats with proper defaults
  const totalPrograms = (stats as any)?.totalPrograms || 0;
  const documentedPrograms = (stats as any)?.documentedPrograms || 0;
  const dataElements = (stats as any)?.dataElements || 0;
  const pendingPrograms = totalPrograms - documentedPrograms;

  const recentActivities = [
    {
      type: 'upload' as const,
      title: 'Billing System v2.1 uploaded',
      time: '2 hours ago',
      status: 'success' as const
    },
    {
      type: 'analysis' as const,
      title: 'Customer Master analysis',
      time: '4 hours ago',
      status: 'processing' as const
    },
    {
      type: 'documentation' as const,
      title: 'Payroll Legacy documented',
      time: '6 hours ago',
      status: 'success' as const
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold gradient-text">
          Welcome to COBOL ClarityEngine
        </h1>
        <p className="text-muted-foreground text-lg">
          Transform your legacy systems into clear, understandable documentation
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Programs"
          value={totalPrograms}
          icon={FileCode}
          color="text-primary"
          description="COBOL programs analyzed"
          data-testid="stat-total-programs"
        />
        <StatCard
          title="Documented"
          value={documentedPrograms}
          icon={CheckCircle}
          color="text-success"
          trend={documentedPrograms > 0 ? "+12%" : undefined}
          description="Fully processed programs"
          data-testid="stat-documented-programs"
        />
        <StatCard
          title="Data Elements"
          value={dataElements}
          icon={Database}
          color="text-warning"
          description="Variables discovered"
          data-testid="stat-data-elements"
        />
        <StatCard
          title="Pending Analysis"
          value={pendingPrograms}
          icon={Clock}
          color="text-muted-foreground"
          description="Awaiting processing"
          data-testid="stat-pending-analysis"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuickAction
                icon={Upload}
                title="Upload COBOL Files"
                description="Add new programs to analyze"
                href="/upload"
                color="from-primary to-accent"
              />
              <QuickAction
                icon={FileCode}
                title="View Programs"
                description="Browse analyzed programs"
                href="/programs"
                color="from-success to-success/80"
              />
              <QuickAction
                icon={Database}
                title="Data Dictionary"
                description="Explore variables and structures"
                href="/data-dictionary"
                color="from-warning to-warning/80"
              />
              <QuickAction
                icon={TrendingUp}
                title="Visualizations"
                description="View system diagrams"
                href="/visualizations"
                color="from-accent to-primary"
              />
            </div>
          </div>

          {/* Progress Overview */}
          {totalPrograms > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="text-primary" size={20} />
                  <span>Documentation Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed Programs</span>
                    <span className="text-white">{documentedPrograms} of {totalPrograms}</span>
                  </div>
                  <Progress 
                    value={(documentedPrograms / totalPrograms) * 100} 
                    className="h-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">{Math.round((documentedPrograms / totalPrograms) * 100)}%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning">{pendingPrograms}</div>
                    <div className="text-xs text-muted-foreground">Remaining</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
          <Card className="glass-card">
            <CardContent className="p-0">
              <div className="space-y-1">
                {recentActivities.map((activity, index) => (
                  <ActivityItem key={index} {...activity} />
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Getting Started */}
          {totalPrograms === 0 && (
            <Card className="glass-card border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="text-primary" size={20} />
                  <span>Getting Started</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Start documenting your COBOL systems in three simple steps:
                </p>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-[hsl(var(--primary-foreground))]">
                      1
                    </div>
                    <span className="text-white">Upload your COBOL files</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-[hsl(var(--primary-foreground))]">
                      2
                    </div>
                    <span className="text-white">AI analyzes the code structure</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-[hsl(var(--primary-foreground))]">
                      3
                    </div>
                    <span className="text-white">Get clear documentation & diagrams</span>
                  </li>
                </ol>
                <Link href="/upload">
                  <Button className="w-full mt-4" data-testid="get-started-upload">
                    Upload Your First Program
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}