# adt-ls capability survey & coverage gaps

What the headless `adt-lsc` language server actually offers, what this library wraps, and
**what we haven't wrapped yet** — captured by **live introspection**, not from docs.

> Source: `adt-lsc` **1.0.0.202605281240** (from `sapse.adt-vscode`). Re-run the
> [introspection script](#reproduce) any time the bundled version changes.

The adt-ls surface has two halves:

1. **Standard LSP** — the `textDocument/*` providers advertised in the `initialize`
   result's `capabilities`. **Fully introspectable** (table below).
2. **Custom `adtLs/*` + the MCP tools** — repository, destinations, CTS, ABAP Unit, ATC,
   business services, file system, activation, `adtLs/mcp/*`. The **MCP tools** are
   introspectable via `tools/list`; the custom LSP methods are **not** (no reflection) —
   enumerating them fully needs decompiling the jar.

---

## 1. Standard LSP providers (live `capabilities`)

| Provider | Offered? | Wrapped? | Library method / note |
| --- | --- | --- | --- |
| `definitionProvider` | ✅ | ✅ | `navigation.goToDefinition` |
| `declarationProvider` | ✅ | ✅ | `navigation.goToDeclaration` |
| `referencesProvider` | ✅ | ✅ | `navigation.findReferences` |
| `hoverProvider` | ✅ | ✅ | `navigation.hover` |
| `documentSymbolProvider` | ✅ | ✅ | `navigation.documentSymbols` |
| `documentHighlightProvider` | ✅ | ✅ | `navigation.documentHighlight` |
| `typeHierarchyProvider` | ✅ | ✅ | `navigation.typeHierarchy` |
| `completionProvider` (`resolveProvider:true`) | ✅ | ⚠️ partial | `navigation.completion` — **does not call `completionItem/resolve`** for full detail/docs |
| `diagnosticProvider` | ✅ | ✅ | `navigation.checkSyntax` → `textDocument/diagnostic` |
| **`codeLensProvider`** | ✅ | ❌ **GAP** | `textDocument/codeLens` (+ `codeLens/resolve`) — **not wrapped at all** |
| **`semanticTokensProvider`** | ✅ | ❌ **GAP** | `textDocument/semanticTokens/full` is called **internally** to prime the token cache, but the tokens are **never returned** to callers |
| `textDocumentSync` | ✅ | ✅ (internal) | didOpen/didChange/didClose managed by the navigation layer |
| `documentFormattingProvider` | ❌ `false` | n/a | **Not offered** — no LSP pretty-printer headless |
| `documentRangeFormattingProvider` | ❌ `false` | n/a | Not offered |

**Not advertised at all** (so correctly absent from the library — adt-ls does not serve them
headless): `renameProvider`, `codeActionProvider` (quick-fixes / refactorings),
`signatureHelpProvider`, `foldingRangeProvider`, `inlayHintProvider`, `callHierarchyProvider`.

---

## 2. MCP tools (live `tools/list` — 14 tools)

| MCP tool | Wrapped? | Library |
| --- | --- | --- |
| `abap_creation-create_object` | ✅ | `lifecycle.create` |
| `abap_creation-run_validation` | ✅ | `lifecycle.validate` |
| `abap_generators-generate_objects` | ✅ | `lifecycle.generate` |
| `abap_activate_objects` | ✅ | `lifecycle.activate` |
| `abap_run_unit_tests` | ✅ | `lifecycle.runUnitTests` |
| `abap_transport-create` | ✅ | `transport.create` |
| `abap_transport-get` | ✅ | `transport.find` |
| `abap_business_services-fetch_services` | ✅ | `services.serviceBindingDetails` |
| `abap_business_services-fetch_service_information` | ✅ | `services.*` |
| **`abap_list_destinations`** | ❌ **GAP** | only via `raw.tool('abap_list_destinations')` |
| **`abap_creation-get_all_creatable_objects`** | ❌ **GAP** | only via `raw.tool(...)` |
| **`abap_creation-get_object_type_details`** | ❌ **GAP** | only via `raw.tool(...)` |
| **`abap_generators-list_generators`** | ❌ **GAP** | only via `raw.tool(...)` |
| **`abap_generators-get_schema`** | ❌ **GAP** | only via `raw.tool(...)` |

> Note: the library covers **more transport than the MCP exposes** — `transport.assign` /
> `list` / `getLockStatus` use **native `adtLs/cts/*` LSP** methods, not these two MCP tools.
> Likewise `repository.search`, file ops, `listInactive`, `getUsers`, ATC and coverage all use
> native `adtLs/*` methods that aren't in the MCP tool list.

---

## 3. Gaps & recommendations (prioritized)

**A — Typed wrappers for the 5 metadata MCP tools** *(easy, generic, additive)*
The library already calls the MCP; these just need typed methods instead of `raw.tool`:

| Suggested API | Backing tool |
| --- | --- |
| `repository.listDestinations()` | `abap_list_destinations` |
| `lifecycle.listCreatableObjects()` | `abap_creation-get_all_creatable_objects` |
| `lifecycle.getObjectTypeDetails(type)` | `abap_creation-get_object_type_details` |
| `lifecycle.listGenerators()` | `abap_generators-list_generators` |
| `lifecycle.getGeneratorSchema(id)` | `abap_generators-get_schema` |

(arc-1-lsp already exposes all five as MCP tools via `raw.tool` — they're proven, just not typed in the SDK.)

**B — Expose advertised LSP features the lib doesn't surface** *(low-cost — the navigation layer
already does the didOpen→query→didClose dance)*

| Suggested API | LSP method | Value |
| --- | --- | --- |
| `navigation.codeLens(ref)` | `textDocument/codeLens` (+ resolve) | inline "N references", run/test actions |
| `navigation.semanticTokens(ref)` | `textDocument/semanticTokens/full` | token classification for syntax highlighting (already fetched internally — just return it) |
| richer `navigation.completion` | `completionItem/resolve` | full signature/doc per completion item |

**C — Deeper research (needs decompilation, not live introspection)**
The full set of custom `adtLs/*` methods isn't reflectable. openADT keeps partial decompiled
research under a gitignored `tmp/sap-adt-mcp-decompiled/`. A focused decompile of
`com.sap.adt.ls` would reveal any `adtLs/*` methods we don't know about (e.g. pretty-printer,
where-used variants, object properties, debugging) beyond the ones already wrapped.

