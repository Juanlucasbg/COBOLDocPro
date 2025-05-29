import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, CheckCircle, Database, AlertTriangle } from "lucide-react";
import ProgramList from "@/components/program-list";
import DataDictionary from "@/components/data-dictionary";
import ProgramVisualization from "@/components/program-visualization";
import Upload from "./upload";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/statistics"],
  });

  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["/api/programs"],
  });

  const { data: uploadSessions } = useQuery({
    queryKey: ["/api/upload-sessions"],
  });

  const statsCards = [
    {
      title: "Total Programs",
      value: stats?.totalPrograms || 0,
      icon: FileCode,
      color: "text-primary",
      bgColor: "bg-blue-100 dark:bg-blue-900",
    },
    {
      title: "Documented",
      value: stats?.documentedPrograms || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900",
    },
    {
      title: "Data Elements",
      value: stats?.dataElements || 0,
      icon: Database,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900",
    },
    {
      title: "Issues Found",
      value: stats?.issuesFound || 0,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900",
    },
  ];

  if (statsLoading || programsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          System Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Billing System v2.1 - Last analyzed 2 hours ago
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <stat.icon className={stat.color} size={18} />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Card>
        <Tabs defaultValue="analysis" className="w-full">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <TabsList className="grid w-full grid-cols-3 bg-transparent">
              <TabsTrigger value="analysis" className="border-b-2 border-transparent data-[state=active]:border-primary">
                Program Analysis
              </TabsTrigger>
              <TabsTrigger value="upload" className="border-b-2 border-transparent data-[state=active]:border-primary">
                Upload & Parse
              </TabsTrigger>
              <TabsTrigger value="visualization" className="border-b-2 border-transparent data-[state=active]:border-primary">
                Structure View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analysis" className="mt-0">
            <div className="p-6">
              <ProgramList programs={programs || []} />
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <div className="p-6">
              <Upload uploadSessions={uploadSessions || []} />
            </div>
          </TabsContent>

          <TabsContent value="visualization" className="mt-0">
            <div className="p-6">
              <ProgramVisualization />
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Data Dictionary Section */}
      <div className="mt-8">
        <DataDictionary />
      </div>
    </div>
  );
}
