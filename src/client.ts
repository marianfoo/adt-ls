/**
 * `createAdtLs()` — the unified client. Wires the whole stack:
 *   discover binary → (optional) TLS truststore + reverse proxy → spawn driver →
 *   register the logon strategy → create destination + ensureLoggedOn → start adt-ls's
 *   own MCP + federate it → resilience (relogon / revive) → the namespaced API.
 *
 * `connection` + `auth` are OPTIONAL: omit both for **foundation mode** — adt-ls and its
 * MCP come up with no destination (e.g. for `health` / listing destinations); the
 * destination-scoped namespaces then throw "No ABAP destination is connected." until a
 * connection is established.
 *
 * One adt-lsc process per instance, isolated store + data dir (ADR-0010). The LSP/MCP
 * split is hidden behind one API; `raw.lsp` / `raw.tool` are the escape hatches (ADR-0002).
 */
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createLifecycle } from './api/lifecycle.js';
import { createNavigation } from './api/navigation.js';
import { createQuality } from './api/quality.js';
import {
  deleteFile,
  getInactiveObjects,
  getLsUri,
  getUsers,
  quickSearch,
  readFile,
  writeFile,
} from './api/repository.js';
import { createServices } from './api/services.js';
import { createDestination, ensureLoggedOn, getLogonInfo, initializeDestinationsService } from './auth/reentrance.js';
import type { LogonStrategy } from './auth/strategy.js';
import { AdtLsMcpClient } from './channels/mcp-federation.js';
import { setMcpDestination, startMcpServer, startMcpServerWithFallback } from './channels/mcp-lifecycle.js';
import { TRUSTSTORE_PASSWORD, prepareAdtLsTls, resolveJreTools } from './connection/cert.js';
import { type TlsReverseProxy, startTlsReverseProxy } from './connection/tls-proxy.js';
import { resolveAdtLsPath } from './discovery.js';
import { AdtLsDriver, type LspClient } from './driver.js';
import { logger } from './log.js';
import { makeRelogon, makeReviveIfDead } from './resilience/session-retry.js';

const execFileP = promisify(execFile);
const VERSION = '0.1.0';
const CLIENT_INFO = { name: '@marianfoo/adt-ls', version: VERSION };
/** Keep-alive heartbeat cadence + activity window (ADR-0007). */
const KEEPALIVE_INTERVAL_MS = 180_000;
const KEEPALIVE_WINDOW_MS = 900_000;

export interface ConnectionOptions {
  /** HTTPS URL of the SAP backend, e.g. `https://host:50001`. */
  systemUrl: string;
  client?: string;
  language?: string;
  /** Backend presents a self-signed cert → engage the localhost TLS reverse proxy. */
  selfSigned?: boolean;
  /** Extra CA cert PEM file paths to add to the JVM truststore (corporate PKI). */
  extraCaCerts?: string[];
  /** Route the proxy's backend hop via a consumer-supplied forward proxy (e.g. a Cloud
   *  Connector bridge). Only used with `selfSigned`. ADR-0006. */
  forwardProxy?: { host: string; port: number };
  /** Liveness probe: a known-present object to search for. Default CL_ABAP_TYPEDESCR. */
  probe?: { pattern: string; types?: string[] };
}

export interface CreateAdtLsOptions {
  /** Explicit adt-ls binary path; otherwise discovered (sapse.adt-vscode / vendor / env). */
  adtLs?: { path?: string };
  /** Backend connection. Omit (with `auth`) for foundation mode (adt-ls up, no destination). */
  connection?: ConnectionOptions;
  /** Logon strategy. Omit (with `connection`) for foundation mode. */
  auth?: LogonStrategy;
  /** adt-ls destination id (callers don't usually need to set this). Default 'ADTLS'. */
  destinationId?: string;
  /** Port for adt-ls's own MCP server. Default 2240 (with bind-fallback). */
  mcpPort?: number;
  /** Enable the activity-gated keep-alive heartbeat. Default true. */
  keepAlive?: boolean;
}

export interface HealthInfo {
  connected: boolean;
  backendLive: boolean;
  destination: string;
  adtLsName?: string;
  adtLsVersion?: string;
  /** Port adt-ls's own MCP server bound (after any port-fallback). */
  mcpPort: number;
}

async function importCaCert(keytool: string, store: string, certPath: string, alias: string): Promise<void> {
  await execFileP(keytool, [
    '-importcert',
    '-noprompt',
    '-keystore',
    store,
    '-storepass',
    TRUSTSTORE_PASSWORD,
    '-alias',
    alias,
    '-file',
    certPath,
  ]);
}

