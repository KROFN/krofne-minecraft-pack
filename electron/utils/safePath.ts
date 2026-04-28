import path from 'path';
import fs from 'fs/promises';
import { BACKUP_FOLDER_NAME, DISABLED_FOLDER_NAME } from '../../shared/constants';

/**
 * Normalize and resolve a path, converting backslashes to forward slashes on Windows.
 */
export function normalizePath(p: string): string {
  return path.resolve(path.normalize(p));
}

/**
 * Check if `child` is within the `parent` directory.
 * Both paths are resolved before comparison.
 */
export function isChildPath(child: string, parent: string): boolean {
  const resolvedChild = normalizePath(child);
  const resolvedParent = normalizePath(parent);

  if (resolvedChild === resolvedParent) return false;

  const relative = path.relative(resolvedParent, resolvedChild);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Create directory recursively if it does not exist.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  const resolved = normalizePath(dirPath);
  await fs.mkdir(resolved, { recursive: true });
}

/**
 * path.join with normalization — joins segments and resolves the result.
 */
export function safeJoin(...segments: string[]): string {
  return normalizePath(path.join(...segments));
}

/**
 * Check if a mods path exists and is a directory.
 */
export async function isModsPathValid(modsPath: string): Promise<boolean> {
  try {
    const resolved = normalizePath(modsPath);
    const stat = await fs.stat(resolved);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Returns the path to the backup directory within the mods folder.
 */
export function getBackupDir(modsPath: string): string {
  return safeJoin(modsPath, BACKUP_FOLDER_NAME);
}

/**
 * Returns the path to the disabled mods directory within the mods folder.
 */
export function getDisabledDir(modsPath: string): string {
  return safeJoin(modsPath, DISABLED_FOLDER_NAME);
}
