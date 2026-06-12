/**
 * TLS-terminating reverse proxy (ADR-0006).
 *
 * adt-ls requires an HTTPS `systemUrl` and validates the backend cert's hostname.
 * SAP on-prem systems often present a self-signed cert (e.g. `CN=*.dummy.nodomain`),
 * which fails hostname verification — and adt-ls's Apache HTTP client ignores
 * `-Djdk.internal.httpclient.disableHostnameVerification`.
 *
 * The fix: point adt-ls's destination at `https://localhost:<port>` served by this
 * proxy with a `CN=localhost` cert (added to the JVM truststore → trust ✓ + hostname ✓).
 * The proxy re-originates each request to the real SAP host, where WE (Node) own the TLS
 * and can accept the self-signed cert (`insecureUpstream`).
 *
 * Two upstream modes:
 *   - DIRECT (default): connect straight to the backend over HTTPS.
 *   - FORWARD-PROXY: re-emit each request as a standard absolute-form HTTP proxy
 *     request to `forwardProxy` — the **consumer's** upstream hook (e.g. a local
 *     Cloud-Connector/BTP bridge). The library itself contains no CC/BTP code; it only
 *     forwards to a proxy endpoint the consumer supplies (ADR-0001 / ADR-0006).
 *
 * Request headers are forwarded as-is so SAP builds the reentrance `logonUrl` against
 * `localhost:<port>` (which the logon handler then GETs back through here).
 */
import http from 'node:http';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import { logger } from '../log.js';

export interface TlsReverseProxyOptions {
  /** PEM-encoded server key + cert for the local HTTPS listener (CN=localhost). */
  key: string | Buffer;
  cert: string | Buffer;
  /** Real backend to forward to. `protocol` only matters in forward-proxy mode. */
  target: { host: string; port: number; protocol?: 'http' | 'https' };
  /** DIRECT mode: accept the backend's (self-signed) cert. Default true. */
  insecureUpstream?: boolean;
  /** Bind host for the local listener. Default 127.0.0.1. */
  bindHost?: string;
  /**
   * When set, forward via this HTTP proxy instead of connecting directly — the
   * consumer's upstream hook (e.g. a Cloud-Connector bridge). The library does not
   * provide it.
   */
  forwardProxy?: { host: string; port: number };
  /**
   * DIRECT mode only: present this client cert (mutual TLS) to the backend on every
   * upstream connection — for X.509 client-certificate logon, where the backend maps the
   * cert subject → user (e.g. AS ABAP `icm/HTTPS/verify_client` + CERTRULE). Ignored in
   * forward-proxy mode. PEM `cert`/`key`.
   */
  clientCert?: { cert: string | Buffer; key: string | Buffer };
}

export interface TlsReverseProxy {
  /** Bound port of the local HTTPS listener. */
  port: number;
  /** `https://localhost:<port>` — use as the adt-ls destination systemUrl. */
  url: string;
  close(): Promise<void>;
}

export async function startTlsReverseProxy(opts: TlsReverseProxyOptions): Promise<TlsReverseProxy> {
  const insecureUpstream = opts.insecureUpstream ?? true;
  const bindHost = opts.bindHost ?? '127.0.0.1';

  const fwd = opts.forwardProxy;
  const scheme = opts.target.protocol ?? (fwd ? 'http' : 'https');

  const server = https.createServer({ key: opts.key, cert: opts.cert }, (req, res) => {
    const onUpstream = (upRes: http.IncomingMessage): void => {
      res.writeHead(upRes.statusCode ?? 502, upRes.headers);
      upRes.pipe(res);
    };
    const upstream = fwd
      ? // FORWARD-PROXY mode: absolute-form request to the consumer's bridge.
        http.request(
          {
            host: fwd.host,
            port: fwd.port,
            method: req.method,
            path: `${scheme}://${opts.target.host}:${opts.target.port}${req.url}`,
            headers: { ...req.headers, host: `${opts.target.host}:${opts.target.port}` },
          },
          onUpstream,
        )
      : // DIRECT mode: straight to the backend over HTTPS (optionally with a client cert).
        https.request(
          {
            host: opts.target.host,
            port: opts.target.port,
            method: req.method,
            path: req.url,
            headers: req.headers,
            rejectUnauthorized: !insecureUpstream,
            ...(opts.clientCert ? { cert: opts.clientCert.cert, key: opts.clientCert.key } : {}),
          },
          onUpstream,
        );
    upstream.on('error', (err) => {
      logger.warn(`tls-proxy: upstream error: ${err.message}`);
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
      res.end(`reverse-proxy upstream error: ${err.message}`);
    });
    req.pipe(upstream);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, bindHost, () => resolve());
  });

  const port = (server.address() as AddressInfo).port;
  // CN=localhost cert ⇒ advertise the host as `localhost`, not the bind IP.
  const url = `https://localhost:${port}`;
  const via = fwd ? ` via forward-proxy ${fwd.host}:${fwd.port}` : '';
  logger.info(`tls-proxy: ${url} → ${scheme}://${opts.target.host}:${opts.target.port}${via}`);

  return {
    port,
    url,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
