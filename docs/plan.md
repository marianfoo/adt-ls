# Implementation plan — `@marianfoo/adt-ls`

Detailed plan for building the library and integrating it into arc-1-lsp. Pairs with
the decisions in [adr/](adr/README.md) and the charter in [../GOAL.md](../GOAL.md).

---

## 1. Mission & scope

One TypeScript library that exposes **everything SAP's headless adt-ls provides**,
hiding all setup. Consumed first by arc-1-lsp (replacing `src/adt-ls/*`), later by
openADT. **adt-ls only** — no direct ADT/SAP HTTP, no SDK sidecar, no MCP server, no
CC/BTP bridge in the lib (ADR-0001).

## 2. Proven feasibility (2026-06-07)

| Check | Result |
|---|---|
| Per-platform binary paths (all 4 VSIX) | ✅ `macosx/cocoa/<arch>/Adt-ls.app/Contents/MacOS/adt-ls`, `linux/gtk/x86_64/adt-ls`, `win32/win32/x86_64/adt-lsc.exe` |
| Bundled JRE | ✅ SAP Machine `21.11.0`; `keytool`/`cacerts` under `…/plugins/com.sap.adt.jvm.sapmachineminimal.<os>.<arch>_21.11.0/jre` (mac: `…/Contents/Eclipse/plugins/…`) |
| Spawn + LSP `initialize` (userAgentInfos) | ✅ `ADTLS 1.0.0.202605281240` |
| Truststore build w/ bundled keytool | ✅ |
| Full lifecycle vs a4h (auth+LSP+MCP+resilience) | ✅ green in ~33s |

No design/protocol blockers. Remaining = deferred verifications: **S-win** (Windows
runtime), **S-dyn** (dynamic MCP tool enumeration), **S-schema** (ADR-0013).

## 3. Architecture

```
                      ┌──────────────────────────────────────────┐
   createAdtLs(opts)  │  AdtLsClient (unified high-level API)     │
        │             │  repository · source · lifecycle ·       │
        ▼             │  navigation · quality · services ·       │
  ┌───────────┐       │  transport · raw.{tool,lsp} · health     │
  │ discovery │       └───────────────┬──────────────────────────┘
  │ (BYO)     │                       │ routes each op to the right channel
  └─────┬─────┘            ┌──────────┴───────────┐
        │                  ▼                      ▼
   ┌────▼─────┐   ┌──────────────────┐   ┌────────────────────┐
   │  driver  │   │ LSP channel      │   │ adt-ls MCP channel │
   │ spawn +  │──▶│ adtLs/* +        │   │ (federation client │
   │ pipe +   │   │ textDocument/*   │   │  to adt-ls's /mcp)  │
   │ initialize│  └──────────────────┘   └────────────────────┘
   └────┬─────┘            ▲                      ▲
        │        ┌─────────┴──────────────────────┴─────────┐
        │        │ cross-cutting: LogonStrategy · TLS/trust  │
        │        │ + optional reverse-proxy · resilience     │
        ▼        │ (cold-retry, revive, keep-alive)          │
   adt-lsc (JVM) └───────────────────────────────────────────┘
```

- **One unified API** hides the LSP-vs-MCP split (ADR-0002). Reads/code-intel/ATC/
  native-transport come from LSP; create/activate/test/validate/generators/services
  come from adt-ls's MCP. Both used internally; never exposed as a server.
- **Escape hatches:** `adt.raw.lsp(method, params)` and `adt.raw.tool(name, args)`
  for the long tail (esp. backend-dynamic MCP tools).

## 4. Package / repo layout

