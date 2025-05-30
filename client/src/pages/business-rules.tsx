import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Code, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { Program } from "@shared/schema";

export default function BusinessRules() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["/api/programs"],
  });

  const filteredPrograms = (programs as Program[]).filter((program: Program) => {
    const hasBusinessRules = program.businessRules && program.businessRules.length > 0;
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         program.filename.toLowerCase().includes(searchQuery.toLowerCase());
    return hasBusinessRules && matchesSearch;
  });

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
          Business Rules
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Extracted business logic and rules from COBOL programs
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search business rules by program name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Business Rules */}
      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No business rules available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Business rules will appear here once COBOL programs are analyzed with AI processing
              </p>
              <Link href="/">
                <Button>Go to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredPrograms.map((program: Program) => (
            <Card key={program.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl mb-2">{program.name}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      From: {program.filename}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {program.businessRules?.length || 0} rules
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {program.businessRules?.map((rule: any, index: number) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            {rule.rule || `Business Rule ${index + 1}`}
                          </h4>
                          
                          {rule.condition && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Condition
                              </span>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                {rule.condition}
                              </p>
                            </div>
                          )}
                          
                          {rule.action && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Action
                              </span>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                {rule.action}
                              </p>
                            </div>
                          )}
                          
                          {rule.codeLocation && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Code Location
                              </span>
                              <div className="flex items-center space-x-2 mt-1">
                                <Code className="h-4 w-4 text-gray-400" />
                                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {rule.codeLocation}
                                </code>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href={`/program/${program.id}`}>
                      <Button variant="outline">View Full Program</Button>
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