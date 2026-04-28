/**
 * Retry a function with exponential backoff.
 * Does NOT retry on 404 or permission errors.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Do not retry on 404 or permission errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't delay after the last attempt
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        // Add jitter: random value between 0 and 50% of delay
        const jitter = Math.floor(Math.random() * delay * 0.5);
        await sleep(delay + jitter);
      }
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network, timeout, hash mismatch).
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // 404 — not retryable
    if (message.includes('404') || message.includes('not found')) {
      return false;
    }

    // Permission errors — not retryable
    if (
      message.includes('eacces') ||
      message.includes('permission') ||
      message.includes('eperm')
    ) {
      return false;
    }

    // Network / timeout errors — retryable
    if (
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('socket hang up') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch failed') ||
      message.includes('enotfound') ||
      message.includes('ehostunreach')
    ) {
      return true;
    }

    // Hash mismatch — retryable
    if (message.includes('hash mismatch') || message.includes('sha512')) {
      return true;
    }

    // AbortError — not retryable
    if (error.name === 'AbortError') {
      return false;
    }
  }

  // For errors with a `code` property (Node.js system errors)
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: string }).code;
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];
    if (retryableCodes.includes(code)) {
      return true;
    }
    // Permission and not-found errors — not retryable
    if (code === 'EACCES' || code === 'EPERM' || code === 'ENOENT') {
      return false;
    }
  }

  // Default: don't retry unknown errors
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