---

## 4. Confirmed **non-gaps** (don't build these)

adt-ls does **not** serve these headless, so the library correctly omits them:
**code formatting / pretty-print** (both formatting providers are `false`), **rename**,
**code actions / quick-fixes / refactorings**, **signature help**, **folding ranges**,
**inlay hints**, **call hierarchy**.

---

## Reproduce

```ts
// bun add file:<lib> @modelcontextprotocol/sdk  &&  bun run introspect.ts
import crypto from 'node:crypto';
import { AdtLsDriver, resolveAdtLsPath, startMcpServer } from '@marianfoo/adt-ls';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const driver = new AdtLsDriver(resolveAdtLsPath());
const init = await driver.start();
console.log(JSON.stringify(init.capabilities, null, 1)); // ← the provider list above

const token = crypto.randomBytes(16).toString('hex');
const { port } = await startMcpServer(driver, { port: 2251, token });
const client = new Client({ name: 'introspect', version: '0' }, { capabilities: {} });
await client.connect(new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/mcp`), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
}));
console.log((await client.listTools()).tools.map((t) => t.name)); // ← the 14 MCP tools
await client.close();
await driver.dispose();
```

No SAP backend is needed — capabilities come from `initialize` and the static MCP tools are
registered at `startMCPServer`. (Destination-scoped *dynamic* tools appear only after
`setMcpDestination` with a live logon — a connected re-run would surface those too.)
