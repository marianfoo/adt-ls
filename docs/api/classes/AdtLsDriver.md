# Class: AdtLsDriver

Defined in: [driver.ts:117](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L117)

Request + notification channel. LSP document features (didOpen → query →
didClose) need fire-and-forget notifications, so the navigation layer depends
on this fuller surface.

## Implements

- [`LspClient`](../interfaces/LspClient.md)

## Constructors

### Constructor

> **new AdtLsDriver**(`binPath`, `opts?`): `AdtLsDriver`

Defined in: [driver.ts:128](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L128)

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

Defined in: [driver.ts:126](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L126)

## Methods

### setRequestHandler()

> **setRequestHandler**(`method`, `handler`): `void`

Defined in: [driver.ts:140](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L140)

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

Defined in: [driver.ts:144](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L144)

#### Parameters

##### timeoutMs?

`number` = `60_000`

#### Returns

`Promise`\<[`AdtLsInitializeResult`](../interfaces/AdtLsInitializeResult.md)\>

***

### sendRequest()

> **sendRequest**\<`T`\>(`method`, `params?`): `Promise`\<`T`\>

Defined in: [driver.ts:217](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L217)

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

Defined in: [driver.ts:222](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L222)

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

Defined in: [driver.ts:227](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L227)

#### Returns

`Promise`\<`void`\>
