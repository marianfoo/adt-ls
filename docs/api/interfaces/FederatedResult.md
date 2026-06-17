# Interface: FederatedResult

Defined in: [channels/federated.ts:12](https://github.com/arc-mcp/adt-ls/blob/main/src/channels/federated.ts#L12)

Helpers for unwrapping results of adt-ls's own (federated) MCP tools.

A federated tool returns a full MCP CallToolResult: `{ content:[{text}],
structuredContent?, isError? }`. The `content[0].text` is the tool's complete JSON
payload; `structuredContent` is an OUTPUT-SCHEMA-projected view that can be LOSSY
(e.g. `abap_business_services-fetch_services` omits `odataVersion` from
structuredContent but keeps it in the text). So we prefer the parsed full text and
fall back to structuredContent, then raw text — giving callers the complete payload
instead of the doubly-wrapped envelope.

## Properties

### content?

> `optional` **content?**: `object`[]

Defined in: [channels/federated.ts:13](https://github.com/arc-mcp/adt-ls/blob/main/src/channels/federated.ts#L13)

#### text?

> `optional` **text?**: `string`

***

### isError?

> `optional` **isError?**: `boolean`

Defined in: [channels/federated.ts:14](https://github.com/arc-mcp/adt-ls/blob/main/src/channels/federated.ts#L14)

***

### structuredContent?

> `optional` **structuredContent?**: `unknown`

Defined in: [channels/federated.ts:15](https://github.com/arc-mcp/adt-ls/blob/main/src/channels/federated.ts#L15)
