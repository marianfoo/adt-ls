/**
 * Gated live smoke: X.509 client-certificate (mutual TLS) logon — passwordless, NO browser.
 *
 * Proves the full `clientCert` path end-to-end: the reverse proxy presents the cert on the
 * upstream hop, the backend authenticates the TLS connection (e.g. AS ABAP
 * `icm/HTTPS/verify_client` + CERTRULE maps the cert subject → user), and adt-ls's reentrance
 * logon completes with NO credential, so a real repository search succeeds.
 *
 * Requires adt-ls + a backend configured for client-cert logon AND a client cert whose
 * subject maps to a user. Provide via env (skips otherwise):
 *   ADTLS_TEST_CLIENT_CERT / ADTLS_TEST_CLIENT_KEY  — PEM file paths
 *   ADTLS_TEST_HOST / ADTLS_TEST_PORT (default 50001) — the backend HTTPS endpoint
 *   ADTLS_TEST_USER (optional — recorded on the destination)
 * Reads only (search). Setup recipe: docs adt-ls-reference §X.509 client-cert.
 */
import { promises as fsp } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { type AdtLsClient, clientCert, createAdtLs, resolveAdtLsPath } from '../src/index.js';

let binPath: string | null = process.env.ARC1_ADT_LS_PATH ?? null;
if (!binPath) {
  try {
    binPath = resolveAdtLsPath();
  } catch {
    binPath = null;
  }
}
const certPath = process.env.ADTLS_TEST_CLIENT_CERT;
const keyPath = process.env.ADTLS_TEST_CLIENT_KEY;
const gated = !binPath || !certPath || !keyPath;
const HOST = process.env.ADTLS_TEST_HOST ?? 'localhost';
const PORT = process.env.ADTLS_TEST_PORT ?? '50001';

describe('createAdtLs clientCert (live — needs ADTLS_TEST_CLIENT_CERT/_KEY + a cert-logon backend)', () => {
  let client: AdtLsClient | undefined;
  afterAll(async () => {
    await client?.dispose();
  });

  it.skipIf(gated)(
    'connects passwordless via mutual TLS + runs a real search',
    async () => {
      const cert = await fsp.readFile(certPath as string, 'utf8');
      const key = await fsp.readFile(keyPath as string, 'utf8');

      client = await createAdtLs({
        adtLs: { path: binPath ?? undefined },
        // selfSigned engages the reverse proxy, which presents the client cert upstream (mutual TLS)
        connection: { systemUrl: `https://${HOST}:${PORT}`, selfSigned: true, client: '001', language: 'EN' },
        auth: clientCert({ cert, key, user: process.env.ADTLS_TEST_USER }),
      });

      const h = client.health();
      expect(h.connected).toBe(true);
      expect(h.backendLive).toBe(true);

      const r = await client.repository.search('CL_ABAP_TYPEDESCR', { types: ['CLAS/OC'], cold: true });
      expect(r.references?.length ?? 0).toBeGreaterThan(0);
    },
    120_000,
  );
});
