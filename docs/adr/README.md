# Architecture Decision Records — `@arc-mcp/adt-ls`

Each ADR captures one decision: the **context**, the **decision**, its **consequences**,
and a **"revisit when"** trigger (most of this design is shaped by *current* adt-ls
limitations that SAP may lift — when they do, simplify). Status values: `Accepted`,
`Superseded`, `Proposed`.

Reference at time of writing: `sapse.adt-vscode` **1.0.1** / adt-ls
**1.0.1.202606111342** / SAP Machine JRE **21.11.0**. Feasibility baseline refreshed
on 2026-06-12; the original a4h end-to-end proof was recorded on 2026-06-07.

| # | Title | Status |
|---|-------|--------|
| [0001](0001-scope-adt-ls-only.md) | Scope: adt-ls only | Accepted |
| [0002](0002-dual-channel-unified-api.md) | Dual channel internally, one unified API | Accepted |
| [0003](0003-auth-logon-strategies.md) | Auth: reentrance ticket + pluggable LogonStrategy | Accepted |
| [0004](0004-discovery-byo.md) | adt-ls discovery & bring-your-own binary | Accepted |
| [0005](0005-cross-platform-transport.md) | Cross-platform transport & process | Accepted |
| [0006](0006-tls-trust.md) | TLS / trust handling | Accepted |
| [0007](0007-resilience.md) | Session resilience built-in | Accepted |
| [0008](0008-runtime-packaging.md) | Runtime & packaging (Node-first ESM) | Accepted |
| [0009](0009-version-pinning.md) | adt-ls version pinning | Accepted |
| [0010](0010-process-isolation-model.md) | Process & isolation model | Accepted |
| [0011](0011-license.md) | License: Apache-2.0 | Accepted |
| [0012](0012-public-api-coverage.md) | Public API surface & capability coverage | Accepted |
| [0013](0013-typing-strategy.md) | Typing strategy & abapify/adt-schemas reuse | Accepted |
