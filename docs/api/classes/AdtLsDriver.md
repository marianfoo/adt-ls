# Class: AdtLsDriver

Defined in: [driver.ts:140](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L140)

Request + notification channel. LSP document features (didOpen → query →
didClose) need fire-and-forget notifications, so the navigation layer depends
on this fuller surface.

## Implements

- [`LspClient`](../interfaces/LspClient.md)

## Constructors

### Constructor

> **new AdtLsDriver**(`binPath`, `opts?`): `AdtLsDriver`

Defined in: [driver.ts:155](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L155)

#### Parameters

##### binPath

`string`

##### opts?

[`AdtLsDriverOptions`](../interfaces/AdtLsDriverOptions.md) = `{}`

#### Returns

`AdtLsDriver`

## Properties

### initializeResult?

> `optional` **initializeResult?**: [`AdtLsInitializeResult`](../interfaces/AdtLsInitializeResult.md)

Defined in: [driver.ts:153](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L153)

## Methods

### setRequestHandler()

> **setRequestHandler**(`method`, `handler`): `void`

Defined in: [driver.ts:169](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L169)

Register/replace a server→client request handler (before or after start).

#### Parameters

##### method

`string`

##### handler

[`ServerRequestHandler`](../type-aliases/ServerRequestHandler.md)

#### Returns

`void`

***

### start()

> **start**(`timeoutMs?`): `Promise`\<[`AdtLsInitializeResult`](../interfaces/AdtLsInitializeResult.md)\>

Defined in: [driver.ts:173](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L173)

#### Parameters

##### timeoutMs?

`number` = `60_000`

#### Returns

`Promise`\<[`AdtLsInitializeResult`](../interfaces/AdtLsInitializeResult.md)\>

***

### sendRequest()

> **sendRequest**\<`T`\>(`method`, `params?`): `Promise`\<`T`\>

Defined in: [driver.ts:271](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L271)

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

#### Implementation of

[`LspClient`](../interfaces/LspClient.md).[`sendRequest`](../interfaces/LspClient.md#sendrequest)

***

### sendNotification()

> **sendNotification**(`method`, `params?`): `Promise`\<`void`\>

Defined in: [driver.ts:276](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L276)

#### Parameters

##### method

`string`

##### params?

`unknown`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`LspClient`](../interfaces/LspClient.md).[`sendNotification`](../interfaces/LspClient.md#sendnotification)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [driver.ts:281](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L281)

#### Returns

`Promise`\<`void`\>
