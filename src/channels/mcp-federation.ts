/** Streamable-HTTP client for adt-ls's own MCP endpoint (ADR-0002). */
import { logger } from '../log.js';

/** The runtime tool contract. Preserve metadata added by SAP/MCP without projecting it away. */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: Record<string, unknown>;
  [key: string]: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

const PROTOCOL_VERSION = '2025-06-18';
const SUPPORTED_PROTOCOLS = [PROTOCOL_VERSION, '2025-03-26'];

function responseFor(value: unknown, id: number): JsonRpcResponse | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const r = value as JsonRpcResponse;
  if (r.jsonrpc !== '2.0' || r.id !== id || (!('result' in r) && !('error' in r))) return undefined;
  return r;
}

/** Consume complete SSE events until OUR response arrives; notifications may precede it. */
async function readResponse(res: Response, id: number): Promise<JsonRpcResponse> {
  const type = res.headers.get('content-type')?.split(';')[0].trim();
  if (type === 'application/json') {
    const response = responseFor(await res.json(), id);
    if (!response) throw new Error('Invalid or mismatched MCP JSON-RPC response');
    return response;
  }
  if (type !== 'text/event-stream' || !res.body) {
    await res.body?.cancel();
    throw new Error(`Unsupported MCP response Content-Type: ${type ?? '<missing>'}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let data: string[] = [];
  const line = (value: string): JsonRpcResponse | undefined => {
    if (value === '') {
      if (!data.length) return undefined;
      const payload = data.join('\n');
      data = [];
      return responseFor(JSON.parse(payload), id);
    }
    if (value.startsWith('data:')) data.push(value.slice(5).replace(/^ /, ''));
    return undefined;
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      // Handle LF, CRLF and CR, including a CRLF split across network chunks.
      for (;;) {
        const index = pending.search(/[\r\n]/);
        if (index < 0 || (!done && pending[index] === '\r' && index === pending.length - 1)) break;
        const current = pending.slice(0, index);
        const skip = pending[index] === '\r' && pending[index + 1] === '\n' ? 2 : 1;
        pending = pending.slice(index + skip);
        const response = line(current);
        if (response) return response;
      }
      if (done) throw new Error('MCP stream ended without a matching JSON-RPC response');
    }
  } finally {
    // Do not wait for an SSE connection to close after the response has arrived.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export class AdtLsMcpClient {
  private sessionId?: string;
  private protocolVersion?: string;
  private nextId = 1;
  private connected = false;
  private connecting?: Promise<void>;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly clientInfo: { name: string; version: string } = { name: '@arc-mcp/adt-ls', version: '0.0.0' },
    private readonly timeoutMs = 120_000,
  ) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(this.sessionId ? { 'Mcp-Session-Id': this.sessionId } : {}),
      ...(this.protocolVersion ? { 'MCP-Protocol-Version': this.protocolVersion } : {}),
    };
  }

  private async rpc(method: string, params?: unknown, notification = false): Promise<Record<string, unknown>> {
    const id = notification ? undefined : this.nextId++;
    const sessionId = this.sessionId;
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        jsonrpc: '2.0',
        ...(id === undefined ? {} : { id }),
        method,
        ...(params ? { params } : {}),
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      await res.body?.cancel();
      if (res.status === 404 && sessionId && method !== 'initialize' && !notification) {
        // An expired MCP session is distinct from a SAP logon. Re-establish the MCP
        // session, but NEVER replay a potentially mutating tool automatically.
        if (this.sessionId === sessionId) {
          this.connected = false;
          this.sessionId = undefined;
          this.protocolVersion = undefined;
        }
        await this.connect();
        throw new Error(`adt-ls MCP ${method}: session expired (HTTP 404); reconnected, request was not retried`);
      }
      throw new Error(`adt-ls MCP ${method} failed: HTTP ${res.status}`);
    }
    if (notification) {
      await res.body?.cancel();
      if (res.status !== 202) throw new Error(`adt-ls MCP ${method}: expected HTTP 202, got ${res.status}`);
      return {};
    }
    const response = await readResponse(res, id as number);
    if (response.error) {
      throw new Error(`adt-ls MCP ${method} error (${response.error.code}): ${response.error.message}`);
    }
    if (!response.result || typeof response.result !== 'object' || Array.isArray(response.result)) {
      throw new Error(`adt-ls MCP ${method}: missing or invalid result`);
    }
    if (method === 'initialize') this.sessionId = res.headers.get('mcp-session-id') ?? undefined;
    return response.result;
  }

  async connect(): Promise<void> {
    if (this.connecting) return this.connecting;
    if (this.connected) return;
    this.connecting = (async () => {
      try {
        const init = await this.rpc('initialize', {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: this.clientInfo,
        });
        if (typeof init.protocolVersion !== 'string' || !SUPPORTED_PROTOCOLS.includes(init.protocolVersion)) {
          throw new Error(`Unsupported MCP protocol version: ${String(init.protocolVersion)}`);
        }
        this.protocolVersion = init.protocolVersion;
        await this.rpc('notifications/initialized', undefined, true);
        this.connected = true;
        logger.debug('federation: connected to adt-ls MCP');
      } catch (error) {
        await this.close().catch(() => {});
        throw error;
      }
    })();
    try {
      await this.connecting;
    } finally {
      this.connecting = undefined;
    }
  }

  async listTools(): Promise<McpTool[]> {
    await this.connect();
    const tools: McpTool[] = [];
    const cursors = new Set<string>();
    let cursor: string | undefined;
    do {
      const result = await this.rpc('tools/list', cursor === undefined ? undefined : { cursor });
      if (!Array.isArray(result.tools) || result.tools.some((t) => !t || typeof t.name !== 'string')) {
        throw new Error('adt-ls MCP tools/list: missing or invalid tools');
      }
      tools.push(...(result.tools as McpTool[]));
      if (result.nextCursor !== undefined && typeof result.nextCursor !== 'string') {
        throw new Error('adt-ls MCP tools/list: invalid nextCursor');
      }
      cursor = result.nextCursor as string | undefined;
      if (cursor !== undefined) {
        if (cursors.has(cursor)) throw new Error('adt-ls MCP tools/list: repeated pagination cursor');
        cursors.add(cursor);
      }
    } while (cursor !== undefined);
    return tools;
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    await this.connect();
    // Tool-level isError stays in the result for the SAP-session retry layer.
    return this.rpc('tools/call', { name, arguments: args });
  }

  async close(): Promise<void> {
    const headers = this.headers();
    const hadSession = Boolean(this.sessionId);
    this.connected = false;
    this.sessionId = undefined;
    this.protocolVersion = undefined;
    if (hadSession) {
      const res = await fetch(this.baseUrl, {
        method: 'DELETE',
        headers,
        signal: AbortSignal.timeout(Math.min(this.timeoutMs, 5_000)),
      });
      await res.body?.cancel();
      if (!res.ok && res.status !== 404 && res.status !== 405) {
        throw new Error(`adt-ls MCP close failed: HTTP ${res.status}`);
      }
    }
  }
}
