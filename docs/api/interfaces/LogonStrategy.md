# Interface: LogonStrategy

Defined in: [auth/strategy.ts:37](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L37)

## Properties

### kind

> `readonly` **kind**: `"basic"` \| `"bearer"` \| `"interactive"` \| `"custom"`

Defined in: [auth/strategy.ts:38](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L38)

***

### user?

> `readonly` `optional` **user?**: `string`

Defined in: [auth/strategy.ts:40](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L40)

Optional user to record on the adt-ls destination (createDestination).

## Methods

### register()

> **register**(`driver`, `ctx`): `void`

Defined in: [auth/strategy.ts:42](https://github.com/marianfoo/adt-ls/blob/main/src/auth/strategy.ts#L42)

Register the server→client logon handler(s) before `ensureLoggedOn`.

#### Parameters

##### driver

[`LogonHandlerRegistrar`](LogonHandlerRegistrar.md)

##### ctx

[`LogonContext`](LogonContext.md)

#### Returns

`void`