```
marianfoo/adt-ls
├── src/
│   ├── index.ts                 # createAdtLs() + public types
│   ├── client.ts                # AdtLsClient: wires channels + namespaces
│   ├── discovery.ts             # locate adt-ls (env > vendor > sapse.adt-vscode)
│   ├── driver.ts                # spawn + pipe (generateRandomPipeName) + LSP conn + routeServerRequest
│   ├── connection/
│   │   ├── index.ts             # plan/open a connection (DIRECT; upstream hook)
│   │   ├── tls-proxy.ts         # optional localhost TLS reverse proxy (self-signed)
│   │   └── cert.ts              # truststore from bundled JRE keytool + JAVA_TOOL_OPTIONS
│   ├── auth/
│   │   ├── strategy.ts          # LogonStrategy interface
│   │   ├── reentrance.ts        # shared reentrance destination CRUD + ticket dance
│   │   ├── basic.ts             # basic(user,pass)
│   │   ├── bearer.ts            # bearer(token | getToken)
│   │   ├── interactive.ts       # interactive(callbacks)
│   │   └── handlers.ts          # server→client logon handlers
│   ├── channels/
│   │   ├── lsp.ts               # adtLs/* + textDocument/* helpers
│   │   ├── mcp-lifecycle.ts     # adtLs/mcp/{start,stop,setDestination}
│   │   └── mcp-federation.ts    # streamable-HTTP client to adt-ls /mcp
│   ├── resilience/
│   │   ├── cold-retry.ts
│   │   └── session-retry.ts     # withRelogon + makeReviveIfDead + keep-alive policy
│   ├── api/
│   │   ├── repository.ts        # quickSearch, getUsers, getLsUri, read/write/delete
│   │   ├── lifecycle.ts         # create/update/read/activate/test/delete, generate, validate
│   │   ├── navigation.ts        # symbols/def/decl/refs/typeHierarchy/hover/highlight/syntax/completion
│   │   ├── quality.ts           # ATC + unit coverage
│   │   ├── services.ts          # runApplication + service-binding
│   │   └── transport.ts         # CTS find/create/assign/list/lock
│   └── types/                   # adt-ls JSON types (live-verified) [+ ADR-0013 reuse seam]
├── scripts/setup-adt-ls.mjs     # extract platform subtree from a user VSIX → vendor/ (+ macOS de-quarantine)
├── tests/                       # vitest, 3-tier (see §9)
├── docs/                        # capability-map, headless-notes, gotchas, quickstart
├── .github/workflows/ci.yml     # Tier-1 only on GitHub-hosted
├── LICENSE                      # Apache-2.0
└── package.json                 # @marianfoo/adt-ls, ESM, tsup/tsdown, exports
```

## 5. Public API

```ts
import { createAdtLs, basic, bearer, interactive } from '@marianfoo/adt-ls'

const adt = await createAdtLs({
  adtLs?: { path?: string },                       // else auto-discover
  connection: {
    systemUrl: 'https://host:443',                 // backend
    selfSigned?: boolean,                          // → engage TLS reverse-proxy
    extraCaCerts?: string[],                        // corporate CA → truststore
    upstream?: (req) => UpstreamTarget,             // hook (consumer plugs CC/BTP)
    client?: '001', language?: 'EN',
  },
  auth: basic('MARIAN', pw)                          // | bearer(token|getToken) | interactive(cbs) | custom
})

await adt.repository.search('CL_*')                 // + getLsUri, getUsers, file read/write/delete
await adt.source.read(uri)                           // read source (LSP fileSystem)
await adt.lifecycle.create({ objectType, name, packageName, description })
await adt.lifecycle.update({ name, objectType, source })
await adt.lifecycle.activate({ name, objectType })   // + runUnitTests, delete, generate, validate
await adt.navigation.documentSymbols(ref)            // + definition/references/typeHierarchy/hover/completion/checkSyntax
await adt.quality.runAtc(ref)                         // + runUnitTestsWithCoverage, listAtcVariants
await adt.services.runApplication(ref)               // + serviceBindingDetails/publish
await adt.transport.find(ref)                         // + create/assign/list/getLockStatus
adt.raw.lsp(method, params); adt.raw.tool(name, args) // escape hatches
adt.health()                                          // { connected, backendLive, adtLsVersion }
await adt.dispose()
```

## 6. Core interfaces

