import fs from 'fs';
import path from 'path';
import { computeFileSha512 } from './hashService';
import { retryWithBackoff } from '../utils/retry';
import { deleteFile, fileExists } from '../utils/fileSystem';
import { ensureDir, normalizePath, getCacheDir } from '../utils/safePath';
import { DOWNLOAD_TIMEOUT_MS, DOWNLOAD_TEMP_EXTENSION, MOD_FILE_EXTENSION, PROGRESS_THROTTLE_MS } from '../../shared/constants';
import { log } from './logService';

export interface DownloadProgress {
  fileName: string;
  bytesDownloaded: number;
  totalBytes: number | null;
  percent: number | null;
}

/**
 * Download a file from a URL with SHA-512 verification and cache support.
 *
 * Cache flow:
 * - Cache dir: mods/_krofne_download_cache/
 * - Cache file (verified): <sha512>.jar
 * - Cache file (in-progress): <sha512>.download
 *
 * Before downloading, checks if <sha512>.jar exists in cache and re-verifies its hash.
 * If cache hit (hash matches), returns { fromCache: true } without network access.
 * If cache exists but hash is wrong, deletes cache file and downloads fresh.
 *
 * After download to <sha512>.download, verifies SHA-512, then renames to <sha512>.jar in cache.
 * The caller (syncExecutor) is responsible for copying from cache to final target.
 *
 * Supports cancellation via AbortSignal and throttled progress callbacks.
 *
 * @param url Download URL
 * @param targetPath Final file path (for reference/logging; download goes to cache)
 * @param expectedSha512 Expected SHA-512 hex digest
 * @param modsDir Mods directory where cache folder lives
 * @param options Optional: retries, onProgress callback, abortSignal for cancel
 * @returns { fromCache: boolean } — true if file was served from cache
 */
export async function downloadFile(
  url: string,
  targetPath: string,
  expectedSha512: string,
  modsDir: string,
  options?: {
    retries?: number;
    onProgress?: (progress: DownloadProgress) => void;
    abortSignal?: AbortSignal;
  },
): Promise<{ fromCache: boolean }> {
  const resolvedModsDir = normalizePath(modsDir);
  const cacheDir = getCacheDir(resolvedModsDir);
  const cacheJarPath = path.join(cacheDir, `${expectedSha512.toLowerCase()}${MOD_FILE_EXTENSION}`);
  const cacheDownloadPath = path.join(cacheDir, `${expectedSha512.toLowerCase()}${DOWNLOAD_TEMP_EXTENSION}`);
  const fileName = path.basename(targetPath);
  const retries = options?.retries ?? 3;
  const onProgress = options?.onProgress;
  const abortSignal = options?.abortSignal;

  // Check if user cancelled before starting
  if (abortSignal?.aborted) {
    throw new DOMException('Download cancelled', 'AbortError');
  }

  // Step 1: Check cache for existing verified file
  if (await fileExists(cacheJarPath)) {
    log('info', `Cache hit for ${fileName}, verifying hash...`);
    try {
      const cachedHash = await computeFileSha512(cacheJarPath);
      if (cachedHash.toLowerCase() === expectedSha512.toLowerCase()) {
        log('info', `Cache verified: ${fileName} (hash OK, skipping download)`);
        return { fromCache: true };
      } else {
        log('warn', `Cache hash mismatch for ${fileName}, deleting cache file and re-downloading`);
        await deleteFile(cacheJarPath);
      }
    } catch (err: any) {
      log('warn', `Cache verification failed for ${fileName}: ${err.message}, deleting cache file`);
      await deleteFile(cacheJarPath);
    }
  }

  // Step 2: Download with retry
  await retryWithBackoff(
    async () => {
      // Check cancellation before each attempt
      if (abortSignal?.aborted) {
        throw new DOMException('Download cancelled', 'AbortError');
      }

      // Ensure cache directory exists
      await ensureDir(cacheDir);

      // Clean up any leftover .download temp file from a previous attempt
      await deleteFile(cacheDownloadPath);

      // Create a combined abort signal: timeout + user cancel
      const timeoutSignal = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS);
      let combinedSignal: AbortSignal;

      if (abortSignal) {
        // Use AbortSignal.any if available, otherwise manual approach
        if (typeof AbortSignal.any === 'function') {
          combinedSignal = AbortSignal.any([timeoutSignal, abortSignal]);
        } else {
          // Fallback: create a manual controller and abort on either signal
          const controller = new AbortController();
          const onAbort = () => controller.abort();
          timeoutSignal.addEventListener('abort', onAbort, { once: true });
          abortSignal.addEventListener('abort', onAbort, { once: true });
          // If already aborted, abort immediately
          if (timeoutSignal.aborted || abortSignal.aborted) {
            controller.abort();
          }
          combinedSignal = controller.signal;
        }
      } else {
        combinedSignal = timeoutSignal;
      }

      // Download to .download temp file in cache
      const response = await fetch(url, {
        signal: combinedSignal,
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
      let lastProgressTime = 0;

      // Stream the response to file
      const writeStream = fs.createWriteStream(cacheDownloadPath);
      const reader = response.body.getReader();

      // Set up finish/error handlers BEFORE writing to avoid race conditions
      const writeDone = new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      try {
        while (true) {
          // Check cancellation during streaming
          if (abortSignal?.aborted) {
            reader.cancel();
            writeStream.destroy();
            await deleteFile(cacheDownloadPath);
            throw new DOMException('Download cancelled', 'AbortError');
          }

          const { done, value } = await reader.read();
          if (done) break;

          writeStream.write(value);
          bytesDownloaded += value.length;

          // Throttled progress callback
          if (onProgress) {
            const now = Date.now();
            if (now - lastProgressTime >= PROGRESS_THROTTLE_MS) {
              lastProgressTime = now;
              onProgress({
                fileName,
                bytesDownloaded,
                totalBytes,
                percent: totalBytes ? Math.round((bytesDownloaded / totalBytes) * 100) : null,
              });
            }
          }
        }
      } finally {
        writeStream.end();
      }

      // Wait for the write stream to finish flushing
      await writeDone;

      // Send final progress
      if (onProgress) {
        onProgress({
          fileName,
          bytesDownloaded,
          totalBytes,
          percent: totalBytes ? 100 : null,
        });
      }

      // Verify SHA-512 of the downloaded temp file
      log('info', `Verifying hash for ${fileName}...`);
      const actualSha512 = await computeFileSha512(cacheDownloadPath);

      if (actualSha512.toLowerCase() !== expectedSha512.toLowerCase()) {
        // Hash mismatch: delete the temp file and throw so retry can kick in
        await deleteFile(cacheDownloadPath);
        const err = new Error(
          `Hash mismatch for ${fileName}: expected ${expectedSha512.substring(0, 16)}... got ${actualSha512.substring(0, 16)}...`,
        );
        log('error', err.message);
        throw err;
      }

      // Hash matches — rename .download to .jar in cache
      await fs.promises.rename(cacheDownloadPath, cacheJarPath);
      log('info', `Download verified and cached: ${fileName} (${expectedSha512.substring(0, 12)}...)`);
    },
    retries,
    1000,
  );

  return { fromCache: false };
}
