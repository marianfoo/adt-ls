import { describe, expect, it, vi } from 'vitest';
import { searchWithRevive } from '../src/api/repository.js';
import {
  isLoggedOffFederatedResult,
  isLoggedOffMessage,
  makeRelogon,
  makeReviveIfDead,
  makeWithRelogon,
} from '../src/resilience/session-retry.js';

describe('isLoggedOffMessage', () => {
  it('matches logged-off variants + 401, not normal errors', () => {
    expect(isLoggedOffMessage('Your user was logged off')).toBe(true);
    expect(isLoggedOffMessage('session has expired')).toBe(true);
    expect(isLoggedOffMessage('HTTP 401')).toBe(true);
    expect(isLoggedOffMessage('401 Unauthorized')).toBe(true);
    expect(isLoggedOffMessage('syntax error in line 5')).toBe(false);
    expect(isLoggedOffMessage('object not found')).toBe(false);
  });
});

describe('isLoggedOffFederatedResult', () => {
  it('detects a logged-off federated tool result', () => {
    expect(isLoggedOffFederatedResult({ isError: true, content: [{ text: 'user was logged off' }] })).toBe(true);
    expect(isLoggedOffFederatedResult({ isError: true, content: [{ text: 'boom' }] })).toBe(false);
    expect(isLoggedOffFederatedResult({ content: [{ text: 'logged off' }] })).toBe(false); // not isError
  });
});

describe('makeRelogon', () => {
  it('shares one in-flight re-logon among concurrent callers', async () => {
    let calls = 0;
    let resolve!: (v: boolean) => void;
    const relogon = makeRelogon(
      () =>
        new Promise<boolean>((r) => {
          calls++;
          resolve = r;
        }),
    );
    const p1 = relogon();
    const p2 = relogon();
    expect(calls).toBe(1); // deduped
    resolve(true);
    expect(await p1).toBe(true);
    expect(await p2).toBe(true);
  });
});

describe('makeWithRelogon', () => {
  it('retries once after a logged-off throw when re-logon succeeds', async () => {
    const relogon = vi.fn(async () => true);
    const withRelogon = makeWithRelogon(relogon);
    let n = 0;
    const r = await withRelogon(async () => {
      if (++n === 1) throw new Error('Your user was logged off');
      return 'ok';
    });
    expect(r).toBe('ok');
    expect(relogon).toHaveBeenCalledTimes(1);
    expect(n).toBe(2);
  });

  it('does not retry (or re-logon) on a normal error', async () => {
    const relogon = vi.fn(async () => true);
    const withRelogon = makeWithRelogon(relogon);
    await expect(withRelogon(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(relogon).not.toHaveBeenCalled();
  });

  it('retries on a logged-off federated result (isError + message)', async () => {
    const relogon = vi.fn(async () => true);
    const withRelogon = makeWithRelogon(relogon);
    let n = 0;
    const r = await withRelogon(
      async () => (++n === 1 ? { isError: true, content: [{ text: 'logged off' }] } : { ok: true }),
      isLoggedOffFederatedResult,
    );
    expect(r).toEqual({ ok: true });
    expect(relogon).toHaveBeenCalledTimes(1);
  });
});

describe('makeReviveIfDead', () => {
  it('no re-logon when the probe is alive', async () => {
    const relogon = vi.fn(async () => true);
    const revive = makeReviveIfDead(async () => true, relogon);
    expect(await revive()).toBe(false);
    expect(relogon).not.toHaveBeenCalled();
  });

  it('re-logons when the probe is dead', async () => {
    const relogon = vi.fn(async () => true);
    const revive = makeReviveIfDead(async () => false, relogon);
    expect(await revive()).toBe(true);
    expect(relogon).toHaveBeenCalledTimes(1);
  });
});

describe('searchWithRevive', () => {
  const empty = { references: [] };
  const hit = { references: [{ name: 'ZCL_X', uri: '/x' }] };

  it('retries once when an empty result is caused by a dead (then revived) session', async () => {
    const run = vi.fn().mockResolvedValueOnce(empty).mockResolvedValueOnce(hit);
    const reviveIfDead = vi.fn(async () => true); // dead → revived
    const r = await searchWithRevive(run, reviveIfDead);
    expect(r).toBe(hit);
    expect(run).toHaveBeenCalledTimes(2);
    expect(reviveIfDead).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry when the session is alive (a genuine no-match)', async () => {
    const run = vi.fn().mockResolvedValue(empty);
    const reviveIfDead = vi.fn(async () => false); // alive → no relogon
    const r = await searchWithRevive(run, reviveIfDead);
    expect(r).toBe(empty);
    expect(run).toHaveBeenCalledTimes(1);
    expect(reviveIfDead).toHaveBeenCalledTimes(1);
  });

  it('does not probe when the first result already has hits', async () => {
    const run = vi.fn().mockResolvedValue(hit);
    const reviveIfDead = vi.fn(async () => true);
    await searchWithRevive(run, reviveIfDead);
    expect(run).toHaveBeenCalledTimes(1);
    expect(reviveIfDead).not.toHaveBeenCalled();
  });

  it('is a no-op passthrough when no reviveIfDead is given', async () => {
    const run = vi.fn().mockResolvedValue(empty);
    expect(await searchWithRevive(run)).toBe(empty);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
