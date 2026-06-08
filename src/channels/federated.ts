/**
 * Helpers for unwrapping results of adt-ls's own (federated) MCP tools.
 *
 * A federated tool returns a full MCP CallToolResult: `{ content:[{text}],
 * structuredContent?, isError? }`. The `content[0].text` is the tool's complete JSON
 * payload; `structuredContent` is an OUTPUT-SCHEMA-projected view that can be LOSSY
 * (e.g. `abap_business_services-fetch_services` omits `odataVersion` from
 * structuredContent but keeps it in the text). So we prefer the parsed full text and
 * fall back to structuredContent, then raw text — giving callers the complete payload
 * instead of the doubly-wrapped envelope.
 */
export interface FederatedResult {
  content?: Array<{ text?: string }>;
  isError?: boolean;
  structuredContent?: unknown;
}

/**
 * Unwrap a federated MCP result → `{ ok, data, text }`. `data` is the parsed full text
 * (preferred), else structuredContent, else the raw text. `ok` is `!isError`.
 */
export function parseFederated(res: unknown): { ok: boolean; data: unknown; text: string } {
  const r = res as FederatedResult;
  const text = r?.content?.[0]?.text ?? '';
  const ok = !r?.isError;
  if (text) {
    try {
      return { ok, data: JSON.parse(text), text };
    } catch {
      /* text is not JSON (e.g. a plain-text report) — fall through */
    }
  }
  if (r?.structuredContent !== undefined) return { ok, data: r.structuredContent, text };
  return { ok, data: text, text };
}
