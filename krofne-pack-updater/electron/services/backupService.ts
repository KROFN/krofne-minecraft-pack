import path from 'path';
import fs from 'fs/promises';
import type { BackupMeta, BackupSession, BackupFileRecord } from '../../shared/types/backup';
import { BACKUP_FOLDER_NAME, BACKUP_META_FILE } from '../../shared/constants';
import { ensureDir, normalizePath, getBackupDir } from '../utils/safePath';
import { copyFile, readJsonFile, writeJsonFile, fileExists } from '../utils/fileSystem';
import { moveFile } from '../utils/fileSystem';
import { deleteFile } from '../utils/fileSystem';
import { formatTimestamp, formatIsoDate } from '../utils/time';
import { addTimestampToFileName } from '../utils/filename';
import { log } from './logService';

/**
 * Create a new backup session directory.
 * Returns the session folder name.
 */
export async function createBackupSession(
  modsDir: string,
  packVersionBefore: string | null,
  packVersionAfter: string,
  files: Array<{ originalPath: string; fileName: string; reason: string }>,
): Promise<string> {
  const backupBase = getBackupDir(modsDir);
  await ensureDir(backupBase);

  const timestamp = formatTimestamp();
  const sessionFolderName = `backup_${timestamp}`;
  const sessionPath = path.join(backupBase, sessionFolderName);

  await ensureDir(sessionPath);

  log('info', `Created backup session: ${sessionFolderName}`);
  return sessionFolderName;
}

/**
 * Copy a file into the backup session directory.
 * Returns the backup file path.
 */
export async function addFileToBackup(
  sessionPath: string,
  originalPath: string,
  fileName: string,
): Promise<string> {
  const resolvedSession = normalizePath(sessionPath);
  await ensureDir(resolvedSession);

  const backupPath = path.join(resolvedSession, fileName);

  // Handle name conflicts by adding a suffix
  let finalBackupPath = backupPath;
  let counter = 1;
  while (await fileExists(finalBackupPath)) {
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    finalBackupPath = path.join(resolvedSession, `${base}_${counter}${ext}`);
    counter++;
  }

  await copyFile(originalPath, finalBackupPath);
  log('debug', `Backed up: ${fileName} → ${path.basename(finalBackupPath)}`);
  return finalBackupPath;
}

/**
 * Write the backup-meta.json for a session.
 */
export async function writeBackupMeta(sessionPath: string, meta: BackupMeta): Promise<void> {
  const resolvedSession = normalizePath(sessionPath);
  const metaPath = path.join(resolvedSession, BACKUP_META_FILE);
  await writeJsonFile(metaPath, meta);
  log('info', `Backup metadata written to ${metaPath}`);
}

/**
 * List all backup sessions in the mods directory.
 */
export async function listBackups(modsDir: string): Promise<BackupSession[]> {
  const backupBase = getBackupDir(modsDir);

  if (!(await fileExists(backupBase))) {
    return [];
  }

  const resolvedBase = normalizePath(backupBase);
  let entries: string[];
  try {
    entries = await fs.readdir(resolvedBase);
  } catch {
    return [];
  }

  const sessions: BackupSession[] = [];

  for (const entry of entries) {
    const entryPath = path.join(resolvedBase, entry);
    try {
      const stat = await fs.stat(entryPath);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }

    // Try to read backup meta
    const metaPath = path.join(entryPath, BACKUP_META_FILE);
    const meta = await readJsonFile<BackupMeta>(metaPath);

    if (meta) {
      sessions.push({
        id: entry,
        folderName: entry,
        createdAt: meta.createdAt,
        packVersionBefore: meta.packVersionBefore,
        packVersionAfter: meta.packVersionAfter,
        fileCount: meta.files.length,
        modsDir: meta.modsDir,
      });
    } else {
      // Session without meta — still include with basic info
      sessions.push({
        id: entry,
        folderName: entry,
        createdAt: '',
        packVersionBefore: null,
        packVersionAfter: '',
        fileCount: 0,
        modsDir,
      });
    }
  }

  // Sort by creation time, newest first
  sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return sessions;
}

/**
 * Read the backup metadata for a specific session.
 */
