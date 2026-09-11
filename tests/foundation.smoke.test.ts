import { describe, expect, it } from 'vitest';
import { createAdtLs, resolveAdtLsPath } from '../src/index.js';

let binary: string | undefined;
try {
  binary = resolveAdtLsPath();
} catch {
  /* Tier 2 requires the user-provided binary. */
}

describe('MCP authoring contract (real binary, no SAP credentials)', () => {
  it.skipIf(!binary)(
    'exposes VFS authoring tools and fresh runtime schemas in an isolated foundation session',
    async () => {
      const adt = await createAdtLs({ adtLs: { path: binary }, keepAlive: false });
      try {
        const capabilities = await adt.capabilities();
        expect(capabilities.lsp).toHaveProperty('completionProvider');
        expect(capabilities.tools.map((tool) => tool.name)).toEqual(
          expect.arrayContaining([
            'abap_creation-create_object',
            'abap_activate_objects',
            'abap_run_unit_tests',
            'abap_generators-generate_objects',
            'abap_list_destinations',
          ]),
        );
        expect(capabilities.tools.find((t) => t.name === 'abap_creation-create_object')?.inputSchema).toBeTruthy();
        expect(await adt.listDestinations()).toEqual([]);
        expect(adt.health().connected).toBe(false);
        capabilities.lsp.completionProvider = null;
        expect((await adt.capabilities()).lsp.completionProvider).not.toBeNull();
      } finally {
        await adt.dispose();
        expect(adt.health().connected).toBe(false);
        expect(adt.health().backendLive).toBe(false);
        await expect(adt.capabilities()).rejects.toThrow(/disposed/);
      }
    },
    60_000,
  );
});
