import ReactMarkdown from 'react-markdown';
import { Bot, Download, RotateCcw } from "lucide-react";
import { type CobolProgram } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentationViewerProps {
  program: CobolProgram;
}

export default function DocumentationViewer({ program }: DocumentationViewerProps) {
  const handleExport = () => {
    const element = document.createElement('a');
    const file = new Blob([program.generatedDocumentation || ''], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${program.filename}-documentation.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleRegenerate = async () => {
    try {
      const response = await fetch(`/api/programs/${program.id}/regenerate`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to regenerate documentation');
      }
      
      // The UI will update automatically through the query invalidation
    } catch (error) {
      console.error('Error regenerating documentation:', error);
    }
  };

  if (program.status === 'processing') {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <div className="my-6">
                <Skeleton className="h-6 w-1/2 mb-3" />
                <Skeleton className="h-32 w-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 flex items-center">
                <Bot className="h-4 w-4 mr-2" />
                Processing with CB77-instruct-7b AI model...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (program.status === 'error') {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
                Documentation Generation Failed
              </h3>
              <p className="text-carbon-gray-80 mb-4">
                {program.errorMessage || 'An error occurred while processing this COBOL file.'}
              </p>
              <Button onClick={handleRegenerate} className="bg-carbon-blue hover:bg-blue-600">
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!program.generatedDocumentation) {
    return (
      <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
        <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
          <div className="p-8">
            <div className="text-center py-8">
              <Bot className="h-16 w-16 text-carbon-gray-50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
                No Documentation Available
              </h3>
              <p className="text-carbon-gray-80 mb-4">
                Documentation hasn't been generated for this program yet.
              </p>
              <Button onClick={handleRegenerate} className="bg-carbon-blue hover:bg-blue-600">
                <Bot className="h-4 w-4 mr-2" />
                Generate Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-carbon-gray-10 p-6 overflow-auto">
      <div className="max-w-none bg-white rounded-lg shadow-sm border border-carbon-gray-20">
        <div className="p-8">
          <div className="flex justify-end mb-6 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="text-carbon-gray-80 hover:text-carbon-gray-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Export MD
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              className="text-carbon-gray-80 hover:text-carbon-gray-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-semibold text-carbon-gray-100 mb-6">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-semibold text-carbon-gray-100 mt-8 mb-4">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-medium text-carbon-gray-100 mt-6 mb-3">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-lg font-medium text-carbon-gray-100 mt-4 mb-3">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-carbon-gray-80 mb-4 leading-relaxed">
                    {children}
                  </p>
                ),
                pre: ({ children }) => (
                  <pre className="bg-carbon-gray-10 rounded-lg p-4 font-mono text-sm text-carbon-gray-100 overflow-x-auto">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => {
                  if (className?.includes('language-')) {
                    return (
                      <code className="block bg-carbon-gray-10 rounded p-4 text-sm font-mono text-carbon-gray-100">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="bg-carbon-gray-20 rounded px-2 py-1 text-sm font-mono text-carbon-gray-100">
                      {children}
                    </code>
                  );
                },
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-carbon-gray-80 space-y-2 mb-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-carbon-gray-80 space-y-2 mb-4">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-carbon-gray-80">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-carbon-blue pl-4 py-2 bg-blue-50 rounded-r-lg mb-4">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {program.generatedDocumentation}
            </ReactMarkdown>
          </div>

          <div className="mt-8 p-4 bg-carbon-gray-10 rounded-lg">
            <p className="text-sm text-carbon-gray-80 flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              Documentation generated by CB77-instruct-7b AI model •{' '}
              {program.processedAt && (
                <>
                  Last updated: {new Date(program.processedAt).toLocaleString()}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
