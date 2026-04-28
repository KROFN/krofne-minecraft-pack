export interface BackupFileRecord {
  originalPath: string;
  backupPath: string;
  fileName: string;
  reason: string;
}

export interface BackupMeta {
  createdAt: string;
  packVersionBefore: string | null;
  packVersionAfter: string;
  modsDir: string;
  files: BackupFileRecord[];
}

export interface BackupSession {
  id: string;
  folderName: string;
  createdAt: string;
  packVersionBefore: string | null;
  packVersionAfter: string;
  fileCount: number;
  modsDir: string;
}
