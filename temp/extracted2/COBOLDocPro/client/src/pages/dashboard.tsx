import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCode, CheckCircle, Database, AlertTriangle } from "lucide-react";
import ProgramList from "@/components/program-list";
import DataDictionary from "@/components/data-dictionary";
import ProgramVisualization from "@/components/program-visualization";
import Upload from "./upload";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/statistics"],
  });

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ["/api/programs"],
  });

  const { data: uploadSessions = [] } = useQuery({
    queryKey: ["/api/upload-sessions"],
  });

  const statsCards = [
    {
      title: "Total Programs",
      value: (stats as any)?.totalPrograms || 0,
      icon: FileCode,
      color: "text-primary",
      bgColor: "bg-blue-100 dark:bg-blue-900",
    },
    {
      title: "Documented",
      value: (stats as any)?.documentedPrograms || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900",
    },
    {
      title: "Data Elements",
      value: (stats as any)?.dataElements || 0,
      icon: Database,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900",
    },
    {
      title: "Issues Found",
      value: (stats as any)?.issuesFound || 0,
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
            <TabsList className="grid w-full grid-cols-4 bg-transparent">
              <TabsTrigger value="analysis" className="border-b-2 border-transparent data-[state=active]:border-primary">
                Program Analysis
              </TabsTrigger>
              <TabsTrigger value="explanation" className="border-b-2 border-transparent data-[state=active]:border-primary">
                System Explanations
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
              <ProgramList programs={programs as any} />
            </div>
          </TabsContent>

          <TabsContent value="explanation" className="mt-0">
            <div className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    System Explanations & Diagrams
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Plain English explanations and visual diagrams of your COBOL systems
                  </p>
                </div>
                
                {programs && (programs as any).length > 0 ? (
                  <div className="grid gap-6">
                    {(programs as any)
                      .slice(0, 3)
                      .map((program: any) => (
                        <Card key={program.id} className="border-l-4 border-l-primary">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{program.name}</CardTitle>
                              <Badge variant="outline">{program.status}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {program.systemExplanation && (
                              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                  What This System Does
                                </h4>
                                <p className="text-blue-800 dark:text-blue-200 text-sm">
                                  {program.systemExplanation.plainEnglishSummary}
                                </p>
                              </div>
                            )}
                            
                            {!program.systemExplanation && program.status === 'failed' && (
                              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
                                <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
                                  Analysis Status
                                </h4>
                                <p className="text-orange-800 dark:text-orange-200 text-sm">
                                  COBOL program uploaded successfully. AI analysis is pending due to endpoint configuration.
                                </p>
                              </div>
                            )}
                            
                            {!program.systemExplanation && program.status === 'processing' && (
                              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                  Analysis in Progress
                                </h4>
                                <p className="text-blue-800 dark:text-blue-200 text-sm">
                                  AI is analyzing this COBOL program to generate documentation and diagrams.
                                </p>
                              </div>
                            )}
                            
                            {program.mermaidDiagram && (
                              <div className="mb-4">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                  {program.mermaidDiagram.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {program.mermaidDiagram.description}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                <span>{program.linesOfCode} lines</span>
                                {program.businessRules && (
                                  <span>{program.businessRules.length} business rules</span>
                                )}
                              </div>
                              <Link href={`/program/${program.id}`}>
                                <Button size="sm">View Details</Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    
                    {(programs as any).filter((program: any) => program.systemExplanation || program.mermaidDiagram).length === 0 && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center text-gray-500 dark:text-gray-400">
                            <p>No system explanations available yet.</p>
                            <p className="text-sm mt-2">Upload COBOL programs to generate explanations and diagrams.</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <p>No programs uploaded yet.</p>
                        <p className="text-sm mt-2">Upload COBOL files to see system explanations and diagrams.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <div className="p-6">
              <Upload />
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
