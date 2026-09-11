/**
 * Locate a developer-provided `adt-ls` binary. `@arc-mcp/adt-ls` never ships or
 * redistributes adt-ls (SAP Developer License) — it discovers one the developer
 * already installed via the `sapse.adt-vscode` extension, a vendored copy, or an
 * explicit path. See ADR-0004.
 *
 * Resolution order:
 *   1. explicit path (`opts.explicitPath` / `ADT_LS_PATH`)
 *   2. `vendor/adt-ls/` in the consumer repo (build-time / CI injection)
 *   3. newest installed `sapse.adt-vscode-*` across the VS Code / Cursor /
 *      VS Code Insiders extension directories
 *
 * The per-platform layout is verified against all four 1.0.1 VSIX:
 *   macOS  `adt-ls/macosx/cocoa/<arch>/Adt-ls.app/Contents/MacOS/adt-ls`
 *   Linux  `adt-ls/linux/gtk/<arch>/adt-ls`
 *   Win    `adt-ls/win32/win32/<arch>/adt-lsc.exe`
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Platform/arch-specific sub-path under an `adt-ls/` root. */
export function platformSubPath(platform: NodeJS.Platform = process.platform, arch: string = process.arch): string[] {
  const a = arch === 'arm64' ? 'aarch64' : arch === 'x64' ? 'x86_64' : arch;
  switch (platform) {
    case 'darwin':
      return ['macosx', 'cocoa', a, 'Adt-ls.app', 'Contents', 'MacOS', 'adt-ls'];
    case 'linux':
      return ['linux', 'gtk', a, 'adt-ls'];
    case 'win32':
      return ['win32', 'win32', a, 'adt-lsc.exe'];
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export interface DiscoverOptions {
  /** Explicit binary path; also read from the `ADT_LS_PATH` env var. */
  explicitPath?: string;
  /** Consumer repo root to look for `vendor/adt-ls/`. Defaults to `process.cwd()`. */
  repoRoot?: string;
  /** Single extension dir override (mainly for tests). */
  extensionsDir?: string;
  /** Multiple extension dirs to scan; defaults to VS Code / Cursor / Insiders. */
  extensionsDirs?: string[];
  platform?: NodeJS.Platform;
  arch?: string;
}

/** Default extension roots: VS Code, Cursor, VS Code Insiders. */
export function defaultExtensionDirs(home: string = os.homedir()): string[] {
  return [
    path.join(home, '.vscode', 'extensions'),
    path.join(home, '.cursor', 'extensions'),
    path.join(home, '.vscode-insiders', 'extensions'),
  ];
}

export function resolveAdtLsPath(opts: DiscoverOptions = {}): string {
  const tried: string[] = [];
  const sub = platformSubPath(opts.platform, opts.arch);

  const explicit = opts.explicitPath ?? process.env.ADT_LS_PATH;
  if (explicit) {
    if (isFile(explicit)) return explicit;
    throw new Error(`Explicit adt-ls binary is not a file: ${explicit}. Check adtLs.path / ADT_LS_PATH.`);
  }

  const repoRoot = opts.repoRoot ?? process.cwd();
  const vendor = path.join(repoRoot, 'vendor', 'adt-ls', ...sub);
  tried.push(vendor);
  if (isFile(vendor)) return vendor;

  const extDirs = opts.extensionsDirs ?? (opts.extensionsDir ? [opts.extensionsDir] : defaultExtensionDirs());
  const candidates: Array<{ name: string; binary: string }> = [];
  for (const extDir of extDirs) {
    if (!fs.existsSync(extDir)) continue;
    for (const name of fs.readdirSync(extDir).filter((d) => /^sapse\.adt-vscode-\d+\.\d+\.\d+(?:-|$)/i.test(d))) {
      candidates.push({ name, binary: path.join(extDir, name, 'adt-ls', ...sub) });
    }
  }
  // Sort across ALL editors; an older VS Code installation must not mask newer Cursor/Insiders.
  candidates.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' }));
  for (const candidate of candidates) {
    tried.push(candidate.binary);
    if (isFile(candidate.binary)) return candidate.binary;
  }

  const triedList = tried.map((t) => `  - ${t}`).join('\n');
  throw new Error(
    `adt-ls binary not found. Set ADT_LS_PATH, drop it in vendor/adt-ls/, or install the 'sapse.adt-vscode' extension. Tried:\n${triedList}`,
  );
}

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}
