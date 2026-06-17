# Interface: Logger

Defined in: [log.ts:6](https://github.com/arc-mcp/adt-ls/blob/main/src/log.ts#L6)

Minimal, injectable logger. A library should not spam stderr by default, so the
default sink is silent; consumers opt in via `setLogger` (e.g. `stderrLogger()`).
stdout is never written to — it stays clean for any stdio-based consumer.

## Methods

### debug()

> **debug**(`msg`): `void`

Defined in: [log.ts:7](https://github.com/arc-mcp/adt-ls/blob/main/src/log.ts#L7)

#### Parameters

##### msg

`string`

#### Returns

`void`

***

### info()

> **info**(`msg`): `void`

Defined in: [log.ts:8](https://github.com/arc-mcp/adt-ls/blob/main/src/log.ts#L8)

#### Parameters

##### msg

`string`

#### Returns

`void`

***

### warn()

> **warn**(`msg`): `void`

Defined in: [log.ts:9](https://github.com/arc-mcp/adt-ls/blob/main/src/log.ts#L9)

#### Parameters

##### msg

`string`

#### Returns

`void`

***

### error()

> **error**(`msg`): `void`

Defined in: [log.ts:10](https://github.com/arc-mcp/adt-ls/blob/main/src/log.ts#L10)

#### Parameters

##### msg

`string`

#### Returns

`void`
