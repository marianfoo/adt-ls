/**
 * Gated smoke (Tier 2): requires a real adt-ls binary (vendor/ or sapse.adt-vscode).
 * If none is discoverable, the test skips (keeps Tier-1 CI green). Spawns adt-ls
 * headless and completes the LSP initialize handshake — no SAP backend needed.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { resolveAdtLsPath } from '../src/discovery.js';
import { AdtLsDriver } from '../src/driver.js';

let binPath: string | null = null;
try {
  binPath = resolveAdtLsPath();
} catch {
  binPath = null;
}

describe('AdtLsDriver (smoke — needs a real adt-ls)', () => {
  let driver: AdtLsDriver | undefined;
  afterAll(async () => {
    await driver?.dispose();
  });

  it.skipIf(!binPath)(
    'spawns adt-ls headless and completes LSP initialize',
    async () => {
      driver = new AdtLsDriver(binPath as string);
      const res = await driver.start();
      expect(res.serverInfo?.name).toMatch(/ADTLS/i);
      expect(Object.keys(res.capabilities)).toEqual(
        expect.arrayContaining(['completionProvider', 'diagnosticProvider']),
      );
    },
    60_000,
  );
});
