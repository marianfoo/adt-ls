/**
 * Self-healing SAP session (ADR-0007): detect a lost session and transparently
 * re-logon + retry.
 *
 * adt-ls holds a SAP *security session* for the destination after the reentrance-ticket
 * logon. That session expires server-side (typically on inactivity). The death has TWO
 * faces:
 *   1. it announces itself — "Your user was logged off" / HTTP 401 → `withRelogon`.
 *   2. it does NOT — repository searches return EMPTY and CTS throws a generic
 *      "Internal error" while destination metadata still says connected → must be
 *      detected by PROBING a known object (`makeReviveIfDead`).
 *
 * There is no `logoff`/refresh; `ensureLoggedOn` re-fires the registered reentrance
 * handler and re-establishes the session. This module is the pure policy — detection +
 * single-retry orchestration + re-logon de-duplication — wired to a real `relogon`.
 */

/**
 * Signatures of a lost SAP session. Deliberately specific (SAP's "logged off" phrase,
 * session-expiry variants, explicit HTTP 401) rather than broad — a false positive would
 * re-logon + retry a call that failed for an unrelated reason. A normal ABAP
 * syntax/validation error never matches.
 */
const LOGGED_OFF =
  /logged.?off|not logged on|logon (?:failed|required|denied|expired)|session\b[\w\s'"-]{0,24}?\b(?:expired|terminated|timed[- ]?out|invalid|no longer valid)\b|http[\s/]?401|401 unauthorized/i;

/** True when an error/message text indicates the SAP session is gone. */
export function isLoggedOffMessage(text: string): boolean {
  return LOGGED_OFF.test(text);
}

/**
 * True when a *federated* MCP tool result is an error caused by a lost session. The
 * federation client returns tool-level failures as `{isError:true, content}` (it only
 * throws on JSON-RPC transport errors), so result inspection — not just catching throws
 * — is required to catch a logged-off mid-tool.
 */
export function isLoggedOffFederatedResult(res: unknown): boolean {
  const r = res as { isError?: boolean; content?: Array<{ text?: string }> } | undefined;
  if (!r?.isError) return false;
  return isLoggedOffMessage((r.content ?? []).map((c) => c?.text ?? '').join(' '));
}

/**
 * Serialize re-logon. A session loss fails every outstanding call at once; without this
 * they would each kick off their own `ensureLoggedOn`. Concurrent callers share one
 * in-flight attempt; once it settles the next loss starts a fresh one.
 */
export function makeRelogon(doRelogon: () => Promise<boolean>): () => Promise<boolean> {
  let inFlight: Promise<boolean> | undefined;
  return () => {
    if (!inFlight) {
      inFlight = doRelogon().finally(() => {
        inFlight = undefined;
      });
    }
    return inFlight;
  };
}

/**
 * Wrap a call so a lost-session failure triggers a single re-logon + retry. Detects loss
 * two ways — a thrown error (LSP / JSON-RPC) or a federated result flagged `isError` with
 * a logged-off message (pass `loggedOffInResult`). Retries at most once and only if
 * re-logon reports success; never loops.
 */
export function makeWithRelogon(relogon: () => Promise<boolean>) {
  return async function withRelogon<T>(fn: () => Promise<T>, loggedOffInResult?: (r: T) => boolean): Promise<T> {
    try {
      const r = await fn();
      if (loggedOffInResult?.(r) && (await relogon())) return fn();
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isLoggedOffMessage(msg) && (await relogon())) return fn();
      throw e;
    }
  };
}

/**
 * Detect-and-heal a SAP session that died WITHOUT announcing itself. After an idle expiry
 * adt-ls does NOT always emit the "logged off" string `withRelogon` watches for — instead
 * the reentrance ticket lapses and repository searches come back EMPTY while CTS throws a
 * generic "Internal error". Destination metadata still says connected, so nothing upstream
 * notices.
 *
 * `makeReviveIfDead` closes that gap: probe a KNOWN-present object; an empty/failed probe
 * means the session is dead → force a re-logon. Returns `true` iff it re-logged on (the
 * caller should then retry its original op); `false` when the session was already alive
 * (the empty/error was genuine, e.g. a real "not found"). Re-logon de-duplication is
 * handled by the shared `relogon`.
 */
export function makeReviveIfDead(
  probeLive: () => Promise<boolean>,
  relogon: () => Promise<boolean>,
  log?: (msg: string) => void,
): () => Promise<boolean> {
  return async () => {
    if (await probeLive()) return false; // session answers → alive; nothing to heal
    log?.('SAP session appears dead (liveness probe empty) — forcing re-logon');
    return relogon();
  };
}
