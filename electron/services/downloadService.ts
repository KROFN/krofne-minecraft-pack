import fs from 'fs';
import path from 'path';
import { computeFileSha512 } from './hashService';
import { retryWithBackoff } from '../utils/retry';
import { deleteFile, moveFile, fileExists } from '../utils/fileSystem';
import { ensureDir, normalizePath } from '../utils/safePath';
import { getTempDownloadPath } from '../utils/filename';
import { DOWNLOAD_TIMEOUT_MS } from '../../shared/constants';
import { log } from './logService';

export interface DownloadProgress {
  fileName: string;
  bytesDownloaded: number;
  totalBytes: number | null;
  percent: number | null;
}

/**
 * Download a file from a URL with SHA-512 verification.
 *
 * Downloads to a .download temp file, verifies hash, and LEAVES the file
 * as .download. The caller is responsible for moving the temp file to the
 * final destination after all downloads are verified and old files are backed up.
 *
 * This is a critical safety design: we never move a .download file to its final
 * .jar name until the caller explicitly does so. This ensures that:
 * 1. All downloads can complete and verify before any local files are touched.
 * 2. If any download fails, no local files have been modified.
 * 3. The caller controls the exact order of backup → delete → rename.
 *
 * @param url Download URL
 * @param targetPath Final file path (the .jar path, NOT the .download path)
 * @param expectedSha512 Expected SHA-512 hex digest
 * @param retries Number of retries on failure (default 3)
 * @param onProgress Optional progress callback
 */
export async function downloadFile(
  url: string,
  targetPath: string,
  expectedSha512: string,
  retries: number = 3,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const resolvedTarget = normalizePath(targetPath);
  const tempPath = getTempDownloadPath(resolvedTarget);
  const fileName = path.basename(resolvedTarget);

  log('info', `Starting download: ${fileName} from ${url}`);

  await retryWithBackoff(
    async () => {
      // Ensure target directory exists
      await ensureDir(path.dirname(resolvedTarget));

      // Clean up any leftover temp file from a previous attempt
      await deleteFile(tempPath);

      // Download to temp file
      const response = await fetch(url, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Download failed: No response body');
      }

      const totalBytes = response.headers.get('content-length')
        ? parseInt(response.headers.get('content-length')!, 10)
        : null;

      let bytesDownloaded = 0;

      // Stream the response to file
      const writeStream = fs.createWriteStream(tempPath);
      const reader = response.body.getReader();

      // Set up finish/error handlers BEFORE writing to avoid race conditions
      const writeDone = new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          writeStream.write(value);
          bytesDownloaded += value.length;

          if (onProgress) {
            onProgress({
              fileName,
              bytesDownloaded,
              totalBytes,
              percent: totalBytes ? Math.round((bytesDownloaded / totalBytes) * 100) : null,
            });
          }
        }
      } finally {
        writeStream.end();
      }

      // Wait for the write stream to finish flushing
      await writeDone;

      // Verify SHA-512 of the downloaded temp file
      log('info', `Verifying hash for ${fileName}...`);
      const actualSha512 = await computeFileSha512(tempPath);

      if (actualSha512.toLowerCase() !== expectedSha512.toLowerCase()) {
        // Hash mismatch: delete the temp file and throw so retry can kick in
        await deleteFile(tempPath);
        const err = new Error(
          `Hash mismatch for ${fileName}: expected ${expectedSha512.substring(0, 16)}... got ${actualSha512.substring(0, 16)}...`,
        );
        log('error', err.message);
        throw err;
      }

      // Hash matches — leave the file as .download for the caller to move.
      // The caller will do: backup old → delete old → move .download to final .jar
      log('info', `Download verified: ${fileName} (hash OK, left as .download)`);
    },
    retries,
    1000,
  );
}
