import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { AdtLsMcpClient } from '../src/channels/mcp-federation.js';

type Request = { id?: number; method: string; params?: Record<string, unknown> };
type Handler = (body: Request, res: http.ServerResponse) => void;
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});

async function serve(
  handler: Handler,
  opts: { session?: boolean; protocol?: string; timeout?: number; initializedStatus?: number } = {},
) {
  const requests: Array<{ body: Request; headers: http.IncomingHttpHeaders; method?: string }> = [];
  let sessions = 0;
  const json = (res: http.ServerResponse, id: number | undefined, result: unknown) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id, result }));
  };
  const server = http.createServer(async (req, res) => {
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = text ? (JSON.parse(text) as Request) : { method: 'DELETE' };
    requests.push({ body, headers: req.headers, method: req.method });
    if (req.method === 'DELETE') {
      res.writeHead(204).end();
      return;
    }
    if (body.method === 'initialize') {
      sessions++;
      if (opts.session !== false) res.setHeader('Mcp-Session-Id', `session-${sessions}`);
      json(res, body.id, {
        protocolVersion: opts.protocol ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'fake', version: '1' },
      });
    } else if (body.method === 'notifications/initialized') res.writeHead(opts.initializedStatus ?? 202).end();
    else handler(body, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanup.push(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  );
  const client = new AdtLsMcpClient(
    `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`,
    'secret',
    undefined,
    opts.timeout ?? 2_000,
  );
  cleanup.push(() => client.close());
  return { client, requests, json };
}

describe('MCP Streamable HTTP integration', () => {
  it('negotiates optional sessions and protocol headers, correlates concurrent IDs, and preserves tool errors', async () => {
    const { client, requests, json } = await serve(
      (body, res) => {
        json(res, body.id, { content: [{ type: 'text', text: String(body.params?.name) }], isError: true });
      },
      { session: false, protocol: '2025-03-26' },
    );
    const results = await Promise.all([client.callTool('one'), client.callTool('two')]);
    expect(results).toEqual([
      { content: [{ type: 'text', text: 'one' }], isError: true },
      { content: [{ type: 'text', text: 'two' }], isError: true },
    ]);
    expect(requests.filter((r) => r.body.method === 'initialize')).toHaveLength(1);
    expect(requests.filter((r) => r.body.id !== undefined).map((r) => r.body.id)).toEqual([1, 2, 3]);
    for (const request of requests.slice(1)) {
      expect(request.headers['mcp-protocol-version']).toBe('2025-03-26');
      expect(request.headers['mcp-session-id']).toBeUndefined();
      expect(request.headers.authorization).toBe('Bearer secret');
    }
  });

  it('reads split multiline SSE events after notifications and stops without waiting for EOF', async () => {
    const { client } = await serve((body, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write(': heartbeat\r\ndata: {"jsonrpc":"2.0","method":"notifications/tools/list_changed"}\r\n\r\n');
      res.write(`event: message\r\ndata:{"jsonrpc":"2.0", "id":${body.id},\r`);
      setImmediate(() => {
        res.write(
          '\ndata: "result":{"tools":[{"name":"café","annotations":{"readOnlyHint":true},"outputSchema":{"type":"object"}}]}}\r\n\r',
        );
        setImmediate(() => res.write('\n'));
      });
      // Keep SSE open deliberately; a client using response.text() would time out.
    });
    expect(await client.listTools()).toEqual([
      { name: 'café', annotations: { readOnlyHint: true }, outputSchema: { type: 'object' } },
    ]);
  });

  it('fetches all pages and preserves the opaque cursor and schema', async () => {
    const { client, requests, json } = await serve((body, res) => {
      json(
        res,
        body.id,
        body.params?.cursor === undefined
          ? { tools: [{ name: 'first', inputSchema: { type: 'object' } }], nextCursor: 'opaque/+=' }
          : { tools: [{ name: 'second' }] },
      );
    });
    expect((await client.listTools()).map((t) => t.name)).toEqual(['first', 'second']);
    const pages = requests.filter((r) => r.body.method === 'tools/list');
    expect(pages[1].body.params).toEqual({ cursor: 'opaque/+=' });
    expect(pages[1].headers['mcp-session-id']).toBe('session-1');
    await client.close();
    const closed = requests.at(-1);
    expect(closed?.method).toBe('DELETE');
    expect(closed?.headers['mcp-protocol-version']).toBe('2025-06-18');
  });

  it('rejects looping pagination instead of hanging', async () => {
    const { client, json } = await serve((body, res) => json(res, body.id, { tools: [], nextCursor: 'same' }));
    await expect(client.listTools()).rejects.toThrow(/repeated pagination cursor/);
  });

  it.each([401, 500])('surfaces HTTP %s instead of a successful empty tool result', async (status) => {
    const { client } = await serve((_body, res) => res.writeHead(status).end('private server details'));
    await expect(client.callTool('write')).rejects.toThrow(`HTTP ${status}`);
    await expect(client.listTools()).rejects.toThrow(`HTTP ${status}`);
  });

  it('surfaces RPC list errors and missing tools instead of an empty list', async () => {
    let fail = true;
    const { client, json } = await serve((body, res) => {
      if (!fail) return json(res, body.id, {});
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } }));
    });
    await expect(client.listTools()).rejects.toThrow(/-32601.*Method not found/);
    fail = false;
    await expect(client.listTools()).rejects.toThrow(/missing or invalid tools/);
  });

  it('rejects mismatched JSON responses and streams ending before a result', async () => {
    let sse = false;
    const { client, json } = await serve((body, res) => {
      if (!sse) return json(res, (body.id ?? 0) + 1, { tools: [] });
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.end('data: {"jsonrpc":"2.0","method":"notifications/tools/list_changed"}\n\n');
    });
    await expect(client.listTools()).rejects.toThrow(/mismatched/);
    sse = true;
    await expect(client.listTools()).rejects.toThrow(/without a matching/);
  });

  it('renegotiates an expired session without replaying a mutation', async () => {
    let expire = true;
    const { client, requests, json } = await serve((body, res) => {
      if (expire) {
        expire = false;
        res.writeHead(404).end();
      } else json(res, body.id, { content: [] });
    });
    await expect(client.callTool('create')).rejects.toThrow(/session expired.*not retried/);
    expect(requests.filter((r) => r.body.method === 'tools/call')).toHaveLength(1);
    expect(requests.filter((r) => r.body.method === 'initialize')).toHaveLength(2);
    await client.callTool('read');
    expect(requests.at(-1)?.headers['mcp-session-id']).toBe('session-2');
  });

  it('rejects an unsupported negotiated protocol and closes the allocated session', async () => {
    const { client, requests } = await serve(() => {}, { protocol: '2099-01-01' });
    await expect(client.connect()).rejects.toThrow(/Unsupported MCP protocol/);
    expect(requests.at(-1)?.method).toBe('DELETE');
    expect(requests.some((r) => r.body.method === 'notifications/initialized')).toBe(false);
  });

  it('fails a rejected initialized notification without waiting on its own connection promise', async () => {
    const { client, requests } = await serve(() => {}, { initializedStatus: 404 });
    await expect(client.connect()).rejects.toThrow(/notifications\/initialized failed: HTTP 404/);
    expect(requests.filter((r) => r.body.method === 'initialize')).toHaveLength(1);
    expect(requests.at(-1)?.method).toBe('DELETE');
  });

  it('bounds hung tool requests without retrying them', async () => {
    const { client, requests } = await serve(() => {}, { timeout: 100 });
    await expect(client.callTool('write')).rejects.toThrow(/timeout|aborted/i);
    expect(requests.filter((r) => r.body.method === 'tools/call')).toHaveLength(1);
  });
});
