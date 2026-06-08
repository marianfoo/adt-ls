import { describe, expect, it, vi } from 'vitest';
import { isTransientColdError, withColdRetry } from '../src/resilience/cold-retry.js';

const noSleep = () => Promise.resolve();

describe('withColdRetry', () => {
  it('retries an empty result, then returns the warm one', async () => {
    let n = 0;
    const fn = vi.fn(async () => (++n < 3 ? { references: [] } : { references: [1] }));
    const r = await withColdRetry(fn, {
      attempts: 3,
      sleep: noSleep,
      retryResult: (x: { references: unknown[] }) => x.references.length === 0,
    });
    expect(r).toEqual({ references: [1] });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('returns the last (still-empty) result after exhausting attempts (never hides it)', async () => {
    const fn = vi.fn(async () => ({ references: [] }));
    const r = await withColdRetry(fn, {
      attempts: 2,
      sleep: noSleep,
      retryResult: (x: { references: unknown[] }) => x.references.length === 0,
    });
    expect(r).toEqual({ references: [] });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries a transient error, then succeeds', async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      if (++n < 2) throw new Error('Internal error');
      return 'ok';
    });
    const r = await withColdRetry(fn, { attempts: 3, sleep: noSleep, retryError: isTransientColdError });
    expect(r).toBe('ok');
  });

  it('rethrows a non-transient error immediately', async () => {
    const fn = vi.fn(async () => {
      throw new Error('not found');
    });
    await expect(withColdRetry(fn, { attempts: 3, sleep: noSleep, retryError: isTransientColdError })).rejects.toThrow(
      'not found',
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('isTransientColdError', () => {
  it('matches the cold/transient signatures, not real errors', () => {
    expect(isTransientColdError(new Error('Internal error'))).toBe(true);
    expect(isTransientColdError(new Error('please try again later'))).toBe(true);
    expect(isTransientColdError(new Error('not found'))).toBe(false);
    expect(isTransientColdError(new Error('not authorized'))).toBe(false);
  });
});
