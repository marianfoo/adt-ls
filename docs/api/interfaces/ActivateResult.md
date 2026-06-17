# Interface: ActivateResult

Defined in: [api/lifecycle.ts:30](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L30)

## Properties

### success

> **success**: `boolean`

Defined in: [api/lifecycle.ts:31](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L31)

***

### diagnostics

> **diagnostics**: `unknown`[]

Defined in: [api/lifecycle.ts:32](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L32)

***

### checkExecuted?

> `optional` **checkExecuted?**: `boolean`

Defined in: [api/lifecycle.ts:34](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L34)

Whether the syntax/consistency check ran (native `activation/activate`).

***

### activationExecuted?

> `optional` **activationExecuted?**: `boolean`

Defined in: [api/lifecycle.ts:36](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L36)

Whether activation actually ran.

***

### generationExecuted?

> `optional` **generationExecuted?**: `boolean`

Defined in: [api/lifecycle.ts:38](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L38)

Whether downstream generation ran (e.g. RAP artifacts).

***

### forceSupported?

> `optional` **forceSupported?**: `boolean`

Defined in: [api/lifecycle.ts:40](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L40)

Whether the backend supports `forceActivation` for this object.

***

### refreshedUris?

> `optional` **refreshedUris?**: `string`[]

Defined in: [api/lifecycle.ts:42](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L42)

LS URIs the backend marked for refresh after activation.
