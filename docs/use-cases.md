# Use cases — dev tools & CI/CD with `@marianfoo/adt-ls`

This guide shows **how real-world developer tools and CI/CD pipelines** use the library,
which API to reach for, and copy-pasteable code for each scenario. For the full method
reference see the [hosted API docs](https://marianfoo.github.io/adt-ls/); for connection
details see [`usage.md`](./usage.md).

## Why it's easy

- **One call to connect.** `createAdtLs({ connection, auth })` does discovery + spawn + the
  LSP handshake + logon + MCP — you get back a typed client.
- **Typed namespaces, not raw protocol.** `adt.repository`, `adt.lifecycle`, `adt.navigation`,
  `adt.quality`, `adt.services`, `adt.transport` — no JSON-RPC, no XML, no CSRF, no locking.
- **BYO binary, auto-discovered.** No host/port/SNC config to hand-write; it finds `adt-lsc`
  from the installed `sapse.adt-vscode` extension (or a vendored copy).
- **Node ≥ 20 *and* Bun.** Same package in both runtimes (verified live).
- **Silent by default.** Logs to a no-op logger until you opt in (`setLogger(stderrLogger)`),
  so it won't pollute stdout in a CLI or a pipeline.
- **`dispose()` cleans everything** — kills `adt-lsc`, closes the proxy, removes temp dirs.

## The 30-second mental model

```ts
import { createAdtLs, basic } from '@marianfoo/adt-ls';

const adt = await createAdtLs({
  connection: { systemUrl: 'https://my-s4:50001', client: '100', selfSigned: true },
  auth: basic(process.env.SAP_USER!, process.env.SAP_PASS!),
});
try {
  const hits = await adt.repository.search('ZCL_*', { types: ['CLAS/OC'] });
  // …do work via adt.repository / lifecycle / navigation / quality / transport…
} finally {
  await adt.dispose(); // always
}
```

Every object is addressed by `{ name, objectType }` (e.g. `{ name: 'ZCL_FOO', objectType: 'CLAS/OC' }`).

---

## Getting `adt-lsc` available (including in CI)

> **Full walkthrough:** [docs/setup.md](./setup.md) — which platform build to download, CI
> vendoring, the bundled JRE, and connecting with auth. (Summary below.)

The `adt-lsc` binary ships inside SAP's `sapse.adt-vscode` extension and is **not
redistributable** (SAP Developer License) — so the library never bundles it; you provide it.

| Environment | How |
| --- | --- |
| **Local dev** | Install the [SAP ADT VS Code extension](https://marketplace.visualstudio.com/items?itemName=SAPSE.adt-vscode) in VS Code / Cursor — auto-discovered. |
| **Custom path** | `createAdtLs({ adtLs: { path: '/opt/adt-lsc' }, … })` or set `ADT_LS_PATH`. |
| **CI / containers** | Vendor the per-platform VSIX you're licensed for: `node scripts/setup-adt-ls.mjs ./adt-vscode-linux-x64.vsix` extracts it into `vendor/`, then **cache** that directory. |

> **CI reality:** ABAP CI usually runs on a **self-hosted runner** that (a) has the licensed
> `adt-lsc` and (b) can reach the SAP system (often a corporate network). The library handles
> everything else.

---

## Connecting (pick the one that fits)

```ts
// Direct, internet-reachable, self-signed cert (engages the localhost TLS proxy)
await createAdtLs({ connection: { systemUrl: 'https://host:50001', client: '100', selfSigned: true }, auth: basic(u, p) });

// Corporate CA instead of self-signed
await createAdtLs({ connection: { systemUrl, extraCaCerts: ['/etc/ssl/corp-root.pem'] }, auth: bearer(token) });

// Behind a Cloud Connector / forward proxy
await createAdtLs({ connection: { systemUrl, selfSigned: true, forwardProxy: { host: '127.0.0.1', port: 20003 } }, auth: basic(u, p) });

// Foundation mode — adt-lsc up, no SAP (e.g. to introspect or just check discovery)
await createAdtLs({});
```

**Auth in pipelines:** use **`basic(user, pass)`** or **`bearer(token)`** with CI secrets —
they obtain the reentrance ticket headlessly. `interactive()` (browser SSO) is for desktop
tools only; it can't run in a headless pipeline.

---

## CI/CD pipelines

### 1. ABAP Unit tests as a build gate

**Use:** `lifecycle.runUnitTests({ name, objectType })` — fail the job if tests fail.

```ts
// run-abap-tests.ts
import { createAdtLs, basic, setLogger, stderrLogger } from '@marianfoo/adt-ls';
setLogger(stderrLogger); // diagnostics on stderr, never stdout

const adt = await createAdtLs({
  connection: { systemUrl: process.env.SAP_URL!, client: process.env.SAP_CLIENT!, selfSigned: true },
  auth: basic(process.env.SAP_USER!, process.env.SAP_PASS!),
});
try {
  const units = ['ZCL_ORDER', 'ZCL_INVOICE'];
  let failed = false;
  for (const name of units) {
    const result = await adt.lifecycle.runUnitTests({ name, objectType: 'CLAS/OC' });
    console.log(name, JSON.stringify(result));        // the adt-ls test payload
    if (/fail|error/i.test(JSON.stringify(result))) failed = true;
  }
  process.exit(failed ? 1 : 0);
} finally {
  await adt.dispose();
}
```

```yaml
# .github/workflows/abap-tests.yml  (self-hosted runner with adt-lsc + SAP reachability)
jobs:
  abap-unit:
    runs-on: [self-hosted, sap]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: node run-abap-tests.ts
        env:
          SAP_URL: ${{ secrets.SAP_URL }}
          SAP_CLIENT: '100'
          SAP_USER: ${{ secrets.SAP_USER }}
          SAP_PASS: ${{ secrets.SAP_PASS }}
```

### 2. ATC (static analysis) gate on PRs

**Use:** `quality.runAtc(ref, { checkVariant? })` — `''` (default) uses the system default
variant; `quality.listAtcVariants(ref, { query })` discovers variants.

```ts
const atc = await adt.quality.runAtc({ name: 'ZCL_ORDER', objectType: 'CLAS/OC' });
// atc = the ATC result payload (findings grouped by object). Fail on priority-1/2:
const findings = JSON.stringify(atc);
if (/"priority"\s*:\s*[12]\b/.test(findings)) {
  console.error('ATC priority-1/2 findings — failing the build');
  process.exit(1);
}
```

### 3. Syntax / "does it compile" check on every PR

**Use:** `navigation.checkSyntax({ name, objectType })` — cheap, fast, no activation.

```ts
const diags = await adt.navigation.checkSyntax({ name: 'ZCL_ORDER', objectType: 'CLAS/OC' });
if (Array.isArray(diags) && diags.length) { console.error(diags); process.exit(1); }
```

### 4. Code coverage reporting

**Use:** `quality.runUnitTestsWithCoverage(ref)` — runs ABAP Unit with coverage measurement.

```ts
const cov = await adt.quality.runUnitTestsWithCoverage({ name: 'ZCL_ORDER', objectType: 'CLAS/OC' });
// publish cov as a CI artifact / coverage summary
```

### 5. Deploy + activation gate

**Use:** `lifecycle.create` → `update` → `activate` — and fail on activation diagnostics.
Great for "promote sources from git into a sandbox and prove they activate clean."

```ts
const ref = { name: 'ZCL_ORDER', objectType: 'CLAS/OC' };
await adt.lifecycle.update({ ...ref, source: await fs.readFile('src/zcl_order.clas.abap', 'utf8') });
const act = await adt.lifecycle.activate(ref);            // → { success, diagnostics }
if (!act.success || act.diagnostics.length) { console.error(act.diagnostics); process.exit(1); }
```

---

## Local developer tools

### 6. A repository-search CLI

**Use:** `repository.search(pattern, { types, maxResults })` → `{ references: [{ name, description, type, uri }] }`.

```ts
const { references } = await adt.repository.search(process.argv[2], { maxResults: 50 });
for (const r of references) console.log(`${r.type}\t${r.name}\t${r.description ?? ''}`);
```

### 7. Read / export source

**Use:** `source.read({ name, objectType, include? })` → the source string. `include` selects a
class part (e.g. `'testclasses'`, `'definitions'`).

```ts
const main = await adt.source.read({ name: 'ZCL_ORDER', objectType: 'CLAS/OC' });
const tests = await adt.source.read({ name: 'ZCL_ORDER', objectType: 'CLAS/OC', include: 'testclasses' });
```

### 8. Code intelligence for an editor / IDE extension

**Use:** `navigation.*` — locate by **symbol name** *or* `{ line, character }` (0-based).

```ts
const ref = { name: 'ZCL_ORDER', objectType: 'CLAS/OC' };
await adt.navigation.documentSymbols(ref);                         // outline
await adt.navigation.hover(ref, { symbol: 'lif_order~submit' });   // hover by symbol — no coords needed
await adt.navigation.goToDefinition(ref, { line: 42, character: 11 });
await adt.navigation.findReferences(ref, { symbol: 'mv_total' }, { includeDeclaration: true });
await adt.navigation.completion(ref, { line: 50, character: 8 }, { maxItems: 50 });
await adt.navigation.typeHierarchy(ref, { symbol: 'zcl_order' }, { direction: 'both' });
```

This is the differentiator: you get **language-server intelligence** (hover/refs/completion/
type-hierarchy) that a raw ADT REST client doesn't give you.

### 9. Pre-commit hook

**Use:** `navigation.checkSyntax` (fast) before allowing a commit/push.

```ts
// .husky/pre-push → node check-changed.ts
for (const ref of changedObjects) {
  const d = await adt.navigation.checkSyntax(ref);
  if (Array.isArray(d) && d.length) process.exit(1);
}
```

---

## AI agents & MCP servers

### 10. Build an MCP server that exposes ADT tools

The library is the **engine** behind an MCP server; you map MCP tools → typed methods. (This is
exactly how `arc-1-lsp` exposes 39 tools.) Two routes:

```ts
// (a) typed methods → your MCP tool handlers (recommended — clean shapes)
server.tool('search_objects', schema, (args) => adt.repository.search(args.pattern, args));

// (b) escape hatch to a tool on adt-ls's own MCP that the lib doesn't wrap
import { parseFederated } from '@marianfoo/adt-ls';
const raw = await adt.raw.tool('abap_list_destinations', {});
const clean = parseFederated(raw);
```

### 11. Agent-driven authoring loop

The full create → edit → activate → test lifecycle in five calls — what an AI coding agent drives:

```ts
await adt.lifecycle.create({ objectType: 'CLAS/OC', name: 'ZCL_NEW', packageName: '$TMP', description: 'demo' });
await adt.lifecycle.update({ name: 'ZCL_NEW', objectType: 'CLAS/OC', source });
const act = await adt.lifecycle.activate({ name: 'ZCL_NEW', objectType: 'CLAS/OC' });
const test = await adt.lifecycle.runUnitTests({ name: 'ZCL_NEW', objectType: 'CLAS/OC' });
// adt.lifecycle.delete(...) to clean up
```

---

## Scaffolding & deployment

### 12. Scaffold a RAP / OData service

**Use:** `lifecycle.generate({ generatorId, content, packageName })` — one call produces a full
object set (table / CDS / behavior / service definition + binding). Discover generators and
their input schema via `adt.raw.tool('abap_generators-list_generators', { destination })` and
`'abap_generators-get_schema'`.

```ts
await adt.lifecycle.generate({
  generatorId: 'published_rap_bo',            // discovered via list_generators
  content: JSON.stringify({ /* matches get_schema */ }),
  packageName: 'ZDEMO',
  transportRequestNumber: 'DEVK900123',
});
```

### 13. Transport-aware deployment

**Use:** `transport.find` / `create` / `assign` — wire created objects into CTS.

```ts
const tr = await adt.transport.create({
  developmentPackage: 'ZDEMO', transportDescription: 'CI deploy', isCreation: true,
});
await adt.transport.assign({ name: 'ZCL_ORDER', objectType: 'CLAS/OC', transport: /* tr number */ });
await adt.transport.list({ query: 'open', limit: 20 });        // your modifiable transports
await adt.transport.getLockStatus({ name: 'ZCL_ORDER', objectType: 'CLAS/OC' });
```

> Local `$TMP`/`$`-packages need **no** transport — pass `transportRequestNumber: ''` (the default).

---

## Production patterns

- **Always `dispose()`** in a `finally` — it kills `adt-lsc` and cleans temp dirs. An orphaned
  `adt-lsc` is a leak.
- **Resilience is automatic.** SAP sessions die fast on idle; the client self-heals (revive on a
  dead session + an activity-gated keep-alive). Check readiness with `adt.health().backendLive`;
  force a re-logon with `adt.reconnect()`.
- **Cold caches.** The first search after a fresh logon can be empty while adt-ls warms its index
  — pass `{ cold: true }` to `repository.search` for the bounded retry.
- **Logging.** `setLogger(stderrLogger)` for debugging; default is silent (stdout stays clean for
  CLIs/MCP stdio).
- **One backend per client.** Each `createAdtLs()` is one `adt-lsc` process + one destination.
  For several systems, create several clients.
- **Scope boundary.** adt-lsc serves the **modern ABAP-Cloud** object types headless; classic
  types return a clear "use Eclipse" error. Write-safety/allowlists are **your** policy — the
  library does not gate writes (ADR-0012).

---

## API cheat-sheet

| Namespace | Methods | For |
| --- | --- | --- |
| `repository` | `search`, `getUsers`, `getLsUri`, `readFile`/`writeFile`/`delete`, `listInactive` | discovery, raw AFF file ops |
| `source` | `read` | read object source (per include) |
| `lifecycle` | `create`, `update`, `activate`, `runUnitTests`, `delete`, `generate`, `validate`, `resolveAffUri` | the authoring loop + scaffolding |
| `navigation` | `documentSymbols`, `goToDefinition`, `goToDeclaration`, `findReferences`, `hover`, `documentHighlight`, `typeHierarchy`, `completion`, `checkSyntax` | editor/IDE code-intelligence |
| `quality` | `runAtc`, `listAtcVariants`, `runUnitTestsWithCoverage` | CI gates: ATC + coverage |
| `services` | `runApplication`, `serviceBindingDetails`, `publishServiceBinding` | console run + business services |
| `transport` | `find`, `create`, `assign`, `list`, `getLockStatus` | CTS / transport management |
| `raw` | `lsp(method, params)`, `tool(name, args)` | escape hatches for the long tail |
| top-level | `health()`, `reconnect()`, `dispose()` | liveness, recovery, cleanup |

Low-level building blocks (`resolveAdtLsPath`, `AdtLsDriver`, `startMcpServer`/`stopMcpServer`/
`setMcpDestination`) are exported too — for tools that proxy adt-ls's MCP themselves.
