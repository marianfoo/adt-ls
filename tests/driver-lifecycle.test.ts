import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { AdtLsDriver } from '../src/driver.js';

const fixture = fileURLToPath(new URL('./fixtures/adt-ls.mjs', import.meta.url));
const drivers: AdtLsDriver[] = [];
afterEach(async () => {
  for (const driver of drivers.splice(0)) await driver.dispose();
});
function create(mode = '') {
  const driver = new AdtLsDriver(process.execPath, { extraArgs: [fixture], extraEnv: { ADTLS_FIXTURE_MODE: mode } });
  drivers.push(driver);
  return driver;
}

describe('driver process lifecycle', () => {
  it('rejects missing executables without unhandled child errors', async () => {
    const driver = new AdtLsDriver(path.join(os.tmpdir(), 'nonexistent-adt-ls-executable'));
    drivers.push(driver);
    await expect(driver.start(1_000)).rejects.toThrow(/ENOENT/);
    await expect(driver.sendRequest('test')).rejects.toThrow(/not started/);
  });
  it('cleans up early exits, incompatible servers, and initialization timeouts', async () => {
    await expect(create('exit').start(2_000)).rejects.toThrow(/exited.*2/);
    await expect(create('old').start(2_000)).rejects.toThrow(/Unsupported adt-ls version/);
    const hung = create('hang');
    await expect(hung.start(1_000)).rejects.toThrow(/initialize timed out/);
    await expect(hung.sendRequest('test')).rejects.toThrow(/not started/);
  });
  it('rejects double starts and tears down the socket; preserves caller-owned data', async () => {
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'caller-data-'));
    writeFileSync(path.join(dataDir, 'keep.txt'), 'user data');
    const driver = new AdtLsDriver(process.execPath, { dataDir, extraArgs: [fixture] });
    drivers.push(driver);
    try {
      const first = driver.start(2_000);
      await expect(driver.start(2_000)).rejects.toThrow(/already started/);
      const result = await first;
      await expect(driver.start()).rejects.toThrow(/already started/);
      await driver.dispose();
      expect(existsSync(path.join(dataDir, 'keep.txt'))).toBe(true);
      if (process.platform !== 'win32') expect(existsSync(result.capabilities.testPipe as string)).toBe(false);
      expect(driver.initializeResult).toBeUndefined();
      await expect(driver.sendNotification('test')).rejects.toThrow(/not started/);
      await driver.dispose();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
