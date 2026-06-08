import type { ServerRequestHandler } from '../driver.js';
/**
 * Pluggable authentication (ADR-0003). The on-the-wire method is always
 * `reentranceTicket`; a `LogonStrategy` supplies the *credential* used to fetch the
 * ticket and registers the server→client logon handler(s) on the driver.
 *
 * Built-ins:
 *   - `basic(user, password)`  — headless, on-prem fixed user (fire-and-forget).
 *   - `bearer(token|getToken)` — headless, BTP ABAP / Steampunk (caller's OAuth token).
 *   - `interactive(callbacks)` — human completes SSO; the lib ships NO browser/TTY,
 *     only consumer callbacks (a batteries-included helper is a separate sub-export).
 *   - `custom(register)`       — full escape hatch.
 *
 * The strategy does NOT call `ensureLoggedOn` — the client orchestrates
 * init → create → ensureLoggedOn. A strategy only registers handlers (+ an optional
 * `user` to record on the destination).
 */
import { logger } from '../log.js';
import {
  LSP_REQUEST_BROWSER_LOGON,
  LSP_REQUEST_LOGON_INPUT,
  extractLogonUrl,
  makeReentranceLogonHandler,
  performReentranceLogon,
} from './reentrance.js';

/** Anything that can register a server→client request handler (e.g. AdtLsDriver). */
export interface LogonHandlerRegistrar {
  setRequestHandler(method: string, handler: ServerRequestHandler): void;
}

export interface LogonContext {
  /** Skip TLS verification when our handler calls the proxy/backend (self-signed). */
  insecure?: boolean;
}

export interface LogonStrategy {
  readonly kind: 'basic' | 'bearer' | 'interactive' | 'custom';
  /** Optional user to record on the adt-ls destination (createDestination). */
  readonly user?: string;
  /** Register the server→client logon handler(s) before `ensureLoggedOn`. */
  register(driver: LogonHandlerRegistrar, ctx: LogonContext): void;
}

/** Basic (user/password) — headless reentrance. The common on-prem case. */
export function basic(user: string, password: string): LogonStrategy {
  return {
    kind: 'basic',
    user,
    register(driver, ctx) {
      driver.setRequestHandler(
        LSP_REQUEST_BROWSER_LOGON,
        makeReentranceLogonHandler({ kind: 'basic', user, password }, { insecure: ctx.insecure }),
      );
    },
  };
}

/** Bearer token — headless reentrance for BTP ABAP. `token` may be a value or an
 *  async provider resolved at logon time. The lib does NOT acquire OAuth tokens. */
export function bearer(token: string | (() => string | Promise<string>), opts: { user?: string } = {}): LogonStrategy {
  return {
    kind: 'bearer',
    user: opts.user,
    register(driver, ctx) {
      driver.setRequestHandler(LSP_REQUEST_BROWSER_LOGON, (params) => {
        const logonUrl = extractLogonUrl(params);
        if (!logonUrl) {
          logger.warn('requestBrowserBasedLogon: no logonUrl in params');
          return false;
        }
        void (async () => {
          const t = typeof token === 'function' ? await token() : token;
          await performReentranceLogon(logonUrl, { kind: 'bearer', token: t }, { insecure: ctx.insecure });
        })().catch((e) => logger.warn(`bearer reentrance logon failed: ${e instanceof Error ? e.message : String(e)}`));
        return true; // fire-and-forget
      });
    },
  };
}

export interface InteractiveCallbacks {
  /** Open the SSO URL (browser). The user completes sign-in there. */
  openUrl(url: string): void | Promise<void>;
  /** Prompt for a logon field (e.g. password) when adt-ls asks. Optional. */
  promptField?(field: { key: string; label: string; sensitive: boolean }): Promise<string | undefined>;
  /** Record the destination user. */
  user?: string;
}

type RequestLogonInputParams = {
  id: string;
  title?: string;
  params?: Array<{ description?: string; label?: string; sensitive?: boolean; field?: { key?: string } }>;
};

/** Interactive — the consumer supplies the UX (no hardcoded browser/TTY). */
export function interactive(cb: InteractiveCallbacks): LogonStrategy {
  return {
    kind: 'interactive',
    user: cb.user,
    register(driver) {
      driver.setRequestHandler(LSP_REQUEST_BROWSER_LOGON, (params) => {
        const url = extractLogonUrl(params);
        if (url) void cb.openUrl(url);
        return true; // user completes SSO in the opened browser
      });
      if (cb.promptField) {
        driver.setRequestHandler(LSP_REQUEST_LOGON_INPUT, async (params) => {
          const p = params as RequestLogonInputParams;
          const field = p.params?.[0];
          if (!field?.field?.key) return undefined;
          const value = await cb.promptField?.({
            key: field.field.key,
            label: field.description ?? field.label ?? 'Enter value',
            sensitive: Boolean(field.sensitive),
          });
          return value ? { id: p.id, fields: [{ key: field.field.key, value }] } : undefined;
        });
      }
    },
  };
}

/** Full escape hatch: register your own server→client handlers. */
export function custom(
  register: (driver: LogonHandlerRegistrar, ctx: LogonContext) => void,
  opts: { user?: string } = {},
): LogonStrategy {
  return { kind: 'custom', user: opts.user, register };
}
