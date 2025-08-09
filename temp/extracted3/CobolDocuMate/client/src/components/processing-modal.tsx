import { Cog, CheckCircle, Clock, LoaderPinwheel } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ProcessingModalProps {
  isOpen: boolean;
}

export default function ProcessingModal({ isOpen }: ProcessingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md">
        <DialogTitle className="sr-only">Processing COBOL File</DialogTitle>
        <DialogDescription className="sr-only">
          Analyzing program structure and generating documentation
        </DialogDescription>
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-carbon-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <Cog className="text-white text-2xl animate-spin" />
          </div>
          
          <h3 className="text-xl font-semibold text-carbon-gray-100 mb-2">
            Processing COBOL File
          </h3>
          
          <p className="text-carbon-gray-80 mb-6">
            Analyzing program structure and generating documentation...
          </p>
          
          {/* Progress Indicators */}
          <div className="w-full bg-carbon-gray-20 rounded-full h-2 mb-6">
            <div 
              className="bg-carbon-blue h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: '65%' }}
            />
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-carbon-gray-80">Parsing divisions...</span>
              <CheckCircle className="h-4 w-4 text-status-success" />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-carbon-gray-80">Extracting business rules...</span>
              <LoaderPinwheel className="h-4 w-4 text-carbon-blue animate-spin" />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-carbon-gray-80">Generating documentation...</span>
              <Clock className="h-4 w-4 text-carbon-gray-50" />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-carbon-gray-80">Creating diagrams...</span>
              <Clock className="h-4 w-4 text-carbon-gray-50" />
            </div>
          </div>
          
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Using CB77-instruct-7b AI model for intelligent COBOL analysis
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
