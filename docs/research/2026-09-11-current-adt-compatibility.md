# Current ADT compatibility: research, plan, and validation

## Target and evidence (2026-09-11)

This repository wraps SAP's **headless adt-ls**, not the Eclipse application. Updating
Eclipse does not update this runtime, and a newer client does not upgrade a backend's
features or authorizations. This work keeps the adt-ls-only boundary (ADR-0001).

Local installation metadata and live handshakes establish:

| Component | Observed version |
| --- | --- |
| Newest local Eclipse installation | Eclipse 2026-06 / platform 4.40, build 4.40.0.20260604-0652 |
| ADT in that Eclipse installation | 3.60.2 |
| Current SAP Eclipse update-site ADT core/MCP features | 3.60.3 |
| Installed SAPSE.adt-vscode extension | 1.1.2 |
| Its headless LSP server | ADTLS 1.1.2.202608131517 |
| Its bundled ADT MCP component / JVM feature | 3.60.3 / SAP Machine 21.12.0 |
| MCP initialization | protocol 2025-06-18; ADT MCP Server 1.0.0 |
| Previous SDK verification target | adt-ls 1.0.1.202606111342 |

The Marketplace gallery's `extensionquery` response confirmed that 1.1.2 was the
newest published extension (all four supported platforms, published 2026-08-14).
The SAP update site's `latest/content.xml.xz` reported ADT core, core feature group
and MCP component 3.60.3. Thus the newest **local** Eclipse installation is one patch
behind the published Eclipse ADT update; no IDE installation was changed by this task.

Primary sources:

