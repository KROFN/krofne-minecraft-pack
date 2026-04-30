import path from 'path';
import { DOWNLOAD_TEMP_EXTENSION } from '../../shared/constants';

/**
 * Remove characters that are unsafe for Windows filenames.
 * Replaces them with underscores and collapses multiple underscores.
 */
export function sanitizeFileName(name: string): string {
  // Windows forbidden characters: \ / : * ? " < > |
  // Also control characters (0x00-0x1F)
  let sanitized = name.replace(/[\\/:*?"<>|\x00-\x1F]/g, '_');
  // Collapse multiple underscores
  sanitized = sanitized.replace(/_+/g, '_');
  // Remove leading/trailing underscores and dots (Windows doesn't like trailing dots)
  sanitized = sanitized.replace(/^[_]+|[_]+$/g, '');
  sanitized = sanitized.replace(/\.+$/g, '');
  // Limit length to 200 characters
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }
  return sanitized || 'unnamed';
}

/**
 * Extract a mod ID from a .jar filename.
 * Lowercases, strips version suffixes, replaces special chars with underscores.
 *
 * Examples:
 *   "jei-1.20.1-forge-15.2.0.27.jar" → "jei"
 *   "create-1.20.1-0.5.1.jar" → "create"
 *   "appleskin-forge-mc1.20.jar" → "appleskin"
 */
export function getModIdFromFileName(fileName: string): string {
  // Remove extension
  let base = fileName.replace(/\.jar$/i, '');

  // Common version patterns to strip:
  // -[0-9] followed by version-like stuff
  // _[0-9] followed by version-like stuff
  // -mc or -forge or -fabric or -neoforge or -quilt followed by anything
  base = base.replace(/[-_](?:mc|forge|fabric|neoforge|quilt).*/i, '');
  base = base.replace(/[-_]\d.*$/i, '');

  // Replace remaining non-alphanumeric chars with underscores
  base = base.replace(/[^a-zA-Z0-9]/g, '_');
  // Collapse multiple underscores
  base = base.replace(/_+/g, '_');
  // Remove leading/trailing underscores
  base = base.replace(/^_+|_+$/g, '');

  return base.toLowerCase() || 'unknown_mod';
}

/**
 * Add a __timestamp before the file extension.
 * Example: "mod.jar" + "2025-03-05_12-30-00" → "mod__2025-03-05_12-30-00.jar"
 */
export function addTimestampToFileName(fileName: string, timestamp: string): string {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return `${base}__${timestamp}${ext}`;
}

/**
 * Get temporary download path by adding .download extension.
 */
export function getTempDownloadPath(targetPath: string): string {
  return targetPath + DOWNLOAD_TEMP_EXTENSION;
}

/**
 * Strip the .download extension from a file path.
 */
export function stripTempExtension(filePath: string): string {
  if (filePath.endsWith(DOWNLOAD_TEMP_EXTENSION)) {
    return filePath.slice(0, -DOWNLOAD_TEMP_EXTENSION.length);
  }
  return filePath;
}
