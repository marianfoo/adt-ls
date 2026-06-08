import { describe, expect, it, vi } from 'vitest';
import { routeServerRequest } from '../src/driver.js';

describe('routeServerRequest', () => {
  it('dispatches to a registered handler', () => {
    const handler = vi.fn(() => true);
    const out = routeServerRequest(
      'adtLs/destinations/requestBrowserBasedLogon',
      { foo: 1 },
      { 'adtLs/destinations/requestBrowserBasedLogon': handler },
    );
    expect(out).toBe(true);
    expect(handler).toHaveBeenCalledWith({ foo: 1 });
  });

  it('returns an array of nulls for workspace/configuration (one per item)', () => {
    const out = routeServerRequest('workspace/configuration', { items: [{ section: 'a' }, { section: 'b' }] }, {});
    expect(out).toEqual([null, null]);
  });

  it('returns [] for workspace/configuration with no items', () => {
    expect(routeServerRequest('workspace/configuration', {}, {})).toEqual([]);
    expect(routeServerRequest('workspace/configuration', undefined, {})).toEqual([]);
  });

  it('returns null for unhandled requests (registerCapability, workDoneProgress/create, …)', () => {
    expect(routeServerRequest('client/registerCapability', { registrations: [] }, {})).toBeNull();
    expect(routeServerRequest('window/workDoneProgress/create', { token: 'x' }, {})).toBeNull();
  });

  it('a registered handler overrides the workspace/configuration default', () => {
    const out = routeServerRequest(
      'workspace/configuration',
      { items: [{}] },
      { 'workspace/configuration': () => ['custom'] },
    );
    expect(out).toEqual(['custom']);
  });
});
