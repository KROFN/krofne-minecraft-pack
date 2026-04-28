export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SyncLogEntry {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
  details?: unknown;
}
