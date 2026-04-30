import path from 'path';
import type { SyncPlan, SyncProgress, SyncState } from '../../shared/types/sync';
import type { BackupFileRecord, BackupMeta } from '../../shared/types/backup';
import { SYNC_STATE_FILE, MAX_PARALLEL_DOWNLOADS, DOWNLOAD_RETRIES, MOD_FILE_EXTENSION } from '../../shared/constants';
import { downloadFile } from './downloadService';
import { computeFileSha512 } from './hashService';
import { createBackupSession, addFileToBackup, writeBackupMeta } from './backupService';
import { saveSettings, getSettings } from './settingsService';
import { copyFile, moveFile, deleteFile, fileExists, writeJsonFile, readJsonFile } from '../utils/fileSystem';
import { ensureDir, normalizePath, getBackupDir, getDisabledDir, getCacheDir } from '../utils/safePath';
import { formatTimestamp, formatIsoDate } from '../utils/time';
import { log } from './logService';

// ── Cancel Support ─────────────────────────────────────────────────────

let syncAbortController: AbortController | null = null;

export function requestSyncCancel(): void {
  if (syncAbortController) {
    syncAbortController.abort();
    syncAbortController = null;
  }
}

// ── Main Executor ──────────────────────────────────────────────────────

/**
 * Execute a sync plan with safety measures, cache support, and cancel support.
 *
 * NEW flow:
 * 1. Write sync state (support 'cancelled' status)
 * 2. Check cache for all download/replace actions → mark which use cache
 * 3. For actions that need download: download to cache (with abort support)
 * 4. Install from cache to final target:
 *    - For missing: copy from cache to mods/<fileName>
 *    - For wrong_hash: backup old file, delete old, copy from cache to mods/<fileName>
 *    - Verify installed file hash
 * 5. Rename files
 * 6. Move extra mods to disabled
 * 7. Write backup meta
 * 8. Update sync state
 *
 * On cancel: set sync state to 'cancelled', clean up .download files in cache,
 * but keep .jar cache files (they're verified and reusable).
 */
