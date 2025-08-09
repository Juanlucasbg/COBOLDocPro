// Comprehensive error handling and recovery system
import { Request, Response, NextFunction } from 'express';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

export class COBOLProcessingError extends Error {
  public code: string;
  public recoverable: boolean;
  public details?: any;

  constructor(code: string, message: string, recoverable = true, details?: any) {
    super(message);
    this.name = 'COBOLProcessingError';
    this.code = code;
    this.recoverable = recoverable;
    this.details = details;
  }
}

export function createApiError(code: string, message: string, recoverable = true, details?: any): ApiError {
  return { code, message, recoverable, details };
}

// Enhanced JSON parsing with multiple fallback strategies
export function safeParseJSON(jsonString: string, fallbackValue: any = {}): any {
  if (!jsonString || typeof jsonString !== 'string') {
    return fallbackValue;
  }

  // Strategy 1: Clean markdown code blocks and extra text
  let cleaned = jsonString
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/^[^{]*\{/, '{')  // Remove text before first {
    .replace(/\}[^}]*$/, '}')  // Remove text after last }
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.log('JSON parse attempt 1 failed, trying strategy 2...');
  }

  // Strategy 2: Extract JSON object more aggressively
  const jsonMatch = cleaned.match(/\{(?:[^{}]|{[^{}]*})*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.log('JSON parse attempt 2 failed, trying strategy 3...');
    }
  }

  // Strategy 3: Extract from multiline content
  const lines = cleaned.split('\n');
  let jsonStart = -1;
  let jsonEnd = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('{') && jsonStart === -1) {
      jsonStart = i;
    }
    if (jsonStart !== -1) {
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (braceCount === 0 && jsonStart !== -1) {
          jsonEnd = i;
          break;
        }
      }
      if (jsonEnd !== -1) break;
    }
  }

  if (jsonStart !== -1 && jsonEnd !== -1) {
    try {
      const jsonText = lines.slice(jsonStart, jsonEnd + 1).join('\n');
      return JSON.parse(jsonText);
    } catch (error) {
      console.log('JSON parse attempt 3 failed, trying strategy 4...');
    }
  }

  // Strategy 4: Fix common JSON formatting issues
  try {
    cleaned = cleaned
      .replace(/'/g, '"')  // Single quotes to double quotes
      .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
      .replace(/:\s*([^",\{\[\]}\s][^",\}\]]*?)(\s*[,\}])/g, ': "$1"$2'); // Quote unquoted values
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.log('JSON parse attempt 4 failed, using fallback value');
  }

  return fallbackValue;
}

// API response wrapper with error handling
export function wrapApiResponse<T>(
  operation: () => Promise<T>,
  errorCode: string,
  errorMessage: string
) {
  return async (): Promise<{ success: boolean; data?: T; error?: ApiError }> => {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      const apiError = createApiError(
        errorCode,
        `${errorMessage}: ${(error as Error).message}`,
        true,
        error
      );
      return { success: false, error: apiError };
    }
  };
}

// Express error handler middleware
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error occurred:', err);

  if (err instanceof COBOLProcessingError) {
    return res.status(400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        recoverable: err.recoverable,
        details: err.details
      }
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      recoverable: false
    }
  });
}

// Retry mechanism for AI API calls
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error = new Error('No attempts made');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw new COBOLProcessingError(
    'RETRY_EXHAUSTED',
    `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
    false,
    lastError
  );
}