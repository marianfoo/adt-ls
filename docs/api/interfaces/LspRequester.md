# Interface: LspRequester

Defined in: [driver.ts:53](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L53)

The LSP request channel alone. Consumers that only send requests (repository
queries, the authoring lifecycle) depend on this minimal surface, so a
session-retry wrapper — or a test fake — can stand in for the full driver.

## Extended by

- [`LspClient`](LspClient.md)

## Methods

### sendRequest()

> **sendRequest**\<`T`\>(`method`, `params?`): `Promise`\<`T`\>

Defined in: [driver.ts:54](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L54)

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### method

`string`

##### params?

`unknown`

#### Returns

`Promise`\<`T`\>
