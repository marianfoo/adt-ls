# Setup — get the `adt-ls` binary and connect with auth

The only real setup step is **providing the `adt-ls` binary** (it's BYO). After that, connecting
is one `createAdtLs()` call. This guide covers: where the binary comes from, **which build to
pick**, how the library finds it (local + CI), and **how it ties into authentication**.

---

## 1. Where the binary comes from

`adt-ls` (the `adt-lsc` language server) ships **inside SAP's `sapse.adt-vscode` VS Code
extension** (publisher **SAPSE**). It is **not redistributable** (SAP Developer License), so
`@arc-mcp/adt-ls` never bundles it — you supply it. Two important facts:

- The extension is **platform-specific** (separate builds per OS + CPU).
- It bundles its **own SAP Machine JRE** (~21.x) — you do **not** need a separate Java install,
  and the library reuses that JRE for TLS (see [auth](#4-connecting--how-auth-works)).

Marketplace: <https://marketplace.visualstudio.com/items?itemName=SAPSE.adt-vscode>

> **Version:** this library requires `adt-lsc` **`1.0.1` or newer** and is verified against
> **`1.0.1.202606111342`**. In CI, pin the extension version for reproducibility.

### Option A — install the extension (best for local dev)

Install **“SAP ABAP Development Tools”** (`SAPSE.adt-vscode`) in **VS Code** or **Cursor**.
VS Code downloads the **correct build for your machine automatically**, and the library
auto-discovers it — nothing else to configure.

### Option B — download the platform VSIX (best for CI / servers / containers)

A `.vsix` is just a zip. Pick the build that matches your **runner's** OS + arch:

| Runner | VSIX `targetPlatform` | binary inside the VSIX |
| --- | --- | --- |
| macOS Apple Silicon | `darwin-arm64` | `extension/adt-ls/macosx/cocoa/aarch64/Adt-ls.app/Contents/MacOS/adt-ls` |
| macOS Intel | `darwin-x64` | `extension/adt-ls/macosx/cocoa/x86_64/Adt-ls.app/Contents/MacOS/adt-ls` |
| Linux x64 | `linux-x64` | `extension/adt-ls/linux/gtk/x86_64/adt-ls` |
| Windows x64 | `win32-x64` | `extension/adt-ls/win32/win32/x86_64/adt-lsc.exe` |

> Choose by the **runner**, not your laptop — a Linux CI runner needs `linux-x64` even if you
> develop on a Mac. (`linux-arm64` works too if SAP ships that build.)

Download a specific build from the Marketplace gallery API (a `.vsix` is returned):

```bash
VER=1.0.1                 # the version from the Marketplace "Version History"
PLAT=linux-x64            # your runner's targetPlatform from the table above
curl -L -o adt-vscode-$PLAT.vsix \
  "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/SAPSE/vsextensions/adt-vscode/$VER/vspackage?targetPlatform=$PLAT"
```

(If the API URL gives you trouble, the always-works fallback is: install the extension once in
VS Code, then copy the `adt-ls/` folder out of `~/.vscode/extensions/sapse.adt-vscode-*/`.)

---

## 2. How the library finds the binary

`createAdtLs()` calls `resolveAdtLsPath()`, which looks **in this order**:

1. **`ADT_LS_PATH`** env var — or the **`adtLs: { path }`** option — an explicit binary path.
2. **`<cwd>/vendor/adt-ls/…`** — a vendored copy in your project.
3. The newest installed **`sapse.adt-vscode-*`** under `~/.vscode/extensions`,
   `~/.cursor/extensions`, or `~/.vscode-insiders/extensions`.

If nothing matches it throws, **listing every path it tried** (paste that into an issue if stuck).

```ts
import { resolveAdtLsPath } from '@arc-mcp/adt-ls';
console.log(resolveAdtLsPath()); // or: createAdtLs({ adtLs: { path: '/opt/adt-lsc' }, … })
```

---

## 3. Vendoring for CI (no VS Code on the runner)

Extract the binary for your platform into `vendor/adt-ls/`, then **cache that folder**:

```bash
# linux-x64 shown; a .vsix is a zip
unzip -q adt-vscode-linux-x64.vsix 'extension/adt-ls/linux/gtk/x86_64/*' -d /tmp/adtls
mkdir -p vendor/adt-ls
cp -R /tmp/adtls/extension/adt-ls/linux vendor/adt-ls/
#  → vendor/adt-ls/linux/gtk/x86_64/adt-ls  ← discovered automatically (step 2.2)
```

…or skip vendoring and point straight at the binary:

```bash
export ADT_LS_PATH=/opt/adt-ls/linux/gtk/x86_64/adt-ls
```

**macOS only:** after copying manually, clear the Gatekeeper quarantine once, or the binary
won't launch:

```bash
xattr -dr com.apple.quarantine /path/to/Adt-ls.app
```

> The repo's `scripts/setup-adt-ls.mjs <path-to.vsix>` automates the extract for the *current*
> platform (incl. the macOS de-quarantine). It isn't shipped in the npm package — copy it, or
> use the `unzip` one-liner above.

```yaml
# GitHub Actions sketch — cache the vendored binary so you fetch the VSIX rarely
- uses: actions/cache@v4
  with:
    path: vendor/adt-ls
    key: adt-ls-${{ runner.os }}-1.0.1
- run: test -d vendor/adt-ls || ./fetch-and-vendor-adt-ls.sh   # your extract step
```

---

## 4. Connecting — how auth works

The binary is only the **engine**; authentication is configured **per connection**. Under the
hood the library uses adt-ls's **reentrance-ticket** logon: your credential (or interactive SSO)
obtains a short-lived ticket, then adt-ls logs the session on. You just pick a strategy:

```ts
import { createAdtLs, basic, bearer, interactive } from '@arc-mcp/adt-ls';

const adt = await createAdtLs({
  connection: {
    systemUrl: 'https://my-s4:50001', // HTTPS, host + port
    client: '100',                    // SAP client (mandant)
    language: 'EN',
    selfSigned: true,                 // most on-prem systems: self-signed/internal cert
  },
  auth: basic(process.env.SAP_USER!, process.env.SAP_PASS!),
});
```

### Which auth strategy?

| Strategy | Use when | Notes |
| --- | --- | --- |
| **`basic(user, pass)`** | **CI/CD, scripts, servers** | fully headless; user+password → ticket |
| **`bearer(token)`** | CI/CD with an OAuth/JWT token | token → ticket |
| **`interactive({ openUrl })`** | **desktop tools a human runs** | opens the browser for **SSO / Secure Login** — **cannot** run headless |
| `custom(register)` | advanced | register your own adt-ls logon request handlers |

**Rule of thumb:** pipelines → `basic`/`bearer`; an interactive desktop tool → `interactive`.
SSO/Secure-Login needs a browser, so it does **not** work in CI — use `basic`/`bearer` there.

### TLS — handled by the bundled JRE

You almost never touch certificates: the library builds a truststore **from adt-lsc's own JRE**.

| Backend | Connection option |
| --- | --- |
| Self-signed / internal cert (most on-prem) | `selfSigned: true` |
| Corporate CA | `extraCaCerts: ['/etc/ssl/corp-root.pem']` |
| Behind a Cloud Connector / forward proxy | `forwardProxy: { host, port }` (with `selfSigned`) |

### Verify the whole setup

```ts
import { resolveAdtLsPath, createAdtLs, basic } from '@arc-mcp/adt-ls';

console.log('binary:', resolveAdtLsPath());                 // 1) discovery works?
const adt = await createAdtLs({
  connection: { systemUrl: process.env.SAP_URL!, client: '100', selfSigned: true },
  auth: basic(process.env.SAP_USER!, process.env.SAP_PASS!),
});
console.log(adt.health());                                  // 2) { connected, backendLive, adtLsVersion, … }
console.log(await adt.repository.search('CL_ABAP*', { types: ['CLAS/OC'], maxResults: 3 }));
await adt.dispose();
```

`health().backendLive === true` means a real round-trip to SAP succeeded — your binary + TLS +
auth are all good.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `adt-ls binary not found` | install the extension, set `ADT_LS_PATH`, or vendor into `vendor/adt-ls/`. The error lists every path tried. |
| macOS: “app is damaged / can't be opened” | `xattr -dr com.apple.quarantine /path/Adt-ls.app` |
| Logon never reaches `connected` | wrong user/password/client; for SSO you need `interactive` (a browser) — that can't run in CI |
| `health().backendLive: false` after idle | SAP sessions expire fast; the client auto-revives on the next call, or call `reconnect()` |
| TLS / certificate errors | set `selfSigned: true` (self-signed) or `extraCaCerts` (corporate CA) |
| Wrong-arch binary / won't spawn | you vendored the wrong `targetPlatform` — match the **runner**, not your laptop (table in §1) |
