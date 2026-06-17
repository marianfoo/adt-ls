/**
 * Minimal Streamable-HTTP MCP client to adt-ls's own `/mcp` endpoint. The library
 * federates adt-ls's tools through this client (the stable, public channel) — it is an
 * MCP *client*, never a server (ADR-0001/0002). Parses SSE-framed responses.
 */
import { logger } from '../log.js';

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface JsonRpcResult {
  result?: { tools?: McpTool[] } & Record<string, unknown>;
  error?: { code: number; message: string };
}

function parseSse(text: string): JsonRpcResult | null {
  for (const line of text.split('\n')) {
    const s = line.startsWith('data: ') ? line.slice(6) : line;
    if (s.trim().startsWith('{')) {
      try {
        return JSON.parse(s) as JsonRpcResult;
      } catch {
        /* not the JSON data line */
      }
    }
  }
  return null;
}

export class AdtLsMcpClient {
  private sessionId?: string;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly clientInfo: { name: string; version: string } = { name: '@arc-mcp/adt-ls', version: '0.0.0' },
  ) {}

  private async rpc(body: unknown): Promise<{ json: JsonRpcResult | null; sessionId?: string; status: number }> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    const res = await fetch(this.baseUrl, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await res.text();
    return { json: parseSse(text), sessionId: res.headers.get('mcp-session-id') ?? undefined, status: res.status };
  }

  async connect(): Promise<void> {
    const init = await this.rpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: this.clientInfo },
    });
    if (init.status !== 200 || !init.sessionId) {
      throw new Error(`adt-ls MCP initialize failed: HTTP ${init.status}`);
    }
    this.sessionId = init.sessionId;
    await this.rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
    logger.debug(`federation: connected to adt-ls MCP (session ${this.sessionId})`);
  }

  async listTools(): Promise<McpTool[]> {
    const r = await this.rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    return r.json?.result?.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const r = await this.rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } });
    if (r.json?.error) {
      throw new Error(`adt-ls tool ${name} error: ${r.json.error.message}`);
    }
    return r.json?.result;
  }
}
