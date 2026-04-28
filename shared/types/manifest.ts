export type LoaderType = 'forge' | 'fabric' | 'neoforge' | 'quilt';

export interface ServerInfo {
  name: string;
  address: string;
  port: number;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

export interface AllowedExtraModRule {
  match: 'filename_contains' | 'filename_regex' | 'sha512';
  value: string;
  reason: string;
}

export interface ManifestSettings {
  extraFilesPolicy: 'move_to_disabled';
  maxParallelDownloads: number;
  downloadRetries: number;
}

export interface ManifestMod {
  id: string;
  name: string;
  fileName: string;
  downloadUrl: string;
  sha512: string;
  sizeBytes?: number;
  required: boolean;
  side: 'client' | 'server' | 'both';
  allowUserToKeepDifferentVersion?: boolean;
}

export interface Manifest {
  schemaVersion: number;
  packName: string;
  packVersion: string;
  minecraftVersion: string;
  loader: LoaderType;
  loaderVersion: string | null;
  manifestUpdatedAt: string;
  server?: ServerInfo;
  changelog: ChangelogEntry[];
  settings: ManifestSettings;
  mods: ManifestMod[];
  allowedExtraMods?: AllowedExtraModRule[];
}
