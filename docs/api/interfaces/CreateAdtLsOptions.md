# Interface: CreateAdtLsOptions

Defined in: [client.ts:74](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L74)

## Properties

### adtLs?

> `optional` **adtLs?**: `object`

Defined in: [client.ts:77](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L77)

Explicit adt-ls binary path; otherwise discovered (sapse.adt-vscode / vendor / env).
 `extraArgs` are prepended to the adt-ls launch (e.g. SNC/JCo JVM flags, `-consoleLog`).

#### path?

> `optional` **path?**: `string`

#### extraArgs?

> `optional` **extraArgs?**: `string`[]

***

### connection?

> `optional` **connection?**: [`ConnectionOptions`](ConnectionOptions.md)

Defined in: [client.ts:79](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L79)

Backend connection. Omit (with `auth`) for foundation mode (adt-ls up, no destination).

***

### auth?

> `optional` **auth?**: [`LogonStrategy`](LogonStrategy.md)

Defined in: [client.ts:81](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L81)

Logon strategy. Omit (with `connection`) for foundation mode.

***

### destinationId?

> `optional` **destinationId?**: `string`

Defined in: [client.ts:83](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L83)

adt-ls destination id (callers don't usually need to set this). Default 'ADTLS'.

***

### mcpPort?

> `optional` **mcpPort?**: `number`

Defined in: [client.ts:85](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L85)

Port for adt-ls's own MCP server. Default 2240 (with bind-fallback).

***

### keepAlive?

> `optional` **keepAlive?**: `boolean`

Defined in: [client.ts:87](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L87)

Enable the activity-gated keep-alive heartbeat. Default true.
