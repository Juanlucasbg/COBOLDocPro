import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Eye, Download } from "lucide-react";
import { Link } from "wouter";
import type { Program } from "@shared/schema";

interface ProgramListProps {
  programs: Program[];
}

export default function ProgramList({ programs }: ProgramListProps) {
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(
    programs.length > 0 ? programs[0] : null
  );

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-badge completed';
      case 'processing':
        return 'status-badge processing';
      case 'failed':
        return 'status-badge failed';
      default:
        return 'status-badge pending';
    }
  };

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

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return '1 day ago';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Program List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Analyzed Programs
          </h2>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {programs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No programs uploaded yet. Upload COBOL files to get started.
            </div>
          ) : (
            programs.slice(0, 10).map((program) => (
              <div
                key={program.id}
                className={`program-card ${
                  selectedProgram?.id === program.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedProgram(program)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {program.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {program.aiSummary || 'AI summary being generated...'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {program.linesOfCode} lines
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Modified {formatTimeAgo(program.lastModified || program.uploadedAt)}
                      </span>
                      <span className={getStatusBadgeClass(program.status)}>
                        {program.status}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <ChevronRight className="text-gray-400" size={16} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Program Detail View */}
      <div>
        {selectedProgram ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedProgram.name} Details</CardTitle>
                <div className="flex space-x-2">
                  <Link href={`/program/${selectedProgram.id}`}>
                    <Button size="sm">
                      <Eye size={14} className="mr-2" />
                      View Source
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm">
                    <Download size={14} className="mr-2" />
                    Export Docs
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Generated Summary */}
              {selectedProgram.aiSummary && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                    AI-Generated Summary
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedProgram.aiSummary}
                    </p>
                  </div>
                </div>
              )}

              {/* Program Structure */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Program Structure
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="space-y-2">
                    {selectedProgram.structure?.divisions?.map((division) => (
                      <div key={division.name}>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {division.name} DIVISION
                        </div>
                        <div className="ml-4 space-y-1">
                          {division.sections.map((section) => (
                            <div key={section.name} className="text-sm text-gray-600 dark:text-gray-400">
                              • {section.name}
                              {section.paragraphs && section.paragraphs.length > 0 && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({section.paragraphs.length} paragraphs)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )) || (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Structure analysis pending...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Complexity Score
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    <Badge className={getComplexityColor(selectedProgram.complexity || 'Unknown')}>
                      {selectedProgram.complexity || 'Unknown'}
                    </Badge>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Business Rules
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedProgram.businessRules?.length || 0} identified
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500 dark:text-gray-400">
                Select a program to view details
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
