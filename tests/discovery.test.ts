import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { platformSubPath, resolveAdtLsPath } from '../src/discovery.js';

describe('platformSubPath', () => {
  it('maps darwin arm64 → aarch64 app bundle', () => {
    expect(platformSubPath('darwin', 'arm64')).toEqual([
      'macosx',
      'cocoa',
      'aarch64',
      'Adt-ls.app',
      'Contents',
      'MacOS',
      'adt-ls',
    ]);
  });
  it('maps linux x64 → x86_64', () => {
    expect(platformSubPath('linux', 'x64')).toEqual(['linux', 'gtk', 'x86_64', 'adt-ls']);
  });
  it('maps win32 → adt-lsc.exe', () => {
    expect(platformSubPath('win32', 'x64')).toEqual(['win32', 'win32', 'x86_64', 'adt-lsc.exe']);
  });
  it('throws on unsupported platform', () => {
    expect(() => platformSubPath('aix' as NodeJS.Platform, 'x64')).toThrow(/Unsupported/);
  });
});

describe('resolveAdtLsPath', () => {
  beforeEach(() => vi.stubEnv('ADT_LS_PATH', ''));
  const tmp: string[] = [];
  const mk = () => {
    const d = mkdtempSync(path.join(os.tmpdir(), 'adtls-disc-'));
    tmp.push(d);
    return d;
  };
  afterEach(() => {
    vi.unstubAllEnvs();
    for (const d of tmp.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it('honors an explicit path when it exists', () => {
    const d = mk();
    const f = path.join(d, 'adt-ls');
    writeFileSync(f, 'x');
    expect(resolveAdtLsPath({ explicitPath: f, repoRoot: mk(), extensionsDir: mk() })).toBe(f);
  });

  it('finds the vendor binary (linux x64)', () => {
    const repo = mk();
    const p = path.join(repo, 'vendor', 'adt-ls', 'linux', 'gtk', 'x86_64', 'adt-ls');
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, 'x');
    expect(resolveAdtLsPath({ repoRoot: repo, platform: 'linux', arch: 'x64', extensionsDir: mk() })).toBe(p);
  });

  it('finds the newest installed sapse.adt-vscode extension (darwin arm64)', () => {
    const ext = mk();
    for (const v of ['sapse.adt-vscode-1.0.1-darwin-arm64', 'sapse.adt-vscode-0.9.0-darwin-arm64']) {
      const p = path.join(ext, v, 'adt-ls', 'macosx', 'cocoa', 'aarch64', 'Adt-ls.app', 'Contents', 'MacOS', 'adt-ls');
      mkdirSync(path.dirname(p), { recursive: true });
      writeFileSync(p, 'x');
    }
    const got = resolveAdtLsPath({ repoRoot: mk(), extensionsDir: ext, platform: 'darwin', arch: 'arm64' });
    expect(got).toContain('sapse.adt-vscode-1.0.1-darwin-arm64');
  });

  it('scans multiple extension dirs (cursor after vscode)', () => {
    const vscode = mk();
    const cursor = mk();
    const p = path.join(cursor, 'sapse.adt-vscode-1.0.1-linux-x64', 'adt-ls', 'linux', 'gtk', 'x86_64', 'adt-ls');
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, 'x');
    expect(resolveAdtLsPath({ repoRoot: mk(), extensionsDirs: [vscode, cursor], platform: 'linux', arch: 'x64' })).toBe(
      p,
    );
  });

  it('selects the newest version across all editor roots, skipping incomplete installs', () => {
    const editors = [mk(), mk(), mk()];
    for (const [i, version] of ['1.0.1', '1.1.2', '1.10.0'].entries()) {
      const binary = path.join(
        editors[i],
        `sapse.adt-vscode-${version}-linux-x64`,
        'adt-ls',
        ...platformSubPath('linux', 'x64'),
      );
      mkdirSync(path.dirname(binary), { recursive: true });
      if (i < 2) writeFileSync(binary, 'x');
    }
    const opts = { repoRoot: mk(), extensionsDirs: editors, platform: 'linux' as const, arch: 'x64' };
    expect(resolveAdtLsPath(opts)).toContain('1.1.2');
    const newer = path.join(
      editors[2],
      'sapse.adt-vscode-1.10.0-linux-x64',
      'adt-ls',
      ...platformSubPath('linux', 'x64'),
    );
    writeFileSync(newer, 'x');
    expect(resolveAdtLsPath(opts)).toBe(newer);
  });

  it('fails on an invalid explicit path instead of silently changing runtime', () => {
    const dir = mk();
    expect(() => resolveAdtLsPath({ explicitPath: dir })).toThrow(/not a file/);
    vi.stubEnv('ADT_LS_PATH', '/missing/adt-ls');
    expect(() => resolveAdtLsPath()).toThrow(/Explicit.*missing/);
    const binary = path.join(dir, 'adt-ls');
    writeFileSync(binary, 'x');
    expect(resolveAdtLsPath({ explicitPath: binary })).toBe(binary);
  });

  it('throws an error listing the tried paths when nothing is found', () => {
    expect(() =>
      resolveAdtLsPath({
        repoRoot: mk(),
        extensionsDir: mk(),
        platform: 'linux',
        arch: 'x64',
      }),
    ).toThrow(/Tried:/);
  });
});
