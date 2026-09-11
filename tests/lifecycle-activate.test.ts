/**
 * Unit tests for the native-activate result mapping (lifecycle.activate) driven by a fake
 * driver — covers success derivation + the nested `objectDiagnostics[].diagnostic[].severity`
 * error-detection shape verified live against a4h, without needing a SAP system.
 */
import { describe, expect, it } from 'vitest';
import { createLifecycle } from '../src/api/lifecycle.js';
import type { LspRequester } from '../src/driver.js';

function lifecycleWith(activateResult: unknown) {
  let activateParams: unknown;
  const driver: LspRequester = {
    sendRequest: async <T>(method: string, params?: unknown): Promise<T> => {
      if (method === 'adtLs/repository/quickSearch') return { references: [{ name: 'ZCL_X', uri: '/adt/x' }] } as T;
      if (method === 'adtLs/repository/getLsUri') return { uri: 'abap:/repotree-v1/ADTLS/x/zcl_x.clas.abap' } as T;
      if (method === 'adtLs/activation/activate') {
        activateParams = params;
        return activateResult as T;
      }
      throw new Error(`unexpected request: ${method}`);
    },
  };
  const lc = createLifecycle({ driver, callTool: async () => ({}), destination: () => 'ADTLS' });
  return { lc, getActivateParams: () => activateParams };
}

describe('lifecycle.activate (native activation/activate)', () => {
  it('maps a clean activation to success + per-phase flags', async () => {
    const { lc, getActivateParams } = lifecycleWith({
      isCheckExecuted: true,
      isActivationExecuted: true,
      isGenerationExecuted: true,
      isForceSupported: false,
      refreshFileUris: ['abap:/x'],
      objectDiagnostics: [],
    });
    const res = await lc.activate({ name: 'ZCL_X', objectType: 'CLAS/OC' });
    expect(res).toMatchObject({
      success: true,
      diagnostics: [],
      checkExecuted: true,
      activationExecuted: true,
      generationExecuted: true,
      forceSupported: false,
      refreshedUris: ['abap:/x'],
    });
    // sends the native shape with forceActivation defaulted false
    expect(getActivateParams()).toEqual({
      destination: 'ADTLS',
      fileUris: ['abap:/repotree-v1/ADTLS/x/zcl_x.clas.abap'],
      references: [],
      forceActivation: false,
    });
  });

  it('treats nested error-severity diagnostics as failure even if activation "executed"', async () => {
    const { lc } = lifecycleWith({
      isActivationExecuted: true, // executed, but with an error → not a success
      objectDiagnostics: [
        {
          lsUri: 'abap:/x',
          diagnostic: [{ range: {}, severity: 1, source: 'abapActivation', message: 'Field unknown.' }],
        },
      ],
    });
    const res = await lc.activate({ name: 'ZCL_X', objectType: 'CLAS/OC' });
    expect(res.success).toBe(false);
    expect(res.diagnostics.length).toBe(1);
  });

  it('forwards forceActivation', async () => {
    const { lc, getActivateParams } = lifecycleWith({ isActivationExecuted: true, objectDiagnostics: [] });
    await lc.activate({ name: 'ZCL_X', objectType: 'CLAS/OC', forceActivation: true });
    expect(getActivateParams()).toMatchObject({ forceActivation: true });
  });

  it('is not a success when activation did not execute', async () => {
    const { lc } = lifecycleWith({ isActivationExecuted: false, objectDiagnostics: [] });
    const res = await lc.activate({ name: 'ZCL_X', objectType: 'CLAS/OC' });
    expect(res.success).toBe(false);
  });
});
