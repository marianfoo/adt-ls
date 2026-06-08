# ADR-0002 — Dual channel internally, one unified API

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

adt-ls exposes capabilities over **two** channels, and neither alone is complete
(live-verified): the **LSP** channel (`adtLs/*` custom requests + standard
`textDocument/*`) serves search, name→URI resolve, read/write/delete, ATC, native CTS
transport, and all code-intelligence; adt-ls's **own MCP server** serves
create/activate/run-unit-tests/validate, object-type details, generators, and
business-services. adt-ls's MCP has *no* read-source tool; the LSP channel has no
create tool.

The consumer asked: no MCP *server* in the library, but using the MCP *channel*
internally is fine.

## Decision

The library uses **both channels internally**, behind **one unified high-level API**
that hides which channel serves a given operation. It is an MCP *client* to adt-ls's
own MCP server (federation), never an MCP server itself.

Two raw escape hatches are exposed for the long tail:
- `adt.raw.lsp(method, params)` — any LSP / `adtLs/*` request.
- `adt.raw.tool(name, args)` — any tool on adt-ls's MCP (esp. backend-dynamic ones).

## Consequences

- Callers get a coherent API and never reason about LSP-vs-MCP.
- Full capability coverage despite the split surface.
- Backend-dynamic MCP tools (which vary per system/version) remain reachable via
  `raw.tool` without the library pre-typing them.

## Revisit when

- SAP unifies the channels, or ships `adt_lsp_*` MCP tools that duplicate the LSP
  code-intelligence (then federate those instead of the LSP bridge).