- [SAP current update-site metadata](https://tools.hana.ondemand.com/latest/content.xml.xz)
  supplies the published Eclipse plug-in versions.
- [SAP ADT 3.60 release notes](https://help.sap.com/docs/ABAP_Cloud/bbcee501b99848bdadecd4e290db3ae4/cbe6ee73bce04073a5271ad0de401208.html?locale=en-US)
  describe transport diffs, ATC updates, MCP integration and backend-dependent generators.
- [SAP's extension listing](https://marketplace.visualstudio.com/items?itemName=SAPSE.adt-vscode)
  lists programs/includes, function groups/modules, dictionary definitions, CDS/RAP,
  debugging, ABAP Unit, ATC and transport management. This is a product feature list,
  not a promise that every feature is exposed by the headless SDK on every backend.
- [MCP Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
  defines JSON/SSE responses, response correlation, optional session IDs and the
  negotiated protocol header.
- [MCP tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
  defines tool schemas, annotations, pagination and tool-level errors.
- Local SAP extension `package.json`, Eclipse `bundles.info`, and the installed
  extension's JavaScript request construction were inspected. No SAP binaries are
  copied into this repository. Live `initialize` and `tools/list` are the runtime
  source of truth; the public documentation alone cannot establish private LSP contracts.

## Confirmed gaps

1. **MCP startup drops authoring tools.** The installed extension sends
   `fileSystemMode: "VFS"` to `adtLs/mcp/startMCPServer`. Our SDK only sends port/token.
   On 1.1.2 this gives 15 tools; VFS gives 20, restoring `abap_creation-create_object`,
   `abap_activate_objects`, `abap_run_unit_tests`, `abap_generators-generate_objects`,
   and `abap_atc_run`. A successful startup smoke test alone missed the regression.
2. **Discovery chooses the first editor, not the newest runtime across editors.**
   An outdated VS Code installation can mask a newer Cursor/Insiders installation.
   Invalid explicit paths can silently select a different runtime.
3. **MCP transport assumptions are too narrow.** Fixed request IDs, first-line SSE
   parsing, mandatory session IDs, missing protocol headers, ignored HTTP/list errors,
   and missing pagination can yield false empty/success results or hang consumers.
4. **Runtime capabilities are hidden.** Current tools include transport unified diffs
   and ATC quick-fix/result tools, but consumers cannot enumerate their actual schemas.
   Availability must be discovered rather than inferred from an Eclipse release number.
5. **Creation cannot supply type-specific fields.** The creation form can report them,
   but the create/validate API only forwards name/package/description.
6. **Coverage input drift.** The current extension sends `uris` to `abapUnit/runTests`;
   our coverage wrapper uses `lsUris`. Verify and repair with a real test class.
7. **Failure cleanup and diagnostics.** Driver spawn failures lack an error handler;
   several client initialization failures leak owned resources. Foundation mode must
   initialize an isolated destination store too.
8. **Documentation and live test assumptions are stale.** On 1.1.2/A4H, SFLIGHT returns
   `.tabl.ddic` source and the creatable catalog includes PROG, FUGR, TABL, ENQU and TYPE.
   Old fixed-version assertions and A4H port 50001 defaults need correction.

## Reviewed implementation plan

- [x] Restore VFS startup for both the unified client and exported launcher helper.
- [x] Correct runtime discovery and update the verified build, retaining the documented
      **1.1.2 minimum** after live tests established incompatible native contracts.
      The initial plan to retain 1.0.1 was rejected during review for this reason.
- [x] Harden the existing small MCP client: streaming JSON/SSE response correlation,
      protocol/session negotiation, explicit errors, timeout/cleanup and paginated tools.
      Never automatically replay mutating tools after uncertain network failures.
- [x] Expose fresh LSP/MCP capabilities (including full tool schemas); add a paged
      transport diff convenience method for the newly exposed read operation.
- [x] Forward type-specific creation/validation fields without allowing them to override
      the explicit object name, package or description. Correct native coverage parameters.
- [x] Clean up failed startup and isolate foundation-mode destination storage.
- [x] Add meaningful unit/HTTP integration regressions, a binary-only authoring-tool
      contract smoke test, and live A4H lifecycle/coverage/classic-source checks.
- [x] Update setup, usage, API reference and capability boundaries with measured evidence.
- [x] Review the final diff, fix findings and repeat affected tests; run CI checks and
      packaging validation. PR publication follows this review.

Plan review: implement the observed VFS regression first. Do not replace working LSP
operations with new MCP tools unnecessarily. Do not infer full Eclipse parity: debugger
UI, refactoring, data preview and backend/licensed AI functions need separate contracts.
Expose newly advertised tool schemas through capabilities/raw access; only add convenience
wrappers whose request contracts are observed. Unit tests must cover failure behavior,
while live tests verify the actual SAP wire contract and clean up their own unique objects.

## Wire migration reference

These are request/result fields, not renamed public SDK methods. The names are case
sensitive. Existing by-name lifecycle methods retain their names.

| Operation | Previous SDK request/assumption | Current contract and implementation |
| --- | --- | --- |
| `adtLs/mcp/startMCPServer` | `{port, token}` | `{port, token, fileSystemMode: "VFS"}`; 20 tools rather than 15 |
| `adtLs/activation/activate` | `lsUris: [uri]` | `fileUris: [uri]`; destination, references and forceActivation remain |
| Activation refresh/diagnostics | `refreshLsUris`, diagnostic `lsUri` | `refreshFileUris`, diagnostic `fileUri`; public `refreshedUris` and raw diagnostic entries preserved |
| `adtLs/activation/getInactiveObjects` | `{destinationId}` | `{destination}` |
| `adtLs/abapUnit/runTests` | `{lsUris: [uri], measurement: "COVERAGE"}` | `{uris: [uri], measurement: "COVERAGE"}` |
| `adtLs/fileSystem/delete` | `{uri}` | `{uri, options: {recursive: false, force: true}}`; confirms enclosing-object deletion; omission caused internal error, false force returned code 1003 |
| `abap_run_unit_tests` | `{destination, uris}` | `{uris}` only: `additionalProperties: false`; success can be plain text `Overall Test Run Status: [PASSED]` |
| `abap_transport-create` | object name/type optional | `objectName` and `objectType` required by the current schema and public type |
| `abap_transport-unifiedDifference` | no wrapper | `destination`, `transportNumber`, `pageSize` (1–40, default 40), optional opaque `cursor` |
| Transport diff result | descriptions refer to `next_cursor` | Actual JSON uses `nextCursor`, `diffResult`, `batchInfo.status`; continue through empty batches until completed |
| `abap_creation-create_object` / `run_validation` | fixed three-field objectContent | JSON string also includes `additionalFields`; explicit name/package/description win |
| MCP initialization | session ID mandatory | Session ID optional; negotiate 2025-06-18 (also accepts 2025-03-26), send its protocol header thereafter |
| MCP responses | first parseable line, fixed IDs, ignored HTTP/list errors | Unique IDs, correlated JSON or streamed multiline SSE response, errors surfaced, all tools/list pages fetched |
| MCP session expiry | missing result could look successful | Reinitialize on HTTP 404, then throw without replaying the failed operation |
| Cleanup | gaps after spawn/logon/MCP failure; user data directory deleted | Owned resources cleaned on all startup failures; explicit low-level dataDir preserved |

## Public API additions and migration

- `adt.capabilities(): Promise<AdtLsCapabilities>` returns a copied LSP initialization
  capability object and freshly enumerated `McpTool[]`. Tool descriptors retain schemas,
  annotations and extra fields. Per-document dynamic LSP registrations are not included
  in the initialization snapshot.
- `adt.transport.getDiff(transportNumber, {cursor?, pageSize?})` returns one
  `TransportDiffPage`. Iterate `nextCursor`; empty `diffResult` does not mean completion.
- `lifecycle.create` and `lifecycle.validate` accept `additionalFields` for the
  type-specific creation contract. Consult `getCreationForm` first.
- `transport.create` now requires `objectName` and `objectType`. It still rejects local
  packages before creating a transport.
- `ParsedAdtLsVersion`, `TransportDiffPage`, `McpTool` and `AdtLsCapabilities` are public
  types. The generated [API reference](../api/README.md) includes these and the existing
  client-cert/version APIs that were missing from the old Markdown reference.
- A missing/directory-valued explicit runtime path is an error; it no longer falls back
  to a different installation. Automatic discovery compares versions across all editors.
- Supply connection and auth together, or omit both. Foundation mode now initializes
  its own destination store. Calling operations after disposal fails promptly.

## Review and test iterations

1. Baseline: 109 tests passed, 3 backend-dependent tests skipped. Real 1.1.2 LSP/MCP
   startup passed despite missing authoring tools: the original smoke coverage was insufficient.
2. VFS probe restored the five missing tools. Live reads/catalog invalidated the blanket
   classic-object restriction. Added foundation-mode tool-contract smoke coverage.
3. Live lifecycle tests exposed changed activation fields, inactive listing parameters,
   unit-test response text and delete options. Fixed contracts, made test object names
   unique, removed the old direct SAP-port defaults and repaired teardown.
4. A real local ABAP test class passed, and native coverage returned its test tree plus
   measurement data. Formatting, completion resolve, semantic tokens, creation form,
   V2 service information and deliberately broken activation diagnostics passed.
5. Schema review caught the 40-object diff limit and forbidden extra destination argument
   on the unit-test tool. Added fixture-based required-field/closed-schema checks against
   the captured SAP tool schemas. Confirmed mandatory transport object fields too.
6. Failure-path review caught a potential self-wait when initialization's notification
   receives HTTP 404. Added a regression and excluded initialization notifications from
   session re-establishment. Checked process errors, initialization timeout, old-version
   rejection, repeated start, caller-data preservation and failed client startup cleanup.
7. Generated both Markdown and HTML API references without warnings. Packaging checks
   ensure the npm artifact contains compiled SDK files, README and license only, with
   no SAP runtime, test credentials or local research artifacts.

## Live observations beyond the automated suite

- Trusted A4H HTTPS port 443; reentrance-ticket Basic logon, search and explicit reconnect.
- Class source, SFLIGHT `.tabl.ddic` source, and RS005ADDRS/RS005ADR program source.
- Creatable catalog: 24 types, including PROG, FUGR, TABL, ENQU and TYPE families.
- Native ATC on CL_ABAP_TYPEDESCR returned `{atcRunCheckResults: []}`; this is a completed
  empty report, not evidence that every ATC variant/check or fix is available.
- Existing transport A4HK900110: three one-object diff pages, status processing →
  processing → completed. The first page had no diff; later pages contained changes.
  No transports were created, released, changed or deleted by the live probes.
- Test objects left during the initial failing delete iterations were identified by their
  unique names and test metadata, deleted after the fix, and a final search found none.

## Final validation record

| Final check | Result |
| --- | --- |
| Full suite, Node 22.21.1, current binary and live A4H credentials | **140 passed, 1 skipped**, 26 test files passed; ~23 seconds |
| Node 20 suite excluding smoke files | **135 passed**, 21 test files |
| Bun 1.3.14, built ESM SDK | Live A4H logon, 20-tool capability discovery, class search, disposal passed |
| Lint / TypeScript / build | Passed |
| Markdown / HTML TypeDoc | Both generated, no warnings |
| Relative Markdown documentation links | All resolve locally |
| `npm pack --dry-run --json` | 6 files, no bundled dependencies or SAP binaries |
| Diff whitespace / final source and schema review | Passed; no remaining actionable findings identified |

The one skipped test requires a configured live client-certificate backend and PEM
credentials. Local certificate/truststore and mutual-TLS proxy tests passed. No claim is
made that this skipped integration ran.

Native SAP integration verification is **macOS arm64/A4H only**. Windows/Linux/Intel macOS runtime
execution, a newly configured mutual-TLS backend and actual AI/deterministic ATC fix
execution are not claimed. TLS/client-cert local HTTP tests do run without SAP credentials.

The implementation adds no direct ADT REST client, Eclipse sidecar, bundled SAP binaries,
new runtime dependencies, or automatic retry of uncertain MCP mutations.
