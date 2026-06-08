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

  it('getCreationForm parses the native UI model into fields with value-help types + pattern', async () => {
    const uiModel = JSON.stringify({
      sections: [
        {
          controls: [
            {
              $type: 'valueHelpText',
              bindingPath: '$.packageName',
              required: true,
              label: { text: 'Package Name' },
              onValueHelp: { adtTypes: [{ value: 'DEVC/K' }] },
            },
            {
              $type: 'text',
              bindingPath: '$.name',
              required: true,
              maxLength: 30,
              pattern: '^[A-Z0-9_/]*$',
              label: { text: 'Name' },
            },
            {
              $type: 'valueHelpText',
              bindingPath: '$.superclass',
              label: { text: 'Superclass' },
              onValueHelp: { adtTypes: [{ value: 'CLAS/OC' }] },
            },
          ],
        },
      ],
    });
    const driver = {
      sendRequest: vi.fn(async () => ({ fieldGroupSections: [{ uiModel }] })),
    } as unknown as LspRequester;
    const lc = createLifecycle({ driver, callTool: vi.fn(), destination: () => 'DEV' });
    const form = await lc.getCreationForm('CLAS/OC');
    expect(driver.sendRequest).toHaveBeenCalledWith('adtLs/objectCreation/getCreationUiModelAndContent', {
      name: 'Z_PLACEHOLDER',
      description: '',
      objectType: 'CLAS/OC',
      destination: 'DEV',
    });
    expect(form).toEqual({
      objectType: 'CLAS/OC',
      fields: [
        { path: 'packageName', required: true, label: 'Package Name', valueHelpTypes: ['DEVC/K'] },
        { path: 'name', required: true, maxLength: 30, pattern: '^[A-Z0-9_/]*$', label: 'Name' },
        { path: 'superclass', required: false, label: 'Superclass', valueHelpTypes: ['CLAS/OC'] },
      ],
    });
  });
});
