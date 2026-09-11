/** Current-runtime read/quality contracts. Writes only a uniquely named $TMP class. */
import { afterAll, describe, expect, it } from 'vitest';
import { type AdtLsClient, basic, createAdtLs, resolveAdtLsPath } from '../src/index.js';

let binary: string | undefined;
try {
  binary = resolveAdtLsPath();
} catch {
  /* BYO runtime. */
}
const password = process.env.ADTLS_TEST_PASSWORD;
const name = `ZCL_ADTLS_COV_${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
const ref = { name, objectType: 'CLAS/OC' };

describe('ADT 1.1.2 compatibility (live A4H)', () => {
  let adt: AdtLsClient | undefined;
  let created = false;
  afterAll(async () => {
    try {
      if (created) await adt?.lifecycle.delete(ref);
    } finally {
      await adt?.dispose();
    }
  });
  it.skipIf(!binary || !password)(
    'runs real unit tests and coverage, reads dictionary source, and discovers new tools',
    async () => {
      const client = await createAdtLs({
        adtLs: { path: binary },
        connection: {
          systemUrl: process.env.ADTLS_TEST_URL ?? 'https://a4h.marianzeis.de',
          client: '001',
          selfSigned: process.env.ADTLS_TEST_SELF_SIGNED === '1',
        },
        auth: basic(process.env.ADTLS_TEST_USER ?? 'MARIAN', password as string),
        keepAlive: false,
      });
      adt = client;
      const capabilities = await client.capabilities();
      expect(capabilities.tools.map((t) => t.name)).toContain('abap_transport-unifiedDifference');
      expect(capabilities.tools.map((t) => t.name)).toContain('abap_atc_execute_deterministic_quickfixes');
      const catalog = (await client.lifecycle.listCreatableObjects()) as {
        creatableObjects: Array<{ objectType: string }>;
      };
      expect(catalog.creatableObjects.map((o) => o.objectType)).toEqual(
        expect.arrayContaining(['PROG/P', 'FUGR/FF', 'TABL/DT']),
      );
      expect(await client.source.read({ name: 'SFLIGHT', objectType: 'TABL/DT' })).toMatch(/define table sflight/i);

      await client.lifecycle.create({ ...ref, packageName: '$TMP', description: 'ADT 1.1.2 coverage test' });
      created = true;
      await client.lifecycle.update({
        ...ref,
        source: `CLASS ${name} DEFINITION PUBLIC FINAL CREATE PUBLIC.
PUBLIC SECTION.
  METHODS answer RETURNING VALUE(result) TYPE i.
ENDCLASS.
CLASS ${name} IMPLEMENTATION.
  METHOD answer.
    result = 42.
  ENDMETHOD.
ENDCLASS.`,
      });
      await client.lifecycle.update({
        ...ref,
        include: 'testclasses',
        source: `CLASS ltc_answer DEFINITION FINAL FOR TESTING DURATION SHORT RISK LEVEL HARMLESS.
PRIVATE SECTION.
  METHODS works FOR TESTING.
ENDCLASS.
CLASS ltc_answer IMPLEMENTATION.
  METHOD works.
    DATA(subject) = NEW ${name}( ).
    cl_abap_unit_assert=>assert_equals( exp = 42 act = subject->answer( ) ).
  ENDMETHOD.
ENDCLASS.`,
      });
      const activation = await client.lifecycle.activate(ref);
      expect(activation.success, JSON.stringify(activation.diagnostics)).toBe(true);
      const unit = await client.lifecycle.runUnitTests(ref);
      expect(unit).toEqual({ message: 'Overall Test Run Status: [PASSED]' });
      const measured = (await client.quality.runUnitTestsWithCoverage(ref)) as { result: unknown; coverage: unknown };
      expect(JSON.stringify(measured.result)).toMatch(/ltc_answer|works/i);
      expect(measured.coverage).toBeTruthy();
      expect(await client.repository.listInactive()).toBeInstanceOf(Array);
      await client.lifecycle.delete(ref);
      created = false;
      await expect(client.source.read(ref)).rejects.toThrow(/not found/);
    },
    200_000,
  );
});