export async function getBackupMeta(
  modsDir: string,
  sessionId: string,
): Promise<BackupMeta | null> {
  const backupBase = getBackupDir(modsDir);
  const metaPath = path.join(backupBase, sessionId, BACKUP_META_FILE);
  return readJsonFile<BackupMeta>(metaPath);
}

/**
 * Rollback a backup session: restore files from backup to their original locations.
 *
 * Steps:
 * 1. Create emergency backup of current files
 * 2. For each file in backup-meta: move current file to emergency, copy backup file to original path
 * 3. Log the rollback
 */
export async function rollbackBackup(
  modsDir: string,
  sessionId: string,
): Promise<void> {
  const backupBase = getBackupDir(modsDir);
  const sessionPath = path.join(backupBase, sessionId);
  const metaPath = path.join(sessionPath, BACKUP_META_FILE);

  const meta = await readJsonFile<BackupMeta>(metaPath);
  if (!meta) {
    throw new Error(`Backup session ${sessionId} has no metadata. Cannot rollback.`);
  }

  log('info', `Starting rollback of backup session: ${sessionId} (${meta.files.length} file(s))`);

  // Step 1: Create emergency backup of current files
  const emergencyTimestamp = formatTimestamp();
  const emergencySessionName = `emergency_${emergencyTimestamp}`;
  const emergencySessionPath = path.join(backupBase, emergencySessionName);
  await ensureDir(emergencySessionPath);

  const emergencyRecords: BackupFileRecord[] = [];
  const failedRestores: string[] = [];

  // Step 2: Restore each file
  for (const record of meta.files) {
    try {
      // Check if backup file exists
      if (!(await fileExists(record.backupPath))) {
        log('warn', `Backup file not found: ${record.backupPath}, skipping`);
        failedRestores.push(`${record.fileName}: backup file missing`);
        continue;
      }

      // Emergency backup current file if it exists
      if (await fileExists(record.originalPath)) {
        try {
          const emergencyBackupPath = path.join(emergencySessionPath, path.basename(record.originalPath));
          let finalEmergencyPath = emergencyBackupPath;
          let counter = 1;
          while (await fileExists(finalEmergencyPath)) {
            const ext = path.extname(record.originalPath);
            const base = path.basename(record.originalPath, ext);
            finalEmergencyPath = path.join(emergencySessionPath, `${base}_${counter}${ext}`);
            counter++;
          }
          await copyFile(record.originalPath, finalEmergencyPath);
          emergencyRecords.push({
            originalPath: record.originalPath,
            backupPath: finalEmergencyPath,
            fileName: path.basename(record.originalPath),
            reason: 'Emergency backup before rollback',
          });
          log('debug', `Emergency backed up current: ${path.basename(record.originalPath)}`);
        } catch (err: any) {
          log('warn', `Could not emergency-backup ${record.originalPath}: ${err.message}`);
        }

        // Remove current file so we can restore the backup version
        await deleteFile(record.originalPath);
      }

      // Ensure parent directory exists
      await ensureDir(path.dirname(record.originalPath));

      // Copy backup file to original location
      await copyFile(record.backupPath, record.originalPath);
      log('info', `Restored: ${record.fileName} → ${record.originalPath}`);
    } catch (err: any) {
      log('error', `Failed to restore ${record.fileName}: ${err.message}`);
      failedRestores.push(`${record.fileName}: ${err.message}`);
    }
  }

  // Write emergency backup meta
  if (emergencyRecords.length > 0) {
    const emergencyMeta: BackupMeta = {
      createdAt: formatIsoDate(),
      packVersionBefore: meta.packVersionAfter,
      packVersionAfter: meta.packVersionBefore ?? 'unknown',
      modsDir,
      files: emergencyRecords,
    };
    await writeJsonFile(path.join(emergencySessionPath, BACKUP_META_FILE), emergencyMeta);
  }

  log('info', `Rollback completed for session: ${sessionId}`);

  if (failedRestores.length > 0) {
    log('warn', `Rollback had ${failedRestores.length} failed restore(s): ${failedRestores.join('; ')}`);
    throw new Error(
      `Rollback partially completed. ${failedRestores.length} file(s) could not be restored:\n${failedRestores.join('\n')}`
    );
  }
}
