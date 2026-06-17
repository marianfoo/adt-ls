# Function: bearer()

> **bearer**(`token`, `opts?`): [`LogonStrategy`](../interfaces/LogonStrategy.md)

Defined in: [auth/strategy.ts:61](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L61)

Bearer token — headless reentrance for BTP ABAP. `token` may be a value or an
 async provider resolved at logon time. The lib does NOT acquire OAuth tokens.

## Parameters

### token

`string` \| (() => `string` \| `Promise`\<`string`\>)

### opts?

#### user?

`string`

## Returns

[`LogonStrategy`](../interfaces/LogonStrategy.md)
