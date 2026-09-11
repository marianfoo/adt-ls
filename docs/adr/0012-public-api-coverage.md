# ADR-0012 — Public API surface & capability coverage

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The goal is to cover **everything adt-ls offers**, at a **high level**, hiding the
channel split (ADR-0002), while staying within adt-ls's runtime/backend object-type
boundary. The original 1.0.1 survey found classic-object placeholders. The 2026-09-11
1.1.2 survey supersedes that blanket limit: table/program source is now served and the
creation catalog includes several classic types. Unsupported placeholders remain errors.

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
  .transport    find · create · assign · list · getLockStatus · getDiff
  .raw          lsp(method, params) · tool(name, args)        // ADR-0002 escape hatches
  .capabilities()  LSP providers and all current MCP tool schemas
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
