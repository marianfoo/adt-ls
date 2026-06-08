import { describe, expect, it, vi } from 'vitest';
import { startMcpServerWithFallback } from '../src/channels/mcp-lifecycle.js';

describe('startMcpServerWithFallback', () => {
  it('returns the first port that binds', async () => {
    const start = vi.fn(async (port: number) => ({ port, token: 't' }));
    const r = await startMcpServerWithFallback(start, 2240);
    expect(r.port).toBe(2240);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('advances past busy ports (bind error) then succeeds', async () => {
    const start = vi.fn(async (port: number) => {
      if (port < 2242) throw new Error('failed to bind: address already in use');
      return { port, token: 't' };
    });
    const r = await startMcpServerWithFallback(start, 2240, 5);
    expect(r.port).toBe(2242);
    expect(start).toHaveBeenCalledTimes(3);
  });

  it('rethrows a non-bind error immediately', async () => {
    const start = vi.fn(async () => {
      throw new Error('boom');
    });
    await expect(startMcpServerWithFallback(start, 2240, 5)).rejects.toThrow('boom');
    expect(start).toHaveBeenCalledTimes(1);
  });
});
