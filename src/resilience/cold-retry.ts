/**
 * Best-effort retry for adt-ls's COLD-BACKEND window. The first repository/CTS calls
 * after a fresh connection (or after the backend session sits idle) come back EITHER
 * empty (a search that should have hits returns []) OR throw a generic "Internal error"
 * — until the SAP-side caches warm up. Either mode would surface to a caller as a
 * spurious "not found" / failure on the very first call.
 *
 * `withColdRetry` retries a bounded number of times with linear backoff. The caller
 * decides what counts as a cold (retryable) outcome via `retryResult` (a result that
 * should be retried, e.g. empty references) and `retryError` (a thrown error that should
 * be retried, e.g. the transient "Internal error"). `sleep` is injectable so tests run
 * instantly. A genuinely-empty result / genuine error still surfaces once the attempts
 * are exhausted — the retry never hides a real outcome, only re-checks it.
 */
export interface ColdRetryOpts<T> {
  /** Total attempts including the first (default 3). */
  attempts?: number;
  /** Base backoff in ms; the delay before attempt i (1-based) is `delayMs * i` (default 500). */
  delayMs?: number;
  /** Return true to retry a (non-throwing) result, e.g. empty search references. */
  retryResult?: (result: T) => boolean;
  /** Return true to retry a thrown error, e.g. the transient cold "Internal error". */
  retryError?: (error: unknown) => boolean;
  /** Injectable sleep (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function withColdRetry<T>(fn: () => Promise<T>, opts: ColdRetryOpts<T> = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const delayMs = opts.delayMs ?? 500;
  const sleep = opts.sleep ?? realSleep;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    const isLast = i === attempts - 1;
    try {
      const result = await fn();
      if (!isLast && opts.retryResult?.(result)) {
        await sleep(delayMs * (i + 1));
        continue;
      }
      return result;
    } catch (e) {
      lastError = e;
      if (isLast || !(opts.retryError?.(e) ?? false)) throw e;
      await sleep(delayMs * (i + 1));
    }
  }
  // Unreachable: the final iteration always returns a result or throws.
  throw lastError;
}

/**
 * adt-ls's generic cold/transient error signature — distinct from a real "not found" /
 * authorization / validation error (which must NOT be retried).
 */
export function isTransientColdError(error: unknown): boolean {
  const m = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return m.includes('internal error') || m.includes('temporarily') || m.includes('try again');
}
