import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download } from "lucide-react";
import type { DataElement } from "@shared/schema";

export default function DataDictionary() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: dataElements = [], isLoading } = useQuery({
    queryKey: ["/api/data-elements"],
  });

  const filteredElements = dataElements.filter((element: DataElement) =>
    searchQuery === "" ||
    element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (element.description && element.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Dictionary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Data Dictionary</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Search data elements..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredElements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery ? "No data elements match your search." : "No data elements found. Upload COBOL programs to populate the data dictionary."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Element Name</th>
                  <th>Picture</th>
                  <th>Level</th>
                  <th>Usage</th>
                  <th>Description</th>
                  <th>Used In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredElements.map((element: DataElement) => (
                  <tr key={element.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 font-mono text-sm text-gray-900 dark:text-white">
                      {element.name}
                    </td>
                    <td className="py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                      {element.picture || '-'}
                    </td>
                    <td className="py-4 text-sm text-gray-700 dark:text-gray-300">
                      {element.level || '-'}
                    </td>
                    <td className="py-4 text-sm text-gray-700 dark:text-gray-300">
                      {element.usage || 'Display'}
                    </td>
                    <td className="py-4 text-sm text-gray-700 dark:text-gray-300 max-w-md">
                      <div className="truncate" title={element.description || 'No description available'}>
                        {element.description || 'No description available'}
                      </div>
                    </td>
                    <td className="py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {element.usedInPrograms?.slice(0, 3).map((program) => (
                          <Badge key={program} variant="secondary" className="text-xs">
                            {program}
                          </Badge>
                        )) || (
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            No programs
                          </span>
                        )}
                        {element.usedInPrograms && element.usedInPrograms.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{element.usedInPrograms.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {searchQuery && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredElements.length} of {dataElements.length} data elements
          </div>
        )}
      </CardContent>
    </Card>
  );
}
