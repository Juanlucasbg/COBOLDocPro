import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileCode, Calendar, Activity } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { Program } from "@shared/schema";

export default function Programs() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["/api/programs"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPrograms = (programs as Program[]).filter((program: Program) =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          COBOL Programs
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and manage all uploaded COBOL programs and their documentation status
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search programs by name or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Programs Grid */}
      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery ? 'No programs found' : 'No programs uploaded yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Upload COBOL files to start generating documentation'
                }
              </p>
              {!searchQuery && (
                <Link href="/upload">
                  <Button>Upload COBOL Files</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredPrograms.map((program: Program) => (
            <Card key={program.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{program.name}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      File: {program.filename}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(program.status)}>
                      {program.status}
                    </Badge>
                    {program.complexity && (
                      <Badge variant="outline" className={getComplexityColor(program.complexity)}>
                        {program.complexity} complexity
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Program Summary */}
                  {program.aiSummary ? (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        AI Summary
                      </h4>
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        {program.aiSummary}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        AI analysis pending. Documentation will be available once processing is complete.
                      </p>
                    </div>
                  )}

                  {/* Program Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <FileCode className="h-4 w-4" />
                        <span>{program.linesOfCode} lines</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Uploaded {formatDate(program.uploadedAt)}</span>
                      </div>
                      {program.lastModified && (
                        <div className="flex items-center space-x-1">
                          <Activity className="h-4 w-4" />
                          <span>Modified {formatDate(program.lastModified)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href={`/program/${program.id}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                    <Link href={`/program/${program.id}`}>
                      <Button>Open Documentation</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}