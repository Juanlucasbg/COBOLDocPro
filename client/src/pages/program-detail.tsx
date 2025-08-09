import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Eye, 
  Download, 
  Bot, 
  ChevronDown, 
  ChevronRight,
  FileCode,
  Database,
  GitBranch
} from "lucide-react";
import SystemExplanation from "@/components/system-explanation";
import { Link } from "wouter";
import { useState } from "react";

export default function ProgramDetail() {
  const { id } = useParams();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["identification", "data", "procedure"]));

  const { data: program, isLoading } = useQuery({
    queryKey: [`/api/programs/${id}`],
    enabled: !!id,
  });

  const { data: dataElements } = useQuery({
    queryKey: [`/api/programs/${id}/data-elements`],
    enabled: !!id,
  });

  const { data: relationships } = useQuery({
    queryKey: [`/api/programs/${id}/relationships`],
    enabled: !!id,
  });

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Program Not Found</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                The requested program could not be found.
              </p>
              <Link href="/">
                <Button className="mt-4">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity?.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {program.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {program.filename} • {program.linesOfCode} lines
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/program/${id}/analysis`}>
            <Button className="bg-green-600 hover:bg-green-700">
              <Bot size={16} className="mr-2" />
              Analysis
            </Button>
          </Link>
          <Button variant="outline">
            <Eye size={16} className="mr-2" />
            View Source
          </Button>
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            Export Docs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Generated Summary */}
          {program.aiSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="text-primary" size={20} />
                  AI-Generated Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {program.aiSummary}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Program Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Program Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="space-y-2">
                  {program.structure?.divisions?.map((division) => (
                    <div key={division.name}>
                      <div 
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded"
                        onClick={() => toggleSection(division.name.toLowerCase())}
                      >
                        {expandedSections.has(division.name.toLowerCase()) ? (
                          <ChevronDown className="text-gray-400" size={16} />
                        ) : (
                          <ChevronRight className="text-gray-400" size={16} />
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {division.name} DIVISION
                        </span>
                      </div>
                      {expandedSections.has(division.name.toLowerCase()) && (
                        <div className="ml-6 space-y-1">
                          {division.sections.map((section) => (
                            <div key={section.name} className="ml-4">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                • {section.name} SECTION
                                {section.paragraphs && section.paragraphs.length > 0 && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({section.paragraphs.length} paragraphs)
                                  </span>
                                )}
                              </div>
                              {section.paragraphs && section.paragraphs.length > 0 && (
                                <div className="ml-4 space-y-1">
                                  {section.paragraphs.slice(0, 5).map((paragraph, pIndex) => (
                                    <div key={`${section.name}-paragraph-${pIndex}-${paragraph.slice(0, 10)}`} className="text-sm text-gray-600 dark:text-gray-400">
                                      • {paragraph}
                                    </div>
                                  ))}
                                  {section.paragraphs.length > 5 && (
                                    <div className="text-xs text-gray-500">
                                      ... and {section.paragraphs.length - 5} more
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Explanation & Diagrams */}
          <SystemExplanation program={program} />

          {/* Business Rules */}
          {program.businessRules && program.businessRules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Business Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {program.businessRules.map((rule, index) => (
                    <div key={`rule-${index}-${rule.rule?.slice(0, 20) || index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {rule.rule}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Condition:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">{rule.condition}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Action:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">{rule.action}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>
                          <span className="ml-2 text-gray-600 dark:text-gray-400">{rule.codeLocation}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <Badge className={`status-badge ${program.status}`}>
                  {program.status}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Complexity</span>
                <Badge className={getComplexityColor(program.complexity || 'Unknown')}>
                  {program.complexity || 'Unknown'}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Lines of Code</span>
                <span className="text-sm font-medium">{program.linesOfCode}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Business Rules</span>
                <span className="text-sm font-medium">
                  {program.businessRules?.length || 0} identified
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Data Elements</span>
                <span className="text-sm font-medium">
                  {dataElements?.length || 0}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Last Modified</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {program.lastModified 
                    ? new Date(program.lastModified).toLocaleDateString()
                    : 'Unknown'
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Related Programs */}
          {relationships && relationships.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch size={16} />
                  Related Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relationships.slice(0, 5).map((rel) => (
                    <div key={rel.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-900 dark:text-white">
                        Program #{rel.toProgramId}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {rel.relationshipType}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileCode size={16} className="mr-2" />
                View Source Code
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Database size={16} className="mr-2" />
                View Data Elements
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <GitBranch size={16} className="mr-2" />
                Dependency Graph
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
