import type { ManifestMod } from './manifest';

export interface LocalModFile {
  fileName: string;
  absolutePath: string;
  sizeBytes: number;
  modifiedAt: string;
  sha512: string;
}

export type ModStatus =
  | 'installed'
  | 'missing'
  | 'wrong_hash'
  | 'extra'
  | 'allowed_extra'
  | 'download_pending'
  | 'downloaded'
  | 'updated'
  | 'disabled'
  | 'failed';

export interface ModCheckResult {
  status: ModStatus;
  manifestMod?: ManifestMod;
  localFile?: LocalModFile;
  expectedFileName?: string;
  message: string;
}
