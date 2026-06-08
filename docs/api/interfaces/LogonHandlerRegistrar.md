# Interface: LogonHandlerRegistrar

Defined in: [auth/strategy.ts:28](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L28)

Anything that can register a server→client request handler (e.g. AdtLsDriver).

## Methods

### setRequestHandler()

> **setRequestHandler**(`method`, `handler`): `void`

Defined in: [auth/strategy.ts:29](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L29)

#### Parameters

##### method

`string`

##### handler

[`ServerRequestHandler`](../type-aliases/ServerRequestHandler.md)

#### Returns

`void`
