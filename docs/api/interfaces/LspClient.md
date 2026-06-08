# Interface: LspClient

Defined in: [driver.ts:61](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L61)

Request + notification channel. LSP document features (didOpen → query →
didClose) need fire-and-forget notifications, so the navigation layer depends
on this fuller surface.

## Extends

- `LspRequester`

## Methods

### sendRequest()

> **sendRequest**\<`T`\>(`method`, `params?`): `Promise`\<`T`\>

Defined in: [driver.ts:53](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L53)

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

#### Inherited from

`LspRequester.sendRequest`

***

### sendNotification()

> **sendNotification**(`method`, `params?`): `Promise`\<`void`\>

Defined in: [driver.ts:62](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L62)

#### Parameters

##### method

`string`

##### params?

`unknown`

#### Returns

`Promise`\<`void`\>
