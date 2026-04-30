import type { AppUpdateInfo } from '../../shared/types/ipc';
import { APP_VERSION, UPDATE_CHECK_URL, GITHUB_RELEASES_URL } from '../../shared/constants';
import { log } from './logService';

/**
 * Check for app updates by fetching the update.json from the repository.
 * Compares with the current APP_VERSION.
 */
export async function checkForUpdate(): Promise<AppUpdateInfo> {
  log('info', `Checking for app update... Current version: ${APP_VERSION}`);

  try {
    const response = await fetch(UPDATE_CHECK_URL, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      log('warn', `Update check failed: HTTP ${response.status}`);
      return {
        hasUpdate: false,
        latestVersion: null,
        downloadUrl: null,
        notes: [],
      };
    }

    const data = await response.json() as {
      latestVersion?: string;
      downloadUrl?: string;
      notes?: string[];
    };

    const latestVersion = data.latestVersion ?? null;
    const downloadUrl = data.downloadUrl ?? GITHUB_RELEASES_URL;
    const notes = data.notes ?? [];

    if (!latestVersion) {
      log('warn', 'Update check: no version found in update.json');
      return {
        hasUpdate: false,
        latestVersion: null,
        downloadUrl: null,
        notes: [],
      };
    }

    const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0;

    log('info', `Update check: latest=${latestVersion}, current=${APP_VERSION}, hasUpdate=${hasUpdate}`);

    return {
      hasUpdate,
      latestVersion,
      downloadUrl,
      notes,
    };
  } catch (err: any) {
    log('warn', `Update check error: ${err.message}`);
    return {
      hasUpdate: false,
      latestVersion: null,
      downloadUrl: null,
      notes: [],
    };
  }
}

/**
 * Compare two semver version strings.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.replace(/^v/, '').split('.').map(Number);
  const partsB = b.replace(/^v/, '').split('.').map(Number);

  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}
