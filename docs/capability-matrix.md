# Capability matrix

What `@marianfoo/adt-ls` exposes, which adt-ls call backs each method, and the
object-type boundary. Live-verified against a4h (S/4HANA 2023, adt-ls
`1.0.0.202605281240`). adt-ls has **two channels** — its own **MCP** server (federated)
and the **LSP** surface (`adtLs/*` + standard `textDocument/*`); the client hides which
one serves a call. Raw access: `adt.raw.tool(name,args)` (MCP) and
`adt.raw.lsp(method,params)` (LSP).

## API → adt-ls call

| Client method | Channel | adt-ls call |
|---|---|---|
| `repository.search(pattern, {types,cold})` | LSP | `adtLs/repository/quickSearch` |
| `repository.getUsers()` | LSP | `adtLs/repository/getUsers` |
| `repository.getLsUri(adtUri)` | LSP | `adtLs/repository/getLsUri` |
| `repository.readFile / writeFile / delete` | LSP | `adtLs/fileSystem/{readFile,writeFile,delete}` |
| `repository.listInactive()` | LSP | `adtLs/activation/getInactiveObjects` |
| `source.read(ref)` | LSP | resolve → `fileSystem/readFile` |
| `lifecycle.create(ref)` | MCP | `abap_creation-create_object` |
| `lifecycle.update(ref)` | LSP | `fileSystem/writeFile` |
| `lifecycle.activate(ref, {forceActivation})` | LSP | `adtLs/activation/activate` (native — per-phase flags + diagnostics; **0.4.0**) |
| `lifecycle.runUnitTests(ref)` | MCP | `abap_run_unit_tests` |
| `lifecycle.delete(ref)` | LSP | `fileSystem/delete` (the `.json` metadata file) |
| `lifecycle.generate(...)` | MCP | `abap_generators-generate_objects` |
| `lifecycle.validate(...)` | MCP | `abap_creation-run_validation` |
| `lifecycle.listCreatableObjects / getObjectTypeDetails / listGenerators / getGeneratorSchema` | MCP | `abap_creation-*` / `abap_generators-*` |
| `lifecycle.getCreationForm(objectType)` | LSP | `adtLs/objectCreation/getCreationUiModelAndContent` (value-help types + name regex; **0.4.0**) |
| `navigation.documentSymbols / goToDefinition / goToDeclaration / findReferences / typeHierarchy / hover / documentHighlight / completion(+resolve) / checkSyntax` | LSP | `textDocument/*` (didOpen → query → didClose) |
| `navigation.format(ref)` | LSP | `textDocument/formatting` (ABAP Pretty-Printer, dyn-registered on didOpen; **0.4.0**) |
| `navigation.semanticTokens(ref)` | LSP | `textDocument/semanticTokens/full` → decoded via the legend (**0.4.0**) |
| `quality.runAtc / listAtcVariants` | LSP | `adtLs/atc/{runCheck,getCheckVariants}` |
| `quality.runUnitTestsWithCoverage` | LSP | `adtLs/abapUnit/runTests` + `adtLs/coverage/getCoverage` |
| `services.runApplication` | LSP | `adtLs/run/runApplication` |
| `services.serviceBindingDetails / publishServiceBinding` | LSP | `adtLs/businessservice/srvb/*` |
| `services.listServices / getServiceInfo` | MCP | `abap_business_services-{fetch_services,fetch_service_information}` (OData URL + entity sets; **0.4.0**) |
| `transport.find / create` | MCP | `abap_transport-{get,create}` (dynamic, backend-dependent) |
| `transport.assign / list / getLockStatus` | LSP | `adtLs/cts/transport/*`, `adtLs/fileSystem/getFileLockStatus` (always present) |
| `transport.check(ref, {operation})` | LSP | `adtLs/cts/transport/checkTransportForObjectLock` (decision oracle: needed? locked? assignable; **0.4.0**) |

## Object-type boundary (ADR-0012)

adt-ls serves **modern ABAP-Cloud / RAP** types headless; classic/legacy types return a
placeholder ("use Eclipse") and are **out of scope**.

- ✅ **Served:** CLAS, INTF, DDLS (CDS), DCLS (access control), SRVB (service binding),
  BDEF, SRVD, DDLX, DRAS, and the rest of the creatable modern set.
- ❌ **Not served (placeholder):** PROG, TABL, FUGR/FUNC, DOMA, DTEL, MSAG, TTYP, XSLT,
  SHLP, ENHO, … — `source.read` throws a clear error for these.

## Notes & gotchas

- **Pin the adt-ls build.** The `adtLs/*` protocol is private/unpublished and can change;
  this release targets `sapse.adt-vscode 1.0.0` / `1.0.0.202605281240`. The client reads
  `serverInfo.version` (`adt.health().adtLsVersion`).
- **`transport.find/create` are dynamic** — they come from the connected system's MCP
  IDE-Actions and vary per backend/version; `transport.assign/list/getLockStatus` use the
  always-present native LSP path. Unknown dynamic tools are reachable via `raw.tool`.
- **Sessions die silently** on idle — the client heals transparently (probe + re-logon +
  activity-gated keep-alive); `health().backendLive` is the real readiness signal.
- **`$TMP`/local packages** are non-transportable; `transport.create` refuses them.
