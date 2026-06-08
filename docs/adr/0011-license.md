# ADR-0011 — License: Apache-2.0

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The library is original TypeScript (a driver/SDK over adt-ls); it bundles **no** SAP
code (BYO binary, ADR-0004). It targets enterprise/SAP-ecosystem adopters and aims to be
*the* shared standard. Neighbouring projects: abap-adt-api (MIT), abapify/adt-cli (MIT).

## Decision

License under **Apache-2.0**.

Rationale: the explicit **patent grant** and clear contribution terms make it the
stronger default for an enterprise-targeted, broadly-reused library and ease corporate
legal review. Apache-2.0 is compatible with depending on / vendoring MIT code (so a
future reuse of `@abapify/adt-schemas`, ADR-0013, is unaffected).

## Consequences

- Enterprise-friendly; patent-safe for adopters and contributors.
- Slightly more ceremony than MIT (NOTICE/headers), which is acceptable.

## Revisit when

- A deliberate ecosystem decision to standardize on MIT across abapify + marianfoo
  packages (then align).
