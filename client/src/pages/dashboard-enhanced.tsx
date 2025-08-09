import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  FileCode, 
  Search, 
  Eye, 
  GitBranch, 
  Database, 
  BarChart3,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Download
} from "lucide-react";
import { Link } from "wouter";
import EnhancedFileUpload from "@/components/enhanced-file-upload";
import ProcessingModal from "@/components/processing-modal";
import { MermaidDiagram } from "@/lib/mermaid-renderer";
import { ClientCobolParser, parseCobolQuick, generateQuickDiagram } from "@/lib/cobol-client-parser";
import SequenceDiagramViewer from "@/components/sequence-diagram-viewer";
import type { Program, DataElement } from "@shared/schema";

type ActiveTab = 'overview' | 'programs' | 'data-dictionary' | 'business-rules' | 'visualizations' | 'sequence';

export default function EnhancedDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState<string>("");
  
  const queryClient = useQueryClient();

  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ['/api/programs'],
  });

  const { data: dataElements = [] } = useQuery({
    queryKey: ['/api/data-elements'],
  });

  const { data: statistics } = useQuery({
    queryKey: ['/api/statistics'],
  });

  const selectedProgram = programs.find((p: Program) => p.id === selectedProgramId);

  // Filter functions
  const filteredPrograms = programs.filter((program: Program) =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const programsWithBusinessRules = programs.filter((program: Program) => 
    program.businessRules && program.businessRules.length > 0
  );

  const programsWithDiagrams = programs.filter((program: Program) => 
    program.mermaidDiagram && program.mermaidDiagram.mermaidCode
  );

  const handleUploadStart = () => {
    setIsProcessing(true);
    setProcessingFile("Processing files...");
  };

  const handleUploadSuccess = () => {
    setIsProcessing(false);
    setProcessingFile("");
    queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
    queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
    queryClient.invalidateQueries({ queryKey: ['/api/data-elements'] });
  };

  const handleUploadError = () => {
    setIsProcessing(false);
    setProcessingFile("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'processing':
        return <Clock className="h-3 w-3" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <FileCode className="h-3 w-3" />;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <FileCode className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Programs</p>
                <p className="text-2xl font-bold text-white">{statistics?.totalPrograms || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Documented</p>
                <p className="text-2xl font-bold text-white">{statistics?.documentedPrograms || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Data Elements</p>
                <p className="text-2xl font-bold text-white">{dataElements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Business Rules</p>
                <p className="text-2xl font-bold text-white">{programsWithBusinessRules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <EnhancedFileUpload
        onUploadStart={handleUploadStart}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />

      {/* Recent Programs */}
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Programs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {programs.slice(0, 5).map((program: Program) => (
              <div
                key={program.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/80 transition-colors"
                onClick={() => {
                  setSelectedProgramId(program.id);
                  setActiveTab('programs');
                }}
              >
                <div className="flex items-center space-x-3">
                  <FileCode className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{program.name}</p>
                    <p className="text-xs text-gray-400">{program.filename}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(program.status || 'unknown')}>
                  {getStatusIcon(program.status || 'unknown')}
                  <span className="ml-1 capitalize">{program.status || 'Unknown'}</span>
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPrograms = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search programs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-900/50 border-gray-700"
        />
      </div>

      {/* Programs Grid */}
      <div className="grid gap-4">
        {filteredPrograms.map((program: Program) => (
          <Card
            key={program.id}
            className={`bg-gray-900/50 border-gray-700 cursor-pointer transition-all hover:border-green-400/50 ${
              selectedProgramId === program.id ? 'border-green-400 bg-green-400/5' : ''
            }`}
            onClick={() => setSelectedProgramId(program.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-white">{program.name}</h3>
                    <Badge className={getStatusColor(program.status || 'unknown')}>
                      {getStatusIcon(program.status || 'unknown')}
                      <span className="ml-1 capitalize">{program.status || 'Unknown'}</span>
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{program.filename}</p>
                  <p className="text-xs text-gray-500">{program.linesOfCode} lines of code</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/program/${program.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderDataDictionary = () => {
    const groupedElements = dataElements.reduce((acc: Record<number, DataElement[]>, element: DataElement) => {
      if (!acc[element.programId]) {
        acc[element.programId] = [];
      }
      acc[element.programId].push(element);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        {Object.entries(groupedElements).map(([programId, elements]) => {
          const program = programs.find((p: Program) => p.id === parseInt(programId));
          if (!program) return null;

          return (
            <Card key={programId} className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-400" />
                  <span>{program.name}</span>
                  <Badge variant="outline" className="border-gray-600 text-gray-400">
                    {elements.length} elements
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {elements.map((element: DataElement) => (
                    <div key={element.id} className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="text-xs border-gray-600">
                          {element.level}
                        </Badge>
                        <span className="text-white font-mono">{element.name}</span>
                        {element.picture && (
                          <Badge variant="outline" className="text-xs border-blue-600 text-blue-400">
                            PIC {element.picture}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderBusinessRules = () => (
    <div className="space-y-4">
      {programsWithBusinessRules.map((program: Program) => (
        <Card key={program.id} className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <GitBranch className="h-5 w-5 text-orange-400" />
              <span>{program.name}</span>
              <Badge variant="outline" className="border-gray-600 text-gray-400">
                {program.businessRules?.length || 0} rules
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {program.businessRules?.map((rule: any, index: number) => (
                <div key={index} className="p-3 bg-gray-800/30 rounded-lg">
                  <h4 className="font-medium text-white mb-2">
                    Rule {index + 1}: {rule.type || 'Business Logic'}
                  </h4>
                  <p className="text-sm text-gray-300 mb-2">{rule.description || rule.rule}</p>
                  {rule.conditions && rule.conditions.length > 0 && (
                    <div className="text-xs text-blue-400">
                      Conditions: {rule.conditions.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderVisualizations = () => (
    <div className="space-y-4">
      {programsWithDiagrams.map((program: Program) => {
        // Generate additional diagrams using client-side parser
        const clientParser = new ClientCobolParser(program.sourceCode || '');
        const sequenceDiagram = clientParser.generateSequenceDiagram();
        const dataDiagram = clientParser.generateDataDiagram();
        
        return (
          <Card key={program.id} className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                  <span>{program.name}</span>
                  <Badge variant="outline" className="border-purple-600 text-purple-400">
                    Multiple Diagrams
                  </Badge>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="flowchart" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
                  <TabsTrigger value="flowchart" className="data-[state=active]:bg-purple-600">
                    Flowchart
                  </TabsTrigger>
                  <TabsTrigger value="sequence" className="data-[state=active]:bg-purple-600">
                    Sequence
                  </TabsTrigger>
                  <TabsTrigger value="data" className="data-[state=active]:bg-purple-600">
                    Data Structure
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="flowchart" className="mt-4">
                  {program.mermaidDiagram?.mermaidCode && (
                    <MermaidDiagram
                      code={program.mermaidDiagram.mermaidCode}
                      id={`flowchart-${program.id}`}
                      className="border border-gray-700 rounded-lg"
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="sequence" className="mt-4">
                  <MermaidDiagram
                    code={sequenceDiagram}
                    id={`sequence-${program.id}`}
                    className="border border-gray-700 rounded-lg"
                  />
                </TabsContent>
                
                <TabsContent value="data" className="mt-4">
                  <MermaidDiagram
                    code={dataDiagram}
                    id={`data-${program.id}`}
                    className="border border-gray-700 rounded-lg"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">COBOL ClarityEngine</h1>
          <p className="text-gray-400">
            Enterprise COBOL documentation and analysis platform
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
          <TabsList className="grid w-full grid-cols-6 bg-gray-900/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="programs" className="data-[state=active]:bg-green-600">
              Programs
            </TabsTrigger>
            <TabsTrigger value="data-dictionary" className="data-[state=active]:bg-green-600">
              Data Dictionary
            </TabsTrigger>
            <TabsTrigger value="business-rules" className="data-[state=active]:bg-green-600">
              Business Rules
            </TabsTrigger>
            <TabsTrigger value="visualizations" className="data-[state=active]:bg-green-600">
              Visualizations
            </TabsTrigger>
            <TabsTrigger value="sequence" className="data-[state=active]:bg-green-600">
              Sequence
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              {renderOverview()}
            </TabsContent>

            <TabsContent value="programs">
              {renderPrograms()}
            </TabsContent>

            <TabsContent value="data-dictionary">
              {renderDataDictionary()}
            </TabsContent>

            <TabsContent value="business-rules">
              {renderBusinessRules()}
            </TabsContent>

            <TabsContent value="visualizations">
              {renderVisualizations()}
            </TabsContent>

            <TabsContent value="sequence">
              <SequenceDiagramViewer programs={programs} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Processing Modal */}
        <ProcessingModal
          isOpen={isProcessing}
          filename={processingFile}
          onComplete={handleUploadSuccess}
        />
      </div>
    </div>
  );
}