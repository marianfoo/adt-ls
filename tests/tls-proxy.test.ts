/**
 * DIRECT-mode reverse-proxy integration test. Gated on openssl (for the localhost
 * cert). Spins an https backend, proxies to it, and asserts a request tunnels through.
 */
import { execFileSync } from 'node:child_process';
import { promises as fsp } from 'node:fs';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateLocalhostCert } from '../src/connection/cert.js';
import { startTlsReverseProxy } from '../src/connection/tls-proxy.js';

function hasOpenssl(): boolean {
  try {
    execFileSync('openssl', ['version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('startTlsReverseProxy (DIRECT)', () => {
  it.skipIf(!hasOpenssl())('terminates TLS and forwards to an https backend', async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'adtls-proxytest-'));
    const cert = await generateLocalhostCert(dir);

    const backend = https.createServer({ key: cert.keyPem, cert: cert.certPem }, (req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`ok:${req.url}`);
    });
    await new Promise<void>((r) => backend.listen(0, '127.0.0.1', () => r()));
    const backendPort = (backend.address() as AddressInfo).port;

    const proxy = await startTlsReverseProxy({
      key: cert.keyPem,
      cert: cert.certPem,
      target: { host: '127.0.0.1', port: backendPort, protocol: 'https' },
      insecureUpstream: true,
    });

    try {
      const body = await new Promise<string>((resolve, reject) => {
        const req = https.request(`${proxy.url}/hello`, { rejectUnauthorized: false }, (res) => {
          let d = '';
          res.on('data', (c) => {
            d += c;
          });
          res.on('end', () => resolve(d));
        });
        req.on('error', reject);
        req.end();
      });
      expect(body).toBe('ok:/hello');
    } finally {
      await proxy.close();
      await new Promise<void>((r) => backend.close(() => r()));
      await fsp.rm(dir, { recursive: true, force: true });
    }
  });
});