```ts
interface LogonStrategy {
  /** authenticationKind is always 'reentranceTicket'; this supplies the credential
   *  to obtain the ticket and answers adt-ls's server→client logon requests. */
  readonly kind: 'basic' | 'bearer' | 'interactive' | 'custom'
  registerHandlers(driver: LspClient, ctx: LogonContext): void
  ensureLoggedOn(driver: LspClient, destinationId: string): Promise<LogonInfo>
}

interface InteractiveCallbacks {              // ADR-0003: no hardcoded browser/TTY
  openUrl(url: string): void | Promise<void>
  promptField(f: { key: string; label: string; sensitive: boolean }): Promise<string | undefined>
  onStateChange?(s: LogonState): void
}

interface ConnectionOptions {
  systemUrl: string
  selfSigned?: boolean
  extraCaCerts?: string[]
  upstream?: (req: ProxyRequest) => UpstreamTarget   // ADR-0006 hook; CC lives in the consumer
  client?: string; language?: string
}
```

## 7. Module mapping — arc-1-lsp `src/adt-ls/*` → `@marianfoo/adt-ls`

The seed is arc-1-lsp's proven, tested modules. Transformations: rename `arc1*`/
`ARC1_*` → neutral; remove `src/server/*` + `src/btp/*` coupling; replace
unix-socket pipe with `generateRandomPipeName` (ADR-0005); make TLS proxy + CC an
`upstream` hook (ADR-0006); inject a pluggable `LogonStrategy` (ADR-0003).

