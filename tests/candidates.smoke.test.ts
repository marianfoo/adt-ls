/**
 * Gated live smoke (Tier 3) for the 0.4.0 capabilities: native activate, ABAP
 * Pretty-Printer formatting, completionItem/resolve enrichment, decoded semanticTokens,
 * and the transport decision oracle. Skips unless adt-ls is present AND ADTLS_TEST_PASSWORD
 * is set. Mutates only $TMP and cleans up.
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

const NAME = `ZCL_ADTLS_CAND_${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
const TYPE = 'CLAS/OC';
// Deliberately unindented so the pretty-printer has something to fix.
const GOOD = `CLASS ${NAME.toLowerCase()} DEFINITION PUBLIC FINAL CREATE PUBLIC.
PUBLIC SECTION.
INTERFACES if_oo_adt_classrun.
METHODS greet IMPORTING iv_name TYPE string RETURNING VALUE(rv_text) TYPE string.
ENDCLASS.
CLASS ${NAME.toLowerCase()} IMPLEMENTATION.
METHOD greet.
rv_text = |Hello { iv_name }|.
ENDMETHOD.
METHOD if_oo_adt_classrun~main.
out->write( greet( 'World' ) ).
ENDMETHOD.
ENDCLASS.`;
const BROKEN = `CLASS ${NAME.toLowerCase()} DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS greet RETURNING VALUE(rv_text) TYPE string.
ENDCLASS.
CLASS ${NAME.toLowerCase()} IMPLEMENTATION.
  METHOD greet.
    rv_text = this_variable_does_not_exist.
  ENDMETHOD.
ENDCLASS.`;

describe('candidate capabilities (live — needs adt-ls + ADTLS_TEST_PASSWORD)', () => {
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
    'native activate + format + completion-resolve + semanticTokens + transport.check',
    async () => {
      adt = await createAdtLs({
        connection: {
          systemUrl: process.env.ADTLS_TEST_URL ?? 'https://a4h.marianzeis.de',
          selfSigned: process.env.ADTLS_TEST_SELF_SIGNED === '1',
          client: '001',
        },
        auth: basic(process.env.ADTLS_TEST_USER ?? 'MARIAN', pw as string),
      });
      expect(adt.health().backendLive).toBe(true);

      await adt.lifecycle.create({
        objectType: TYPE,
        name: NAME,
        packageName: '$TMP',
        description: 'adt-ls 1.1.2 candidates',
      });
      createdByTest = true;
      await adt.lifecycle.update({ name: NAME, objectType: TYPE, source: GOOD });

      // ── Native activate: rich per-phase result ──
      const act = await adt.lifecycle.activate({ name: NAME, objectType: TYPE });
      expect(act.success).toBe(true);
      expect(act.activationExecuted).toBe(true);
      expect(typeof act.checkExecuted).toBe('boolean');
      expect(Array.isArray(act.refreshedUris)).toBe(true);
      expect(act.diagnostics).toEqual([]);

      // ── Formatting: pretty-printer reindents the unindented source ──
      const fmt = await adt.navigation.format({ name: NAME, objectType: TYPE });
      expect(fmt.edits.length).toBeGreaterThan(0);
      expect(fmt.formatted).not.toBe(GOOD);
      expect(fmt.formatted).toMatch(/METHOD greet/i);
      // a pretty-printed body line is indented (the input had none)
      expect(fmt.formatted).toMatch(/\n\s+METHOD greet/i);

      // ── completionItem/resolve enrichment at a member position (out->) ──
      const lines = GOOD.split('\n');
      const li = lines.findIndex((l) => l.includes('out->'));
      const col = lines[li].indexOf('out->') + 5; // 0-based char right after "->"
      const comp = (await adt.navigation.completion(
        { name: NAME, objectType: TYPE },
        { line: li + 1, character: col + 1 },
        { resolve: true },
      )) as { resolved: number; items: Array<Record<string, unknown>> };
      expect(comp.resolved).toBeGreaterThan(0);
      const enriched = comp.items.find((i) => i.documentation);
      expect(enriched, 'at least one resolved item carries documentation').toBeTruthy();
      expect(comp.items.every((i) => !('data' in i))).toBe(true); // data stripped from output

      // ── Decoded semantic tokens ──
      const st = await adt.navigation.semanticTokens({ name: NAME, objectType: TYPE });
      expect(st.legend.tokenTypes.length).toBeGreaterThan(0);
      expect(st.tokens.length).toBeGreaterThan(0);
      expect(st.tokens.some((t) => t.tokenType === 'keyword')).toBe(true);

      // ── Transport decision oracle: $TMP → no recording required ──
      const check = (await adt.transport.check({ name: NAME, objectType: TYPE })) as {
        isTransportCheckSuccessful?: boolean;
        isRecordingRequired?: boolean;
      };
      expect(check.isTransportCheckSuccessful).toBe(true);
      expect(check.isRecordingRequired).toBe(false);

      // ── Creation form contract: legal values per field (value-help types + name regex) ──
      const form = await adt.lifecycle.getCreationForm('CLAS/OC');
      expect(form.fields.length).toBeGreaterThan(0);
      const nameField = form.fields.find((f) => f.path === 'name');
      expect(nameField?.pattern).toBeTruthy(); // e.g. ^[A-Z0-9_/]*$
      const superclass = form.fields.find((f) => f.path === 'superclass');
      expect(superclass?.valueHelpTypes).toContain('CLAS/OC'); // the legal-values info MCP flattens away

      // ── SRVB service info via the business-services MCP tools (a published DMO V2 binding) ──
      const svcList = (await adt.services.listServices({ name: '/DMO/UI_FLIGHT_R_V2', objectType: 'SRVB/SVB' })) as {
        odataVersion?: string;
        services: Array<{ name: string }>;
      };
      expect(svcList.services.length).toBeGreaterThan(0);
      const svcInfo = await adt.services.getServiceInfo({ name: '/DMO/UI_FLIGHT_R_V2', objectType: 'SRVB/SVB' });
      expect(svcInfo.serviceUrl).toMatch(/\/sap\/opu\/odata/);
      expect(svcInfo.entitySets.length).toBeGreaterThan(0);

      // ── Native activate on broken source → success:false with diagnostics ──
      await adt.lifecycle.update({ name: NAME, objectType: TYPE, source: BROKEN });
      const bad = await adt.lifecycle.activate({ name: NAME, objectType: TYPE });
      // eslint-disable-next-line no-console
      console.log('broken-activate diagnostics:', JSON.stringify(bad.diagnostics).slice(0, 800));
      expect(bad.success).toBe(false);
      expect(bad.diagnostics.length).toBeGreaterThan(0);

      await adt.lifecycle.delete({ name: NAME, objectType: TYPE });
      createdByTest = false;
    },
    200_000,
  );
});
