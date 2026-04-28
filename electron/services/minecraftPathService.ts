import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import type { MinecraftFolderCandidate } from '../../shared/types/ipc';
import { normalizePath } from '../utils/safePath';
import { fileExists } from '../utils/fileSystem';
import { log } from './logService';
import type { AppSettings } from '../../shared/types/settings';
import { getSettings } from './settingsService';

/**
 * Detect Minecraft folders on this system.
 * Checks:
 * 1) settings.lastModsPath (if set and exists)
 * 2) %APPDATA%/.minecraft/mods (if exists)
 * 3) %APPDATA%/.minecraft (offer to create mods subfolder)
 */
export async function detectMinecraftFolders(): Promise<MinecraftFolderCandidate[]> {
  const candidates: MinecraftFolderCandidate[] = [];

  // 1) Check saved mods path from settings
  const settings: AppSettings = await getSettings();
  if (settings.lastModsPath) {
    const exists = await fileExists(settings.lastModsPath);
    if (exists) {
      try {
        const stat = await fs.stat(settings.lastModsPath);
        if (stat.isDirectory()) {
          candidates.push({
            label: path.basename(path.dirname(settings.lastModsPath)) + '/' + path.basename(settings.lastModsPath),
            modsPath: normalizePath(settings.lastModsPath),
            confidence: 'high',
            reason: 'Previously used mods folder',
            lastModifiedAt: stat.mtime.toISOString(),
          });
        }
      } catch {
        // path not accessible
      }
    }
  }

  // Determine .minecraft path
  const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const minecraftDir = normalizePath(path.join(appDataPath, '.minecraft'));
  const modsDir = path.join(minecraftDir, 'mods');

  // 2) Check %APPDATA%/.minecraft/mods
  if (modsDir !== (settings.lastModsPath ? normalizePath(settings.lastModsPath) : '')) {
    const modsExists = await fileExists(modsDir);
    if (modsExists) {
      try {
        const stat = await fs.stat(modsDir);
        if (stat.isDirectory()) {
          candidates.push({
            label: '.minecraft/mods',
            modsPath: normalizePath(modsDir),
            confidence: 'high',
            reason: 'Standard Minecraft Forge mods folder found',
            lastModifiedAt: stat.mtime.toISOString(),
          });
        }
      } catch {
        // not accessible
      }
    }
  }

  // 3) Check %APPDATA%/.minecraft (offer to create mods)
  const mcDirExists = await fileExists(minecraftDir);
  if (mcDirExists) {
    try {
      const stat = await fs.stat(minecraftDir);
      if (stat.isDirectory()) {
        // Only offer if we haven't already found the mods subfolder
        const alreadyHasModsDir = candidates.some(
          (c) => normalizePath(c.modsPath) === normalizePath(modsDir),
        );
        if (!alreadyHasModsDir) {
          candidates.push({
            label: '.minecraft (create mods folder)',
            modsPath: normalizePath(modsDir),
            confidence: 'medium',
            reason: 'Minecraft folder found; mods subfolder can be created',
            lastModifiedAt: stat.mtime.toISOString(),
          });
        }
      }
    } catch {
      // not accessible
    }
  }

  log('info', `Detected ${candidates.length} Minecraft folder candidate(s)`);
  return candidates;
}
