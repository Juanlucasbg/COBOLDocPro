import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Maximize, GitBranch } from "lucide-react";

export default function ProgramVisualization() {
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [visualizationType, setVisualizationType] = useState("dependencies");

  const { data: programs = [] } = useQuery({
    queryKey: ["/api/programs"],
  });

  const { data: relationships = [] } = useQuery({
    queryKey: [`/api/programs/${selectedProgram}/relationships`],
    enabled: selectedProgram !== "all",
  });

  const legendItems = [
    { label: "Entry Points", color: "bg-primary", textColor: "text-primary" },
    { label: "COBOL Programs", color: "bg-blue-100 border-blue-300", textColor: "text-blue-800" },
    { label: "Called Programs", color: "bg-green-100 border-green-300", textColor: "text-green-800" },
    { label: "Data Files", color: "bg-orange-100 border-orange-300", textColor: "text-orange-800" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Program Structure Visualization
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive diagrams showing program relationships and data flow
        </p>
      </div>

      {/* Visualization Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((program: any) => (
                <SelectItem key={program.id} value={program.id.toString()}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={visualizationType} onValueChange={setVisualizationType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select view type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dependencies">Program Dependencies</SelectItem>
              <SelectItem value="dataflow">Data Flow</SelectItem>
              <SelectItem value="hierarchy">Call Hierarchy</SelectItem>
              <SelectItem value="files">File Relationships</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <ZoomOut size={16} />
          </Button>
          <Button variant="outline" size="sm">
            <ZoomIn size={16} />
          </Button>
          <Button variant="outline" size="sm">
            <Maximize size={16} />
          </Button>
        </div>
      </div>

      {/* Visualization Canvas */}
      <Card>
        <CardContent className="p-6">
          <div 
            className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center relative border-2 border-dashed border-gray-300 dark:border-gray-600"
            style={{ height: "500px" }}
          >
            {/* Sample visualization content - in a real implementation, this would be replaced with an interactive diagram */}
            <div className="absolute top-4 left-4">
              <div className="bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
                MAIN-JOB
              </div>
              <div className="w-px h-8 bg-gray-400 ml-6 mt-2"></div>
            </div>
            
            <div className="absolute top-20 left-8">
              <div className="bg-blue-100 border border-blue-300 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium">
                {programs.length > 0 ? programs[0].name : 'PGMBILL1'}
              </div>
              <div className="flex mt-2">
                <div className="w-8 h-px bg-gray-400 mt-2"></div>
                <div className="bg-green-100 border border-green-300 text-green-800 px-3 py-2 rounded-lg text-sm font-medium">
                  {programs.length > 1 ? programs[1].name : 'PGMTAX01'}
                </div>
              </div>
            </div>

            <div className="absolute top-32 right-8">
              <div className="bg-orange-100 border border-orange-300 text-orange-800 px-3 py-2 rounded-lg text-sm font-medium">
                TRANSACT.DAT
              </div>
            </div>

            <div className="text-center text-gray-500 dark:text-gray-400">
              <GitBranch size={48} className="mx-auto mb-2" />
              <p className="font-medium">Interactive Program Dependency Visualization</p>
              <p className="text-sm">
                {programs.length === 0 
                  ? "Upload COBOL programs to see dependency visualization"
                  : "Click and drag to explore relationships"
                }
              </p>
              {relationships.length > 0 && (
                <p className="text-xs mt-2">
                  {relationships.length} relationships found
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center space-x-2">
                <div className={`w-4 h-4 ${item.color} rounded border`}></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
