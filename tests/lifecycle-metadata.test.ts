import { describe, expect, it, vi } from 'vitest';
import { createLifecycle } from '../src/api/lifecycle.js';
import type { LspRequester } from '../src/driver.js';

/** Metadata methods added in 0.3.0 — verify each calls the right adt-ls MCP tool + args. */
const federated = (obj: unknown) => ({ content: [{ text: JSON.stringify(obj) }] });
const fakeDriver = { sendRequest: vi.fn() } as unknown as LspRequester;

function setup() {
  const callTool = vi.fn(async () => federated({ ok: 1 }));
  const lc = createLifecycle({ driver: fakeDriver, callTool, destination: () => 'DEV' });
  return { lc, callTool };
}

describe('lifecycle metadata methods', () => {
  it('listCreatableObjects → abap_creation-get_all_creatable_objects', async () => {
    const { lc, callTool } = setup();
    await lc.listCreatableObjects();
    expect(callTool).toHaveBeenCalledWith('abap_creation-get_all_creatable_objects', { destination: 'DEV' });
  });

  it('getObjectTypeDetails passes objectType + default name', async () => {
    const { lc, callTool } = setup();
    await lc.getObjectTypeDetails('CLAS/OC');
    expect(callTool).toHaveBeenCalledWith('abap_creation-get_object_type_details', {
      destination: 'DEV',
      objectType: 'CLAS/OC',
      name: 'Z_PLACEHOLDER',
    });
  });

  it('listGenerators → abap_generators-list_generators', async () => {
    const { lc, callTool } = setup();
    await lc.listGenerators();
    expect(callTool).toHaveBeenCalledWith('abap_generators-list_generators', { destination: 'DEV' });
  });

  it('getGeneratorSchema passes generatorId + defaults', async () => {
    const { lc, callTool } = setup();
    await lc.getGeneratorSchema('published_rap_bo');
    expect(callTool).toHaveBeenCalledWith('abap_generators-get_schema', {
      destination: 'DEV',
      generatorId: 'published_rap_bo',
      packageName: '$TMP',
      referencedObjectType: '',
      referencedObjectName: '',
    });
  });

  it('unwraps the federated result to the parsed payload', async () => {
    const { lc } = setup();
    expect(await lc.listGenerators()).toEqual({ ok: 1 });
  });
});
