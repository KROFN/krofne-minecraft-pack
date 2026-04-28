/**
 * Format bytes to human-readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Format a value as percentage of total.
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  const pct = Math.round((value / total) * 100);
  return `${pct}%`;
}

/**
 * Truncate a string in the middle: "very-lo...name.jar"
 */
export function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return str.slice(0, half) + '...' + str.slice(str.length - half);
}

/**
 * Format ISO date string to readable format.
 */
export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Format SHA-512 hash: first 16 chars + "..."
 */
export function formatSha512(sha: string): string {
  if (!sha) return '';
  if (sha.length <= 16) return sha;
  return sha.slice(0, 16) + '...';
}
