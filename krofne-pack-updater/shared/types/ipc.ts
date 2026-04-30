import type { AppSettings } from './settings';
import type { Manifest } from './manifest';
import type { SyncPlan, SyncProgress } from './sync';
import type { BackupSession, BackupMeta } from './backup';
import type { SyncLogEntry } from './logs';

export interface MinecraftFolderCandidate {
  label: string;
  modsPath: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  lastModifiedAt?: string;
}

export interface ServerStatusResult {
  reachable: boolean;
  latencyMs: number | null;
  error: string | null;
}

export interface AppUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string | null;
  downloadUrl: string | null;
  notes: string[];
}

export interface AdminScanResult {
  files: Array<{
    fileName: string;
    sha512: string;
    sizeBytes: number;
  }>;
}

export interface KrofnePackAPI {
  // Settings
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

  // Minecraft folder
  detectMinecraftFolders(): Promise<MinecraftFolderCandidate[]>;
  selectModsFolder(): Promise<string | null>;

  // Manifest
  loadManifest(url?: string): Promise<Manifest>;

  // Check & Sync
  checkMods(): Promise<SyncPlan>;
  synchronize(syncPlan: SyncPlan): Promise<void>;
  onSyncProgress(callback: (progress: SyncProgress) => void): () => void;

  // Backups
  listBackups(): Promise<BackupSession[]>;
  getBackupMeta(sessionId: string): Promise<BackupMeta | null>;
  rollbackBackup(sessionId: string): Promise<void>;

  // Folder operations
  openFolder(path: string): Promise<void>;

  // Server
  checkServerStatus(address: string, port: number): Promise<ServerStatusResult>;

  // App
  getAppVersion(): Promise<string>;
  checkAppUpdate(): Promise<AppUpdateInfo>;

  // Admin
  adminScanFolder(folderPath: string): Promise<AdminScanResult>;
  adminGenerateManifest(data: AdminGenerateManifestData): Promise<Manifest>;
  adminSaveManifest(manifest: Manifest, filePath: string): Promise<void>;

  // Logs
  getLogs(): Promise<SyncLogEntry[]>;
  openLogsFolder(): Promise<void>;
  copyLogsToClipboard(): Promise<string>;

  // Recovery
  checkRecovery(): Promise<boolean>;
  performRecovery(): Promise<void>;

  // Cancel & Cache
  cancelSync(): Promise<void>;
  clearDownloadCache(): Promise<void>;
}

export interface AdminGenerateManifestData {
  packName: string;
  packVersion: string;
  minecraftVersion: string;
  loader: string;
  loaderVersion: string | null;
  githubRawBaseUrl: string;
  localModsPath: string;
  oldManifestUrl?: string;
  changelog: Array<{ version: string; date: string; items: string[] }>;
}

// Type for the window.krofnePack global
declare global {
  interface Window {
    krofnePack: KrofnePackAPI;
  }
}
