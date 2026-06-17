# ADR-0013 — Typing strategy & `@abapify/adt-schemas` reuse

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

`abapify/adt-cli` (Petr Plenkov, MIT) has a strong asset: an **XSD→TS codegen**
(`ts-xsd`) with ~24 committed ADT XSDs producing 61 generated `.types.ts`, plus
ts-rest/zod-style **contracts**. But those describe the **direct ADT REST XML** surface
and bind to `/sap/bc/adt/*` endpoints. Our library is adt-ls-only (ADR-0001), and adt-ls
**projects ADT into its own JSON** (e.g. ATC → `AtcRunFinding{lineNumber,priority,
message,checkId}`, not the `atcworklist` XML shape). So the REST shapes do not, in
general, match adt-ls's output.

## Decision

- **Source of truth = adt-ls's live JSON.** Types are written/verified from what adt-ls
  actually returns.
- **Do not** adopt `adt-cli`'s **contracts** (they are direct ADT REST — forbidden by
  ADR-0001).
- **Optionally reuse `@abapify/adt-schemas` types or its XSD→TS codegen** *only where
  adt-ls exposes raw ADT XML* (e.g. payloads surfaced verbatim, or via `raw.*`). **ABAP
  Unit coverage is the prime candidate** for a direct match.
- Treat a **shared, transport-neutral domain model** spanning `@abapify/adt-cli` (REST)
  and `@arc-mcp/adt-ls` (adt-ls) as an **ecosystem collaboration track** with
  Petr/abapify — valuable for consistency, but it needs transport-neutral types +
  adapters, so it is not a dependency or a blocker.

## Consequences

- Correct types for the surface we actually consume.
- A clear, bounded reuse path that avoids re-importing the REST paradigm.
- License-clean (MIT → Apache-2.0, ADR-0011).

## Spike — S-schema (do before adopting any external types)

Capture adt-ls's live JSON for **ATC / AUnit / coverage / ddl-source** and diff against
the corresponding `@abapify/adt-schemas` XSD-derived types. Adopt types/codegen only
where shapes align; otherwise keep hand-written adt-ls JSON types.

## Revisit when

- adt-ls starts returning raw ADT XML for more capabilities, or the abapify shared
  domain-model collaboration lands.
