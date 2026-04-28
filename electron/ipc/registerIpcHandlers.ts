import { ipcMain, dialog, clipboard, app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs/promises';

import { APP_VERSION, SYNC_STATE_FILE, DOWNLOAD_TEMP_EXTENSION } from '../../shared/constants';
import type { SyncPlan, SyncProgress } from '../../shared/types/sync';
import type { AdminGenerateManifestData } from '../../shared/types/ipc';

// Services
import * as settingsService from '../services/settingsService';
import { log, initLogSession, getLogs, getLogsFilePath, copyLogsToClipboard } from '../services/logService';
import { loadManifest } from '../services/manifestService';
import { detectMinecraftFolders } from '../services/minecraftPathService';
import { scanModsDirectory } from '../services/scannerService';
import { buildSyncPlan } from '../services/syncPlannerService';
import { executeSyncPlan } from '../services/syncExecutorService';
import { listBackups, getBackupMeta, rollbackBackup } from '../services/backupService';
import { checkForUpdate } from '../services/updateCheckService';
import { checkServerStatus } from '../services/serverStatusService';
import {
  adminScanFolder,
  adminGenerateManifest,
  adminSaveManifest,
} from '../services/adminManifestService';

// Utilities
import { openFolderInExplorer } from '../utils/fileSystem';
import { normalizePath } from '../utils/safePath';
import { fileExists, readJsonFile, deleteFile, listFiles } from '../utils/fileSystem';

/**
 * Register all IPC handlers for the main process.
 */
export function registerIpcHandlers(): void {
  // Initialize log session
  initLogSession().catch(() => {});
  log('info', `krofnePackUpdater v${APP_VERSION} starting...`);

  // ── Settings ────────────────────────────────────────────────────────

  ipcMain.handle('settings:get', async () => {
    try {
      return await settingsService.getSettings();
    } catch (err: any) {
      log('error', `settings:get failed: ${err.message}`);
      throw err;
    }
  });

  ipcMain.handle('settings:save', async (_event, partial) => {
    try {
      return await settingsService.saveSettings(partial);
    } catch (err: any) {
      log('error', `settings:save failed: ${err.message}`);
      throw err;
    }
  });

  // ── Minecraft Folder ────────────────────────────────────────────────

  ipcMain.handle('minecraft:detectFolders', async () => {
    try {
      return await detectMinecraftFolders();
    } catch (err: any) {
      log('error', `minecraft:detectFolders failed: ${err.message}`);
      throw err;
    }
  });

  ipcMain.handle('minecraft:selectFolder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Minecraft mods folder',
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      // Save the selected path
      const selectedPath = result.filePaths[0];
      await settingsService.saveSettings({ lastModsPath: selectedPath });
      return selectedPath;
    } catch (err: any) {
      log('error', `minecraft:selectFolder failed: ${err.message}`);
      throw err;
    }
  });

  // ── Manifest ────────────────────────────────────────────────────────

  ipcMain.handle('manifest:load', async (_event, url?: string) => {
    try {
      const manifestUrl = url || (await settingsService.getSettings()).manifestUrl;
      if (!manifestUrl) {
        throw new Error('No manifest URL configured. Please set it in settings.');
      }
      return await loadManifest(manifestUrl);
    } catch (err: any) {
      log('error', `manifest:load failed: ${err.message}`);
      throw err;
    }
  });

  // ── Sync Check ──────────────────────────────────────────────────────

  ipcMain.handle('sync:check', async () => {
    try {
      const settings = await settingsService.getSettings();

      if (!settings.lastModsPath) {
        throw new Error('No mods folder selected. Please select your Minecraft mods folder first.');
      }

      const modsPath = normalizePath(settings.lastModsPath);
      const modsPathValid = await fileExists(modsPath);
      if (!modsPathValid) {
        throw new Error(`Mods folder does not exist: ${modsPath}`);
      }

      // Load manifest
      const manifestUrl = settings.manifestUrl;
      if (!manifestUrl) {
        throw new Error('No manifest URL configured. Please set it in settings.');
      }
      const manifest = await loadManifest(manifestUrl);

      // Scan local mods
      log('info', `Scanning mods directory: ${modsPath}`);
      const localMods = await scanModsDirectory(modsPath);

      // Build sync plan
      const plan = buildSyncPlan(manifest, localMods, modsPath);

      return plan;
    } catch (err: any) {
      log('error', `sync:check failed: ${err.message}`);
      throw err;
    }
  });

  // ── Sync Execute ────────────────────────────────────────────────────

  ipcMain.handle('sync:execute', async (event, syncPlan: SyncPlan) => {
    try {
      await executeSyncPlan(syncPlan, (progress: SyncProgress) => {
        event.sender.send('sync:progress', progress);
      });
    } catch (err: any) {
      log('error', `sync:execute failed: ${err.message}`);
      throw err;
    }
  });

  // ── Backups ─────────────────────────────────────────────────────────

  ipcMain.handle('backup:list', async () => {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.lastModsPath) {
        return [];
      }
      return await listBackups(settings.lastModsPath);
    } catch (err: any) {
      log('error', `backup:list failed: ${err.message}`);
      throw err;
    }
  });

  ipcMain.handle('backup:getMeta', async (_event, sessionId: string) => {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.lastModsPath) {
        return null;
      }
      return await getBackupMeta(settings.lastModsPath, sessionId);
    } catch (err: any) {
      log('error', `backup:getMeta failed: ${err.message}`);
      throw err;
    }
  });

  ipcMain.handle('backup:rollback', async (_event, sessionId: string) => {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.lastModsPath) {
        throw new Error('No mods folder configured.');
      }
      await rollbackBackup(settings.lastModsPath, sessionId);
    } catch (err: any) {
      log('error', `backup:rollback failed: ${err.message}`);
      throw err;
    }
  });

  // ── Folder Operations ───────────────────────────────────────────────

  ipcMain.handle('folder:open', async (_event, folderPath: string) => {
    try {
      await openFolderInExplorer(folderPath);
    } catch (err: any) {
      log('error', `folder:open failed: ${err.message}`);
      throw err;
    }
  });

  // ── Server Status ───────────────────────────────────────────────────

  ipcMain.handle('server:checkStatus', async (_event, address: string, port: number) => {
    try {
      return await checkServerStatus(address, port);
    } catch (err: any) {
      log('error', `server:checkStatus failed: ${err.message}`);
      throw err;
    }
  });

  // ── App Info ────────────────────────────────────────────────────────

  ipcMain.handle('app:getVersion', async () => {
    return APP_VERSION;
  });

  ipcMain.handle('app:checkUpdate', async () => {
    try {
      return await checkForUpdate();
    } catch (err: any) {
      log('error', `app:checkUpdate failed: ${err.message}`);
      throw err;
    }
  });

  // ── Admin ───────────────────────────────────────────────────────────

  ipcMain.handle('admin:scanFolder', async (_event, folderPath: string) => {
    try {
      return await adminScanFolder(folderPath);
    } catch (err: any) {
      log('error', `admin:scanFolder failed: ${err.message}`);
      throw err;
    }
  });

  ipcMain.handle('admin:generateManifest', async (_event, data: AdminGenerateManifestData) => {
    try {
      return await adminGenerateManifest(data);
    } catch (err: any) {
      log('error', `admin:generateManifest failed: ${err.message}`);
      throw err;
    }
  });

  ipcMain.handle('admin:saveManifest', async (_event, manifest: any, filePath: string) => {
    try {
      await adminSaveManifest(manifest, filePath);
    } catch (err: any) {
      log('error', `admin:saveManifest failed: ${err.message}`);
      throw err;
    }
  });

  // ── Logs ────────────────────────────────────────────────────────────

  ipcMain.handle('logs:get', async () => {
    return getLogs();
  });

  ipcMain.handle('logs:openFolder', async () => {
    try {
      await openFolderInExplorer(getLogsFilePath());
    } catch (err: any) {
      log('error', `logs:openFolder failed: ${err.message}`);
      throw err;
    }
  });

  ipcMain.handle('logs:copyToClipboard', async () => {
    try {
      const text = copyLogsToClipboard();
      clipboard.writeText(text);
      return text;
    } catch (err: any) {
      log('error', `logs:copyToClipboard failed: ${err.message}`);
      throw err;
    }
  });

  // ── Recovery ────────────────────────────────────────────────────────

  ipcMain.handle('recovery:check', async () => {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.lastModsPath) {
        return false;
      }
      const stateFilePath = path.join(settings.lastModsPath, SYNC_STATE_FILE);
      const state = await readJsonFile<{ status: string }>(stateFilePath);
      return state?.status === 'running' || state?.status === 'interrupted';
    } catch {
      return false;
    }
  });

  ipcMain.handle('recovery:perform', async () => {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.lastModsPath) {
        throw new Error('No mods folder configured.');
      }

      const modsPath = normalizePath(settings.lastModsPath);

      // 1. Delete any leftover .download temp files
      const tempFiles = await listFiles(modsPath, DOWNLOAD_TEMP_EXTENSION);
      for (const tempFile of tempFiles) {
        try {
          await deleteFile(tempFile);
          log('info', `Recovery: deleted temp file ${path.basename(tempFile)}`);
        } catch (err: any) {
          log('warn', `Recovery: could not delete temp file ${path.basename(tempFile)}: ${err.message}`);
        }
      }

      // 2. Remove the sync state file
      const stateFilePath = path.join(modsPath, SYNC_STATE_FILE);
      try {
        await deleteFile(stateFilePath);
        log('info', 'Recovery: removed sync state file');
      } catch (err: any) {
        log('warn', `Recovery: could not remove sync state file: ${err.message}`);
      }

      log('info', 'Recovery completed. Please re-check mods to get a fresh sync plan.');
    } catch (err: any) {
      log('error', `recovery:perform failed: ${err.message}`);
      throw err;
    }
  });

  log('info', 'All IPC handlers registered');
}
