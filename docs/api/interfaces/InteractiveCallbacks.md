# Interface: InteractiveCallbacks

Defined in: [auth/strategy.ts:115](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L115)

## Properties

### user?

> `optional` **user?**: `string`

Defined in: [auth/strategy.ts:121](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L121)

Record the destination user.

## Methods

### openUrl()

> **openUrl**(`url`): `void` \| `Promise`\<`void`\>

Defined in: [auth/strategy.ts:117](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L117)

Open the SSO URL (browser). The user completes sign-in there.

#### Parameters

##### url

`string`

#### Returns

`void` \| `Promise`\<`void`\>

***

### promptField()?

> `optional` **promptField**(`field`): `Promise`\<`string` \| `undefined`\>

Defined in: [auth/strategy.ts:119](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L119)

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
