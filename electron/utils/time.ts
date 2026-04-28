/**
 * Format a date as YYYY-MM-DD_HH-mm-ss (for file-safe timestamps).
 */
export function formatTimestamp(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Format a date as ISO 8601 string.
 */
export function formatIsoDate(date?: Date): string {
  const d = date ?? new Date();
  return d.toISOString();
}

/**
 * Format a date as HH:mm:ss for log display.
 */
export function formatDateForLog(date?: Date): string {
  const d = date ?? new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
