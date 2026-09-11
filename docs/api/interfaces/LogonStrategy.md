# Interface: LogonStrategy

Defined in: [auth/strategy.ts:40](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L40)

## Properties

### kind

> `readonly` **kind**: `"basic"` \| `"bearer"` \| `"interactive"` \| `"custom"` \| `"clientCert"`

Defined in: [auth/strategy.ts:41](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L41)

***

### user?

> `readonly` `optional` **user?**: `string`

Defined in: [auth/strategy.ts:43](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L43)

Optional user to record on the adt-ls destination (createDestination).

***

### clientCert?

> `readonly` `optional` **clientCert?**: `object`

Defined in: [auth/strategy.ts:48](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L48)

PEM client cert + key for the upstream TLS hop. Set only by `clientCert()`; the
 library's reverse proxy presents it to the backend on every request, so the TLS
 connection itself (mutual TLS → e.g. AS ABAP `verify_client` + CERTRULE) authenticates
 the user. Requires `connection.selfSigned` (the proxy does the mutual-TLS hop).

#### cert

> **cert**: `string` \| `Buffer`\<`ArrayBufferLike`\>

#### key

> **key**: `string` \| `Buffer`\<`ArrayBufferLike`\>

## Methods

### register()

> **register**(`driver`, `ctx`): `void`

Defined in: [auth/strategy.ts:50](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L50)

Register the server→client logon handler(s) before `ensureLoggedOn`.

#### Parameters

##### driver

[`LogonHandlerRegistrar`](LogonHandlerRegistrar.md)

##### ctx

[`LogonContext`](LogonContext.md)

#### Returns

`void`
