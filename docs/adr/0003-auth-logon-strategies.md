# ADR-0003 — Auth: reentrance ticket + pluggable LogonStrategy

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

For HTTP logon, adt-ls's destination `authenticationKind` must be
**`reentranceTicket`** — `basicAuth` is accepted at create time but fails session
dispatch ("password must not be null"; live-verified). So there is effectively *one*
on-the-wire method; what differs is **how the reentrance ticket is obtained**: a Basic
credential (on-prem fixed user), a Bearer/OAuth token (BTP ABAP / Steampunk), or an
interactive browser SSO completed by a human. SNC/Kerberos/X.509 require the native SAP
crypto library (desktop-only, not feasible headless in pure TS); SAML collapses into
interactive-or-bearer; Principal Propagation is unreliable for ADT and is CC/BTP
territory (out of scope, ADR-0001).

## Decision

`authenticationKind` is always `reentranceTicket`. Auth is a pluggable
**`LogonStrategy`** with built-ins:
- `basic(user, password)` — fetch the ticket headlessly (fire-and-forget delivery).
- `bearer(token | getToken)` — caller supplies the token; the library does **not**
  implement OAuth/XSUAA/IAS acquisition.
- `interactive(callbacks)` — `openUrl` / `promptField` / `onStateChange`; the library
  ships **no** hardcoded browser/TTY (that would break genericity). A batteries-included
  browser+TTY helper is a **separate optional sub-export**.
- `custom(handler)` — full escape hatch.

Drop SNC/Kerberos/SAML-direct/Principal-Propagation.

## Consequences

- Dead-simple default (`auth: basic(...)`), one-liner for the common case.
- Works headless (servers/agents) and interactively (CLIs/desktop) from one library.
- BTP OAuth plumbing stays in the consumer (keeps the lib generic and CC-free).

## Revisit when

- SAP adds a non-interactive/native auth (basic/token/client-credentials) or documents
  a headless logon → much of the reentrance dance and the TLS proxy can be dropped.
