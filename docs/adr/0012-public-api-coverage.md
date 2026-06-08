# ADR-0012 — Public API surface & capability coverage

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The goal is to cover **everything adt-ls offers**, at a **high level**, hiding the
channel split (ADR-0002), while staying within adt-ls's headless object-type boundary:
modern ABAP-Cloud / RAP types are served (CLAS, INTF, DDLS, DCLS, SRVB, BDEF, SRVD,
DDLX, DRAS…); classic types (PROG, TABL, FUGR, DOMA, DTEL, MSAG…) return a placeholder
("use Eclipse") and are out of scope.

## Decision

A factory + namespaced client:

```
createAdtLs({ adtLs?, connection, auth }) → AdtLsClient
  .repository   search · getUsers · getLsUri · file read/write/delete
  .source       read source (per include for classes)
  .lifecycle    create · update · activate · runUnitTests · delete · generate · validate
  .navigation   documentSymbols · definition · declaration · references · typeHierarchy ·
                hover · documentHighlight · checkSyntax · completion
  .quality      runAtc · listAtcVariants · runUnitTestsWithCoverage
  .services     runApplication · serviceBindingDetails · publishServiceBinding
  .transport    find · create · assign · list · getLockStatus
  .raw          lsp(method, params) · tool(name, args)        // ADR-0002 escape hatches
  .health()     { connected, backendLive, adtLsVersion }
  .dispose()
```

- High-level operations are the public contract; channel choice is internal.
- The **live-verified capability matrix** (ported from arc-1-lsp's
  `adt-ls-reference.md`) ships as docs and is the authoritative coverage map.
- The library does **not** gate writes or enforce package allowlists — that is the
  consumer's policy layer (e.g. arc-1-lsp's write-safety).

## Consequences

- One coherent, documented API; coverage is explicit and honest about the boundary.
- New adt-ls capabilities are added as typed methods; the dynamic tail stays on `raw`.

## Revisit when

- adt-ls serves classic types headless, or adds/removes operations.
