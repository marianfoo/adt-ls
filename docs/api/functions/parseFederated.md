# Function: parseFederated()

> **parseFederated**(`res`): `object`

Defined in: [channels/federated.ts:22](https://github.com/arc-mcp/adt-ls/blob/main/src/channels/federated.ts#L22)

Unwrap a federated MCP result → `{ ok, data, text }`. `data` is the parsed full text
(preferred), else structuredContent, else the raw text. `ok` is `!isError`.

## Parameters

### res

`unknown`

## Returns

`object`

### ok

> **ok**: `boolean`

### data

> **data**: `unknown`

### text

> **text**: `string`
