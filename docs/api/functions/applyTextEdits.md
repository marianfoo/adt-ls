# Function: applyTextEdits()

> **applyTextEdits**(`text`, `edits`): `string`

Defined in: [api/navigation.ts:44](https://github.com/arc-mcp/adt-ls/blob/main/src/api/navigation.ts#L44)

Apply LSP `TextEdit[]` to source text (pure). Edits are non-overlapping per the LSP
spec; we sort by start offset descending so applying one never shifts the offsets of
those not yet applied. Positions are UTF-16 code-unit based, matching JS string indices.

## Parameters

### text

`string`

### edits

[`TextEdit`](../interfaces/TextEdit.md)[]

## Returns

`string`
