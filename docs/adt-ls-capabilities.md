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
| `activation` | **activate**, getInactiveObjects | ✅ `repository.listInactive` · ✅ **native `activate`** (0.4.0 — `lifecycle.activate` uses `adtLs/activation/activate`: per-phase flags, `forceActivation`, no 15-object cap) |
| `objectCreation` | getCreatableObjectTypes, **getCreationUiModelAndContent, sideEffects, validate, create** | 🟡 lib creates via the MCP `abap_creation-*` tools; the **native 4-step pipeline** (UI-model → validate → create, with transport-check + starter source) is richer |
| `cts/transport` | searchTransports(Simple), createTransportForObjectLock, assignTransportToObject, **checkTransportForObjectLock** | ✅ `transport.{list,create,assign,find,check}` (0.4.0 added `check` = `checkTransportForObjectLock`, the decision oracle) |
| `cts/solman` | getConfiguration, check, requestObjectAllowlistApproval | 🟡 **none** — Solution Manager / ChaRM transport |
| `atc` | runCheck, getCheckVariants | ✅ `quality.{runAtc,listAtcVariants}` |
| `abapUnit` | runTests, capabilities, validateRunParams | ✅ `lifecycle.runUnitTests` |
| `coverage` | getCoverage, **loadStatementResults** | ✅ `quality.runUnitTestsWithCoverage` (getCoverage) · 🟡 per-statement `loadStatementResults` |
| `businessservice/srvb` | getServiceBindingDetails, publishandUnpublishAction, **getServiceEntitySet, getPreviewURL, getCreateFioriApp** | ✅ details / publish · 🟡 OData preview URL, entity-set, "create Fiori app" |
| `run` | runApplication | ✅ `services.runApplication` |
| `destinations` | initializeService, list, listSystemConfigurations, create, createProject, deleteProject, getLogonInfo, ensureLoggedOn, stopLogonAttempt, getStorePath | ✅ used internally for logon; `listDestinations()` (0.3.0) via the MCP equivalent · 🟡 native `list`/`listSystemConfigurations`/`deleteProject` not surfaced |
| `mcp` | startMCPServer, setDestination, stopMCPServer | ✅ exported (0.2.0) |
| `textDocument` | (standard LSP — see §2) + **insertProposal, notifyDirtyState** | ✅ standard features via `navigation.*` (0.4.0 added `format`, `semanticTokens`, completion `resolve`) · 🟡 `insertProposal`, `notifyDirtyState` |
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
| `completionProvider` (`resolveProvider:true`) | ✅ | ✅ (0.4.0) | `navigation.completion(…, { resolve:true })` → `completionItem/resolve` enriches member items with the full ABAP signature + ABAP-Doc as markdown (keywords carry no `data` → no-op) |
| `diagnosticProvider` | ✅ | ✅ | `navigation.checkSyntax` |
| `codeLensProvider` | ✅ | 🟡 skip | `textDocument/codeLens` — only SRVB/AFF-JSON lenses + client-side commands → low headless value |
| `semanticTokensProvider` | ✅ | ✅ (0.4.0) | `navigation.semanticTokens` → decoded `[{line,character,length,tokenType,tokenModifiers[]}]` via the 23-type/10-modifier legend (same pass that primes hover/highlight) |
| `documentFormatting` / `documentRangeFormatting` | ❌ `false` at init **but registered live** | ✅ (0.4.0) | **CONFIRMED:** `textDocument/{formatting,rangeFormatting}` are dynamically registered on `didOpen` (captured the `client/registerCapability` live); `navigation.format` → ABAP Pretty-Printer output. The prior "unverified" is now resolved. |

Not advertised at all → correctly absent: `rename`, `codeAction` (quick-fix), `signatureHelp`,
`foldingRange`, `inlayHint`, `callHierarchy`.

## 3. MCP tools (`tools/list` — 14 static)

