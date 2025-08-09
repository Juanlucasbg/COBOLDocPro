import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Database, Code2, Info } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { DataElement } from "@shared/schema";

export default function DataDictionary() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: dataElements = [], isLoading } = useQuery({
    queryKey: ["/api/data-elements"],
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["/api/programs"],
  });

  const getDataTypeColor = (picture: string) => {
    if (!picture) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    
    if (picture.includes('9')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'; // Numeric
    } else if (picture.includes('X')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'; // Alphanumeric
    } else if (picture.includes('S')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'; // Signed
    }
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'; // Other
  };

  const getUsageColor = (usage: string) => {
    switch (usage?.toUpperCase()) {
      case 'COMP':
      case 'COMPUTATIONAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'COMP-3':
      case 'PACKED-DECIMAL':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'DISPLAY':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const filteredElements = (dataElements as DataElement[]).filter((element: DataElement) =>
    element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    element.picture?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    element.usage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedElements = filteredElements.reduce((acc, element) => {
    const programId = element.programId;
    if (!acc[programId]) {
      acc[programId] = [];
    }
    acc[programId].push(element);
    return acc;
  }, {} as Record<number, DataElement[]>);

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
          Data Dictionary
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive view of all data elements across COBOL programs
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search data elements by name, picture, or usage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Data Elements */}
      {filteredElements.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No data elements available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Data elements will appear here once COBOL programs are parsed and analyzed
              </p>
              <Link href="/upload">
                <Button>Upload COBOL Files</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedElements).map(([programIdStr, elements]) => {
            const programId = parseInt(programIdStr);
            const program = (programs as any[]).find(p => p.id === programId);
            
            return (
              <Card key={programId}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-2">
                        {program?.name || `Program ${programId}`}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        From: {program?.filename || 'Unknown file'}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {elements.length} elements
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {elements.map((element: DataElement) => (
                      <div key={element.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                              {element.name}
                            </h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <span>Level {element.level}</span>
                              {element.lineNumber && (
                                <>
                                  <span>•</span>
                                  <span>Line {element.lineNumber}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {element.picture && (
                              <Badge className={getDataTypeColor(element.picture)}>
                                PIC {element.picture}
                              </Badge>
                            )}
                            {element.usage && (
                              <Badge className={getUsageColor(element.usage)}>
                                {element.usage}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {element.parentElement && (
                          <div className="mb-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Code2 className="h-4 w-4" />
                              <span>Child of: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">{element.parentElement}</code></span>
                            </div>
                          </div>
                        )}
                        
                        {element.description && (
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3">
                            <div className="flex items-start space-x-2">
                              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                              <div>
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                  {element.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Link href={`/program/${programId}`}>
                      <Button variant="outline">View Program</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}