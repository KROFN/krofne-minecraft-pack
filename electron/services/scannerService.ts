import path from 'path';
import type { LocalModFile } from '../../shared/types/mod';
import { BACKUP_FOLDER_NAME, DISABLED_FOLDER_NAME, MOD_FILE_EXTENSION } from '../../shared/constants';
import { listFiles, getFileSize, getFileModifiedTime } from '../utils/fileSystem';
import { normalizePath } from '../utils/safePath';
import { log } from './logService';
import { computeFileSha512 } from './hashService';

/**
 * Scan a mods directory for .jar files.
 * Only top-level files are scanned; files in _backup_by_krofne_pack and _disabled_by_krofne_pack are skipped.
 * For each .jar file, computes SHA-512 hash.
 */
export async function scanModsDirectory(modsPath: string): Promise<LocalModFile[]> {
  const resolvedModsPath = normalizePath(modsPath);
  log('info', `Scanning mods directory: ${resolvedModsPath}`);

  const allFiles = await listFiles(resolvedModsPath, MOD_FILE_EXTENSION);

  const backupDir = path.join(resolvedModsPath, BACKUP_FOLDER_NAME);
  const disabledDir = path.join(resolvedModsPath, DISABLED_FOLDER_NAME);

  // Filter out files that are in backup or disabled directories
  const jarFiles = allFiles.filter((filePath) => {
    const parentDir = path.dirname(filePath);
    if (parentDir === backupDir || parentDir === disabledDir) {
      return false;
    }
    // Also skip if parent is a subfolder of backup or disabled
    if (parentDir.startsWith(backupDir + path.sep) || parentDir.startsWith(disabledDir + path.sep)) {
      return false;
    }
    return true;
  });

  log('info', `Found ${jarFiles.length} .jar file(s) to scan`);

  const results: LocalModFile[] = [];

  for (const filePath of jarFiles) {
    const fileName = path.basename(filePath);
    try {
      const [sizeBytes, modifiedAt, sha512] = await Promise.all([
        getFileSize(filePath),
        getFileModifiedTime(filePath),
        computeFileSha512(filePath),
      ]);

      results.push({
        fileName,
        absolutePath: normalizePath(filePath),
        sizeBytes,
        modifiedAt,
        sha512,
      });
    } catch (err: any) {
      log('warn', `Failed to scan file ${fileName}: ${err.message}`);
    }
  }

  log('info', `Scanned ${results.length} mod file(s) successfully`);
  return results;
}
