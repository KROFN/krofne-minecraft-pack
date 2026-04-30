import path from 'path';
import type { Manifest, ManifestMod, LoaderType, AllowedExtraModRule } from '../../shared/types/manifest';
import type { AdminScanResult, AdminGenerateManifestData } from '../../shared/types/ipc';
import { MOD_FILE_EXTENSION } from '../../shared/constants';
import { computeFileSha512 } from './hashService';
import { listFiles, getFileSize, writeJsonFile } from '../utils/fileSystem';
import { normalizePath } from '../utils/safePath';
import { getModIdFromFileName } from '../utils/filename';
import { formatIsoDate } from '../utils/time';
import { loadManifest } from './manifestService';
import { log } from './logService';

/**
 * Scan a folder for .jar files and compute SHA-512 for each.
 */
export async function adminScanFolder(folderPath: string): Promise<AdminScanResult> {
  const resolved = normalizePath(folderPath);
  log('info', `Admin scanning folder: ${resolved}`);

  const jarFiles = await listFiles(resolved, MOD_FILE_EXTENSION);

  const files: AdminScanResult['files'] = [];

  for (const filePath of jarFiles) {
    const fileName = path.basename(filePath);
    try {
      const [sha512, sizeBytes] = await Promise.all([
        computeFileSha512(filePath),
        getFileSize(filePath),
      ]);

      files.push({
        fileName,
        sha512,
        sizeBytes,
      });
    } catch (err: any) {
      log('warn', `Admin scan: failed to process ${fileName}: ${err.message}`);
    }
  }

  log('info', `Admin scan complete: ${files.length} .jar file(s) found`);
  return { files };
}

/**
 * Generate a manifest from scanned data.
 * If an old manifest is provided, tries to match by SHA-512 and preserve existing metadata.
 */
export async function adminGenerateManifest(
  data: AdminGenerateManifestData,
): Promise<Manifest> {
  log('info', `Admin generating manifest: ${data.packName} v${data.packVersion}`);

  // Scan the local mods folder
  const scanResult = await adminScanFolder(data.localModsPath);

  // Try to load old manifest if URL is provided
  let oldManifest: Manifest | null = null;
  if (data.oldManifestUrl) {
    try {
      oldManifest = await loadManifest(data.oldManifestUrl);
      log('info', `Old manifest loaded: ${oldManifest.packName} v${oldManifest.packVersion} (${oldManifest.mods.length} mods)`);
    } catch (err: any) {
      log('warn', `Could not load old manifest: ${err.message}`);
    }
  }

  // Build a lookup of old mods by SHA-512
  const oldModsByHash = new Map<string, ManifestMod>();
  if (oldManifest) {
    for (const mod of oldManifest.mods) {
      oldModsByHash.set(mod.sha512.toLowerCase(), mod);
    }
  }

  // Generate mod entries
  const mods: ManifestMod[] = scanResult.files.map((file) => {
    const existingMod = oldModsByHash.get(file.sha512.toLowerCase());

    if (existingMod) {
      // Preserve existing metadata but update fileName if it changed
      return {
        ...existingMod,
        fileName: file.fileName,
        sizeBytes: file.sizeBytes,
      } satisfies ManifestMod;
    }

    // New file — generate entry
    const id = getModIdFromFileName(file.fileName);
    const downloadUrl = data.githubRawBaseUrl
      ? `${data.githubRawBaseUrl.replace(/\/$/, '')}/${file.fileName}`
      : '';

    return {
      id,
      name: file.fileName.replace(/\.jar$/i, ''),
      fileName: file.fileName,
      downloadUrl,
      sha512: file.sha512,
      sizeBytes: file.sizeBytes,
      required: true,
      side: 'both' as const,
    } satisfies ManifestMod;
  });

  const manifest: Manifest = {
    schemaVersion: 1,
    packName: data.packName,
    packVersion: data.packVersion,
    minecraftVersion: data.minecraftVersion,
    loader: data.loader as LoaderType,
    loaderVersion: data.loaderVersion,
    manifestUpdatedAt: formatIsoDate(),
    changelog: data.changelog,
    settings: {
      extraFilesPolicy: 'move_to_disabled',
      maxParallelDownloads: 3,
      downloadRetries: 3,
    },
    mods,
    allowedExtraMods: oldManifest?.allowedExtraMods,
  };

  log('info', `Manifest generated: ${mods.length} mod(s)`);
  return manifest;
}

/**
 * Save a manifest as formatted JSON to a file path.
 */
export async function adminSaveManifest(
  manifest: Manifest,
  filePath: string,
): Promise<void> {
  const resolved = normalizePath(filePath);
  await writeJsonFile(resolved, manifest);
  log('info', `Manifest saved to: ${resolved}`);
}
