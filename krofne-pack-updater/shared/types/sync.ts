import type { ManifestMod } from './manifest';
import type { LocalModFile, ModCheckResult } from './mod';
import type { Manifest } from './manifest';

export type SyncActionType =
  | 'download'
  | 'replace'
  | 'move_extra_to_disabled'
  | 'rename_to_manifest_filename';

export interface SyncAction {
  id: string;
  type: SyncActionType;
  mod?: ManifestMod;
  localFile?: LocalModFile;
  targetPath: string;
  backupPath?: string;
  reason: string;
}

export interface SyncPlan {
  createdAt: string;
  modsDir: string;
  manifest: Manifest;
  installed: ModCheckResult[];
  missing: ModCheckResult[];
  wrongHash: ModCheckResult[];
  extra: ModCheckResult[];
  allowedExtra: ModCheckResult[];
  actions: SyncAction[];
  summary: {
    installedCount: number;
    missingCount: number;
    wrongHashCount: number;
    extraCount: number;
    allowedExtraCount: number;
    totalActions: number;
  };
}

export interface SyncProgress {
  phase: 'idle' | 'preparing' | 'checking' | 'cache_check' | 'downloading' | 'replacing' | 'renaming' | 'moving' | 'moving_extra' | 'verifying' | 'installing' | 'backing_up' | 'recovery' | 'done' | 'error' | 'cancelled';
  currentAction?: string;
  completedActions: number;
  totalActions: number;
  currentFile?: string;
  percent: number;
  message: string;
  currentFileName?: string;
  fileDownloadedBytes?: number;
  fileTotalBytes?: number;
  filePercent?: number;
  totalDownloadedBytes?: number;
  totalBytes?: number;
}

export interface SyncState {
  syncId: string;
  startedAt: string;
  status: 'running' | 'completed' | 'interrupted' | 'cancelled';
  completedActions: string[];
  pendingActions: string[];
  tempFiles: string[];
}

export interface UserFriendlyError {
  title: string;
  message: string;
  technicalDetails?: string;
}
