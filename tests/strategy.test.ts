import { describe, expect, it, vi } from 'vitest';
import { LSP_REQUEST_BROWSER_LOGON, LSP_REQUEST_LOGON_INPUT } from '../src/auth/reentrance.js';
import { basic, bearer, custom, interactive } from '../src/auth/strategy.js';
import type { ServerRequestHandler } from '../src/driver.js';

function fakeRegistrar() {
  const handlers: Record<string, ServerRequestHandler> = {};
  return {
    handlers,
    setRequestHandler(m: string, h: ServerRequestHandler) {
      handlers[m] = h;
    },
  };
}

describe('LogonStrategy', () => {
  it('basic registers a reentrance handler + exposes the user', () => {
    const s = basic('MARIAN', 'pw');
    expect(s.kind).toBe('basic');
    expect(s.user).toBe('MARIAN');
    const reg = fakeRegistrar();
    s.register(reg, {});
    const h = reg.handlers[LSP_REQUEST_BROWSER_LOGON];
    expect(h).toBeTypeOf('function');
    expect(h({ params: [] })).toBe(false); // no logonUrl
    expect(h({ params: [{ field: { key: 'logonUrl', value: 'http://127.0.0.1:1/reentranceticket' } }] })).toBe(true);
  });

  it('bearer resolves a token provider lazily + returns true fire-and-forget', () => {
    const getToken = vi.fn(async () => 'TOK');
    const s = bearer(getToken, { user: 'CB9980000001' });
    expect(s.kind).toBe('bearer');
    expect(s.user).toBe('CB9980000001');
    const reg = fakeRegistrar();
    s.register(reg, {});
    const h = reg.handlers[LSP_REQUEST_BROWSER_LOGON];
    expect(h({ params: [{ field: { key: 'logonUrl', value: 'http://127.0.0.1:1/reentranceticket' } }] })).toBe(true);
    expect(h({ params: [] })).toBe(false);
  });

  it('interactive opens the SSO url + can prompt fields', async () => {
    const opened: string[] = [];
    const s = interactive({ openUrl: (u) => void opened.push(u), promptField: async () => 'secret' });
    const reg = fakeRegistrar();
    s.register(reg, {});
    expect(
      reg.handlers[LSP_REQUEST_BROWSER_LOGON]({ params: [{ field: { key: 'logonUrl', value: 'https://idp/login' } }] }),
    ).toBe(true);
    expect(opened).toEqual(['https://idp/login']);
    const out = await reg.handlers[LSP_REQUEST_LOGON_INPUT]({
      id: 'A4H',
      params: [{ field: { key: 'password' }, sensitive: true, label: 'PW' }],
    });
    expect(out).toEqual({ id: 'A4H', fields: [{ key: 'password', value: 'secret' }] });
  });

  it('custom passes through a register function', () => {
    const reg = fakeRegistrar();
    const s = custom((d) => d.setRequestHandler('x', () => 1), { user: 'U' });
    expect(s.kind).toBe('custom');
    expect(s.user).toBe('U');
    s.register(reg, {});
    expect(reg.handlers.x({})).toBe(1);
  });
});
