#!/usr/bin/env node
/**
 * Extract the adt-ls binary for the *current* platform from a downloaded
 * `sapse.adt-vscode-*.vsix` into ./vendor/adt-ls/ (gitignored). adt-ls is BYO
 * (non-redistributable, SAP Developer License) — this never commits it. See ADR-0004.
 *
 * Usage: node scripts/setup-adt-ls.mjs <path-to .vsix> [--dest <dir, default: vendor>]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const vsix = process.argv[2];
if (!vsix || !existsSync(vsix)) {
  console.error('Usage: node scripts/setup-adt-ls.mjs <path-to .vsix> [--dest <dir>]');
  process.exit(1);
}
const di = process.argv.indexOf('--dest');
const dest = path.resolve(di > -1 ? process.argv[di + 1] : 'vendor');

const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
const sub = { darwin: `macosx/cocoa/${arch}`, linux: `linux/gtk/${arch}`, win32: `win32/win32/${arch}` }[
  process.platform
];
if (!sub) {
  console.error(`Unsupported platform: ${process.platform}`);
  process.exit(1);
}

const adtRoot = path.join(dest, 'adt-ls');
const osDir = sub.split('/')[0]; // macosx | linux | win32
rmSync(path.join(adtRoot, osDir), { recursive: true, force: true });
mkdirSync(adtRoot, { recursive: true });

const tmp = path.join(os.tmpdir(), `adtls-vsix-${Date.now()}`);
console.log(`Extracting extension/adt-ls/${sub}/* from ${path.basename(vsix)} ...`);
execFileSync('unzip', ['-q', vsix, `extension/adt-ls/${sub}/*`, '-d', tmp], { stdio: 'inherit' });
execFileSync('cp', ['-R', path.join(tmp, 'extension', 'adt-ls', osDir), adtRoot], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });

if (process.platform === 'darwin') {
  const app = path.join(adtRoot, sub, 'Adt-ls.app');
  if (existsSync(app)) {
    console.log('de-quarantining (macOS Gatekeeper) ...');
    try {
      execFileSync('xattr', ['-dr', 'com.apple.quarantine', app]);
    } catch {
      /* best-effort */
    }
  }
}
console.log(`Done -> ${path.join(adtRoot, sub)}`);
