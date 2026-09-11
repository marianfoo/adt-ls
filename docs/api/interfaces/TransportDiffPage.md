# Interface: TransportDiffPage

Defined in: [api/lifecycle.ts:70](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L70)

A single transport-diff page, as returned by the current SAP MCP tool.

## Properties

### batchInfo?

> `optional` **batchInfo?**: `object`

Defined in: [api/lifecycle.ts:71](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L71)

#### currentBatchSize?

> `optional` **currentBatchSize?**: `number`

#### totalObjects?

> `optional` **totalObjects?**: `number`

#### processedCount?

> `optional` **processedCount?**: `number`

#### remainingCount?

> `optional` **remainingCount?**: `number`

#### batchHasChanges?

> `optional` **batchHasChanges?**: `boolean`

#### status?

> `optional` **status?**: `"processing"` \| `"completed"`

***

### message?

> `optional` **message?**: `string`

Defined in: [api/lifecycle.ts:79](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L79)

***

### nextCursor?

> `optional` **nextCursor?**: `string`

Defined in: [api/lifecycle.ts:80](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L80)

***

### diffResult?

> `optional` **diffResult?**: `string`

Defined in: [api/lifecycle.ts:81](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L81)
