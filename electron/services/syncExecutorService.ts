import path from 'path';
import type { SyncPlan, SyncProgress, SyncState } from '../../shared/types/sync';
import type { BackupFileRecord, BackupMeta } from '../../shared/types/backup';
import { SYNC_STATE_FILE, MAX_PARALLEL_DOWNLOADS, DOWNLOAD_RETRIES } from '../../shared/constants';
import { downloadFile } from './downloadService';
import { computeFileSha512 } from './hashService';
import { createBackupSession, addFileToBackup, writeBackupMeta } from './backupService';
import { saveSettings, getSettings } from './settingsService';
import { moveFile, deleteFile, fileExists, writeJsonFile, readJsonFile } from '../utils/fileSystem';
import { ensureDir, normalizePath, getBackupDir, getDisabledDir } from '../utils/safePath';
import { getTempDownloadPath } from '../utils/filename';
import { formatTimestamp, formatIsoDate } from '../utils/time';
import { log } from './logService';

/**
 * Execute a sync plan with safety measures.
 *
 * CRITICAL DESIGN: Downloads go to .download temp files FIRST.
 * Only after ALL downloads are verified do we touch any local files.
 * This ensures that if any download fails, no local files have been modified.
 *
 * Steps:
 * 1. Write .krofne-sync-state.json (status: running)
 * 2. Create backup session and copy files that will be replaced/moved
 * 3. Download all missing/wrong_hash to .download temp files (with parallel limit)
 * 4. Re-verify all .download temp files (SHA-512 double-check)
 * 5. For wrong_hash: delete old file (backup already made in step 2)
 * 6. Move .download files to final .jar names
 * 7. Rename files if needed (SHA matches but filename differs)
 * 8. Move extra mods to _disabled_by_krofne_pack (add timestamp if name conflict)
 * 9. Write backup-meta.json
 * 10. Update sync state to completed
 * 11. Save lastSuccessfulPackVersion in settings
 *
 * On any critical failure: stop, update state to 'interrupted', leave files for recovery.
 */
