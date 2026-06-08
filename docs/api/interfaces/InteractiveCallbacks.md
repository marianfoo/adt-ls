# Interface: InteractiveCallbacks

Defined in: [auth/strategy.ts:82](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L82)

## Properties

### user?

> `optional` **user?**: `string`

Defined in: [auth/strategy.ts:88](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L88)

Record the destination user.

## Methods

### openUrl()

> **openUrl**(`url`): `void` \| `Promise`\<`void`\>

Defined in: [auth/strategy.ts:84](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L84)

Open the SSO URL (browser). The user completes sign-in there.

#### Parameters

##### url

`string`

#### Returns

`void` \| `Promise`\<`void`\>

***

### promptField()?

> `optional` **promptField**(`field`): `Promise`\<`string` \| `undefined`\>

Defined in: [auth/strategy.ts:86](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L86)

Prompt for a logon field (e.g. password) when adt-ls asks. Optional.

#### Parameters

##### field

###### key

`string`

###### label

`string`

###### sensitive

`boolean`

#### Returns

`Promise`\<`string` \| `undefined`\>
