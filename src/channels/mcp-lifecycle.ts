/**
 * Thin wrappers over adt-ls's custom MCP-lifecycle LSP requests. These boot/stop
 * adt-ls's own Streamable-HTTP MCP server and bind it to a destination — without VS
 * Code. Verified live: startMCPServer accepts a caller-supplied port+token and returns
 * the effective values. (ADR-0002.)
 */
import type { LspRequester } from '../driver.js';

export interface StartMcpServerResult {
  port: number;
  token: string;
  version?: string;
}

export function startMcpServer(
  driver: LspRequester,
  opts: { port: number; token: string },
): Promise<StartMcpServerResult> {
  // Since 1.1.2, omitting this mode silently hides create/activate/test/generator tools.
  // VFS is the mode used by SAP's VS Code client (ABAP virtual file-system URIs).
  return driver.sendRequest<StartMcpServerResult>('adtLs/mcp/startMCPServer', { ...opts, fileSystemMode: 'VFS' });
}

/**
 * Start adt-ls's MCP server, advancing to the next port when the requested one is bound
 * — concurrent instances / leftover binds / parallel tests all contend for the default
 * port. Tries `attempts` consecutive ports; only a bind failure is retried (any other
 * error rethrows immediately). `start` is injectable for tests. Returns the EFFECTIVE result.
 */
export async function startMcpServerWithFallback(
  start: (port: number) => Promise<StartMcpServerResult>,
  startPort: number,
  attempts = 20,
  onRetry: (busyPort: number) => void = () => {},
): Promise<StartMcpServerResult> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const port = startPort + i;
    try {
      return await start(port);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/failed to bind|address already in use|eaddrinuse|must be between/i.test(msg)) throw e;
      onRetry(port);
    }
  }
  throw lastErr;
}

export function stopMcpServer(driver: LspRequester): Promise<unknown> {
  return driver.sendRequest('adtLs/mcp/stopMCPServer');
}

export function setMcpDestination(driver: LspRequester, destinationId: string): Promise<unknown> {
  return driver.sendRequest('adtLs/mcp/setDestination', { destinationId });
}