export async function executeSyncPlan(
  plan: SyncPlan,
  onProgress?: (progress: SyncProgress) => void,
): Promise<void> {
  const modsDir = normalizePath(plan.modsDir);
  const backupDir = getBackupDir(modsDir);
  const disabledDir = getDisabledDir(modsDir);
  const stateFilePath = path.join(modsDir, SYNC_STATE_FILE);
  const totalActions = plan.actions.length;
  let completedActions = 0;

  const sendProgress = (partial: Partial<SyncProgress>) => {
    const progress: SyncProgress = {
      phase: partial.phase ?? 'checking',
      currentAction: partial.currentAction,
      completedActions,
      totalActions,
      currentFile: partial.currentFile,
      percent: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
      message: partial.message ?? '',
    };
    onProgress?.(progress);
  };

  try {
    // Step 0: Check write permission to mods directory
    try {
      const testFile = path.join(modsDir, '.krofne-write-test');
      await writeJsonFile(testFile, { test: true });
      const { deleteFile } = await import('../utils/fileSystem');
      await deleteFile(testFile);
    } catch {
      throw new Error(
        `Нет прав на запись в папку mods: ${modsDir}\nПроверьте, что папка существует и у вас есть права на запись.`
      );
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

    // Step 2: Create backup session and copy files that will be replaced/moved
    const settings = await getSettings();
    const filesToBackup: Array<{ originalPath: string; fileName: string; reason: string }> = [];

    for (const action of plan.actions) {
      if (action.type === 'replace' && action.localFile) {
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
      const sessionId = await createBackupSession(
        modsDir,
        settings.lastSuccessfulPackVersion ?? null,
        plan.manifest.packVersion,
        filesToBackup,
      );
      sessionPath = path.join(backupDir, sessionId);
      log('info', `Backup session created: ${sessionId} with ${filesToBackup.length} file(s)`);

      // Backup each file (copy, not move — originals stay in place until step 5)
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
    }

    // Step 3: Download all missing/wrong_hash mods to .download temp files
    // IMPORTANT: downloadFile receives the FINAL target path (e.g. mods/mod.jar).
    // Internally it downloads to mods/mod.jar.download, verifies hash, and leaves as .download.
    // We do NOT pass the .download path — downloadFile handles that internally.
    const downloadActions = plan.actions.filter(
      (a) => a.type === 'download' || a.type === 'replace',
    );

    if (downloadActions.length > 0) {
      sendProgress({ phase: 'downloading', message: `Downloading ${downloadActions.length} mod(s)...` });

      const parallelLimit = plan.manifest.settings?.maxParallelDownloads ?? MAX_PARALLEL_DOWNLOADS;
      const retries = plan.manifest.settings?.downloadRetries ?? DOWNLOAD_RETRIES;

      await runWithParallelLimit(downloadActions, parallelLimit, async (action) => {
        if (!action.mod) throw new Error(`Action ${action.id} has no mod reference`);

        sendProgress({
          phase: 'downloading',
          currentAction: action.id,
          currentFile: action.mod.fileName,
          message: `Downloading ${action.mod.name}...`,
        });

        // Pass the FINAL .jar path — downloadFile creates .download internally
        await downloadFile(action.mod.downloadUrl, action.targetPath, action.mod.sha512, retries);

        // Track the temp file in sync state for recovery
        const tempPath = getTempDownloadPath(action.targetPath);
        syncState.tempFiles.push(tempPath);
        await writeJsonFile(stateFilePath, syncState);

        log('info', `Downloaded and verified: ${action.mod.fileName}`);
      });

      completedActions += downloadActions.length;
    }

    // Step 4: Re-verify all .download temp files (SHA-512 double-check)
    // This is a safety net — downloadFile already verified, but we check again
    // to be absolutely sure before touching any local files.
    sendProgress({ phase: 'checking', message: 'Re-verifying downloaded files...' });

    for (const action of downloadActions) {
      if (!action.mod) continue;
      const tempPath = getTempDownloadPath(action.targetPath);

      if (!(await fileExists(tempPath))) {
        throw new Error(`Download temp file missing: ${path.basename(tempPath)}`);
      }

      const actualHash = await computeFileSha512(tempPath);
      if (actualHash.toLowerCase() !== action.mod.sha512.toLowerCase()) {
        throw new Error(
          `Re-verification failed for ${action.mod.fileName}: hash mismatch after download. ` +
          `This should not happen — the download may have been corrupted.`
        );
      }
    }

    log('info', 'All downloaded files re-verified successfully');

    // Step 5: For wrong_hash (replace): delete old file
    // Backup was already created in Step 2, so this is safe.
    const replaceActions = plan.actions.filter((a) => a.type === 'replace');

    if (replaceActions.length > 0) {
      sendProgress({ phase: 'replacing', message: `Replacing ${replaceActions.length} mod(s)...` });

      for (const action of replaceActions) {
        if (!action.localFile) continue;

        sendProgress({
          phase: 'replacing',
          currentAction: action.id,
          currentFile: action.localFile.fileName,
          message: `Removing old version: ${action.localFile.fileName}...`,
        });

        // Delete the old file — backup copy exists from Step 2
        await deleteFile(action.localFile.absolutePath);
        log('info', `Removed old file (backup exists): ${action.localFile.fileName}`);
      }
    }

    // Step 6: Move .download temp files to final .jar names
    sendProgress({ phase: 'replacing', message: 'Installing downloaded mods...' });

    for (const action of downloadActions) {
      const tempPath = getTempDownloadPath(action.targetPath);
      if (await fileExists(tempPath)) {
        await moveFile(tempPath, action.targetPath);
        log('info', `Installed: ${path.basename(action.targetPath)}`);

        // Remove from temp files tracking
        const idx = syncState.tempFiles.indexOf(tempPath);
        if (idx >= 0) syncState.tempFiles.splice(idx, 1);

        completedActions++;
      } else {
        throw new Error(`Temp download file not found: ${path.basename(tempPath)}`);
      }
    }

    // Step 7: Rename files if needed (SHA matches but filename differs from manifest)
    const renameActions = plan.actions.filter((a) => a.type === 'rename_to_manifest_filename');

    if (renameActions.length > 0) {
      sendProgress({ phase: 'renaming', message: `Renaming ${renameActions.length} file(s)...` });

      for (const action of renameActions) {
        if (!action.localFile) continue;

        sendProgress({
          phase: 'renaming',
          currentAction: action.id,
          currentFile: action.localFile.fileName,
          message: `Renaming ${action.localFile.fileName} → ${path.basename(action.targetPath)}`,
        });

        await moveFile(action.localFile.absolutePath, action.targetPath);
        log('info', `Renamed: ${action.localFile.fileName} → ${path.basename(action.targetPath)}`);
        completedActions++;
      }
    }

    // Step 8: Move extra mods to _disabled_by_krofne_pack
    const disableActions = plan.actions.filter((a) => a.type === 'move_extra_to_disabled');

    if (disableActions.length > 0) {
      sendProgress({ phase: 'moving', message: `Moving ${disableActions.length} extra mod(s) to disabled...` });
      await ensureDir(disabledDir);

      for (const action of disableActions) {
        if (!action.localFile) continue;

        sendProgress({
          phase: 'moving',
          currentAction: action.id,
          currentFile: action.localFile.fileName,
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

    // Step 9: Write backup-meta.json
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

    // Step 10: Update sync state to completed
    syncState.status = 'completed';
    syncState.completedActions = plan.actions.map((a) => a.id);
    syncState.pendingActions = [];
    syncState.tempFiles = [];
    await writeJsonFile(stateFilePath, syncState);

    // Step 11: Save lastSuccessfulPackVersion
    await saveSettings({ lastSuccessfulPackVersion: plan.manifest.packVersion });

    sendProgress({
      phase: 'done',
      message: 'Sync completed successfully!',
      percent: 100,
    });

    log('info', `Sync completed successfully for ${plan.manifest.packName} v${plan.manifest.packVersion}`);
  } catch (err: any) {
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

    throw err;
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