All wrapped (lifecycle / transport / services) or exposed in **0.3.0** (`listDestinations`,
`listCreatableObjects`, `getObjectTypeDetails`, `listGenerators`, `getGeneratorSchema`). The
library covers **more than the MCP exposes** — transport assign/list/lock, search, file ops, ATC
and coverage all go through native `adtLs/*` LSP methods, not MCP tools.

---

## 4. Candidate wrapping — status

### 4a. Wrapped in 0.4.0 (live-verified against a4h `1.0.0.202605281240`)

Each was probed live; the **exact verified call** is recorded as durable evidence.

| Capability | API | Verified call → observed result |
| --- | --- | --- |
| **ABAP Pretty-Printer formatting** | `navigation.format(ref, {tabSize?,insertSpaces?})` | open doc → `textDocument/formatting {textDocument:{uri}, options:{tabSize:2,insertSpaces:true}}` → **one full-document `TextEdit`** with pretty-printed source (CRLF). `formatting`+`rangeFormatting` arrive via `client/registerCapability` on `didOpen`. |
| **Native activation** | `lifecycle.activate(ref, {forceActivation?})` | `adtLs/activation/activate {destination, lsUris:[uri], references:[], forceActivation:false}` → `{isCheckExecuted,isActivationExecuted,isGenerationExecuted,isForceSupported,refreshLsUris[],objectDiagnostics[]}`. Errors nest as `objectDiagnostics[].diagnostic[].severity:1` (`source:"abapActivation"`). |
| **Transport decision oracle** | `transport.check(ref, {operation?,transportLayer?,recordChanges?})` | `adtLs/cts/transport/checkTransportForObjectLock {operationType:'MODIFY', objectInfo:{objectUri:uri}, transportLayer:'', isRecordChanges:true}` → `{isTransportCheckSuccessful,isRecordingRequired,isLockedInRequests,transportCreationConfiguration{…},checkMessages{…}}`. `$TMP` → `isRecordingRequired:false`. |
| **Completion resolve** | `navigation.completion(ref, locator, {resolve:true})` | member position (e.g. `out->`) → items carry `data` → `completionItem/resolve` returns `documentation.value` = markdown ABAP signature (`importing/returning/…`). Keyword positions carry no `data` (no-op). |
| **Decoded semantic tokens** | `navigation.semanticTokens(ref)` | `textDocument/semanticTokens/full` → `{data:[…5-int tuples]}`; decoded with the `initialize` legend (23 types / 10 modifiers) into absolute `{line,character,length,tokenType,tokenModifiers[]}`. |

### 4b. Probed but **deferred** (evidence-backed)

| Candidate | Why deferred |
| --- | --- |
| SRVB `getServiceEntitySet` / `getPreviewURL` | `ServiceBindingPreviewData` shape decompiled (`{bindingType,entity,lsuri,service,serviceDefinationName,serviceName,serviceVersion}` — note lowercase `lsuri`); even fully populated, returns **`"Internal error"`** on a4h (needs a *published* binding + gateway activation). Medium value, not reliably reachable. |
| `objectGenerator` native dry-run (`getListOfObjectsToBeGenerated`) | `fetchAllGenerators` needs a project-qualified ref URI; class lsUri → `"Internal error"`, package ADT URI → `"URI does not contain a AFF file name"`. The **MCP** `abap_generators-*` path already covers generation; native dry-run is a finicky, low-marginal-value extra. |
| `objectCreation/{getCreationUiModelAndContent,validate}` | Both work (`validate` needs `fieldGroup:` **integer**, e.g. `1`), but **duplicate** the library's existing MCP `getObjectTypeDetails` / `validateObject`. |
| `fileSystem/toggleVersion` | `adtLs/fileSystem/toggleVersion {uri}` → `null` (works) but it's a UI active/inactive **view** toggle — unclear value for a headless/programmatic consumer. |
| `codePrediction`, `modelDriven`, `support`, `joule`, `cts/solman` | Niche / interactive / backend-gated (AI completion, form-UI protocol, support bundles, ChaRM). |

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
