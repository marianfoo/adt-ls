# Function: startMcpServerWithFallback()

> **startMcpServerWithFallback**(`start`, `startPort`, `attempts?`, `onRetry?`): `Promise`\<[`StartMcpServerResult`](../interfaces/StartMcpServerResult.md)\>

Defined in: [channels/mcp-lifecycle.ts:27](https://github.com/arc-mcp/adt-ls/blob/main/src/channels/mcp-lifecycle.ts#L27)

Start adt-ls's MCP server, advancing to the next port when the requested one is bound
— concurrent instances / leftover binds / parallel tests all contend for the default
port. Tries `attempts` consecutive ports; only a bind failure is retried (any other
error rethrows immediately). `start` is injectable for tests. Returns the EFFECTIVE result.

## Parameters

### start

(`port`) => `Promise`\<[`StartMcpServerResult`](../interfaces/StartMcpServerResult.md)\>

### startPort

`number`

### attempts?

`number` = `20`

### onRetry?

(`busyPort`) => `void`

## Returns

`Promise`\<[`StartMcpServerResult`](../interfaces/StartMcpServerResult.md)\>
