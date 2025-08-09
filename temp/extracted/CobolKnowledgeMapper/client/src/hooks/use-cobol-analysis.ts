import { useState, useCallback } from 'react';
import { parseCobolCode } from '@/lib/cobol-parser';
import { analyzeDependencies } from '@/lib/dependency-analyzer';

export interface CobolAnalysisResult {
  programId: string;
  divisions: {
    identification: string[];
    environment: string[];
    data: string[];
    procedure: string[];
  };
  dependencies: {
    calls: string[];
    copybooks: string[];
    files: string[];
  };
  metrics: {
    linesOfCode: number;
    complexity: number;
    maintainabilityIndex: number;
  };
}

export function useCobolAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CobolAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeCode = useCallback(async (code: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const parsed = parseCobolCode(code);
      const dependencies = analyzeDependencies(code);
      
      const result: CobolAnalysisResult = {
        programId: parsed.programId || 'UNKNOWN',
        divisions: parsed.divisions,
        dependencies,
        metrics: {
          linesOfCode: code.split('\n').length,
          complexity: Math.floor(Math.random() * 10) + 1, // Placeholder
          maintainabilityIndex: Math.floor(Math.random() * 100) + 1 // Placeholder
        }
      };
      
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsAnalyzing(false);
  }, []);

  return {
    analyzeCode,
    reset,
    isAnalyzing,
    result,
    error
  };
}