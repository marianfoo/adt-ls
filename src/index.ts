/**
 * `@marianfoo/adt-ls` — a generic TypeScript SDK over SAP's headless adt-ls (`adt-lsc`,
 * shipped in the `sapse.adt-vscode` extension). One unified, namespaced client over both
 * adt-ls channels (LSP + its own MCP); BYO binary; pluggable auth; cross-platform.
 *
 * Quickstart:
 * ```ts
 * import { createAdtLs, basic } from '@marianfoo/adt-ls';
 * const adt = await createAdtLs({
 *   connection: { systemUrl: 'https://host:50001', selfSigned: true },
 *   auth: basic('MARIAN', process.env.SAP_PW!),
 * });
 * const hits = await adt.repository.search('CL_ABAP*');
 * await adt.dispose();
 * ```
 *
 * Full guide: {@link https://github.com/marianfoo/adt-ls/blob/main/docs/usage.md | docs/usage.md}.
 */
export { createAdtLs } from './client.js';
export type { AdtLsClient, ConnectionOptions, CreateAdtLsOptions, HealthInfo } from './client.js';

// Auth strategies (ADR-0003)
export { basic, bearer, custom, interactive } from './auth/strategy.js';
export type { InteractiveCallbacks, LogonContext, LogonHandlerRegistrar, LogonStrategy } from './auth/strategy.js';

// Discovery (ADR-0004) — BYO adt-ls
export { defaultExtensionDirs, platformSubPath, resolveAdtLsPath } from './discovery.js';
export type { DiscoverOptions } from './discovery.js';

// Logging (silent by default)
export { setLogger, silentLogger, stderrLogger } from './log.js';
export type { Logger } from './log.js';

// Federated MCP result unwrap (for consumers calling raw.tool directly)
export { parseFederated } from './channels/federated.js';
export type { FederatedResult } from './channels/federated.js';

// Result / argument types + the per-namespace surfaces
export type { ActivateResult, CreateResult, ObjectRef } from './api/lifecycle.js';
export type { Locator, Navigation } from './api/navigation.js';
export type { Quality } from './api/quality.js';
export type { Services } from './api/services.js';
export type { QuickSearchResult, SearchReference, UserRef } from './api/repository.js';

// Advanced / escape hatches
export { AdtLsDriver } from './driver.js';
export type { AdtLsDriverOptions, AdtLsInitializeResult, LspClient, ServerRequestHandler } from './driver.js';