export async function executeSyncPlan(
  plan: SyncPlan,
  onProgress?: (progress: SyncProgress) => void,
): Promise<void> {
  const modsDir = normalizePath(plan.modsDir);
  const backupDir = getBackupDir(modsDir);
  const disabledDir = getDisabledDir(modsDir);
  const cacheDir = getCacheDir(modsDir);
  const stateFilePath = path.join(modsDir, SYNC_STATE_FILE);
  const totalActions = plan.actions.length;
  let completedActions = 0;

  // Create abort controller for cancel support
  const abortController = new AbortController();
  syncAbortController = abortController;
  const abortSignal = abortController.signal;

  const sendProgress = (partial: Partial<SyncProgress>) => {
    const progress: SyncProgress = {
      phase: partial.phase ?? 'checking',
      currentAction: partial.currentAction,
      completedActions,
      totalActions,
      currentFile: partial.currentFile,
      percent: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
      message: partial.message ?? '',
      currentFileName: partial.currentFileName,
      fileDownloadedBytes: partial.fileDownloadedBytes,
      fileTotalBytes: partial.fileTotalBytes,
      filePercent: partial.filePercent,
      totalDownloadedBytes: partial.totalDownloadedBytes,
      totalBytes: partial.totalBytes,
    };
    onProgress?.(progress);
  };

  const checkCancelled = (): boolean => {
    return abortSignal.aborted;
  };

  try {
    // Step 0: Check write permission to mods directory
    try {
      const testFile = path.join(modsDir, '.krofne-write-test');
      await writeJsonFile(testFile, { test: true });
      await deleteFile(testFile);
    } catch {
      throw new Error(
        `Нет прав на запись в папку mods: ${modsDir}\nПроверьте, что папка существует и у вас есть права на запись.`
      );
    }

    if (checkCancelled()) {
      throw new DOMException('Sync cancelled by user', 'AbortError');
    }

    // Step 1: Write sync state
    log('info', `Starting sync execution for ${plan.manifest.packName} v${plan.manifest.packVersion}`);

    const syncState: SyncState = {
      syncId: `sync-${Date.now()}`,
      startedAt: formatIsoDate(),
      status: 'running',
      completedActions: [],
      pendingActions: plan.actions.map((a) => a.id),
      tempFiles: [],
    };
    await writeJsonFile(stateFilePath, syncState);

    // Step 2: Prepare download/replace actions and check cache
    const downloadActions = plan.actions.filter(
      (a) => a.type === 'download' || a.type === 'replace',
    );

    // Calculate total bytes for progress tracking
    const totalBytes = downloadActions.reduce((sum, a) => sum + (a.mod?.sizeBytes ?? 0), 0);
    let totalDownloadedBytes = 0;
    let completedDownloadActions = 0;

    if (checkCancelled()) {
      throw new DOMException('Sync cancelled by user', 'AbortError');
    }

    // Step 3: Check cache and download as needed
    if (downloadActions.length > 0) {
      sendProgress({ phase: 'cache_check', message: `Checking cache for ${downloadActions.length} mod(s)...` });

      // Ensure cache directory exists
      await ensureDir(cacheDir);

      // First pass: check which files are already in cache
      const cacheResults: Map<string, boolean> = new Map();
      for (const action of downloadActions) {
        if (!action.mod) continue;
        const cacheJarPath = path.join(cacheDir, `${action.mod.sha512.toLowerCase()}${MOD_FILE_EXTENSION}`);
        if (await fileExists(cacheJarPath)) {
          try {
            const cachedHash = await computeFileSha512(cacheJarPath);
            if (cachedHash.toLowerCase() === action.mod.sha512.toLowerCase()) {
              cacheResults.set(action.id, true);
              log('info', `Cache hit: ${action.mod.fileName} — skipping download`);
              // Count cached bytes for progress
              totalDownloadedBytes += action.mod.sizeBytes ?? 0;
              completedDownloadActions++;
              continue;
            } else {
              log('warn', `Cache hash mismatch: ${action.mod.fileName} — will re-download`);
              await deleteFile(cacheJarPath);
            }
          } catch (err: any) {
            log('warn', `Cache check failed: ${action.mod.fileName}: ${err.message}`);
            await deleteFile(cacheJarPath);
          }
        }
        cacheResults.set(action.id, false);
      }

      if (checkCancelled()) {
        throw new DOMException('Sync cancelled by user', 'AbortError');
      }

      // Second pass: download files not in cache
      const needsDownload = downloadActions.filter((a) => !cacheResults.get(a.id));
      const parallelLimit = plan.manifest.settings?.maxParallelDownloads ?? MAX_PARALLEL_DOWNLOADS;
      const retries = plan.manifest.settings?.downloadRetries ?? DOWNLOAD_RETRIES;

      if (needsDownload.length > 0) {
        sendProgress({
          phase: 'downloading',
          message: `Downloading ${needsDownload.length} mod(s) (${completedDownloadActions} from cache)...`,
          totalDownloadedBytes,
          totalBytes,
        });

        await runWithParallelLimit(needsDownload, parallelLimit, async (action) => {
          if (checkCancelled()) {
            throw new DOMException('Sync cancelled by user', 'AbortError');
          }

          if (!action.mod) throw new Error(`Action ${action.id} has no mod reference`);

          sendProgress({
            phase: 'downloading',
            currentAction: action.id,
            currentFile: action.mod.fileName,
            currentFileName: action.mod.fileName,
            message: `Downloading ${action.mod.name}...`,
            totalDownloadedBytes,
            totalBytes,
          });

          const result = await downloadFile(
            action.mod.downloadUrl,
            action.targetPath,
            action.mod.sha512,
            modsDir,
            {
              retries,
              abortSignal,
              onProgress: (dlProgress) => {
                // Forward file-level progress
                sendProgress({
                  phase: 'downloading',
                  currentAction: action.id,
                  currentFile: action.mod!.fileName,
                  currentFileName: action.mod!.fileName,
                  fileDownloadedBytes: dlProgress.bytesDownloaded,
                  fileTotalBytes: dlProgress.totalBytes ?? action.mod!.sizeBytes ?? undefined,
                  filePercent: dlProgress.percent ?? undefined,
                  totalDownloadedBytes,
                  totalBytes,
                  message: `Downloading ${action.mod!.name}: ${dlProgress.percent ?? '?'}%`,
                });
              },
            },
          );

          // Update progress tracking
          totalDownloadedBytes += action.mod.sizeBytes ?? 0;
          completedDownloadActions++;

          log('info', `${result.fromCache ? 'Cache hit' : 'Downloaded and verified'}: ${action.mod.fileName}`);

          // Update sync state
          syncState.completedActions.push(action.id);
          const pendingIdx = syncState.pendingActions.indexOf(action.id);
          if (pendingIdx >= 0) syncState.pendingActions.splice(pendingIdx, 1);
          await writeJsonFile(stateFilePath, syncState);
        });
      }

      completedActions += downloadActions.length;

      if (checkCancelled()) {
        throw new DOMException('Sync cancelled by user', 'AbortError');
      }
    }

    // Step 4: Install from cache to final target
    if (downloadActions.length > 0) {
      sendProgress({ phase: 'installing', message: `Installing ${downloadActions.length} mod(s) from cache...` });

      // First, handle backups for replace actions
      const replaceActions = plan.actions.filter((a) => a.type === 'replace');
      if (replaceActions.length > 0) {
        const settings = await getSettings();
        const filesToBackup: Array<{ originalPath: string; fileName: string; reason: string }> = [];

        for (const action of replaceActions) {
          if (action.localFile) {
            filesToBackup.push({
              originalPath: action.localFile.absolutePath,
              fileName: action.localFile.fileName,
              reason: action.reason,
            });
          }
        }

        let sessionPath: string | null = null;
        const backupRecords: BackupFileRecord[] = [];

        if (filesToBackup.length > 0) {
          sendProgress({ phase: 'backing_up', message: `Backing up ${filesToBackup.length} file(s)...` });

          const sessionId = await createBackupSession(
            modsDir,
            settings.lastSuccessfulPackVersion ?? null,
            plan.manifest.packVersion,
            filesToBackup,
          );
          sessionPath = path.join(backupDir, sessionId);
          log('info', `Backup session created: ${sessionId} with ${filesToBackup.length} file(s)`);

          for (const file of filesToBackup) {
            try {
              const backupPath = await addFileToBackup(sessionPath, file.originalPath, file.fileName);
              backupRecords.push({
                originalPath: file.originalPath,
                backupPath,
                fileName: file.fileName,
                reason: file.reason,
              });
            } catch (err: any) {
              log('error', `Failed to backup ${file.fileName}: ${err.message}`);
              throw new Error(`Backup failed for ${file.fileName}: ${err.message}`);
            }
          }

          // Write backup meta now so it's saved even if install is interrupted
          if (sessionPath && backupRecords.length > 0) {
            const meta: BackupMeta = {
              createdAt: formatIsoDate(),
              packVersionBefore: settings.lastSuccessfulPackVersion ?? null,
              packVersionAfter: plan.manifest.packVersion,
              modsDir,
              files: backupRecords,
            };
            await writeBackupMeta(sessionPath, meta);
          }
        }
      }

      if (checkCancelled()) {
        throw new DOMException('Sync cancelled by user', 'AbortError');
      }

      // Install each download/replace action from cache
      for (const action of downloadActions) {
        if (!action.mod) continue;

        if (checkCancelled()) {
          throw new DOMException('Sync cancelled by user', 'AbortError');
        }

        sendProgress({
          phase: 'installing',
          currentAction: action.id,
          currentFile: action.mod.fileName,
          currentFileName: action.mod.fileName,
          message: `Installing ${action.mod.name}...`,
        });

        const cacheJarPath = path.join(cacheDir, `${action.mod.sha512.toLowerCase()}${MOD_FILE_EXTENSION}`);

        // Verify cache file still exists
        if (!(await fileExists(cacheJarPath))) {
          throw new Error(`Cache file missing for ${action.mod.fileName}: ${path.basename(cacheJarPath)}`);
        }

        // For replace: delete old file (backup was already created above)
        if (action.type === 'replace' && action.localFile) {
          await deleteFile(action.localFile.absolutePath);
          log('info', `Removed old file (backup exists): ${action.localFile.fileName}`);
        }

        // Copy from cache to final target
        await copyFile(cacheJarPath, action.targetPath);
        log('info', `Installed: ${path.basename(action.targetPath)} (from cache)`);

        // Verify the installed file hash
        const installedHash = await computeFileSha512(action.targetPath);
        if (installedHash.toLowerCase() !== action.mod.sha512.toLowerCase()) {
          throw new Error(
            `Hash verification failed after install for ${action.mod.fileName}. ` +
            `This should not happen — the file may have been corrupted during copy.`
          );
        }

        log('info', `Verified installed file: ${action.mod.fileName} (hash OK)`);
      }
    }

    if (checkCancelled()) {
      throw new DOMException('Sync cancelled by user', 'AbortError');
    }

    // Step 5: Rename files if needed (SHA matches but filename differs from manifest)
    const renameActions = plan.actions.filter((a) => a.type === 'rename_to_manifest_filename');

    if (renameActions.length > 0) {
      sendProgress({ phase: 'renaming', message: `Renaming ${renameActions.length} file(s)...` });

      for (const action of renameActions) {
        if (!action.localFile) continue;

        if (checkCancelled()) {
          throw new DOMException('Sync cancelled by user', 'AbortError');
        }

        sendProgress({
          phase: 'renaming',
          currentAction: action.id,
          currentFile: action.localFile.fileName,
          currentFileName: action.localFile.fileName,
          message: `Renaming ${action.localFile.fileName} → ${path.basename(action.targetPath)}`,
        });

        await moveFile(action.localFile.absolutePath, action.targetPath);
        log('info', `Renamed: ${action.localFile.fileName} → ${path.basename(action.targetPath)}`);
        completedActions++;
      }
    }

    if (checkCancelled()) {
      throw new DOMException('Sync cancelled by user', 'AbortError');
    }

    // Step 6: Move extra mods to _disabled_by_krofne_pack
    const disableActions = plan.actions.filter((a) => a.type === 'move_extra_to_disabled');

    if (disableActions.length > 0) {
      sendProgress({ phase: 'moving_extra', message: `Moving ${disableActions.length} extra mod(s) to disabled...` });
      await ensureDir(disabledDir);

      for (const action of disableActions) {
        if (!action.localFile) continue;

        if (checkCancelled()) {
          throw new DOMException('Sync cancelled by user', 'AbortError');
        }

        sendProgress({
          phase: 'moving_extra',
          currentAction: action.id,
          currentFile: action.localFile.fileName,
          currentFileName: action.localFile.fileName,
          message: `Moving ${action.localFile.fileName} to disabled...`,
        });

        // Check if target already exists, add timestamp if conflict
        let targetPath = action.targetPath;
        if (await fileExists(targetPath)) {
          const ext = path.extname(action.localFile.fileName);
          const base = path.basename(action.localFile.fileName, ext);
          const timestamp = formatTimestamp();
          targetPath = path.join(disabledDir, `${base}__${timestamp}${ext}`);
        }

        await moveFile(action.localFile.absolutePath, targetPath);
        log('info', `Moved to disabled: ${action.localFile.fileName} → ${path.basename(targetPath)}`);
        completedActions++;
      }
    }

    // Step 7: Update sync state to completed
    syncState.status = 'completed';
    syncState.completedActions = plan.actions.map((a) => a.id);
    syncState.pendingActions = [];
    syncState.tempFiles = [];
    await writeJsonFile(stateFilePath, syncState);

    // Step 8: Save lastSuccessfulPackVersion
    await saveSettings({ lastSuccessfulPackVersion: plan.manifest.packVersion });

    sendProgress({
      phase: 'done',
      message: 'Sync completed successfully!',
      percent: 100,
    });

    log('info', `Sync completed successfully for ${plan.manifest.packName} v${plan.manifest.packVersion}`);
  } catch (err: any) {
    const isCancel = abortSignal.aborted ||
      err?.name === 'AbortError' ||
      (err?.message && err.message.toLowerCase().includes('cancel'));

    if (isCancel) {
      log('info', 'Sync cancelled by user');

      // Clean up .download files in cache (in-progress downloads), but keep .jar cache files
      try {
        const { listFiles: listCacheFiles } = await import('../utils/fileSystem');
        const downloadTempFiles = await listCacheFiles(cacheDir, '.download');
        for (const tempFile of downloadTempFiles) {
          try {
            await deleteFile(tempFile);
            log('info', `Cancel cleanup: deleted temp file ${path.basename(tempFile)}`);
          } catch (cleanupErr: any) {
            log('warn', `Cancel cleanup: could not delete ${path.basename(tempFile)}: ${cleanupErr.message}`);
          }
        }
      } catch (cleanupErr: any) {
        log('warn', `Cancel cleanup failed: ${cleanupErr.message}`);
      }

      // Update sync state to 'cancelled'
      try {
        const existingState = await readJsonFile<SyncState>(stateFilePath);
        if (existingState && existingState.status === 'running') {
          existingState.status = 'cancelled';
          await writeJsonFile(stateFilePath, existingState);
        }
      } catch {
        // If we can't update the state, that's OK
      }

      sendProgress({
        phase: 'cancelled',
        message: 'Sync cancelled by user. Already downloaded files are saved in cache.',
      });
    } else {
      log('error', `Sync failed: ${err.message}`);

      // Update sync state to 'interrupted' so recovery can detect it clearly
      try {
        const existingState = await readJsonFile<SyncState>(stateFilePath);
        if (existingState && existingState.status === 'running') {
          existingState.status = 'interrupted';
          await writeJsonFile(stateFilePath, existingState);
        }
      } catch {
        // If we can't update the state, the 'running' status will still trigger recovery
      }

      sendProgress({
        phase: 'error',
        message: `Sync failed: ${err.message}`,
      });
    }

    throw err;
  } finally {
    syncAbortController = null;
  }
}

/**
 * Run an array of async tasks with a parallel limit.
 * If any task fails, the error propagates and remaining tasks are not started.
 */
async function runWithParallelLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item).then(() => {
      executing.splice(executing.indexOf(promise), 1);
    });
    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}
