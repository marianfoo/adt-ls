# ADR-0009 — adt-ls version pinning

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The `adtLs/*` protocol is **private and unpublished**; SAP can change it between
releases. It is young (its MCP server is flagged experimental). The installed adt-ls
build reports itself in the LSP `initialize` response as
`serverInfo.version` (verified: `ADTLS 1.0.0.202605281240`), and the extension carries
a `version` in its `package.json`.

## Decision

- Each `@marianfoo/adt-ls` release **declares a supported adt-ls build** (current:
  `sapse.adt-vscode 1.0.0` / `adt-ls 1.0.0.202605281240` / SAP Machine JRE 21.11.0).
- At startup, read `serverInfo.version` and **warn (not fail) on mismatch** with the
  supported build.
- Pin *behaviour* to the supported build; never assume undocumented stability across
  versions. Capability docs are version-tagged.

## Consequences

- Cheap, reliable detection (no extra round-trip — comes from `initialize`).
- Clear signal when a user's adt-ls drifts from what the release was verified against.

## Revisit when

- SAP **publishes** the `adt-ls-client-protocol` / types → adopt them and drop the
  reverse-engineering + much of the pinning caution.
