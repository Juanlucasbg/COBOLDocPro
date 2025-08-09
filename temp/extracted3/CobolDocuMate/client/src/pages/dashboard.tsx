import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Code, FileText, ServerCog, Map, BarChart3 } from "lucide-react";
import { type CobolProgram } from "@shared/schema";
import FileUpload from "@/components/file-upload";
import SystemOverview from "@/components/system-overview";
import DocumentationViewer from "@/components/documentation-viewer";
import ProgramStructure from "@/components/program-structure";
import BusinessRules from "@/components/business-rules";
import Diagrams from "@/components/diagrams";
import ProcessingModal from "@/components/processing-modal";

type TabType = 'documentation' | 'structure' | 'business-rules' | 'diagrams';

export default function Dashboard() {
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('documentation');
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();

  const { data: programs = [], isLoading } = useQuery<CobolProgram[]>({
    queryKey: ['/api/programs'],
  });

  const selectedProgram = programs.find(p => p.id === selectedProgramId);

  const handleProgramSelect = (programId: number) => {
    setSelectedProgramId(programId);
    setActiveTab('documentation');
  };

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
    setIsProcessing(false);
  };

  const handleUploadStart = () => {
    setIsProcessing(true);
  };

  const renderTabContent = () => {
    if (!selectedProgram) {
      return (
        <div className="flex-1 bg-carbon-gray-10 p-6 flex items-center justify-center">
          <div className="text-center">
            <Code className="h-16 w-16 text-carbon-gray-50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
              Select a COBOL Program
            </h3>
            <p className="text-carbon-gray-80">
              Choose a program from the sidebar to view its documentation
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'documentation':
        return <DocumentationViewer program={selectedProgram} />;
      case 'structure':
        return <ProgramStructure program={selectedProgram} />;
      case 'business-rules':
        return <BusinessRules program={selectedProgram} />;
      case 'diagrams':
        return <Diagrams program={selectedProgram} />;
      default:
        return <DocumentationViewer program={selectedProgram} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-carbon-gray-10">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-carbon-gray-20 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-carbon-gray-20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-carbon-blue rounded-lg flex items-center justify-center">
              <Code className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-carbon-gray-100">COBOL Docs</h1>
              <p className="text-sm text-carbon-gray-80">Documentation Tool</p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="border-b border-carbon-gray-20">
          <FileUpload 
            onUploadStart={handleUploadStart}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>

        {/* System Overview */}
        <div className="flex-1">
          <SystemOverview
            programs={programs}
            selectedProgramId={selectedProgramId}
            onProgramSelect={handleProgramSelect}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="bg-white border-b border-carbon-gray-20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-carbon-gray-100">
                {selectedProgram?.filename || 'COBOL Documentation Tool'}
              </h1>
              <p className="text-carbon-gray-80 mt-1">
                {selectedProgram 
                  ? 'Generated documentation and analysis'
                  : 'Upload COBOL files to generate documentation'
                }
              </p>
            </div>
            {selectedProgram && (
              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 text-carbon-gray-80 hover:text-carbon-gray-100 transition-colors">
                  <BarChart3 className="h-4 w-4 mr-2 inline" />
                  Export
                </button>
                <button className="px-4 py-2 bg-carbon-blue text-white rounded-lg hover:bg-blue-600 transition-colors">
                  <Code className="h-4 w-4 mr-2 inline" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        {selectedProgram && (
          <div className="bg-white border-b border-carbon-gray-20">
            <div className="flex space-x-0">
              <button
                onClick={() => setActiveTab('documentation')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'documentation'
                    ? 'text-carbon-blue border-b-2 border-carbon-blue'
                    : 'text-carbon-gray-80 hover:text-carbon-gray-100'
                }`}
              >
                <FileText className="h-4 w-4 mr-2 inline" />
                Documentation
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'structure'
                    ? 'text-carbon-blue border-b-2 border-carbon-blue'
                    : 'text-carbon-gray-80 hover:text-carbon-gray-100'
                }`}
              >
                <Map className="h-4 w-4 mr-2 inline" />
                Program Structure
              </button>
              <button
                onClick={() => setActiveTab('business-rules')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'business-rules'
                    ? 'text-carbon-blue border-b-2 border-carbon-blue'
                    : 'text-carbon-gray-80 hover:text-carbon-gray-100'
                }`}
              >
                <ServerCog className="h-4 w-4 mr-2 inline" />
                Business Rules
              </button>
              <button
                onClick={() => setActiveTab('diagrams')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'diagrams'
                    ? 'text-carbon-blue border-b-2 border-carbon-blue'
                    : 'text-carbon-gray-80 hover:text-carbon-gray-100'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-2 inline" />
                Diagrams
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        {renderTabContent()}
      </div>

      {/* Processing Modal */}
      <ProcessingModal isOpen={isProcessing} />
    </div>
  );
}
