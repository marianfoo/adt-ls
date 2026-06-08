/**
 * Services unit tests — the SRVB service-info methods (listServices / getServiceInfo) which
 * chain the abap_business_services MCP tools, driven by a fake callTool so the arg
 * construction (esp. the 7 required fetch_service_information fields) + the V4-publish guard
 * are covered without a live SAP system.
 */
import { describe, expect, it } from 'vitest';
import { createServices } from '../src/api/services.js';
import type { LspClient } from '../src/driver.js';

const lsp: LspClient = { sendRequest: async <T>(): Promise<T> => ({}) as T, sendNotification: async () => {} };
const lifecycle = { resolveAffUri: async () => 'abap:/x' };
const fed = (payload: unknown, isError = false) => ({ content: [{ text: JSON.stringify(payload) }], isError });

const FETCH_SERVICES_V2 = {
  bindingType: 'ODATA',
  odataVersion: 'V2',
  odataInfoUri: [{ href: '/sap/bc/adt/businessservices/odatav2/%2FX' }],
  services: [{ name: '/X', content: [{ serviceDefinition: '/XDEF', serviceVersion: '0001' }], isPublished: true }],
};

describe('services.listServices', () => {
  it('calls fetch_services with {destination, serviceBindingName} and returns the parsed data', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const svc = createServices({
      lsp,
      lifecycle,
      destination: () => 'ADTLS',
      callTool: async (name, args) => {
        calls.push({ name, args });
        return fed(FETCH_SERVICES_V2);
      },
    });
    const r = await svc.listServices({ name: '/X', objectType: 'SRVB/SVB' });
    expect(calls[0]).toEqual({
      name: 'abap_business_services-fetch_services',
      args: { destination: 'ADTLS', serviceBindingName: '/X' },
    });
    expect(r.odataVersion).toBe('V2');
    expect(r.services[0].content[0].serviceDefinition).toBe('/XDEF');
  });
});

describe('services.getServiceInfo', () => {
  it('chains fetch_services → fetch_service_information with all required fields', async () => {
    let infoArgs: Record<string, unknown> | undefined;
    const svc = createServices({
      lsp,
      lifecycle,
      destination: () => 'ADTLS',
      callTool: async (name, args) => {
        if (name === 'abap_business_services-fetch_services') return fed(FETCH_SERVICES_V2);
        infoArgs = args;
        return fed({
          serviceUrl: 'https://h/sap/opu/odata/X?sap-client=001',
          entitySets: [{ name: 'E', navigations: ['to_F'] }],
        });
      },
    });
    const info = await svc.getServiceInfo({ name: '/X', objectType: 'SRVB/SVB' });
    expect(info.serviceUrl).toMatch(/sap-client=001/);
    expect(info.entitySets[0]).toEqual({ name: 'E', navigations: ['to_F'] });
    expect(infoArgs).toEqual({
      destination: 'ADTLS',
      serviceBindingName: '/X',
      serviceName: '/X',
      serviceDefinition: '/XDEF',
      serviceVersion: '0001',
      odataInfoUri: '/sap/bc/adt/businessservices/odatav2/%2FX',
      odataVersion: 'V2',
      isPublished: true,
    });
  });

  it('throws (not the opaque tool error) when a V4 binding is unpublished', async () => {
    const svc = createServices({
      lsp,
      lifecycle,
      destination: () => 'ADTLS',
      callTool: async (name) => {
        if (name === 'abap_business_services-fetch_services')
          return fed({
            odataVersion: 'V4',
            odataInfoUri: [{ href: '/i' }],
            services: [
              { name: '/X', content: [{ serviceDefinition: '/D', serviceVersion: '0001' }], isPublished: false },
            ],
          });
        throw new Error('fetch_service_information must NOT be called for an unpublished V4 binding');
      },
    });
    await expect(svc.getServiceInfo({ name: '/X', objectType: 'SRVB/SVB' })).rejects.toThrow(/not published/i);
  });

  it('picks the requested service by name', async () => {
    let infoArgs: Record<string, unknown> | undefined;
    const twoServices = {
      odataVersion: 'V2',
      odataInfoUri: [{ href: '/i' }],
      services: [
        { name: '/A', content: [{ serviceDefinition: '/AD', serviceVersion: '0001' }], isPublished: true },
        { name: '/B', content: [{ serviceDefinition: '/BD', serviceVersion: '0002' }], isPublished: true },
      ],
    };
    const svc = createServices({
      lsp,
      lifecycle,
      destination: () => 'ADTLS',
      callTool: async (name, args) => {
        if (name === 'abap_business_services-fetch_services') return fed(twoServices);
        infoArgs = args;
        return fed({ serviceUrl: 'u', entitySets: [] });
      },
    });
    await svc.getServiceInfo({ name: '/X', objectType: 'SRVB/SVB' }, { service: '/B' });
    expect(infoArgs).toMatchObject({ serviceName: '/B', serviceDefinition: '/BD', serviceVersion: '0002' });
  });
});
