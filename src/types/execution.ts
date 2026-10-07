export type TaskStatus = 'PENDING' | 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
export interface ProvenanceChunk { documentId?: string; chunkIndex?: number; source?: string; content?: string; similarity?: number }
export interface ExecutionTask {
  id: string; title: string; description?: string; type: string; status: TaskStatus;
  dependencies: string[]; capability?: string; durationMs?: number; agent?: string;
  input?: string; output?: string; metadata?: Record<string, unknown>;
  score?: number; evaluationStatus?: string; chunks?: ProvenanceChunk[]; query?: string;
}
export interface ExecutionEvent { id: string; label: string; message: string; source: 'CLIENT' | 'POST-RUN' | 'DEMO'; time?: string; durationMs?: number; status?: TaskStatus }
export interface ExecutionModel { runId: string; task: string; tasks: ExecutionTask[]; events: ExecutionEvent[]; finalAnswer: string; createdAt?: string; dependenciesAvailable: boolean; chunks: ProvenanceChunk[] }