export async function createAdtLs(opts: CreateAdtLsOptions) {
  const conn = opts.connection;
  const auth = opts.auth;
  const probe = conn?.probe ?? { pattern: 'CL_ABAP_TYPEDESCR', types: ['CLAS/OC'] };
  const insecure = Boolean(conn?.selfSigned);
  const binPath = opts.adtLs?.path ?? resolveAdtLsPath();
  const workBase = await fsp.mkdtemp(path.join(os.tmpdir(), 'adt-ls-client-'));

  // The destination id is set only when a connection is configured (foundation mode → undefined).
  const destId: string | undefined = conn && auth ? (opts.destinationId ?? 'ADTLS') : undefined;

  // 1. TLS material + the systemUrl the JVM will use (only when connecting).
  let extraEnv: Record<string, string> = {};
  let systemUrl = conn?.systemUrl ?? '';
  let proxy: TlsReverseProxy | undefined;
  if (conn?.selfSigned) {
    const tls = await prepareAdtLsTls({ adtLsBin: binPath, workDir: workBase });
    const u = new URL(conn.systemUrl);
    proxy = await startTlsReverseProxy({
      key: tls.proxyKeyPem,
      cert: tls.proxyCertPem,
      target: { host: u.hostname, port: Number(u.port || 443), protocol: u.protocol === 'http:' ? 'http' : 'https' },
      insecureUpstream: true,
      forwardProxy: conn.forwardProxy,
    });
    systemUrl = proxy.url;
    extraEnv = { JAVA_TOOL_OPTIONS: tls.javaToolOptions };
  } else if (conn?.extraCaCerts?.length) {
    const { keytool, cacerts } = resolveJreTools(binPath);
    const store = path.join(workBase, 'truststore.p12');
    await fsp.copyFile(cacerts, store);
    for (let i = 0; i < conn.extraCaCerts.length; i++)
      await importCaCert(keytool, store, conn.extraCaCerts[i], `ca-${i}`);
    extraEnv = {
      JAVA_TOOL_OPTIONS: [
        `-Djavax.net.ssl.trustStore=${store}`,
        `-Djavax.net.ssl.trustStorePassword=${TRUSTSTORE_PASSWORD}`,
        '-Djavax.net.ssl.trustStoreType=PKCS12',
      ].join(' '),
    };
  }

  // 2. Spawn the driver.
  const driver = new AdtLsDriver(binPath, { dataDir: path.join(workBase, 'data'), extraEnv, clientInfo: CLIENT_INFO });
  await driver.start();

  // 3. Destination + logon (only when connecting).
  let connected = false;
  if (conn && auth && destId) {
    auth.register(driver, { insecure });
    await initializeDestinationsService(driver, path.join(workBase, 'destinations.json'));
    await createDestination(driver, {
      id: destId,
      systemUrl,
      user: auth.user,
      client: conn.client,
      language: conn.language,
    });
    const logon = await ensureLoggedOn(driver, destId);
    connected = logon.logonState === 'connected';
    if (!connected) {
      const info = await getLogonInfo(driver, destId).catch(() => undefined);
      connected = info?.logonState === 'connected';
    }
    if (!connected) {
      await driver.dispose().catch(() => {});
      await proxy?.close().catch(() => {});
      await fsp.rm(workBase, { recursive: true, force: true }).catch(() => {});
      throw new Error(
        `Logon to ${destId} did not reach 'connected' (${logon.logonState}${logon.message ? `: ${logon.message}` : ''}).`,
      );
    }
  }

  // 4. Start adt-ls's own MCP server (with port-fallback) + federate it (always).
  const token = crypto.randomBytes(24).toString('hex');
  const started = await startMcpServerWithFallback(
    (port) => startMcpServer(driver, { port, token }),
    opts.mcpPort ?? 2240,
    20,
    (busy) => logger.warn(`adt-ls MCP port ${busy} busy — trying ${busy + 1}`),
  );
  const mcp = new AdtLsMcpClient(`http://localhost:${started.port}/mcp`, started.token, CLIENT_INFO);
  await mcp.connect();
  if (destId && connected) await setMcpDestination(driver, destId);
  logger.info(`adt-ls MCP federated on http://localhost:${started.port}/mcp`);

  // 5. Resilience: relogon (deduped) + revive-if-dead (probe a known object). Guarded on destId.
  let backendLive = false;
  const relogon = makeRelogon(async () => {
    if (!destId) return false;
    try {
      const r = await ensureLoggedOn(driver, destId);
      await setMcpDestination(driver, destId);
      const ok = r.logonState === 'connected';
      if (ok) backendLive = true;
      return ok;
    } catch {
      return false;
    }
  });
  const probeLive = async (): Promise<boolean> => {
    if (!destId) return false;
    try {
      const r = await quickSearch(
        driver,
        { destination: destId, pattern: probe.pattern, maxResults: 1, types: probe.types ?? [] },
        {},
      );
      const alive = (r.references?.length ?? 0) > 0;
      if (alive) backendLive = true;
      return alive;
    } catch {
      return false;
    }
  };
  const reviveIfDead = makeReviveIfDead(probeLive, relogon, (m) => logger.warn(m));

  // 6. Activity tracking — user calls go through `active*`; the keep-alive probe uses the raw
  //    driver so it does NOT count as activity (else an idle session never lapses).
  let lastActivity = Date.now();
  const touch = (): void => {
    lastActivity = Date.now();
  };
  const active: LspClient = {
    sendRequest<T = unknown>(m: string, p?: unknown): Promise<T> {
      touch();
      return driver.sendRequest<T>(m, p);
    },
    sendNotification(m: string, p?: unknown): Promise<void> {
      touch();
      return driver.sendNotification(m, p);
    },
  };
  const activeCallTool = (name: string, args: Record<string, unknown>): Promise<unknown> => {
    touch();
    return mcp.callTool(name, args);
  };
  const requireDest = (): string => {
    if (!destId) throw new Error('No ABAP destination is connected.');
    return destId;
  };

  // 7. Assemble the API over the activity-tracking channels.
  const lifecycle = createLifecycle({
    driver: active,
    callTool: activeCallTool,
    destination: () => destId,
    reviveIfDead,
  });
  const navigation = createNavigation({ lsp: active, lifecycle });
  const quality = createQuality({ lsp: active, lifecycle });
  const services = createServices({ lsp: active, lifecycle });

  // 8. Warm up the cold backend caches + start the keep-alive (only when connected).
  let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
  if (connected) {
    await probeLive();
    if (opts.keepAlive !== false) {
      keepAliveTimer = setInterval(() => {
        if (Date.now() - lastActivity > KEEPALIVE_WINDOW_MS) return; // idle → stay quiet
        void reviveIfDead().catch(() => {});
      }, KEEPALIVE_INTERVAL_MS);
      keepAliveTimer.unref?.();
    }
  }

  let disposed = false;
  const dispose = async (): Promise<void> => {
    if (disposed) return;
    disposed = true;
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    await driver.dispose().catch(() => {});
    await proxy?.close().catch(() => {});
    await fsp.rm(workBase, { recursive: true, force: true }).catch(() => {});
  };

  return {
    repository: {
      search: (pattern: string, o: { maxResults?: number; types?: string[]; cold?: boolean } = {}) =>
        quickSearch(
          active,
          { destination: requireDest(), pattern, maxResults: o.maxResults, types: o.types },
          { cold: o.cold },
        ),
      getUsers: () => getUsers(active, requireDest()),
      getLsUri: (adtUri: string) => getLsUri(active, requireDest(), adtUri),
      readFile: (uri: string) => readFile(active, uri),
      writeFile: (uri: string, content: string) => writeFile(active, uri, content),
      delete: (uri: string) => deleteFile(active, uri),
      listInactive: () => getInactiveObjects(active, requireDest()),
    },
    source: { read: lifecycle.readSource },
    lifecycle: {
      resolveAffUri: lifecycle.resolveAffUri,
      create: lifecycle.createObject,
      update: lifecycle.updateSource,
      activate: lifecycle.activate,
      runUnitTests: lifecycle.runUnitTests,
      delete: lifecycle.deleteObject,
      generate: lifecycle.generateObjects,
      validate: lifecycle.validateObject,
    },
    navigation,
    quality,
    services,
    transport: {
      find: lifecycle.findTransport,
      create: lifecycle.createTransport,
      assign: lifecycle.assignTransport,
      list: lifecycle.listTransports,
      getLockStatus: lifecycle.getLockStatus,
    },
    raw: {
      lsp: <T = unknown>(method: string, params?: unknown): Promise<T> => active.sendRequest<T>(method, params),
      tool: (name: string, args: Record<string, unknown> = {}): Promise<unknown> => activeCallTool(name, args),
    },
    /** Re-logon manually (also auto-heals on dead-session detection). */
    reconnect: (): Promise<boolean> => relogon(),
    health: (): HealthInfo => ({
      connected,
      backendLive,
      destination: destId ?? '',
      adtLsName: driver.initializeResult?.serverInfo?.name,
      adtLsVersion: driver.initializeResult?.serverInfo?.version,
      mcpPort: started.port,
    }),
    dispose,
  };
}

export type AdtLsClient = Awaited<ReturnType<typeof createAdtLs>>;
