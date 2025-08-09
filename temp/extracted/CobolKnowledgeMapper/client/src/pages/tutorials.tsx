import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  GraduationCap, 
  Play, 
  CheckCircle, 
  Lock, 
  Clock, 
  Star,
  BookOpen,
  Award,
  Target,
  Users
} from "lucide-react";
import TutorialCard from "@/components/tutorials/tutorial-card";
import InteractiveLesson from "@/components/tutorials/interactive-lesson";
import type { TutorialModule, UserProgress } from "@shared/schema";

export default function TutorialsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedModuleId, setSelectedModuleId] = useState<number | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock user ID - in real app this would come from auth context
  const currentUserId = 1;

  const { data: modules, isLoading: loadingModules } = useQuery({
    queryKey: ['/api/tutorials'],
  });

  const { data: userProgress, isLoading: loadingProgress } = useQuery({
    queryKey: ['/api/users', currentUserId, 'progress'],
  });

  const { data: selectedModule } = useQuery({
    queryKey: ['/api/tutorials', selectedModuleId],
    enabled: !!selectedModuleId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { moduleId: number; progress: number; isCompleted: boolean }) => {
      return apiRequest('PUT', `/api/users/${currentUserId}/progress`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', currentUserId, 'progress'] });
      toast({
        title: "Progress Updated",
        description: "Your learning progress has been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
    },
  });

  // Calculate overall progress
  const overallProgress = modules && userProgress ? 
    Math.round((userProgress.filter((p: UserProgress) => p.isCompleted).length / modules.length) * 100) : 0;

  const completedModules = userProgress?.filter((p: UserProgress) => p.isCompleted).length || 0;
  const totalModules = modules?.length || 0;

  const getModuleProgress = (moduleId: number) => {
    return userProgress?.find((p: UserProgress) => p.moduleId === moduleId);
  };

  const isModuleUnlocked = (module: TutorialModule, index: number) => {
    if (index === 0) return true; // First module is always unlocked
    const previousModuleProgress = getModuleProgress(modules[index - 1].id);
    return previousModuleProgress?.isCompleted || false;
  };

  const handleStartModule = (moduleId: number) => {
    setSelectedModuleId(moduleId);
    setActiveTab("lesson");
    
    // Update progress to mark as started
    const currentProgress = getModuleProgress(moduleId);
    if (!currentProgress) {
      updateProgressMutation.mutate({
        moduleId,
        progress: 0,
        isCompleted: false
      });
    }
  };

  const handleProgressUpdate = (moduleId: number, progress: number, isCompleted: boolean) => {
    updateProgressMutation.mutate({
      moduleId,
      progress,
      isCompleted
    });
  };

  if (loadingModules || loadingProgress) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-32 bg-slate-800 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Junior Developer Learning Path</h1>
        <p className="text-slate-400">Interactive tutorials to master legacy COBOL systems</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
            Overview
          </TabsTrigger>
          <TabsTrigger value="modules" className="data-[state=active]:bg-blue-600">
            Learning Modules
          </TabsTrigger>
          <TabsTrigger value="lesson" className="data-[state=active]:bg-blue-600" disabled={!selectedModuleId}>
            Interactive Lesson
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Progress Overview */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-100 flex items-center space-x-2">
                  <GraduationCap className="w-6 h-6 text-blue-400" />
                  <span>Your Learning Progress</span>
                </CardTitle>
                <Badge className="bg-teal-600 text-white">
                  {overallProgress}% Complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Overall Progress</span>
                    <span className="text-slate-100">{completedModules} of {totalModules} modules</span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-green-400">{completedModules}</p>
                    <p className="text-sm text-slate-400">Completed</p>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-blue-400">
                      {userProgress?.filter((p: UserProgress) => p.progress > 0 && !p.isCompleted).length || 0}
                    </p>
                    <p className="text-sm text-slate-400">In Progress</p>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Lock className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-400">{totalModules - completedModules}</p>
                    <p className="text-sm text-slate-400">Remaining</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Path Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-slate-100 flex items-center space-x-2">
                  <Target className="w-5 h-5 text-teal-400" />
                  <span>Learning Objectives</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-slate-200">Master COBOL Fundamentals</h4>
                      <p className="text-sm text-slate-400">Understand program structure, syntax, and basic operations</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-teal-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-slate-200">Dependency Analysis</h4>
                      <p className="text-sm text-slate-400">Learn to identify and map program relationships</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-slate-200">Legacy System Navigation</h4>
                      <p className="text-sm text-slate-400">Navigate and understand complex enterprise systems</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-slate-200">Documentation Best Practices</h4>
                      <p className="text-sm text-slate-400">Create and maintain effective system documentation</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-slate-100 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span>Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className={`flex items-center space-x-3 p-3 rounded-lg ${completedModules >= 1 ? 'bg-green-900/30' : 'bg-slate-700'}`}>
                    <Star className={`w-5 h-5 ${completedModules >= 1 ? 'text-yellow-400' : 'text-slate-500'}`} />
                    <div>
                      <h4 className={`font-medium ${completedModules >= 1 ? 'text-green-300' : 'text-slate-400'}`}>
                        First Steps
                      </h4>
                      <p className="text-sm text-slate-400">Complete your first tutorial module</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center space-x-3 p-3 rounded-lg ${completedModules >= 3 ? 'bg-blue-900/30' : 'bg-slate-700'}`}>
                    <BookOpen className={`w-5 h-5 ${completedModules >= 3 ? 'text-blue-400' : 'text-slate-500'}`} />
                    <div>
                      <h4 className={`font-medium ${completedModules >= 3 ? 'text-blue-300' : 'text-slate-400'}`}>
                        Knowledge Builder
                      </h4>
                      <p className="text-sm text-slate-400">Complete 3 tutorial modules</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center space-x-3 p-3 rounded-lg ${overallProgress === 100 ? 'bg-purple-900/30' : 'bg-slate-700'}`}>
                    <GraduationCap className={`w-5 h-5 ${overallProgress === 100 ? 'text-purple-400' : 'text-slate-500'}`} />
                    <div>
                      <h4 className={`font-medium ${overallProgress === 100 ? 'text-purple-300' : 'text-slate-400'}`}>
                        COBOL Master
                      </h4>
                      <p className="text-sm text-slate-400">Complete all tutorial modules</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules?.map((module: TutorialModule, index: number) => {
              const progress = getModuleProgress(module.id);
              const isUnlocked = isModuleUnlocked(module, index);
              
              return (
                <TutorialCard
                  key={module.id}
                  module={module}
                  progress={progress}
                  isUnlocked={isUnlocked}
                  onStart={() => handleStartModule(module.id)}
                />
              );
            })}
          </div>

          {modules?.length === 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <GraduationCap className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Tutorials Available</h3>
                <p className="text-slate-400">Tutorial modules are being prepared for you.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lesson" className="space-y-6">
          {selectedModule ? (
            <InteractiveLesson
              module={selectedModule}
              progress={getModuleProgress(selectedModule.id)}
              onProgressUpdate={(progress, isCompleted) => 
                handleProgressUpdate(selectedModule.id, progress, isCompleted)
              }
              onComplete={() => {
                setActiveTab("modules");
                setSelectedModuleId(undefined);
              }}
            />
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Lesson Selected</h3>
                <p className="text-slate-400">Go to Learning Modules to start a lesson.</p>
                <Button 
                  onClick={() => setActiveTab("modules")}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  Browse Modules
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
