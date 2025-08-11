import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  FileText, 
  GitBranch, 
  Activity,
  Code,
  Database,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";

export default function ProgramDetail() {
  const params = useParams();
  const programId = params.id;

  // Fetch program details
  const { data: program, isLoading } = useQuery({
    queryKey: [`/api/programs/${programId}`],
    enabled: !!programId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading program details...</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-20">
        <p className="text-white">Program not found</p>
        <Link href="/">
          <Button className="mt-4">Return to Overview</Button>
        </Link>
      </div>
    );
  }

  const getComplexityBadge = (complexity: number) => {
    if (complexity <= 10) {
      return <Badge className="bg-green-500/20 text-green-400">Low Complexity</Badge>;
    } else if (complexity <= 20) {
      return <Badge className="bg-yellow-500/20 text-yellow-400">Medium Complexity</Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-400">High Complexity</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          className="mb-4 text-white hover:text-green-400"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {program.name}
            </h1>
            <p className="text-gray-400">
              {program.filename}
            </p>
          </div>
          <div className="flex gap-2">
            {getComplexityBadge(program.complexity || 0)}
            {program.status === 'completed' && (
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Analyzed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <Code className="w-4 h-4 mr-2" />
              Lines of Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {program.linesOfCode?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Complexity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {program.complexity || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <Database className="w-4 h-4 mr-2" />
              Statements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {program.totalStatements || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-white">
              {program.updatedAt ? new Date(program.updatedAt).toLocaleDateString() : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Program Information */}
      {(program.author || program.dateWritten) && (
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Program Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {program.author && (
              <div className="flex items-center text-gray-400">
                <User className="w-4 h-4 mr-2" />
                <span className="text-sm">Author: </span>
                <span className="text-white ml-2">{program.author}</span>
              </div>
            )}
            {program.dateWritten && (
              <div className="flex items-center text-gray-400">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="text-sm">Date Written: </span>
                <span className="text-white ml-2">{program.dateWritten}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for Different Documentation Views */}
      <Tabs defaultValue="ai-documentation" className="space-y-4">
        <TabsList className="bg-gray-900">
          <TabsTrigger value="ai-documentation">AI Documentation</TabsTrigger>
          <TabsTrigger value="business-rules">Business Rules</TabsTrigger>
          <TabsTrigger value="quality">Quality Assessment</TabsTrigger>
          <TabsTrigger value="source">Source Code</TabsTrigger>
        </TabsList>

        {/* AI Documentation Tab */}
        <TabsContent value="ai-documentation" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">AI-Generated Documentation</CardTitle>
              <CardDescription className="text-gray-400">
                Comprehensive analysis and explanation of the program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {program.aiSummary ? (
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                      {program.aiSummary}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No AI documentation available yet. Documentation is being generated.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Rules Tab */}
        <TabsContent value="business-rules" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Business Rules</CardTitle>
              <CardDescription className="text-gray-400">
                Extracted business logic and validation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {program.businessRules ? (
                <div className="space-y-4">
                  {JSON.parse(program.businessRules).map((rule: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white">{rule.name}</h4>
                        <Badge className="bg-blue-500/20 text-blue-400">
                          {rule.confidence}% Confidence
                        </Badge>
                      </div>
                      <p className="text-gray-300 text-sm">{rule.description}</p>
                      {rule.impact && (
                        <p className="text-gray-400 text-xs mt-2">
                          Impact: {rule.impact}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">
                  No business rules extracted yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Assessment Tab */}
        <TabsContent value="quality" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Quality Assessment</CardTitle>
              <CardDescription className="text-gray-400">
                Code quality metrics and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {program.qualityAssessment ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-semibold mb-3">Quality Score</h4>
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl font-bold text-green-500">
                        {JSON.parse(program.qualityAssessment).score}/100
                      </div>
                      <Badge className={`${
                        JSON.parse(program.qualityAssessment).score >= 80 ? 'bg-green-500/20 text-green-400' :
                        JSON.parse(program.qualityAssessment).score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {JSON.parse(program.qualityAssessment).grade}
                      </Badge>
                    </div>
                  </div>

                  {JSON.parse(program.qualityAssessment).recommendations && (
                    <div>
                      <h4 className="text-white font-semibold mb-3">Recommendations</h4>
                      <ul className="space-y-2">
                        {JSON.parse(program.qualityAssessment).recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">
                  Quality assessment not available yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Code Tab */}
        <TabsContent value="source" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Source Code Preview</CardTitle>
              <CardDescription className="text-gray-400">
                First 100 lines of the COBOL program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <pre className="text-xs text-gray-300 font-mono">
                  <code>
                    {program.sourceCode ? 
                      program.sourceCode.split('\n').slice(0, 100).join('\n') + 
                      (program.sourceCode.split('\n').length > 100 ? '\n\n... (truncated)' : '') :
                      'Source code not available'}
                  </code>
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}