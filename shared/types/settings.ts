export interface AppSettings {
  manifestUrl: string;
  lastModsPath: string | null;
  uiMode: 'simple' | 'detailed';
  debugMode: boolean;
  maxParallelDownloads: number;
  downloadRetries: number;
  lastSuccessfulPackVersion?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  manifestUrl: 'https://raw.githubusercontent.com/KROFN/krofne-minecraft-pack/main/manifest.json',
  lastModsPath: null,
  uiMode: 'simple',
  debugMode: false,
  maxParallelDownloads: 3,
  downloadRetries: 3,
};
