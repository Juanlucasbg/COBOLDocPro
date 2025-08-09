import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Loader2, FileCode, Brain, GitBranch, FileText } from "lucide-react";

interface ProcessingModalProps {
  isOpen: boolean;
  filename?: string;
  onComplete?: () => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed';
  icon: React.ReactNode;
}

export default function ProcessingModal({ isOpen, filename, onComplete }: ProcessingModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: 'parsing',
      label: 'Parsing COBOL structure...',
      status: 'pending',
      icon: <FileCode className="h-4 w-4" />
    },
    {
      id: 'analysis',
      label: 'Analyzing semantic patterns...',
      status: 'pending',
      icon: <Brain className="h-4 w-4" />
    },
    {
      id: 'rules',
      label: 'Extracting business rules...',
      status: 'pending',
      icon: <GitBranch className="h-4 w-4" />
    },
    {
      id: 'documentation',
      label: 'Generating documentation...',
      status: 'pending',
      icon: <FileText className="h-4 w-4" />
    }
  ]);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStepIndex(0);
      setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
      return;
    }

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 8 + 2, 100);
        
        // Update step status based on progress
        const stepProgress = newProgress / 25; // 4 steps, so 25% each
        const newCurrentStep = Math.min(Math.floor(stepProgress), 3);
        
        if (newCurrentStep !== currentStepIndex) {
          setCurrentStepIndex(newCurrentStep);
          setSteps(prevSteps => prevSteps.map((step, index) => ({
            ...step,
            status: index < newCurrentStep ? 'completed' :
                   index === newCurrentStep ? 'processing' : 'pending'
          })));
        }
        
        if (newProgress >= 100) {
          setTimeout(() => {
            onComplete?.();
          }, 1000);
        }
        
        return newProgress;
      });
    }, 150);

    return () => clearInterval(timer);
  }, [isOpen, currentStepIndex, onComplete]);

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-green-400 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepTextColor = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-400';
      case 'processing':
        return 'text-white';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md bg-black border-gray-800">
        <DialogTitle className="sr-only">Processing COBOL File</DialogTitle>
        <DialogDescription className="sr-only">
          Analyzing program structure and generating documentation
        </DialogDescription>
        
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
            <FileCode className="text-green-400 text-2xl animate-pulse" />
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-2">
            Processing COBOL Analysis
          </h3>
          
          <p className="text-gray-400 mb-6">
            {filename ? `Analyzing ${filename}...` : 'Performing comprehensive COBOL analysis...'}
          </p>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <Progress 
              value={progress} 
              className="h-2 bg-gray-800"
            />
            <div className="text-sm text-gray-400 mt-2">
              {Math.round(progress)}% complete
            </div>
          </div>
          
          {/* Processing Steps */}
          <div className="space-y-3 text-sm">
            {steps.map((step) => (
              <div key={step.id} className="flex justify-between items-center">
                <span className={getStepTextColor(step)}>
                  {step.label}
                </span>
                {getStepIcon(step)}
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-sm text-green-400">
              Using enterprise-grade semantic analysis for comprehensive COBOL understanding
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}