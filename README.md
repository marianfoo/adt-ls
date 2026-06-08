# @marianfoo/adt-ls

> Generic, reusable TypeScript SDK over SAP's headless **adt-ls** — the `adt-lsc`
> language server shipped inside the official `sapse.adt-vscode` extension. It hides
> the painful setup (discovery, JVM, named-pipe + LSP handshake, reentrance logon,
> TLS/truststore, session resilience) so that *driving adt-ls is a few lines of code*.

**Status: published on npm (`0.2.0`) — functionally complete & live-proven.** The full
SAP authoring lifecycle (search → create → update → read → activate → run-tests →
delete) runs end-to-end through `createAdtLs()` against a real S/4HANA system (adt-ls
`1.0.0.202605281240`). Runs under **Node ≥ 20 and Bun** (both verified live).

## Install

```bash
npm install @marianfoo/adt-ls
```

You **bring adt-ls** (SAP Developer License — not redistributable): install the
`sapse.adt-vscode` extension (VS Code / Cursor) and the library auto-discovers it, or
run `node scripts/setup-adt-ls.mjs <path-to.vsix>` to extract it into `vendor/`.

## Quickstart

```ts
import { createAdtLs, basic } from '@marianfoo/adt-ls';

const adt = await createAdtLs({
  connection: { systemUrl: 'https://my-s4:50001', selfSigned: true, client: '001' },
  auth: basic('MARIAN', process.env.SAP_PW!), // or bearer(token) / interactive({ openUrl })
});

const hits = await adt.repository.search('CL_ABAP*', { types: ['CLAS/OC'] });
const src = await adt.source.read({ name: 'ZCL_FOO', objectType: 'CLAS/OC' });

await adt.lifecycle.create({ objectType: 'CLAS/OC', name: 'ZCL_BAR', packageName: '$TMP', description: 'demo' });
await adt.lifecycle.activate({ name: 'ZCL_BAR', objectType: 'CLAS/OC' });

await adt.dispose();
```

### Low-level building blocks

Consumers that drive adt-ls themselves — e.g. **proxying its MCP endpoint** to external
agents — can skip `createAdtLs()` and use the primitives directly (this is what
`abapify/openadt` adopts):

```ts
import { resolveAdtLsPath, AdtLsDriver, startMcpServer } from '@marianfoo/adt-ls';

const driver = new AdtLsDriver(resolveAdtLsPath(), {
  extraArgs: ['-consoleLog', `-Djco.middleware.snc_lib=${sncLib}`], // SNC/JCo JVM flags
});
await driver.start(); // discovery + spawn + LSP initialize (short pipe; macOS-safe)
// register your own logon handlers: driver.setRequestHandler('adtLs/destinations/requestBrowserBasedLogon', …)
const { port, token } = await startMcpServer(driver, { port: 2240, token: myToken });
// → proxy http://localhost:${port}/mcp (Authorization: Bearer ${token}) however you like
await driver.dispose();
```

## Documentation

- **[Usage guide](https://github.com/marianfoo/adt-ls/blob/main/docs/usage.md)** — connecting, auth, the full API with examples, resilience, logging.
- **[API reference](https://github.com/marianfoo/adt-ls/blob/main/docs/api/README.md)** — generated from the types via TypeDoc (`npm run docs:api`).
- **[Capability matrix](https://github.com/marianfoo/adt-ls/blob/main/docs/capability-matrix.md)** — the method surface + the object-type support boundary.
- **[ADRs](https://github.com/marianfoo/adt-ls/tree/main/docs/adr)** — the architecture decisions (0001–0013).

---

## Why this exists

Two first-party projects already drive headless adt-ls and **reimplement the same
fragile, reverse-engineered plumbing**: `abapify/openadt` (its
`@openadt/sap-adt-mcp-launcher`) and `arc-1-lsp` (`src/adt-ls/*`). Both encode the
identical landmines (the `userAgentInfos` NPE, HTTPS-only + hostname verification,
silent session death, the reentrance-ticket dance). The fragmentation that actually
hurt here is **first-party duplication**, and the cure is one shared library.

The thesis: adt-ls is the *correct* path (SAP-maintained CSRF/locking/activation/XML),
but its setup is so much harder than calling ADT REST directly that people avoid it.
This library makes adt-ls **as easy to use as a plain API**, so the easy choice is
also the right one.

## Scope — the hard line

**adt-ls ONLY.** No direct ADT/SAP HTTP, no SAP ADT SDK sidecar, no MCP server, no
Cloud-Connector/BTP bridge *inside* the library. What adt-ls can't do headless is out
of scope. See [ADR-0001](docs/adr/0001-scope-adt-ls-only.md).

## Verified feasibility (2026-06-07, macOS arm64, adt-ls `1.0.0.202605281240`)

Proven hands-on against the freshly-downloaded 1.0.0 VSIX and the live a4h system:

- Per-platform binary paths confirmed across **all four** VSIX (darwin-arm64, darwin-x64, linux-x64, win32-x64).
- Spawn + LSP `initialize` (with the `userAgentInfos` workaround) → `ADTLS 1.0.0.202605281240`.
- Truststore build with the **bundled** SAP Machine JRE 21 `keytool`.
- **Full `create → update → read → activate → run-tests → delete` GREEN against a4h** — exercising auth (reentrance + TLS proxy), the LSP channel, the MCP channel, and the resilience layer end-to-end.

→ **No design or protocol blockers remain.**

## Consumers

- **arc-1-lsp** — replaces its `src/adt-ls/*` entirely; keeps its own MCP server, BTP/Cloud-Connector
  bridge (via the `connection.forwardProxy` hook), authz, and write-safety as thin wrappers over the lib.
- **openADT** — its TypeScript launcher core can converge onto this lib.
