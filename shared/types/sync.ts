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
  phase: 'checking' | 'downloading' | 'replacing' | 'renaming' | 'moving' | 'done' | 'error';
  currentAction?: string;
  completedActions: number;
  totalActions: number;
  currentFile?: string;
  percent: number;
  message: string;
}

export interface SyncState {
  syncId: string;
  startedAt: string;
  status: 'running' | 'completed' | 'interrupted';
  completedActions: string[];
  pendingActions: string[];
  tempFiles: string[];
}
