# Interface: CreateAdtLsOptions

Defined in: [client.ts:73](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L73)

## Properties

### adtLs?

> `optional` **adtLs?**: `object`

Defined in: [client.ts:75](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L75)

Explicit adt-ls binary path; otherwise discovered (sapse.adt-vscode / vendor / env).

#### path?

> `optional` **path?**: `string`

***

### connection?

> `optional` **connection?**: [`ConnectionOptions`](ConnectionOptions.md)

Defined in: [client.ts:77](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L77)

Backend connection. Omit (with `auth`) for foundation mode (adt-ls up, no destination).

***

### auth?

> `optional` **auth?**: [`LogonStrategy`](LogonStrategy.md)

Defined in: [client.ts:79](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L79)

Logon strategy. Omit (with `connection`) for foundation mode.

***

### destinationId?

> `optional` **destinationId?**: `string`

Defined in: [client.ts:81](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L81)

adt-ls destination id (callers don't usually need to set this). Default 'ADTLS'.

***

### mcpPort?

> `optional` **mcpPort?**: `number`

Defined in: [client.ts:83](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L83)

Port for adt-ls's own MCP server. Default 2240 (with bind-fallback).

***

### keepAlive?

> `optional` **keepAlive?**: `boolean`

Defined in: [client.ts:85](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L85)

Enable the activity-gated keep-alive heartbeat. Default true.
