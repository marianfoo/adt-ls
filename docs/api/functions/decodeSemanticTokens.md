# Function: decodeSemanticTokens()

> **decodeSemanticTokens**(`data`, `legend`): [`DecodedToken`](../interfaces/DecodedToken.md)[]

Defined in: [api/navigation.ts:84](https://github.com/arc-mcp/adt-ls/blob/main/src/api/navigation.ts#L84)

Decode LSP delta-encoded semantic tokens (flat int array of 5-tuples
`[ΔlineFromPrev, ΔstartChar, length, tokenTypeIdx, modifierBitset]`) into absolute,
name-resolved tokens (pure). Positions are 0-based, as LSP emits them.

## Parameters

### data

`number`[] \| `undefined`

### legend

[`SemanticTokensLegend`](../interfaces/SemanticTokensLegend.md)

## Returns

[`DecodedToken`](../interfaces/DecodedToken.md)[]
