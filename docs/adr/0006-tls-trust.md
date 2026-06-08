# ADR-0006 — TLS / trust handling

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

adt-ls requires an **HTTPS** `systemUrl` and **validates the backend cert's hostname**;
its Apache HTTP client ignores `-Djdk.internal.httpclient.disableHostnameVerification`.
Enterprise on-prem systems usually present a proper corporate-CA cert (trust just needs
the CA); dev systems (e.g. a4h) present a self-signed `CN=*.dummy.nodomain` that fails
both trust *and* hostname. BTP ABAP systems have valid public CA certs. Cloud-Connector
routing is out of scope for the library (ADR-0001).

## Decision

- **Truststore augmentation (always available):** build a truststore from the bundled
  JRE's `cacerts` + any `extraCaCerts` the consumer supplies, injected via
  `JAVA_TOOL_OPTIONS` (`-Djavax.net.ssl.trustStore…`). Covers corporate-CA on-prem and
  public-CA BTP with no proxy.
- **Optional localhost TLS reverse-proxy (engaged only for self-signed/hostname
  mismatch):** present a `CN=localhost` cert (added to the truststore) and re-originate
  to the backend with verification off. Off by default; auto-engaged when
  `connection.selfSigned` (or detected hostname mismatch).
- **`upstream` hook:** the proxy's backend hop is pluggable so a consumer (e.g.
  arc-1-lsp) can route through a Cloud-Connector/BTP bridge **from outside** the library.

## Consequences

- Enterprise-ready out of the box (corporate CA via truststore; valid-CA BTP needs
  neither proxy nor custom trust).
- Runtime deps: `keytool` (bundled JRE) + `openssl` (cert gen) on the proxy path.
- CC/BTP complexity stays in the consumer, not the library.

## Revisit when

- adt-ls honors hostname-verification flags or accepts a configurable truststore
  directly → the localhost proxy can be dropped for the self-signed case.
