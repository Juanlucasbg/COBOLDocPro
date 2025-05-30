// Observability and monitoring system inspired by the Flask application
interface ObservabilitySpan {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  metadata: Record<string, any>;
  result?: any;
  error?: string;
}

interface AgentDecision {
  id: string;
  operation: string;
  inputs: Record<string, any>;
  reasoning: string;
  output?: Record<string, any>;
  timestamp: number;
}

interface SessionData {
  sessionId: string;
  userId?: string;
  context: Record<string, any>;
  startTime: number;
  endTime?: number;
  spans: ObservabilitySpan[];
  decisions: AgentDecision[];
}

class ObservabilityTracker {
  private sessions: Map<string, SessionData> = new Map();
  private currentSession: string | null = null;

  startSession(sessionId?: string, userId?: string, context: Record<string, any> = {}): string {
    const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: SessionData = {
      sessionId: id,
      userId,
      context,
      startTime: Date.now(),
      spans: [],
      decisions: []
    };
    
    this.sessions.set(id, session);
    this.currentSession = id;
    
    console.log(`[Observability] Started session ${id} for user ${userId || 'anonymous'}`);
    return id;
  }

  endSession(sessionId?: string): void {
    const id = sessionId || this.currentSession;
    if (!id) return;

    const session = this.sessions.get(id);
    if (session) {
      session.endTime = Date.now();
      console.log(`[Observability] Ended session ${id}, duration: ${session.endTime - session.startTime}ms`);
    }
  }

  startSpan(operation: string, metadata: Record<string, any> = {}): string {
    const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const span: ObservabilitySpan = {
      id: spanId,
      operation,
      startTime: Date.now(),
      metadata
    };

    if (this.currentSession) {
      const session = this.sessions.get(this.currentSession);
      if (session) {
        session.spans.push(span);
      }
    }

    console.log(`[Observability] Started span ${operation} (${spanId})`);
    return spanId;
  }

  endSpan(spanId: string, result?: any, error?: string): void {
    if (!this.currentSession) return;

    const session = this.sessions.get(this.currentSession);
    if (!session) return;

    const span = session.spans.find(s => s.id === spanId);
    if (span) {
      span.endTime = Date.now();
      span.result = result;
      span.error = error;
      
      const duration = span.endTime - span.startTime;
      console.log(`[Observability] Ended span ${span.operation} (${spanId}), duration: ${duration}ms`);
      
      if (error) {
        console.error(`[Observability] Span ${span.operation} failed:`, error);
      }
    }
  }

  logDecision(
    operation: string,
    inputs: Record<string, any>,
    reasoning: string,
    output?: Record<string, any>
  ): string {
    const decisionId = `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const decision: AgentDecision = {
      id: decisionId,
      operation,
      inputs,
      reasoning,
      output,
      timestamp: Date.now()
    };

    if (this.currentSession) {
      const session = this.sessions.get(this.currentSession);
      if (session) {
        session.decisions.push(decision);
      }
    }

    console.log(`[Observability] Agent decision: ${operation} - ${reasoning}`);
    return decisionId;
  }

  getSessionMetrics(sessionId?: string): SessionData | null {
    const id = sessionId || this.currentSession;
    if (!id) return null;

    return this.sessions.get(id) || null;
  }

  getAllSessions(): SessionData[] {
    return Array.from(this.sessions.values());
  }
}

// Singleton instance
export const observabilityTracker = new ObservabilityTracker();

// Agent monitoring helper
export class AgentMonitor {
  startSession(sessionId?: string, userId?: string, context: Record<string, any> = {}): string {
    return observabilityTracker.startSession(sessionId, userId, context);
  }

  endSession(sessionId?: string): void {
    observabilityTracker.endSession(sessionId);
  }

  logDecision(
    operation: string,
    inputs: Record<string, any>,
    reasoning: string,
    output?: Record<string, any>
  ): string {
    return observabilityTracker.logDecision(operation, inputs, reasoning, output);
  }

  logError(operation: string, error: Error, context: Record<string, any> = {}): void {
    console.error(`[Agent] Error in ${operation}:`, error.message);
    observabilityTracker.logDecision(
      `${operation}_error`,
      { error: error.message, ...context },
      `Error occurred during ${operation}: ${error.message}`
    );
  }

  logPerformance(operation: string, duration: number, metadata: Record<string, any> = {}): void {
    console.log(`[Agent] Performance: ${operation} took ${duration}ms`);
    observabilityTracker.logDecision(
      `${operation}_performance`,
      { duration, ...metadata },
      `Performance measurement for ${operation}`
    );
  }
}

export const agentMonitor = new AgentMonitor();