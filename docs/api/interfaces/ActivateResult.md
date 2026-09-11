# Interface: ActivateResult

Defined in: [api/lifecycle.ts:31](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L31)

## Properties

### success

> **success**: `boolean`

Defined in: [api/lifecycle.ts:32](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L32)

***

### diagnostics

> **diagnostics**: `unknown`[]

Defined in: [api/lifecycle.ts:33](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L33)

***

### checkExecuted?

> `optional` **checkExecuted?**: `boolean`

Defined in: [api/lifecycle.ts:35](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L35)

Whether the syntax/consistency check ran (native `activation/activate`).

***

### activationExecuted?

> `optional` **activationExecuted?**: `boolean`

Defined in: [api/lifecycle.ts:37](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L37)

Whether activation actually ran.

***

### generationExecuted?

> `optional` **generationExecuted?**: `boolean`

Defined in: [api/lifecycle.ts:39](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L39)

Whether downstream generation ran (e.g. RAP artifacts).

***

### forceSupported?

> `optional` **forceSupported?**: `boolean`

Defined in: [api/lifecycle.ts:41](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L41)

Whether the backend supports `forceActivation` for this object.

***

### refreshedUris?

> `optional` **refreshedUris?**: `string`[]

Defined in: [api/lifecycle.ts:43](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L43)

LS URIs the backend marked for refresh after activation.
