# ADR-0004 — adt-ls discovery & bring-your-own binary

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

adt-ls (`adt-lsc`) is distributed only inside the `sapse.adt-vscode` extension under
the SAP Developer License — **non-redistributable**. The VSIX is platform-specific and
bundles its own **SAP Machine JRE 21** (no separate Java needed). Verified paths
(all 4 VSIX, 2026-06-07):

| Platform | launcher | bundled JRE |
|---|---|---|
| macOS arm64/x64 | `adt-ls/macosx/cocoa/<arch>/Adt-ls.app/Contents/MacOS/adt-ls` | `…/Contents/Eclipse/plugins/com.sap.adt.jvm.sapmachineminimal.macosx.<arch>_21.11.0/jre` |
| Linux x64 | `adt-ls/linux/gtk/x86_64/adt-ls` | `…/x86_64/plugins/…linux.x86_64_21.11.0/jre` |
| Windows x64 | `adt-ls/win32/win32/x86_64/adt-lsc.exe` | `…/x86_64/plugins/…win32.x86_64_21.11.0/jre` |

## Decision

**Never bundle or commit the binary.** Discover a developer-provided one, in order:
1. explicit path / `ADT_LS_PATH` env,
2. `vendor/adt-ls/` (build-time/CI injection),
3. newest installed `sapse.adt-vscode-*` under `~/.vscode`, `~/.cursor`,
   `~/.vscode-insiders` extensions.

Use the **bundled JRE** for `keytool`/`cacerts` (ADR-0006). Note the launcher name:
`adt-ls` on mac/Linux, `adt-lsc.exe` on Windows (Eclipse console-launcher suffix).

## Consequences

- License-clean; works from a normal extension install or a CI-extracted VSIX.
- `scripts/setup-adt-ls.mjs <vsix>` extracts the platform subtree into `vendor/`
  (+ macOS `xattr -dr com.apple.quarantine`).

## Revisit when

- SAP ships adt-ls standalone or allows redistribution → bundling becomes possible.
- New platform VSIX targets appear (arm64 Linux/Windows; see ADR-0005 matrix).
