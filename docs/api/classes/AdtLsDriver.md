# Class: AdtLsDriver

Defined in: [driver.ts:138](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L138)

Request + notification channel. LSP document features (didOpen → query →
didClose) need fire-and-forget notifications, so the navigation layer depends
on this fuller surface.

## Implements

- [`LspClient`](../interfaces/LspClient.md)

## Constructors

### Constructor

> **new AdtLsDriver**(`binPath`, `opts?`): `AdtLsDriver`

Defined in: [driver.ts:150](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L150)

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

Defined in: [driver.ts:148](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L148)

## Methods

### setRequestHandler()

> **setRequestHandler**(`method`, `handler`): `void`

Defined in: [driver.ts:163](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L163)

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

Defined in: [driver.ts:167](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L167)

#### Parameters

##### timeoutMs?

`number` = `60_000`

#### Returns

`Promise`\<[`AdtLsInitializeResult`](../interfaces/AdtLsInitializeResult.md)\>

***

### sendRequest()

> **sendRequest**\<`T`\>(`method`, `params?`): `Promise`\<`T`\>

Defined in: [driver.ts:244](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L244)

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

Defined in: [driver.ts:249](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L249)

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

Defined in: [driver.ts:254](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L254)

#### Returns

`Promise`\<`void`\>
