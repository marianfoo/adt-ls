/**
 * TLS material for the headless adt-ls connection (ADR-0006).
 *
 * Two artifacts, both ephemeral (built at startup into a temp dir, never persisted):
 *   1. a `CN=localhost` keypair+cert for the optional TLS reverse proxy
 *      (`tls-proxy.ts`), and
 *   2. a JVM truststore = a copy of adt-ls's own JRE `cacerts` (so all public CAs
 *      still validate) + that localhost cert, so the JVM trusts the proxy. Injected
 *      into adt-ls via `JAVA_TOOL_OPTIONS` (launcher-agnostic; no `-vmargs` parsing).
 *
 * `keytool` is required and always ships with adt-ls's bundled SAP Machine JRE;
 * `openssl` is required for cert generation (present on macOS/Linux + most images).
 * The bundled-JRE layout is verified against the 1.0.0 VSIX (see ADR-0004).
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export const TRUSTSTORE_PASSWORD = 'changeit'; // JRE cacerts default; truststore holds only public certs
export const PROXY_CERT_ALIAS = 'adt-ls-proxy-localhost';

export interface JreTools {
  keytool: string;
  cacerts: string;
}

/**
 * Locate the bundled SAP Machine JRE's `keytool` + `cacerts` relative to the adt-ls
 * binary. Layouts differ by platform (verified against the 1.0.0 VSIX):
 *   - linux/win: `binDir/plugins/com.sap.adt.jvm.<ver>/jre/...`
 *   - macOS:     `binDir/../Eclipse/plugins/com.sap.adt.jvm.<ver>/jre/...`
 */
export function resolveJreTools(adtLsBin: string): JreTools {
  const binDir = path.dirname(adtLsBin);
  const pluginRoots = [
    path.join(binDir, 'plugins'),
    path.join(binDir, '..', 'Eclipse', 'plugins'),
    path.join(binDir, '..', '..', 'Eclipse', 'plugins'),
  ];
  const keytoolName = process.platform === 'win32' ? 'keytool.exe' : 'keytool';
  for (const plugins of pluginRoots) {
    if (!fs.existsSync(plugins)) continue;
    const jvm = fs.readdirSync(plugins).find((d) => d.startsWith('com.sap.adt.jvm.'));
    if (!jvm) continue;
    const jreLib = path.join(plugins, jvm, 'jre');
    const keytool = path.join(jreLib, 'bin', keytoolName);
    const cacerts = path.join(jreLib, 'lib', 'security', 'cacerts');
    if (fs.existsSync(keytool)) return { keytool, cacerts };
  }
  throw new Error(
    `Could not locate the adt-ls JRE keytool relative to ${adtLsBin}. Looked under: ${pluginRoots.join(', ')}`,
  );
}

export interface ProxyCert {
  keyPath: string;
  certPath: string;
  keyPem: string;
  certPem: string;
}

/** Generate an ephemeral `CN=localhost` self-signed keypair+cert via openssl. */
export async function generateLocalhostCert(dir: string): Promise<ProxyCert> {
  await fsp.mkdir(dir, { recursive: true });
  const keyPath = path.join(dir, 'proxy-key.pem');
  const certPath = path.join(dir, 'proxy-cert.pem');
  // CN=localhost (no SAN): adt-ls's verifier falls back to CN when no SAN is present,
  // and the proxy is only ever reached as `localhost`. Avoiding -addext keeps this
  // portable across OpenSSL and macOS LibreSSL.
  await execFileP('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-days',
    '825',
    '-subj',
    '/CN=localhost',
  ]);
  const [keyPem, certPem] = await Promise.all([fsp.readFile(keyPath, 'utf8'), fsp.readFile(certPath, 'utf8')]);
  return { keyPath, certPath, keyPem, certPem };
}

/**
 * Build a JVM truststore: copy the JRE cacerts (preserving public CAs) and import the
 * proxy cert under `PROXY_CERT_ALIAS`. Returns the truststore path.
 */
export async function buildTruststore(opts: {
  keytool: string;
  cacerts: string;
  certPath: string;
  outPath: string;
  password?: string;
}): Promise<string> {
  const password = opts.password ?? TRUSTSTORE_PASSWORD;
  await fsp.mkdir(path.dirname(opts.outPath), { recursive: true });
  await fsp.copyFile(opts.cacerts, opts.outPath);
  await execFileP(opts.keytool, [
    '-importcert',
    '-noprompt',
    '-keystore',
    opts.outPath,
    '-storepass',
    password,
    '-alias',
    PROXY_CERT_ALIAS,
    '-file',
    opts.certPath,
  ]);
  return opts.outPath;
}

export interface AdtLsTlsMaterial {
  /** PEM key+cert for the reverse proxy. */
  proxyKeyPem: string;
  proxyCertPem: string;
  /** Truststore path + the JAVA_TOOL_OPTIONS to make adt-ls trust the proxy. */
  trustStorePath: string;
  javaToolOptions: string;
}

/**
 * One-shot: generate the localhost proxy cert + build the truststore from adt-ls's own
 * JRE, into `workDir`. Returns everything needed to start the proxy and spawn adt-ls
 * trusting it.
 */
export async function prepareAdtLsTls(opts: { adtLsBin: string; workDir: string }): Promise<AdtLsTlsMaterial> {
  const { keytool, cacerts } = resolveJreTools(opts.adtLsBin);
  const cert = await generateLocalhostCert(opts.workDir);
  const trustStorePath = await buildTruststore({
    keytool,
    cacerts,
    certPath: cert.certPath,
    outPath: path.join(opts.workDir, 'truststore.p12'),
  });
  const javaToolOptions = [
    `-Djavax.net.ssl.trustStore=${trustStorePath}`,
    `-Djavax.net.ssl.trustStorePassword=${TRUSTSTORE_PASSWORD}`,
    '-Djavax.net.ssl.trustStoreType=PKCS12',
  ].join(' ');
  return { proxyKeyPem: cert.keyPem, proxyCertPem: cert.certPem, trustStorePath, javaToolOptions };
}
