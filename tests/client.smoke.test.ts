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

const NAME = 'ZCL_ADTLS_LCTEST';
const TYPE = 'CLAS/OC';
const SOURCE = `CLASS zcl_adtls_lctest DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS hello RETURNING VALUE(rv) TYPE string.
ENDCLASS.
CLASS zcl_adtls_lctest IMPLEMENTATION.
  METHOD hello.
    rv = 'hi'.
  ENDMETHOD.
ENDCLASS.`;

describe('createAdtLs (live — needs adt-ls + ADTLS_TEST_PASSWORD)', () => {
  let adt: AdtLsClient | undefined;
  afterAll(async () => {
    try {
      await adt?.lifecycle.delete({ name: NAME, objectType: TYPE });
    } catch {
      /* already gone */
    }
    await adt?.dispose();
  });

  it.skipIf(gated)(
    'connects + runs the full $TMP lifecycle through the unified client',
    async () => {
      adt = await createAdtLs({
        connection: {
          systemUrl: `https://${process.env.ADTLS_TEST_HOST ?? 'a4h.marianzeis.de'}:${process.env.ADTLS_TEST_PORT ?? '50001'}`,
          selfSigned: true,
          client: '001',
        },
        auth: basic(process.env.ADTLS_TEST_USER ?? 'MARIAN', pw as string),
      });

      expect(adt.health().connected).toBe(true);
      expect(adt.health().adtLsVersion).toMatch(/1\.0\.1/);
      expect(adt.health().backendLive).toBe(true);

      const hits = await adt.repository.search('CL_ABAP_TYPEDESCR', { types: ['CLAS/OC'], cold: true });
      expect(hits.references.length).toBeGreaterThan(0);

      await adt.lifecycle.delete({ name: NAME, objectType: TYPE }).catch(() => {}); // clean slate
      const created = await adt.lifecycle.create({
        objectType: TYPE,
        name: NAME,
        packageName: '$TMP',
        description: '@marianfoo/adt-ls live test',
      });
      expect(created.filePath).toMatch(/zcl_adtls_lctest\.clas\.abap$/i);

      await adt.lifecycle.update({ name: NAME, objectType: TYPE, source: SOURCE });
      const src = await adt.source.read({ name: NAME, objectType: TYPE });
      expect(src).toMatch(/METHODS hello/i);

      const act = await adt.lifecycle.activate({ name: NAME, objectType: TYPE });
      expect(act.success).toBe(true);
      expect(act.diagnostics).toEqual([]);

      const tests = await adt.lifecycle.runUnitTests({ name: NAME, objectType: TYPE });
      expect(JSON.stringify(tests)).toMatch(/no tests found|testClasses|durationCategory/i);

      await adt.lifecycle.delete({ name: NAME, objectType: TYPE });
      await expect(adt.source.read({ name: NAME, objectType: TYPE })).rejects.toBeTruthy();
    },
    200_000,
  );
});
