# Interface: CreateAdtLsOptions

Defined in: [client.ts:73](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L73)

## Properties

### adtLs?

> `optional` **adtLs?**: `object`

Defined in: [client.ts:76](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L76)

Explicit adt-ls binary path; otherwise discovered (sapse.adt-vscode / vendor / env).
 `extraArgs` are prepended to the adt-ls launch (e.g. SNC/JCo JVM flags, `-consoleLog`).

#### path?

> `optional` **path?**: `string`

#### extraArgs?

> `optional` **extraArgs?**: `string`[]

***

### connection?

> `optional` **connection?**: [`ConnectionOptions`](ConnectionOptions.md)

Defined in: [client.ts:78](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L78)

Backend connection. Omit (with `auth`) for foundation mode (adt-ls up, no destination).

***

### auth?

> `optional` **auth?**: [`LogonStrategy`](LogonStrategy.md)

Defined in: [client.ts:80](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L80)

Logon strategy. Omit (with `connection`) for foundation mode.

***

### destinationId?

> `optional` **destinationId?**: `string`

Defined in: [client.ts:82](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L82)

adt-ls destination id (callers don't usually need to set this). Default 'ADTLS'.

***

### mcpPort?

> `optional` **mcpPort?**: `number`

Defined in: [client.ts:84](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L84)

Port for adt-ls's own MCP server. Default 2240 (with bind-fallback).

***

### keepAlive?

> `optional` **keepAlive?**: `boolean`

Defined in: [client.ts:86](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L86)

Enable the activity-gated keep-alive heartbeat. Default true.
