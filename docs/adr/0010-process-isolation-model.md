# ADR-0010 — Process & isolation model

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

adt-ls is **single-session per process**. Destinations persist **globally** in
`~/.adtls/destinations.json` — shared with the user's real VS Code / Cursor / Eclipse —
so an un-isolated run can pollute or reuse the user's store. Multi-destination or
multi-user scenarios therefore need multiple adt-lsc processes. arc-1-lsp's
principal-propagation design uses a per-user session **pool**, but that is a consumer
concern, not generic library behaviour.

## Decision

- **One adt-lsc process per `createAdtLs` instance.**
- **Isolated by default:** a per-instance `destinationsStorePath` and `-data` workspace
  dir (never the global `~/.adtls`), cleaned up on `dispose()`.
- **Pooling / multi-user / per-user identity is the consumer's responsibility** — the
  library gives a clean single-session primitive; consumers compose pools over it.
- Never kill adt-ls processes the library didn't spawn (the user's IDEs).

## Consequences

- Safe to embed in any tool without clobbering the developer's IDE destinations.
- Scaling to many destinations/users = many instances (the consumer orchestrates).

## Revisit when

- adt-ls gains multi-session support or a per-request identity hook → pooling could move
  into (or be obviated for) the library.
