import { describe, expect, it } from 'vitest';
import { composeSpawnArgs } from '../src/driver.js';

describe('composeSpawnArgs', () => {
  it('builds the default adt-ls argv when no extra args are given', () => {
    expect(composeSpawnArgs({ dataDir: '/ws', pipeName: '/tmp/p.sock' })).toEqual([
      '-Djco.trace_path',
      '/ws',
      '-data',
      '/ws',
      '--pipe=/tmp/p.sock',
    ]);
  });

  it('prepends extraArgs (e.g. SNC/JCo JVM flags) ahead of -data/--pipe', () => {
    const pipe = '\\\\.\\pipe\\x';
    const args = composeSpawnArgs({
      dataDir: '/ws',
      pipeName: pipe,
      extraArgs: ['-consoleLog', '-Djco.middleware.snc_lib=/opt/sapcrypto/libsapcrypto.so'],
    });
    expect(args.slice(0, 2)).toEqual(['-consoleLog', '-Djco.middleware.snc_lib=/opt/sapcrypto/libsapcrypto.so']);
    expect(args).toContain(`--pipe=${pipe}`);
    expect(args.indexOf('-consoleLog')).toBeLessThan(args.indexOf(`--pipe=${pipe}`));
  });

  it('treats empty extraArgs the same as none', () => {
    expect(composeSpawnArgs({ dataDir: '/ws', pipeName: '/p', extraArgs: [] })).toHaveLength(5);
  });
});
