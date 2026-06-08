# ADR-0008 — Runtime & packaging (Node-first ESM)

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The two seed implementations diverge on runtime: openADT's TS launcher leans on **Bun**
(`Bun.TOML`, `.ts` import specifiers, `resolve-bun.ts`); arc-1-lsp is **Node + ESM**
with `.js` specifiers. A library meant to be used by everyone must run on the most
common runtime with the standard publishable convention.

## Decision

- **Node-first ESM**, Bun-optional. No Bun-only APIs in the core (use a portable TOML
  parser if config parsing is ever needed; prefer plain options objects).
- **`.js` import specifiers** (NodeNext ESM), TypeScript **strict**.
- Build with **tsup/tsdown**; test with **vitest**; lint/format with **Biome**.
- Package **`@marianfoo/adt-ls`** (matching the existing `@marianfoo/*` scope), repo
  **`marianfoo/adt-ls`**; proper `exports` map (root + sub-paths, e.g. the optional
  interactive browser/TTY helper as a separate entry).
- stdout stays clean if a CLI/stdio consumer is ever built; logging is injectable.

## Consequences

- Drop-in for Node consumers (arc-1-lsp); still runnable under Bun.
- A small reconciliation cost porting openADT's Bun-specific launcher bits to Node.

## Revisit when

- A compelling reason to ship a Bun-native build, or to support Deno, appears.
