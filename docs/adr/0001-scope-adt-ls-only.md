# ADR-0001 — Scope: adt-ls only

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

There are several ways to reach SAP ADT: the official SAP ADT SDK (Java/Eclipse
bundles), direct ADT REST (`/sap/bc/adt/*`, what abap-adt-api / abapify-adt-cli /
openADT's HTTP fallback do), and SAP's headless **adt-ls** (`adt-lsc`, shipped in
`sapse.adt-vscode`). adt-ls *is* the official SDK pre-packaged by SAP into a headless
language server — using it means SAP maintains CSRF, locking, activation, XML, and
transport for us. Its only real downside is setup complexity, which this library
removes.

## Decision

The library targets **adt-ls exclusively**. It will **never**:
- make direct ADT HTTP calls (`GET /sap/bc/adt/…`),
- embed or sidecar the SAP ADT SDK,
- host its own MCP server,
- contain a Cloud-Connector / BTP connectivity bridge.

What adt-ls cannot do headless is **out of scope**, not a
gap to patch. Consumers needing direct-REST coverage use a different tool.

## Consequences

- Clean product boundary; SAP owns the hard ADT semantics.
- Capability ceiling = adt-ls's headless surface (see ADR-0012).
- The library can never be "tempted" into a hybrid direct-REST path, even when adt-ls
  is missing a feature — that pressure is resolved by scope, not code.

## Revisit when

- adt-ls's capability surface materially expands or shrinks.
- A genuine need arises for a *separate* direct-REST sibling (that is a different
  package, not this one).
