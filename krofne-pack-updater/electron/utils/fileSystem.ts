import fs from 'fs/promises';
import fsCb from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ensureDir, normalizePath } from './safePath';

/**
 * Read and parse a JSON file. Returns null if file does not exist or is invalid JSON.
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const resolved = normalizePath(filePath);
    const content = await fs.readFile(resolved, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Write data as formatted JSON to a file. Ensures parent directory exists.
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const resolved = normalizePath(filePath);
  await ensureDir(path.dirname(resolved));
  const content = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(resolved, content, 'utf-8');
}

/**
 * Copy a file from src to dest. Ensures dest parent directory exists.
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  const resolvedSrc = normalizePath(src);
  const resolvedDest = normalizePath(dest);
  await ensureDir(path.dirname(resolvedDest));
  await fs.copyFile(resolvedSrc, resolvedDest);
}

/**
 * Move a file from src to dest. Ensures dest parent directory exists.
 */
export async function moveFile(src: string, dest: string): Promise<void> {
  const resolvedSrc = normalizePath(src);
  const resolvedDest = normalizePath(dest);
  await ensureDir(path.dirname(resolvedDest));
  await fs.rename(resolvedSrc, resolvedDest);
}

/**
 * Delete a file if it exists. Does not throw if the file does not exist.
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    const resolved = normalizePath(filePath);
    await fs.unlink(resolved);
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
  }
}

/**
 * List files in a directory. Optionally filter by extension (e.g. '.jar').
 * Returns full absolute paths.
 */
export async function listFiles(dirPath: string, extension?: string): Promise<string[]> {
  const resolved = normalizePath(dirPath);
  let entries: string[];
  try {
    entries = await fs.readdir(resolved);
  } catch {
    return [];
  }

  const result: string[] = [];
  for (const entry of entries) {
    if (extension && !entry.endsWith(extension)) continue;
    const fullPath = path.join(resolved, entry);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isFile()) {
        result.push(fullPath);
      }
    } catch {
      // skip inaccessible files
    }
  }
  return result;
}

/**
 * Check if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const resolved = normalizePath(filePath);
    await fs.access(resolved, fsCb.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes.
 */
export async function getFileSize(filePath: string): Promise<number> {
  const resolved = normalizePath(filePath);
  const stat = await fs.stat(resolved);
  return stat.size;
}

/**
 * Get file modified time as ISO string.
 */
export async function getFileModifiedTime(filePath: string): Promise<string> {
  const resolved = normalizePath(filePath);
  const stat = await fs.stat(resolved);
  return stat.mtime.toISOString();
}

/**
 * Open a folder in Windows Explorer.
 */
export async function openFolderInExplorer(folderPath: string): Promise<void> {
  const resolved = normalizePath(folderPath);
  return new Promise((resolve, reject) => {
    // Use spawn instead of exec to avoid command injection via path
    const child = spawn('explorer', [resolved], {
      shell: false,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    // Explorer always returns immediately; errors are unlikely
    resolve();
  });
}
