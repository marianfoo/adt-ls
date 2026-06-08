# @marianfoo/adt-ls

> Generic, reusable TypeScript SDK over SAP's headless **adt-ls** — the `adt-lsc`
> language server shipped inside the official `sapse.adt-vscode` extension. It hides
> the painful setup (discovery, JVM, named-pipe + LSP handshake, reentrance logon,
> TLS/truststore, session resilience) so that *driving adt-ls is a few lines of code*.

**Status: working — functionally complete & live-proven.** The full SAP authoring
lifecycle (search → create → update → read → activate → run-tests → delete) runs
end-to-end through `createAdtLs()` against a real S/4HANA system (adt-ls
`1.0.0.202605281240`). Not yet published to npm.

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

See the **[capability matrix](https://github.com/marianfoo/adt-ls/blob/main/docs/capability-matrix.md)**
for the full method surface and the object-type support boundary.

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

## Design & decisions

The full design lives in [`docs/`](https://github.com/marianfoo/adt-ls/tree/main/docs): the
[implementation plan](https://github.com/marianfoo/adt-ls/blob/main/docs/plan.md), the
[capability matrix](https://github.com/marianfoo/adt-ls/blob/main/docs/capability-matrix.md),
and **[13 ADRs](https://github.com/marianfoo/adt-ls/tree/main/docs/adr)** — scope (adt-ls only),
the dual-channel unified API, auth strategies, BYO discovery, cross-platform transport,
TLS/trust, resilience, packaging, version pinning, process isolation, license, API coverage,
and typing.

## Consumers

- **arc-1-lsp** — replaces its `src/adt-ls/*` entirely; keeps its own MCP server, BTP/Cloud-Connector
  bridge (via the `connection.forwardProxy` hook), authz, and write-safety as thin wrappers over the lib.
- **openADT** — its TypeScript launcher core can converge onto this lib.
