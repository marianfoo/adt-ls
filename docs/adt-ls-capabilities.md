# adt-ls capability survey (1.1.2)

Verified target: **ADTLS 1.1.2.202608131517**, SAPSE.adt-vscode **1.1.2**, macOS arm64,
A4H over HTTPS. The corresponding local Eclipse installation has ADT 3.60.2 on
Eclipse 2026-06. These are different distributions with different version numbers.

The [dated research and migration record](research/2026-09-11-current-adt-compatibility.md)
contains the evidence, reviewed plan, protocol changes and validation results. The
[complete runtime snapshot](research/2026-09-11-adt-1.1.2-capabilities.json) records LSP
initialization providers and all 20 MCP tool descriptors, including input/output schemas.
For the previous 1.0.1 survey, see the repository history before this upgrade.

## Channels and current coverage

| Surface | SDK coverage | Boundary |
| --- | --- | --- |
| LSP repository / virtual file system | Search, source and metadata reads/writes, deletion, inactive objects, AFF URI resolution | Supported types depend on runtime and backend |
| LSP object lifecycle | Activation, creation forms, locking and transport decisions | Current `fileUris` / `refreshFileUris` contract |
| Standard LSP | Symbols, definitions/declarations, references, type hierarchy, completion/resolve, hover, highlights, diagnostics, semantic tokens, formatting | Formatting is registered dynamically for open documents |
| LSP quality/runtime | ATC variants/runs, ABAP Unit coverage, console apps, service bindings | Backend capabilities and permissions still apply |
| MCP authoring | Create, validate, generators, ABAP Unit, service information | Startup must select `fileSystemMode: "VFS"` |
| MCP transport | Find/create requests, paged unified diffs | `getDiff` is read-only; pages contain at most 40 objects |
| Dynamic/new MCP tools | Fresh discovery through `capabilities()`; calls through `raw.tool()` | Schema presence is not proof of execution support or license entitlement |
| Other private LSP requests | `raw.lsp()` | Use observed contracts; no published compatibility guarantee |

## MCP tools observed in VFS mode

These 20 names were returned in an isolated foundation session without a destination.
The same contracts can be inspected again after connecting. New SAP releases/backends
may change the list; the SDK fetches every page instead of caching a fixed inventory.

| Group | Tools | Usage |
| --- | --- | --- |
| ATC | `abap_atc_run`, `abap_atc_get_result`, `abap_atc_execute_deterministic_quickfixes`, `abap_atc_apply_ai_fix`, `abap_atc_get_ai_fix_result` | Discovered/raw. The existing `quality.runAtc` uses native LSP. Fix execution was not exercised on user code. |
| Business services | `abap_business_services-fetch_services`, `abap_business_services-fetch_service_information` | `services.listServices/getServiceInfo` |
| Activation/tests | `abap_activate_objects`, `abap_run_unit_tests` | Native `lifecycle.activate` provides phase flags; `lifecycle.runUnitTests` uses MCP |
| Object creation | `abap_creation-create_object`, `abap_creation-get_all_creatable_objects`, `abap_creation-get_object_type_details`, `abap_creation-run_validation` | `lifecycle.create/listCreatableObjects/getObjectTypeDetails/validate` |
| Generators | `abap_generators-generate_objects`, `abap_generators-list_generators`, `abap_generators-get_schema` | `lifecycle.generate/listGenerators/getGeneratorSchema` |
| Destinations | `abap_list_destinations` | `listDestinations` |
| Transports | `abap_transport-create`, `abap_transport-get`, `abap_transport-unifiedDifference` | `transport.create/find/getDiff` |

Omitting VFS leaves only 15 tools. Create, activation, unit tests, generator execution
and MCP ATC-run disappear even though the server starts successfully. The binary-only
foundation smoke test checks this authoring contract explicitly.

## Object support: retire the old classic/modern blanket split

Live reads on 1.1.2/A4H returned class source, SFLIGHT table definition source
(`.tabl.ddic`), and program source (RS005ADDRS and RS005ADR). The creatable catalog also
advertised programs/includes, function groups/modules/includes, structures, tables,
lock objects and type groups alongside classes/interfaces and CDS/RAP objects.

This establishes broader support than the old 1.0.1 survey. It does **not** establish
that every catalog entry supports every operation on every backend. Check the catalog,
creation form and actual read result. DOMA, DTEL, MSAG, SHLP, TTYP and other types must
not be assumed supported merely because Eclipse can edit them.

The SDK does not maintain a classic-object denylist. It raises a descriptive error
when source reads return SAP's unsupported-editor placeholder. Type-specific creation
fields can be passed through `additionalFields`; explicit identity fields take precedence.

## Current limits and future work

- Full Eclipse parity is not achievable by changing this SDK alone. It can expose
  contracts SAP makes available through adt-ls, subject to backend support.
- Rename, standard `codeAction`, signature help, call hierarchy, workspace symbols and
  workspace diagnostics were not advertised by the current initialization response.
  The earlier negative probes are historical evidence, not a reason to claim that new
  ATC MCP quick fixes are impossible. The quick-fix tools are now discoverable.
- The extension has debugger-related requests, but this SDK does not implement a debug
  adapter, breakpoint lifecycle, variable inspection or the interactive UI.
- Free SQL/data preview, Git, transport release/delete, runtime dumps/tracing and FLP
  customization have no high-level SDK API or newly verified contract in this survey.
- Generators and AI features remain backend-dependent. Catalog/schema discovery is
  supported; no production RAP generation or AI quick-fix run was performed here.
- Current integration verification is macOS arm64/A4H. Platform path unit tests do not
  constitute native Windows, Linux or Intel-macOS runtime verification.

## Reproduce the survey

```sh
npm ci
npm run build
node scripts/inspect-adt-ls.mjs > capabilities.json
npm test
```

The inspector starts a temporary foundation session and disposes it, without reading
Eclipse's workspace or the global destination store. It prints only runtime metadata and
contracts. For a connected snapshot:

```ts
const { lsp, tools } = await adt.capabilities();
console.log(JSON.stringify({ version: adt.health().adtLsVersion, lsp, tools }, null, 2));
```

Live A4H tests use `ADTLS_TEST_PASSWORD`, optional `ADTLS_TEST_USER`, and optional
`ADTLS_TEST_URL`; the default URL is trusted HTTPS on port 443. See [setup](setup.md).
