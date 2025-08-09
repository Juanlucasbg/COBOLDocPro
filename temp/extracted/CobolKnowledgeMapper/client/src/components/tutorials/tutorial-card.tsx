import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  CheckCircle, 
  Lock, 
  Clock, 
  Star,
  BookOpen,
  RotateCcw
} from "lucide-react";
import type { TutorialModule, UserProgress } from "@shared/schema";

interface TutorialCardProps {
  module: TutorialModule;
  progress?: UserProgress;
  isUnlocked: boolean;
  onStart: () => void;
}

export default function TutorialCard({ 
  module, 
  progress, 
  isUnlocked, 
  onStart 
}: TutorialCardProps) {
  const isCompleted = progress?.isCompleted || false;
  const isInProgress = (progress?.progress || 0) > 0 && !isCompleted;
  const currentProgress = progress?.progress || 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-600';
      case 'intermediate': return 'bg-yellow-600';
      case 'advanced': return 'bg-red-600';
      default: return 'bg-slate-600';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '🟢';
      case 'intermediate': return '🟡';
      case 'advanced': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusIcon = () => {
    if (isCompleted) {
      return <CheckCircle className="w-6 h-6 text-green-400" />;
    }
    if (isInProgress) {
      return <Play className="w-6 h-6 text-blue-400" />;
    }
    if (!isUnlocked) {
      return <Lock className="w-6 h-6 text-slate-500" />;
    }
    return <BookOpen className="w-6 h-6 text-slate-400" />;
  };

  const getStatusBadge = () => {
    if (isCompleted) {
      return <Badge className="bg-green-600 text-white">Completed</Badge>;
    }
    if (isInProgress) {
      return <Badge className="bg-blue-600 text-white">In Progress</Badge>;
    }
    if (!isUnlocked) {
      return <Badge className="bg-slate-600 text-slate-300">Locked</Badge>;
    }
    return <Badge variant="outline" className="text-slate-300">Available</Badge>;
  };

  const getActionButton = () => {
    if (!isUnlocked) {
      return (
        <Button disabled className="w-full bg-slate-700 text-slate-400">
          <Lock className="w-4 h-4 mr-2" />
          Locked
        </Button>
      );
    }

    if (isCompleted) {
      return (
        <Button 
          variant="outline" 
          onClick={onStart}
          className="w-full border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Review
        </Button>
      );
    }

    if (isInProgress) {
      return (
        <Button 
          onClick={onStart}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Play className="w-4 h-4 mr-2" />
          Continue
        </Button>
      );
    }

    return (
      <Button 
        onClick={onStart}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Play className="w-4 h-4 mr-2" />
        Start
      </Button>
    );
  };

  return (
    <Card className={`bg-slate-800 border-slate-700 transition-all duration-200 hover:border-slate-600 ${
      !isUnlocked ? 'opacity-75' : ''
    } ${isInProgress ? 'border-blue-500' : ''} ${isCompleted ? 'border-green-500' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
            {getStatusIcon()}
          </div>
          {getStatusBadge()}
        </div>
        
        <div className="space-y-2">
          <h3 className={`text-lg font-semibold ${isUnlocked ? 'text-slate-100' : 'text-slate-400'}`}>
            {module.title}
          </h3>
          <p className={`text-sm ${isUnlocked ? 'text-slate-400' : 'text-slate-500'}`}>
            {module.description}
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Progress Bar (if in progress or completed) */}
          {(isInProgress || isCompleted) && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Progress</span>
                <span className="text-slate-100">{currentProgress}%</span>
              </div>
              <Progress value={currentProgress} className="h-2" />
            </div>
          )}
          
          {/* Module Details */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">{module.estimatedMinutes} min</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <span className="text-slate-400">{getDifficultyIcon(module.difficulty)}</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getDifficultyColor(module.difficulty)} text-white border-transparent`}
                >
                  {module.difficulty}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <span className="text-xs text-slate-500">Module {module.order}</span>
            </div>
          </div>
          
          {/* Learning Objectives Preview */}
          {module.content && typeof module.content === 'object' && (module.content as any).objectives && (
            <div className="bg-slate-700/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-slate-300 mb-2">You'll Learn:</h4>
              <ul className="space-y-1">
                {((module.content as any).objectives as string[]).slice(0, 2).map((objective, index) => (
                  <li key={index} className="text-xs text-slate-400 flex items-start space-x-2">
                    <Star className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <span>{objective}</span>
                  </li>
                ))}
                {((module.content as any).objectives as string[]).length > 2 && (
                  <li className="text-xs text-slate-500">
                    +{((module.content as any).objectives as string[]).length - 2} more objectives
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* Completion Info */}
          {isCompleted && progress?.completedAt && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Completed!</span>
              </div>
              <p className="text-xs text-green-300">
                Finished on {new Date(progress.completedAt).toLocaleDateString()}
              </p>
            </div>
          )}
          
          {/* Prerequisites (for locked modules) */}
          {!isUnlocked && (
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Lock className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-400">Prerequisites Required</span>
              </div>
              <p className="text-xs text-slate-500">
                Complete the previous module to unlock this lesson
              </p>
            </div>
          )}
          
          {/* Action Button */}
          <div className="pt-2">
            {getActionButton()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
