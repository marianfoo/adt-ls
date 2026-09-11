# @arc-mcp/adt-ls

[![npm](https://img.shields.io/npm/v/@arc-mcp/adt-ls.svg)](https://www.npmjs.com/package/@arc-mcp/adt-ls)
[![license: Apache-2.0](https://img.shields.io/npm/l/@arc-mcp/adt-ls.svg)](LICENSE)

> Generic, reusable TypeScript SDK over SAP's headless **adt-ls** — the `adt-lsc`
> language server shipped inside the official `sapse.adt-vscode` extension. It hides
> the painful setup (discovery, JVM, named-pipe + LSP handshake, reentrance logon,
> TLS/truststore, session resilience) so that *driving adt-ls is a few lines of code*.

**Status: published on npm; current runtime compatibility verified on macOS arm64.** The full SAP authoring
lifecycle (search → create → update → read → activate → run-tests → delete), plus code
intelligence, quality gates, ABAP formatting, transport, and OData service info, all run
end-to-end through `createAdtLs()` against a real S/4HANA system (adt-ls
`1.1.2.202608131517`). Runs under **Node ≥ 20 and Bun** (both verified live).

## Install

```bash
npm install @arc-mcp/adt-ls
```

You **bring adt-ls** (SAP Developer License — not redistributable): install the
`sapse.adt-vscode` extension (VS Code / Cursor) and the library auto-discovers it, or
vendor the per-platform VSIX for CI. **New here → [docs/setup.md](https://github.com/arc-mcp/adt-ls/blob/main/docs/setup.md)**:
which platform build to download, CI vendoring, and connecting with auth.
**Eclipse users:** Eclipse ADT and the headless runtime have separate versions.
Your Eclipse installation does not supply this SDK's runtime; install/update
`SAPSE.adt-vscode` as described above. [Current compatibility research and migration notes](docs/research/2026-09-11-current-adt-compatibility.md).

This release requires `adt-ls >= 1.1.2` and is verified against `1.1.2.202608131517`.

## Quickstart

```ts
import { createAdtLs, basic } from '@arc-mcp/adt-ls';

const adt = await createAdtLs({
  connection: { systemUrl: 'https://my-s4:50001', selfSigned: true, client: '001' },
  auth: basic('DEVELOPER', process.env.SAP_PW!), // or bearer(token) / interactive({ openUrl }) / clientCert({ cert, key })
});

const hits = await adt.repository.search('CL_ABAP*', { types: ['CLAS/OC'] });
const src = await adt.source.read({ name: 'ZCL_FOO', objectType: 'CLAS/OC' });

await adt.lifecycle.create({ objectType: 'CLAS/OC', name: 'ZCL_BAR', packageName: '$TMP', description: 'demo' });
await adt.lifecycle.activate({ name: 'ZCL_BAR', objectType: 'CLAS/OC' });

await adt.dispose();
```

### Auth strategies

The on-the-wire logon is always a reentrance ticket; `auth` supplies the credential:

- `basic(user, password)` — headless user/password (on-prem fixed user).
- `bearer(token | getToken)` — headless OAuth bearer (BTP ABAP / Steampunk).
- `interactive({ openUrl })` — the consumer opens the SSO URL; a human signs in (the lib
  ships no browser/TTY).
- `clientCert({ cert, key })` — **passwordless X.509 mutual TLS, no browser.** The reverse
  proxy presents the client cert on every upstream hop, so the backend authenticates the TLS
  connection itself and the reentrance handler runs with no credential. Requires
  `connection.selfSigned`. Server-side this is the standard AS ABAP
  [X.509 client-certificate logon](https://help.sap.com/docs/ABAP_PLATFORM_NEW/68bf513362174d54b58cddec28794093/bb5d22518bc72214e10000000a44176d.html)
  + [rule-based mapping (CERTRULE)](https://help.sap.com/docs/ABAP_PLATFORM_NEW/e815bb97839a4d83be6c4fca48ee5777/c830fd902dc8473b9e59db1576cc784b.html);
  it needs no KDC and no license (unlike Kerberos/SPNEGO). In an enterprise the cert is
  typically issued by SAP Secure Login Service (often from a Kerberos/SAML logon) or a
  corporate PKI. Consumers wire the cert source + server setup; arc-1-lsp ships a full guide.

```ts
import { createAdtLs, clientCert } from '@arc-mcp/adt-ls';
import { readFileSync } from 'node:fs';

const adt = await createAdtLs({
  connection: { systemUrl: 'https://my-s4:50001', selfSigned: true, client: '001' },
  auth: clientCert({ cert: readFileSync('client.crt'), key: readFileSync('client.key') }),
});
```

### Low-level building blocks

Consumers that drive adt-ls themselves — e.g. **proxying its MCP endpoint** to external
agents — can skip `createAdtLs()` and use the primitives directly (this is what
`abapify/openadt` adopts):

```ts
import { resolveAdtLsPath, AdtLsDriver, startMcpServer } from '@arc-mcp/adt-ls';

const driver = new AdtLsDriver(resolveAdtLsPath(), {
  extraArgs: ['-consoleLog', `-Djco.middleware.snc_lib=${sncLib}`], // SNC/JCo JVM flags
});
await driver.start(); // discovery + spawn + LSP initialize (short pipe; macOS-safe)
// register your own logon handlers: driver.setRequestHandler('adtLs/destinations/requestBrowserBasedLogon', …)
const { port, token } = await startMcpServer(driver, { port: 2240, token: myToken });
// → proxy http://localhost:${port}/mcp (Authorization: Bearer ${token}) however you like
await driver.dispose();
```

## Capabilities

One namespaced client over both adt-ls channels (LSP + its own MCP) — the split is hidden:

- **`capabilities()`** — fresh LSP providers and all MCP tool contracts, including schemas and annotations.
- **`repository`** — object search, file read/write/delete, inactive-object list, name→URI resolver.
- **`source` / `lifecycle`** — read; create, update, **activate** (native — per-phase diagnostics, `forceActivation`), run unit tests, delete; RAP generators; creatable-type catalog + **creation-form** (legal values per field), type-specific creation fields + validation.
- **`navigation`** — document symbols, definition/declaration, references, type hierarchy, hover, completion (with **resolve** → method signatures + ABAP-Doc), syntax check, **semantic tokens**, and **ABAP Pretty-Printer formatting**.
- **`quality`** — ATC static analysis + ABAP Unit code coverage.
- **`services`** — run a console app, service-binding details/publish, and live **OData service info** (URL + entity sets).
- **`transport`** — find / create / assign / list, lock status, and the **transport decision oracle** (`check`), and paged **transport diffs** (`getDiff`, backend-dependent).
- **`raw`** — escape hatches to any adt-ls MCP tool or LSP method.

What maps to which adt-ls call: the **[capability matrix](https://github.com/arc-mcp/adt-ls/blob/main/docs/capability-matrix.md)**. What's reachable headless vs. not (with live evidence): the **[capability survey](https://github.com/arc-mcp/adt-ls/blob/main/docs/adt-ls-capabilities.md)**.

## Documentation

- **[Setup guide](https://github.com/arc-mcp/adt-ls/blob/main/docs/setup.md)** — **start here**: where to get the binary, which platform build, CI vendoring, and connecting with auth.
- **[📖 API reference (hosted)](https://arc-mcp.github.io/adt-ls/)** — the full TypeDoc site, auto-published to GitHub Pages on every push to `main`.
- **[Usage guide](https://github.com/arc-mcp/adt-ls/blob/main/docs/usage.md)** — connecting, auth, the full API with examples, resilience, logging.
- **[Use cases](https://github.com/arc-mcp/adt-ls/blob/main/docs/use-cases.md)** — dev-tool & CI/CD recipes (ABAP Unit gate, ATC, syntax check, MCP server, scaffolding) with the API to use.
- **[API reference (Markdown)](https://github.com/arc-mcp/adt-ls/blob/main/docs/api/README.md)** — the same reference rendered in-repo (`npm run docs:api`).
- **[Capability matrix](https://github.com/arc-mcp/adt-ls/blob/main/docs/capability-matrix.md)** — the method surface + the object-type support boundary.
- **[adt-ls capability survey](https://github.com/arc-mcp/adt-ls/blob/main/docs/adt-ls-capabilities.md)** — what the live binary offers vs. what's wrapped, and the known coverage gaps.
- **[ADRs](https://github.com/arc-mcp/adt-ls/tree/main/docs/adr)** — the architecture decisions (0001–0013).

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

## Current verification (2026-09-11)

Target: adt-ls **1.1.2.202608131517**, bundled SAP Machine **21.12.0**, macOS arm64,
A4H over HTTPS port 443. The library's minimum runtime is **1.1.2** because activation,
ABAP Unit, inactive-object listing and deletion contracts changed after the old baseline.

The test suite checks the real LSP handshake and presence of the MCP authoring tools;
backend tests cover create/update/read/activate/test/delete, code intelligence, creation
forms, service info, dictionary source and ABAP Unit coverage. Failure-path tests cover
startup cleanup and MCP JSON/SSE, pagination, errors and timeouts.

See [research and validation](docs/research/2026-09-11-current-adt-compatibility.md) for
measured results and the remaining platform/backend boundaries. This is not a claim of
full Eclipse feature parity.

## Consumers

- **arc-1-lsp** — replaces its `src/adt-ls/*` entirely; keeps its own MCP server, BTP/Cloud-Connector
  bridge (via the `connection.forwardProxy` hook), authz, and write-safety as thin wrappers over the lib.
- **openADT** — its TypeScript launcher core can converge onto this lib.
