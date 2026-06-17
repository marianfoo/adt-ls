# Goal-command charter — `@arc-mcp/adt-ls`

Paste the block below as the argument to the goal command (e.g. `/goal <text>`). It is
the durable north star, **trimmed to the 4000-char goal-condition limit** (≈3920). The
full detail lives in [docs/plan.md](docs/plan.md) and [docs/adr/](docs/adr/README.md);
the prompt points the agent there.

```
Build @arc-mcp/adt-ls — a generic, reusable, Apache-2.0 TypeScript SDK that exposes EVERYTHING SAP's headless adt-ls (adt-lsc from the sapse.adt-vscode extension) provides, hiding all setup so driving adt-ls is a few lines — then make arc-1-lsp consume it, replacing src/adt-ls/* entirely. Feasibility PROVEN: full create→edit→activate→test→delete GREEN vs a4h on adt-ls 1.0.0.202605281240. Full ADRs (0001–0013) + plan live in /Users/marianzeis/DEV/adt-ls — read them first.

SCOPE: adt-ls ONLY — no direct ADT/SAP HTTP, no SAP-SDK sidecar, no MCP server, no CC/BTP bridge in the lib.

CHANNELS: use BOTH internally (LSP adtLs/*+textDocument/* AND adt-ls's own MCP) behind ONE unified API hiding the split; escape hatches adt.raw.tool(name,args) + adt.raw.lsp(method,params).

AUTH: authenticationKind=reentranceTicket always; pluggable LogonStrategy = basic(user,pass) | bearer(token|getToken) | interactive(callbacks: openUrl/promptField/onState) | custom. Interactive ships browser/TTY as a SEPARATE optional helper. No OAuth acquisition (caller supplies token). Drop SNC/Kerberos/SAML/PP.

PLATFORM: Win/Mac/Linux; matrix = darwin-arm64, darwin-x64, linux-x64, win32-x64. Discover adt-ls from sapse.adt-vscode (.vscode/.cursor/.vscode-insiders) + env + vendor/; use its bundled SAP Machine JRE 21; pipe via vscode-jsonrpc generateRandomPipeName.

TLS: truststore augmentation (bundled keytool + JAVA_TOOL_OPTIONS) + OPTIONAL localhost reverse-proxy for self-signed; `upstream` hook so consumers plug CC from outside.

RESILIENCE (built-in, transparent): cold-retry, dead-session revive (probe known object), activity-gated keep-alive, relogon-on-logged-off; health.backendLive.

MODEL: one adt-lsc process per createAdtLs instance, isolated store+data dir; pooling/multi-user = consumer's job.

VERSIONING: each release declares a supported adt-ls build; detect serverInfo.version at startup, warn on mismatch.

RUNTIME: Node-first ESM (no Bun), TS strict, tsup/tsdown, vitest, Biome.

TYPING (ADR-13): type from live adt-ls JSON as source of truth; OPTIONALLY reuse @abapify/adt-schemas types or its XSD→TS codegen ONLY where adt-ls emits raw ADT XML (coverage prime); shared transport-neutral domain model = ecosystem track with Petr/abapify; run spike S-schema before adopting any.

API: createAdtLs({adtLs?,connection,auth}) → adt.repository/source/lifecycle/navigation/quality/services/transport + adt.raw.tool/lsp + adt.health + adt.dispose(). Cover every adt-ls capability; coverage = adt-ls boundary (modern ABAP-Cloud/RAP in, classic out). Ship the live-verified capability matrix as docs.

SEED from arc-1-lsp's proven src/adt-ls/* (discovery, cert, driver, destinations, session-retry, cold-retry, repository, lifecycle, navigation, quality, services, federated, mcp-lifecycle).

TESTS/CI (3 tiers): unit on GitHub-hosted every PR; offline-integration (spawn+initialize, truststore) + live-SAP (a4h: logon + full lifecycle + dynamic-tool map) on a self-hosted runner — DOCUMENT runner setup for now, keep committed CI at Tier 1; skipIf-gate binary/SAP tests; ship setup-adt-ls extracting the platform subtree from a user VSIX into gitignored vendor/ (+ macOS de-quarantine). a4h cred = user MARIAN / SAP_S4_PRIMARY_PASSWORD (DEVELOPER stale → 401).

PROCESS: (1) review the ADRs + plan in /Users/marianzeis/DEV/adt-ls (module mapping arc-1-lsp↔lib, LogonStrategy + connection interfaces, S-win/S-dyn/S-schema milestones). (2) create arc-mcp/adt-ls repo + a new arc-1-lsp branch, build lib + integration together; arc-1-lsp keeps its MCP server, btp/CC bridge, authz, write-safety as thin wrappers (no backward-compat — not in prod). S-win runs later on the Windows VM.

DONE = published-quality @arc-mcp/adt-ls: easy to use, documented (README gotchas + capability matrix + quickstart), Apache-2.0, usable by anyone, used in arc-1-lsp in place of every adt-ls feature.
```
