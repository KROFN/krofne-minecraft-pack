import type { KrofnePackAPI } from '@shared/types/ipc';
import type { AppSettings } from '@shared/types/settings';
import type { Manifest } from '@shared/types/manifest';
import type { SyncPlan, SyncProgress } from '@shared/types/sync';
import type { BackupSession, BackupMeta } from '@shared/types/backup';
import type { SyncLogEntry } from '@shared/types/logs';
import type {
  MinecraftFolderCandidate,
  ServerStatusResult,
  AppUpdateInfo,
  AdminScanResult,
  AdminGenerateManifestData,
} from '@shared/types/ipc';

/**
 * Check if we're running inside Electron with the krofnePack API available.
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.krofnePack;
}

function getAPI(): KrofnePackAPI {
  if (typeof window !== 'undefined' && window.krofnePack) {
    return window.krofnePack;
  }
  throw new Error(
    'krofnePack API is not available. This feature requires the Electron desktop app.'
  );
}

// ─── Settings ────────────────────────────────────────────────────────
export async function getSettings(): Promise<AppSettings> {
  try {
    return await getAPI().getSettings();
  } catch (err) {
    throw new Error(`Не удалось загрузить настройки: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  try {
    return await getAPI().saveSettings(settings);
  } catch (err) {
    throw new Error(`Не удалось сохранить настройки: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Minecraft Folder ────────────────────────────────────────────────
export async function detectMinecraftFolders(): Promise<MinecraftFolderCandidate[]> {
  try {
    return await getAPI().detectMinecraftFolders();
  } catch (err) {
    throw new Error(`Не удалось найти папки Minecraft: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function selectModsFolder(): Promise<string | null> {
  try {
    return await getAPI().selectModsFolder();
  } catch (err) {
    throw new Error(`Не удалось выбрать папку: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Manifest ────────────────────────────────────────────────────────
export async function loadManifest(url?: string): Promise<Manifest> {
  try {
    return await getAPI().loadManifest(url);
  } catch (err) {
    throw new Error(`Не удалось загрузить манифест: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Check & Sync ────────────────────────────────────────────────────
export async function checkMods(): Promise<SyncPlan> {
  try {
    return await getAPI().checkMods();
  } catch (err) {
    throw new Error(`Не удалось проверить моды: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function synchronize(syncPlan: SyncPlan): Promise<void> {
  try {
    return await getAPI().synchronize(syncPlan);
  } catch (err) {
    throw new Error(`Ошибка синхронизации: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function onSyncProgress(callback: (progress: SyncProgress) => void): () => void {
  try {
    return getAPI().onSyncProgress(callback);
  } catch {
    // Return a no-op unsubscribe if API not available
    return () => {};
  }
}

// ─── Backups ─────────────────────────────────────────────────────────
export async function listBackups(): Promise<BackupSession[]> {
  try {
    return await getAPI().listBackups();
  } catch (err) {
    throw new Error(`Не удалось загрузить бэкапы: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getBackupMeta(sessionId: string): Promise<BackupMeta | null> {
  try {
    return await getAPI().getBackupMeta(sessionId);
  } catch (err) {
    throw new Error(`Не удалось загрузить данные бэкапа: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function rollbackBackup(sessionId: string): Promise<void> {
  try {
    return await getAPI().rollbackBackup(sessionId);
  } catch (err) {
    throw new Error(`Не удалось откатить бэкап: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Folder Operations ───────────────────────────────────────────────
export async function openFolder(path: string): Promise<void> {
  try {
    return await getAPI().openFolder(path);
  } catch (err) {
    throw new Error(`Не удалось открыть папку: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Server ──────────────────────────────────────────────────────────
export async function checkServerStatus(address: string, port: number): Promise<ServerStatusResult> {
  try {
    return await getAPI().checkServerStatus(address, port);
  } catch (err) {
    throw new Error(`Не удалось проверить сервер: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── App ─────────────────────────────────────────────────────────────
export async function getAppVersion(): Promise<string> {
  try {
    return await getAPI().getAppVersion();
  } catch (err) {
    throw new Error(`Не удалось получить версию: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function checkAppUpdate(): Promise<AppUpdateInfo> {
  try {
    return await getAPI().checkAppUpdate();
  } catch (err) {
    throw new Error(`Не удалось проверить обновления: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Admin ───────────────────────────────────────────────────────────
export async function adminScanFolder(folderPath: string): Promise<AdminScanResult> {
  try {
    return await getAPI().adminScanFolder(folderPath);
  } catch (err) {
    throw new Error(`Не удалось просканировать папку: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function adminGenerateManifest(data: AdminGenerateManifestData): Promise<Manifest> {
  try {
    return await getAPI().adminGenerateManifest(data);
  } catch (err) {
    throw new Error(`Не удалось сгенерировать манифест: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function adminSaveManifest(manifest: Manifest, filePath: string): Promise<void> {
  try {
    return await getAPI().adminSaveManifest(manifest, filePath);
  } catch (err) {
    throw new Error(`Не удалось сохранить манифест: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Logs ────────────────────────────────────────────────────────────
export async function getLogs(): Promise<SyncLogEntry[]> {
  try {
    return await getAPI().getLogs();
  } catch (err) {
    throw new Error(`Не удалось загрузить логи: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function openLogsFolder(): Promise<void> {
  try {
    return await getAPI().openLogsFolder();
  } catch (err) {
    throw new Error(`Не удалось открыть папку логов: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function copyLogsToClipboard(): Promise<string> {
  try {
    return await getAPI().copyLogsToClipboard();
  } catch (err) {
    throw new Error(`Не удалось скопировать логи: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Cancel & Cache ─────────────────────────────────────────────────
export async function cancelSync(): Promise<void> {
  try {
    return await getAPI().cancelSync();
  } catch (err) {
    throw new Error(`Не удалось отменить синхронизацию: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function clearDownloadCache(): Promise<void> {
  try {
    return await getAPI().clearDownloadCache();
  } catch (err) {
    throw new Error(`Не удалось очистить cache: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Recovery ────────────────────────────────────────────────────────
export async function checkRecovery(): Promise<boolean> {
  try {
    return await getAPI().checkRecovery();
  } catch (err) {
    throw new Error(`Не удалось проверить восстановление: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function performRecovery(): Promise<void> {
  try {
    return await getAPI().performRecovery();
  } catch (err) {
    throw new Error(`Не удалось выполнить восстановление: ${err instanceof Error ? err.message : String(err)}`);
  }
}
