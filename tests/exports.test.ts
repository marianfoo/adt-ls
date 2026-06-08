import { describe, expect, it, vi } from 'vitest';
import * as api from '../src/index.js';

/** Guards the public API surface added in 0.2.0 for MCP-proxy consumers (e.g. openADT). */
describe('public API exports (0.2.0)', () => {
  it('exposes the adt-ls MCP lifecycle helpers (G3) + composeSpawnArgs (G4)', () => {
    expect(typeof api.startMcpServer).toBe('function');
    expect(typeof api.stopMcpServer).toBe('function');
    expect(typeof api.setMcpDestination).toBe('function');
    expect(typeof api.startMcpServerWithFallback).toBe('function');
    expect(typeof api.composeSpawnArgs).toBe('function');
  });

  it('startMcpServer sends adtLs/mcp/startMCPServer with the caller port+token', async () => {
    const sendRequest = vi.fn().mockResolvedValue({ port: 2240, token: 'tok' });
    const res = await api.startMcpServer({ sendRequest }, { port: 2240, token: 'tok' });
    expect(sendRequest).toHaveBeenCalledWith('adtLs/mcp/startMCPServer', { port: 2240, token: 'tok' });
    expect(res).toEqual({ port: 2240, token: 'tok' });
  });

  it('setMcpDestination sends adtLs/mcp/setDestination with {destinationId}', async () => {
    const sendRequest = vi.fn().mockResolvedValue('ok');
    await api.setMcpDestination({ sendRequest }, 'DEV');
    expect(sendRequest).toHaveBeenCalledWith('adtLs/mcp/setDestination', { destinationId: 'DEV' });
  });
});
