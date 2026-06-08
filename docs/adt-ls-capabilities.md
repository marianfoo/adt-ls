# adt-ls capability survey & coverage gaps

What the headless `adt-lsc` language server **actually offers**, what `@marianfoo/adt-ls`
**wraps**, what's **worth wrapping next**, and what's a **hard boundary** (never in adt-ls).

> **Sources.** Live introspection of `adt-lsc` **1.0.0.202605281240** (`initialize`
> capabilities + MCP `tools/list`, see [Reproduce](#reproduce)), cross-checked against the full
> **decompiled** `com.sap.adt.ls` LSP4J interfaces. The canonical deep map lives in arc-1-lsp at
> `docs/research/adt-ls-capability-map.md` (**23 `adtLs/*` segments / ~92 methods**); the jar
> inventory under `sapse.adt-vscode-*/adt-ls` (96 `com.sap.adt.*` jars) independently confirms it.

adt-ls exposes its surface over **three channels**: the custom `adtLs/*` JSON-RPC segments
(the bulk), the standard `textDocument/*` LSP providers, and its own MCP tool server. The
library reaches all three.

---

## 1. The full `adtLs/*` control plane (23 segments)

Legend: ✅ wrapped · 🟡 reachable but **not wrapped** (candidate) · ⛔ present but not agent-usable.

| Segment | Methods | `@marianfoo/adt-ls` coverage |
| --- | --- | --- |
| `repository` | getUsers, getLsUri, quickSearch | ✅ `repository.{getUsers,getLsUri,search}` |
| `fileSystem` | readFile, writeFile, delete, getFileLockStatus, lockFile, unlockFile, **toggleVersion**, stat, abapStat, readDirectory, getObjectName, getPackageName, forceRefresh, getFolderUri, **getExternalLinks** | ✅ read/write/delete/getFileLockStatus · 🟡 toggleVersion (active⇄inactive draft), getExternalLinks, stat/readDirectory, explicit lock/unlock |
| `activation` | **activate**, getInactiveObjects | ✅ `repository.listInactive` · 🟡 **native `activate`** (lib uses the MCP wrapper → no `forceActivation`, capped at 15 objects) |
| `objectCreation` | getCreatableObjectTypes, **getCreationUiModelAndContent, sideEffects, validate, create** | 🟡 lib creates via the MCP `abap_creation-*` tools; the **native 4-step pipeline** (UI-model → validate → create, with transport-check + starter source) is richer |
| `cts/transport` | searchTransports(Simple), createTransportForObjectLock, assignTransportToObject, **checkTransportForObjectLock** | ✅ `transport.{list,create,assign,find}` · 🟡 `checkTransportForObjectLock` (the transport "decision oracle") |
| `cts/solman` | getConfiguration, check, requestObjectAllowlistApproval | 🟡 **none** — Solution Manager / ChaRM transport |
| `atc` | runCheck, getCheckVariants | ✅ `quality.{runAtc,listAtcVariants}` |
| `abapUnit` | runTests, capabilities, validateRunParams | ✅ `lifecycle.runUnitTests` |
| `coverage` | getCoverage, **loadStatementResults** | ✅ `quality.runUnitTestsWithCoverage` (getCoverage) · 🟡 per-statement `loadStatementResults` |
| `businessservice/srvb` | getServiceBindingDetails, publishandUnpublishAction, **getServiceEntitySet, getPreviewURL, getCreateFioriApp** | ✅ details / publish · 🟡 OData preview URL, entity-set, "create Fiori app" |
| `run` | runApplication | ✅ `services.runApplication` |
| `destinations` | initializeService, list, listSystemConfigurations, create, createProject, deleteProject, getLogonInfo, ensureLoggedOn, stopLogonAttempt, getStorePath | ✅ used internally for logon; `listDestinations()` (0.3.0) via the MCP equivalent · 🟡 native `list`/`listSystemConfigurations`/`deleteProject` not surfaced |
| `mcp` | startMCPServer, setDestination, stopMCPServer | ✅ exported (0.2.0) |
| `textDocument` | (standard LSP — see §2) + **insertProposal, notifyDirtyState** | ✅ standard features via `navigation.*` · 🟡 `insertProposal`, `notifyDirtyState` |
| **`codePrediction`** | getCodePredictions, reportCodePredictionInsertion | 🟡 **none** — ML/AI next-code prediction |
| **`modelDriven`** | content, schema, viewDescription, modelDrivenDescriptor, valueHelp, sideEffect, action, actionInput | 🟡 **none** — model-driven (form/metadata) object editing (value-helps, actions, side-effects) |
| **`support`** | getSupportFileOptions, createSupportFile | 🟡 **none** — supportability bundle generation |
| **`joule`** | getJouleDestination | 🟡 **none** — Joule (SAP AI assistant) destination hook |
| **`debugger`** | initializeDebugger, onBreakpointChangedRequest (+ 4 DAP client notifications) | ⛔ interactive, **stateful**, attach-style DAP — not agent-usable |
| `serverExtension/objectGenerator` | getListOfObjectsToBeGenerated (+5) | ✅ `lifecycle.generate` (via MCP) · 🟡 **dry-run** preview-before-generate |

**Headline — segments we never touched:** `codePrediction`, `modelDriven`, `support`, `joule`,
`debugger`, `cts/solman`. The first five are genuinely new capability areas (AI completion,
form-based editing, support bundles, AI hook); `debugger` is real but interactive-only.

---

## 2. Standard `textDocument/*` LSP providers (live `capabilities`)

| Provider | Offered? | Wrapped? | Note |
| --- | --- | --- | --- |
| definition / declaration / references / hover / documentHighlight / documentSymbol / typeHierarchy | ✅ | ✅ | `navigation.*` |
| `completionProvider` (`resolveProvider:true`) | ✅ | ⚠️ partial | `navigation.completion` — **no `completionItem/resolve`** |
| `diagnosticProvider` | ✅ | ✅ | `navigation.checkSyntax` |
| `codeLensProvider` | ✅ | 🟡 **GAP** | `textDocument/codeLens` — not wrapped |
| `semanticTokensProvider` | ✅ | 🟡 **GAP** | fetched internally to prime the cache, never returned |
| `documentFormatting` / `documentRangeFormatting` | ❌ `false` at init | — | **but** a per-type `*FormatService` may register dynamically on `didOpen` — **unverified** (see §4) |

Not advertised at all → correctly absent: `rename`, `codeAction` (quick-fix), `signatureHelp`,
`foldingRange`, `inlayHint`, `callHierarchy`.

## 3. MCP tools (`tools/list` — 14 static)

All wrapped (lifecycle / transport / services) or exposed in **0.3.0** (`listDestinations`,
`listCreatableObjects`, `getObjectTypeDetails`, `listGenerators`, `getGeneratorSchema`). The
library covers **more than the MCP exposes** — transport assign/list/lock, search, file ops, ATC
and coverage all go through native `adtLs/*` LSP methods, not MCP tools.

---

## 4. What's worth wrapping next (candidates, prioritized)

| # | Candidate | adt-ls method | Effort / payoff |
| --- | --- | --- | --- |
| 1 | `completionItem/resolve` (rich completion detail) | `completionItem/resolve` | tiny / sidesteps the hover cache gate |
| 2 | `semanticTokens` + `codeLens` (already-fetched / advertised) | `textDocument/{semanticTokens,codeLens}` | small / editor highlighting + inline actions |
| 3 | **Native `activation/activate`** | `adtLs/activation/activate` | small / `forceActivation`, no 15-object cap (vs the lossy MCP wrapper) |
| 4 | **`objectCreation` pipeline** | `adtLs/objectCreation/{getCreationUiModelAndContent,validate,create}` | larger / canonical create with transport-check + starter source |
| 5 | `fileSystem/toggleVersion` (active⇄inactive draft) | `adtLs/fileSystem/toggleVersion` | small / proper object-state control |
| 6 | `cts/transport/checkTransportForObjectLock` | (same) | small / the transport decision oracle |
| 7 | SRVB `getPreviewURL` / `getServiceEntitySet` | `adtLs/businessservice/srvb/*` | small / live OData preview |
| 8 | `objectGenerator` dry-run preview | `serverExtension/objectGenerator/getListOfObjectsToBeGenerated` | small / preview before mass-generate |
| 9 | **Pretty-print / formatting** | dynamic per-type `*FormatService` | **needs a `didOpen` dynamic-registration probe** — highest ambiguity; formatting is `false` at init but may register live |
| 10 | `codePrediction`, `modelDriven`, `support`, `joule` | respective segments | bigger / niche — AI completion, form editing, support bundles |

## 5. Hard boundaries — NOT in adt-ls (don't build; main-arc-1 territory)

No `adtLs/*` method exists for these, so they can't be reached headless:

- **Free ABAP SQL / table-content / data preview** — no data-read surface.
- **Git** (gCTS / abapGit).
- **Transport release / delete / reassign** — the segment has only check/create/assign/search.
- **Runtime logs** — dumps (ST22), traces/profiler, system messages, gateway errors.
- **Quick-fixes** (`codeAction` unadvertised) and **refactoring** (rename/extract) — the backend
  handlers exist in `com.sap.adt.refactoring`, but there's **no `adtLs/refactoring` segment** and
  `rename`/`codeAction` aren't advertised → unreachable until SAP exposes them.
- **Revision history** (`getVersions`).
- **FLP customization** (catalogs / tiles).
- **Classic object types** — PROG / FUNC / FUGR / INCL, classic DDIC (TABL/DOMA/DTEL/…), MSAG,
  ENHO, etc. The backend jars are present (`com.sap.adt.programs`, `com.sap.adt.ddic.*`, …) but
  the **LS front-end doesn't wire them** (returns a "use Eclipse" placeholder). This is a SAP
  front-end choice, not a backend gap — a standing **watch-item**, not closable by us today.

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
console.log(JSON.stringify(init.capabilities, null, 1)); // standard LSP providers (§2)

const token = crypto.randomBytes(16).toString('hex');
const { port } = await startMcpServer(driver, { port: 2251, token });
const client = new Client({ name: 'introspect', version: '0' }, { capabilities: {} });
await client.connect(new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/mcp`), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
}));
console.log((await client.listTools()).tools.map((t) => t.name)); // the 14 MCP tools (§3)
await client.close();
await driver.dispose();
```

The full `adtLs/*` segment list (§1) is **not** introspectable at runtime — it's read from the
decompiled `com.sap.adt.ls` jar. To re-derive the segments: extract
`sapse.adt-vscode-*/adt-ls/**/com.sap.adt.ls_*.jar` and `grep -rao "adtLs/[A-Za-z/]*"` the class
files; for per-method detail, `javap` the `internal/**/IAdtLs*Extension` interfaces with a JDK 21+.
