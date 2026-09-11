# Interface: LogonHandlerRegistrar

Defined in: [auth/strategy.ts:31](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L31)

Anything that can register a server→client request handler (e.g. AdtLsDriver).

## Methods

### setRequestHandler()

> **setRequestHandler**(`method`, `handler`): `void`

Defined in: [auth/strategy.ts:32](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L32)

#### Parameters

##### method

`string`

##### handler

[`ServerRequestHandler`](../type-aliases/ServerRequestHandler.md)

#### Returns

`void`
