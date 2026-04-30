import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import type { LogLevel, SyncLogEntry } from '../../shared/types/logs';
import { formatDateForLog, formatIsoDate } from '../utils/time';
import { ensureDir, normalizePath } from '../utils/safePath';

const MAX_LOG_ENTRIES = 1000;
const LOGS_DIR_NAME = 'logs';

let logBuffer: SyncLogEntry[] = [];
let entryCounter = 0;

function getLogsDir(): string {
  return path.join(app.getPath('userData'), LOGS_DIR_NAME);
}

function getLatestLogPath(): string {
  return path.join(getLogsDir(), 'latest.log');
}

function getDailyLogPath(): string | null {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return path.join(getLogsDir(), `${dateStr}.log`);
}

function formatLogLine(entry: SyncLogEntry): string {
  const time = formatDateForLog(new Date(entry.time));
  let line = `[${time}] [${entry.level.toUpperCase()}] ${entry.message}`;
  if (entry.details !== undefined) {
    line += ` | ${JSON.stringify(entry.details)}`;
  }
  return line;
}

async function writeToFile(entry: SyncLogEntry): Promise<void> {
  try {
    const logsDir = getLogsDir();
    await ensureDir(logsDir);

    const line = formatLogLine(entry) + '\n';

    // Write to latest.log (overwrite on first write of session, append after)
    const latestPath = getLatestLogPath();
    await fs.appendFile(latestPath, line, 'utf-8');

    // Write to daily log
    const dailyPath = getDailyLogPath();
    if (dailyPath) {
      await fs.appendFile(dailyPath, line, 'utf-8');
    }
  } catch {
    // Logging should never throw
  }
}

/**
 * Add a log entry to the in-memory buffer and write to log files.
 */
export function log(level: LogLevel, message: string, details?: unknown): void {
  const entry: SyncLogEntry = {
    id: String(++entryCounter),
    time: formatIsoDate(),
    level,
    message,
    ...(details !== undefined ? { details } : {}),
  };

  logBuffer.push(entry);

  // Trim buffer if it exceeds max size
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer = logBuffer.slice(logBuffer.length - MAX_LOG_ENTRIES);
  }

  // Fire and forget — write to file
  writeToFile(entry);
}

/**
 * Get all buffered log entries.
 */
export function getLogs(): SyncLogEntry[] {
  return [...logBuffer];
}

/**
 * Get the logs directory path.
 */
export function getLogsFilePath(): string {
  return normalizePath(getLogsDir());
}

/**
 * Return all logs as a single text string, formatted for clipboard.
 */
export function copyLogsToClipboard(): string {
  return logBuffer.map(formatLogLine).join('\n');
}

/**
 * Clear the latest.log file at the start of a new session.
 */
export async function initLogSession(): Promise<void> {
  try {
    const latestPath = getLatestLogPath();
    await ensureDir(path.dirname(latestPath));
    await fs.writeFile(latestPath, '', 'utf-8');
  } catch {
    // ignore
  }
}
