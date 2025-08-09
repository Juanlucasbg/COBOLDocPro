import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Play, 
  Pause,
  RotateCcw,
  BookOpen,
  Code,
  Target,
  Award,
  Lightbulb,
  HelpCircle
} from "lucide-react";
import type { TutorialModule, UserProgress } from "@shared/schema";

interface LessonStep {
  id: string;
  type: 'instruction' | 'exercise' | 'quiz' | 'example';
  title: string;
  content: string;
  code?: string;
  questions?: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
  hints?: string[];
  solution?: string;
}

interface InteractiveLessonProps {
  module: TutorialModule;
  progress?: UserProgress;
  onProgressUpdate: (progress: number, isCompleted: boolean) => void;
  onComplete: () => void;
}

export default function InteractiveLesson({ 
  module, 
  progress, 
  onProgressUpdate, 
  onComplete 
}: InteractiveLessonProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Map<string, number>>(new Map());
  const [showHints, setShowHints] = useState<Set<string>>(new Set());
  const [showSolution, setShowSolution] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);

  // Mock lesson content - in real app this would come from module.content
  const lessonSteps: LessonStep[] = [
    {
      id: 'intro',
      type: 'instruction',
      title: 'Understanding COBOL Dependencies',
      content: 'In COBOL systems, programs depend on each other through CALL statements and COPY statements. Understanding these dependencies is crucial for maintaining legacy systems.',
      hints: ['Dependencies help us understand how programs interact', 'CALL creates runtime dependencies', 'COPY creates compile-time dependencies']
    },
    {
      id: 'call-example',
      type: 'example',
      title: 'CALL Statement Example',
      content: 'Here\'s how a CALL statement creates a dependency between two programs:',
      code: `IDENTIFICATION DIVISION.
PROGRAM-ID. MAIN-PROGRAM.

PROCEDURE DIVISION.
    CALL 'VALIDATION-ROUTINE'
        USING CUSTOMER-RECORD
        GIVING VALIDATION-RESULT.
    
    IF VALIDATION-RESULT = 'VALID'
        PERFORM PROCESS-CUSTOMER
    END-IF.`,
      hints: ['The CALL statement creates a dependency', 'Parameters are passed using USING clause', 'Results are returned using GIVING clause']
    },
    {
      id: 'exercise-1',
      type: 'exercise',
      title: 'Identify Dependencies',
      content: 'Look at the following COBOL code and identify the dependencies:',
      code: `WORKING-STORAGE SECTION.
    COPY CUSTOMER-RECORD.
    
PROCEDURE DIVISION.
    CALL 'VALIDATE-DATA'
        USING CUSTOMER-RECORD.
        
    CALL 'SAVE-CUSTOMER'
        USING CUSTOMER-RECORD
        GIVING SAVE-STATUS.`,
      solution: 'This code has 3 dependencies: 1 COPY dependency (CUSTOMER-RECORD) and 2 CALL dependencies (VALIDATE-DATA, SAVE-CUSTOMER)',
      hints: ['Look for COPY statements', 'Look for CALL statements', 'Count each dependency separately']
    },
    {
      id: 'quiz-1',
      type: 'quiz',
      title: 'Quick Quiz',
      content: 'Test your understanding of COBOL dependencies:',
      questions: [
        {
          question: 'What type of dependency does a CALL statement create?',
          options: ['Compile-time dependency', 'Runtime dependency', 'Static dependency', 'None of the above'],
          correctAnswer: 1,
          explanation: 'CALL statements create runtime dependencies because the called program is loaded and executed at runtime.'
        },
        {
          question: 'What type of dependency does a COPY statement create?',
          options: ['Runtime dependency', 'Compile-time dependency', 'Dynamic dependency', 'No dependency'],
          correctAnswer: 1,
          explanation: 'COPY statements create compile-time dependencies because the copied code is included during compilation.'
        }
      ]
    }
  ];

  const currentStep = lessonSteps[currentStepIndex];
  const totalSteps = lessonSteps.length;
  const lessonProgress = Math.round((completedSteps.size / totalSteps) * 100);

  useEffect(() => {
    // Update progress when completed steps change
    const isCompleted = completedSteps.size === totalSteps;
    onProgressUpdate(lessonProgress, isCompleted);
  }, [completedSteps, lessonProgress, totalSteps, onProgressUpdate]);

  const handleStepComplete = () => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStep.id);
    setCompletedSteps(newCompleted);

    if (newCompleted.size === totalSteps) {
      // Lesson completed
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    const newAnswers = new Map(userAnswers);
    newAnswers.set(`${currentStep.id}-${questionIndex}`, answerIndex);
    setUserAnswers(newAnswers);
  };

  const toggleHint = () => {
    const newHints = new Set(showHints);
    if (newHints.has(currentStep.id)) {
      newHints.delete(currentStep.id);
    } else {
      newHints.add(currentStep.id);
    }
    setShowHints(newHints);
  };

  const toggleSolution = () => {
    const newSolutions = new Set(showSolution);
    if (newSolutions.has(currentStep.id)) {
      newSolutions.delete(currentStep.id);
    } else {
      newSolutions.add(currentStep.id);
    }
    setShowSolution(newSolutions);
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'instruction': return <BookOpen className="w-5 h-5 text-blue-400" />;
      case 'exercise': return <Target className="w-5 h-5 text-green-400" />;
      case 'quiz': return <HelpCircle className="w-5 h-5 text-purple-400" />;
      case 'example': return <Code className="w-5 h-5 text-yellow-400" />;
      default: return <BookOpen className="w-5 h-5 text-slate-400" />;
    }
  };

  const isStepCompleted = completedSteps.has(currentStep.id);
  const canProceed = currentStep.type !== 'quiz' || (currentStep.questions?.every((_, index) => 
    userAnswers.has(`${currentStep.id}-${index}`)
  ));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Lesson Header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-100 flex items-center space-x-2">
                <Award className="w-6 h-6 text-yellow-400" />
                <span>{module.title}</span>
              </CardTitle>
              <p className="text-slate-400 mt-1">{module.description}</p>
            </div>
            <Badge className="bg-blue-600 text-white">
              Interactive Lesson
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Overall Progress</span>
                <span className="text-slate-100">{lessonProgress}%</span>
              </div>
              <Progress value={lessonProgress} className="h-3" />
            </div>
            
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Step {currentStepIndex + 1} of {totalSteps}</span>
              <span>{completedSteps.size} steps completed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Navigation */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {lessonSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(index)}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  index === currentStepIndex 
                    ? 'bg-blue-600 text-white' 
                    : completedSteps.has(step.id)
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {completedSteps.has(step.id) ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStepIcon(currentStep.type)}
              <div>
                <CardTitle className="text-slate-100">{currentStep.title}</CardTitle>
                <Badge 
                  variant="outline" 
                  className={`mt-1 ${
                    currentStep.type === 'instruction' ? 'text-blue-300' :
                    currentStep.type === 'exercise' ? 'text-green-300' :
                    currentStep.type === 'quiz' ? 'text-purple-300' :
                    'text-yellow-300'
                  }`}
                >
                  {currentStep.type.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            {isStepCompleted && (
              <Badge className="bg-green-600 text-white">
                <CheckCircle className="w-4 h-4 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Step Content */}
            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300 leading-relaxed">{currentStep.content}</p>
            </div>

            {/* Code Example */}
            {currentStep.code && (
              <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                  <div className="flex items-center space-x-2">
                    <Code className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">COBOL Example</span>
                  </div>
                </div>
                <ScrollArea className="h-64">
                  <pre className="p-4 text-sm font-mono text-slate-100 whitespace-pre-wrap">
                    {currentStep.code}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {/* Quiz Questions */}
            {currentStep.type === 'quiz' && currentStep.questions && (
              <div className="space-y-4">
                {currentStep.questions.map((question, qIndex) => {
                  const userAnswer = userAnswers.get(`${currentStep.id}-${qIndex}`);
                  const isAnswered = userAnswer !== undefined;
                  const isCorrect = isAnswered && userAnswer === question.correctAnswer;
                  
                  return (
                    <div key={qIndex} className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-slate-200 mb-3">
                        {qIndex + 1}. {question.question}
                      </h4>
                      
                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => (
                          <button
                            key={oIndex}
                            onClick={() => handleQuizAnswer(qIndex, oIndex)}
                            disabled={isAnswered}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              isAnswered
                                ? oIndex === question.correctAnswer
                                  ? 'border-green-500 bg-green-900/20 text-green-300'
                                  : oIndex === userAnswer && !isCorrect
                                  ? 'border-red-500 bg-red-900/20 text-red-300'
                                  : 'border-slate-600 bg-slate-800/50 text-slate-400'
                                : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                            }`}
                          >
                            <span className="font-medium mr-2">{String.fromCharCode(65 + oIndex)}.</span>
                            {option}
                          </button>
                        ))}
                      </div>
                      
                      {isAnswered && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          isCorrect 
                            ? 'bg-green-900/20 border border-green-700' 
                            : 'bg-red-900/20 border border-red-700'
                        }`}>
                          <p className={`text-sm ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                            {isCorrect ? '✓ Correct!' : '✗ Incorrect.'}
                          </p>
                          <p className="text-sm text-slate-300 mt-1">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Hints */}
            {currentStep.hints && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleHint}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {showHints.has(currentStep.id) ? 'Hide' : 'Show'} Hints
                </Button>
                
                {showHints.has(currentStep.id) && (
                  <div className="mt-3 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-300 mb-2">💡 Hints:</h4>
                    <ul className="space-y-1">
                      {currentStep.hints.map((hint, index) => (
                        <li key={index} className="text-sm text-yellow-200">
                          • {hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Solution */}
            {currentStep.solution && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSolution}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Target className="w-4 h-4 mr-2" />
                  {showSolution.has(currentStep.id) ? 'Hide' : 'Show'} Solution
                </Button>
                
                {showSolution.has(currentStep.id) && (
                  <div className="mt-3 bg-green-900/20 border border-green-700 rounded-lg p-4">
                    <h4 className="font-medium text-green-300 mb-2">✓ Solution:</h4>
                    <p className="text-sm text-green-200">{currentStep.solution}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="border-slate-600"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center space-x-4">
              {!isStepCompleted && canProceed && (
                <Button
                  onClick={handleStepComplete}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
              )}

              {currentStepIndex === totalSteps - 1 && completedSteps.size === totalSteps ? (
                <Button
                  onClick={onComplete}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Award className="w-4 h-4 mr-2" />
                  Finish Lesson
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={currentStepIndex === totalSteps - 1 || !canProceed}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