| arc-1-lsp module | → lib module | change |
|---|---|---|
| `discovery.ts` | `discovery.ts` | keep `platformSubPath` (VSIX-verified); drop `ARC1_` env name → `ADT_LS_PATH` |
| `cert.ts` | `connection/cert.ts` | keep `resolveJreTools`/truststore as-is |
| `tls-reverse-proxy.ts` | `connection/tls-proxy.ts` | keep DIRECT; **drop** `forwardProxy`/CC branch → `upstream` hook |
| `driver.ts` | `driver.ts` | swap unix-socket for `generateRandomPipeName`; keep `routeServerRequest`, `extraEnv` |
| `destinations.ts` | `auth/reentrance.ts` + `auth/handlers.ts` | split destination CRUD vs the strategy-specific handler |
| `mcp-lifecycle.ts` | `channels/mcp-lifecycle.ts` | as-is |
| `mcp-federation.ts` | `channels/mcp-federation.ts` | drop `arc-1-lsp` client name |
| `federated.ts` | `channels/federated.ts` | as-is |
| `repository.ts` | `api/repository.ts` | as-is |
| `lifecycle.ts` | `api/lifecycle.ts` | drop transport-write *gating* (consumer's concern); keep CTS calls |
| `navigation.ts` | `api/navigation.ts` | as-is |
| `quality.ts` | `api/quality.ts` | as-is |
| `services.ts` | `api/services.ts` | as-is |
| `cold-retry.ts` | `resilience/cold-retry.ts` | as-is |
| `session-retry.ts` | `resilience/session-retry.ts` | as-is |
| (engine.ts connect/warm-up/keep-alive) | `client.ts` + `resilience/*` | extract the wiring (minus server/btp/authz) |

**Stays in arc-1-lsp** (wraps the lib): `src/server/*` (MCP server + 39 tools, auth
edge, write-safety), `src/btp/*` (CC bridge → plugged via the `upstream` hook),
`src/authz/*` (scopes), config.

## 8. Phased delivery

> Phases 0–6 happen on a single arc-1-lsp branch + the new repo, built together.

- **Phase 0 — Repo scaffold.** Create `marianfoo/adt-ls`; ESM + tsup/tsdown + vitest +
  Biome + Apache-2.0 + `package.json` exports; `scripts/setup-adt-ls.mjs`; Tier-1 CI.
  *Exit:* `npm run build` + lint + Tier-1 tests green.
- **Phase 1 — Connect core.** discovery + driver (cross-platform pipe) + connection +
  cert/truststore + optional TLS proxy. *Exit:* spawn + `initialize` smoke green on
  the extracted VSIX (mirrors the proven driver smoke).
- **Phase 2 — Auth.** `LogonStrategy` + reentrance CRUD + `basic`/`bearer`/
  `interactive`/`custom`; optional browser/TTY helper as a sub-export. *Exit:* live
  reentrance logon to a4h green (basic, user MARIAN).
- **Phase 3 — Capability surface.** repository/source/lifecycle/navigation/quality/
  services/transport + `raw.*`; unified routing. *Exit:* full lifecycle + code-intel
  + ATC live green vs a4h.
- **Phase 4 — Resilience.** cold-retry + session-retry + activity-gated keep-alive +
  `health.backendLive`. *Exit:* revive + cold-start guards unit-tested + live-smoked.
- **Phase 5 — Docs.** README (quickstart + gotchas/landmines), capability matrix
  (port `adt-ls-reference.md`), headless-notes, API reference, version-compat note.
- **Phase 6 — arc-1-lsp integration.** Replace `src/adt-ls/*` with the dep; rewire
  `engine.ts`/server to the lib; CC bridge via `upstream` hook. *Exit:* arc-1-lsp test
  suite green; live lifecycle via the lib.
- **Later — S-win** (Windows self-hosted runner), **S-dyn** (dynamic-tool map),
  **S-schema** (ADR-0013 type alignment).

## 9. Test strategy (3 tiers)

| Tier | What | Needs | Where |
|---|---|---|---|
| 1 unit | routing, retries, URI build, discovery (synthetic), cert-path | nothing | GitHub-hosted, every PR |
| 2 offline-integration | spawn+`initialize`, truststore build w/ real keytool | the binary | self-hosted (skipIf on public CI) |
| 3 live-SAP | reentrance logon, full lifecycle, ATC, dynamic-tool map | binary + a4h | self-hosted only, creds as secrets |

- `skipIf`-gate Tiers 2/3 so public CI stays green.
- `scripts/setup-adt-ls.mjs <vsix>` extracts the correct platform subtree into
  gitignored `vendor/adt-ls/` and runs `xattr -dr com.apple.quarantine` on macOS.
- **Self-hosted runner: documented only for now** (user provisions later); a Windows
  self-hosted runner covers S-win. a4h cred: user `MARIAN` / `SAP_S4_PRIMARY_PASSWORD`
  (the `DEVELOPER` legacy password is stale → 401).

## 10. Spikes / milestones

- **S-win** — spawn + named pipe + bundled keytool truststore + JAVA_TOOL_OPTIONS on
  Windows x64 (paths already confirmed from the VSIX).
- **S-dyn** — enumerate adt-ls's MCP `tools/list` against a4h; classify static vs
  backend-dynamic; type the stable set, leave the rest to `raw.tool`.
- **S-schema** (ADR-0013) — diff adt-ls's live JSON (ATC/AUnit/**coverage**/ddl) vs
  `@abapify/adt-schemas` XSD-derived types; adopt types/codegen only where shapes align.

## 11. Versioning & compatibility (ADR-0009)

Each release declares a supported adt-ls build (current `1.0.0.202605281240`). The
client reads `serverInfo.version` from `initialize` and **warns on mismatch**. The
private `adtLs/*` protocol can change between releases — pin behaviour, don't assume.

## 12. Risks & open items

- **Private protocol churn** — SAP can change `adtLs/*`; mitigated by version pin + warn.
- **Windows runtime unproven** — S-win on the VM before claiming Win support.
- **Dynamic MCP tools vary per backend** — covered by `raw.tool` + S-dyn.
- **Interactive logon UX** — kept generic via callbacks; the batteries-included helper
  is a separate opt-in export.
- **Ecosystem convergence** — a shared transport-neutral domain model with
  abapify/adt-cli (ADR-0013) is a collaboration, not a blocker.

## 13. Definition of done

A published-quality `@marianfoo/adt-ls`: easy to use, properly documented (quickstart
+ gotchas + capability matrix), Apache-2.0, usable by anyone, and used inside arc-1-lsp
in place of every adt-ls feature it had — with the live a4h lifecycle green through the
library.
