import path from 'path';
import { app } from 'electron';
import type { AppSettings } from '../../shared/types/settings';
import { DEFAULT_SETTINGS } from '../../shared/types/settings';
import { SETTINGS_FILE } from '../../shared/constants';
import { readJsonFile, writeJsonFile } from '../utils/fileSystem';

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

/**
 * Read settings from disk, or return defaults if not found / invalid.
 */
export async function getSettings(): Promise<AppSettings> {
  const data = await readJsonFile<Partial<AppSettings>>(getSettingsPath());
  if (!data) {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...data };
}

/**
 * Merge partial settings with existing settings and save to disk.
 * Returns the updated full settings object.
 */
export async function saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated: AppSettings = { ...current, ...partial };
  await writeJsonFile(getSettingsPath(), updated);
  return updated;
}
