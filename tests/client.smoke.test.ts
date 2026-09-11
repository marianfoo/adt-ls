/**
 * Gated live smoke (Tier 3): the full authoring loop through the unified `createAdtLs`
 * client against a real SAP system. Skips unless adt-ls is present AND
 * ADTLS_TEST_PASSWORD is set. Mutates only $TMP and cleans up. Defaults to a4h.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { resolveAdtLsPath } from '../src/discovery.js';
import { type AdtLsClient, basic, createAdtLs } from '../src/index.js';

let binPath: string | null = null;
try {
  binPath = resolveAdtLsPath();
} catch {
  binPath = null;
}
const pw = process.env.ADTLS_TEST_PASSWORD;
const gated = !binPath || !pw;

const NAME = `ZCL_ADTLS_LCTEST_${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
const TYPE = 'CLAS/OC';
const SOURCE = `CLASS ${NAME.toLowerCase()} DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS hello RETURNING VALUE(rv) TYPE string.
ENDCLASS.
CLASS ${NAME.toLowerCase()} IMPLEMENTATION.
  METHOD hello.
    rv = 'hi'.
  ENDMETHOD.
ENDCLASS.`;

describe('createAdtLs (live — needs adt-ls + ADTLS_TEST_PASSWORD)', () => {
  let adt: AdtLsClient | undefined;
  let createdByTest = false;
  afterAll(async () => {
    try {
      if (createdByTest) await adt?.lifecycle.delete({ name: NAME, objectType: TYPE });
    } finally {
      await adt?.dispose();
    }
  });

  it.skipIf(gated)(
    'connects + runs the full $TMP lifecycle through the unified client',
    async () => {
      adt = await createAdtLs({
        connection: {
          systemUrl: process.env.ADTLS_TEST_URL ?? 'https://a4h.marianzeis.de',
          selfSigned: process.env.ADTLS_TEST_SELF_SIGNED === '1',
          client: '001',
        },
        auth: basic(process.env.ADTLS_TEST_USER ?? 'MARIAN', pw as string),
      });

      expect(adt.health().connected).toBe(true);
      expect(adt.health().adtLsVersion).toMatch(/^1\./);
      expect(adt.health().backendLive).toBe(true);

      const hits = await adt.repository.search('CL_ABAP_TYPEDESCR', { types: ['CLAS/OC'], cold: true });
      expect(hits.references.length).toBeGreaterThan(0);

      const created = await adt.lifecycle.create({
        objectType: TYPE,
        name: NAME,
        packageName: '$TMP',
        description: '@arc-mcp/adt-ls live test',
      });
      createdByTest = true;
      expect(created.filePath).toMatch(new RegExp(`${NAME}\\.clas\\.abap$`, 'i'));

      await adt.lifecycle.update({ name: NAME, objectType: TYPE, source: SOURCE });
      const src = await adt.source.read({ name: NAME, objectType: TYPE });
      expect(src).toMatch(/METHODS hello/i);

      const act = await adt.lifecycle.activate({ name: NAME, objectType: TYPE });
      expect(act.success).toBe(true);
      expect(act.diagnostics).toEqual([]);

      const tests = await adt.lifecycle.runUnitTests({ name: NAME, objectType: TYPE });
      expect(JSON.stringify(tests)).toMatch(/no (?:executable )?tests found|testClasses|durationCategory/i);

      await adt.lifecycle.delete({ name: NAME, objectType: TYPE });
      createdByTest = false;
      await expect(adt.source.read({ name: NAME, objectType: TYPE })).rejects.toBeTruthy();
    },
    200_000,
  );
});
