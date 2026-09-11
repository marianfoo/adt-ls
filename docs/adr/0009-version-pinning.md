# ADR-0009 — adt-ls version pinning

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The `adtLs/*` protocol is **private and unpublished**; SAP can change it between
releases. It is young (its MCP server is flagged experimental). The installed adt-ls
build reports itself in the LSP `initialize` response as
`serverInfo.version` (verified: `ADTLS 1.0.1.202606111342`), and the extension carries
a `version` in its `package.json`.

## Decision

- Each `@arc-mcp/adt-ls` release **declares a minimum and verified adt-ls build** (current:
  `sapse.adt-vscode 1.1.2` / `adt-ls 1.1.2.202608131517` / SAP Machine JRE 21.12.0).
- At startup, read `serverInfo.version`, **fail fast below the minimum version**, and warn
  when the build is supported but differs from the exact verified build.
- Pin *behaviour* to the supported build; never assume undocumented stability across
  versions. Capability docs are version-tagged.

## Consequences

- Cheap, reliable detection (no extra round-trip — comes from `initialize`).
- Clear signal when a user's adt-ls drifts from what the release was verified against.

## Revisit when

- SAP **publishes** the `adt-ls-client-protocol` / types → adopt them and drop the
  reverse-engineering + much of the pinning caution.

## 2026-09-11 update

The minimum is now **1.1.2**. Testing found incompatible native activation, coverage,
inactive-object and file-delete contracts as well as the new required VFS MCP mode.
Keeping the 1.0.1 minimum would advertise support for requests we no longer send.
See the [research and validation record](../research/2026-09-11-current-adt-compatibility.md).
The original 1.0.1 startup observation above is historical.
