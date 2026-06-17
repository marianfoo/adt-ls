# Interface: Locator

Defined in: [api/navigation.ts:15](https://github.com/arc-mcp/adt-ls/blob/main/src/api/navigation.ts#L15)

Where to point a position-based query: a declared symbol name, OR an explicit 1-based
line+character (editor convention; converted to LSP 0-based).

## Properties

### symbol?

> `optional` **symbol?**: `string`

Defined in: [api/navigation.ts:16](https://github.com/arc-mcp/adt-ls/blob/main/src/api/navigation.ts#L16)

***

### line?

> `optional` **line?**: `number`

Defined in: [api/navigation.ts:17](https://github.com/arc-mcp/adt-ls/blob/main/src/api/navigation.ts#L17)

***

### character?

> `optional` **character?**: `number`

Defined in: [api/navigation.ts:18](https://github.com/arc-mcp/adt-ls/blob/main/src/api/navigation.ts#L18)
