/**
 * Quality & test capabilities over adt-ls's custom LSP segments — ATC static analysis
 * (`adtLs/atc`) and ABAP Unit code coverage (`adtLs/abapUnit` + `adtLs/coverage`). All
 * READS. Each resolves the object to its repotree AFF URI via lifecycle.resolveAffUri.
 */
import type { LspClient } from '../driver.js';
import type { Lifecycle, ObjectRef } from './lifecycle.js';

export interface QualityDeps {
  lsp: LspClient;
  /** Reused for name → repotree AFF URI (carries the destination). */
  lifecycle: Pick<Lifecycle, 'resolveAffUri'>;
}

/** Race a request against a timeout (clears the timer); the adt-ls ATC/unit backends
 * busy-poll server-side, so a hung run must not hang the tool. */
async function withTimeout<T>(label: string, p: Promise<T>, timeoutMs: number, hint: string): Promise<T> {
  p.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms — ${hint}`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createQuality(deps: QualityDeps) {
  const { lsp, lifecycle } = deps;

  return {
    /**
     * List the ATC check variants configured on the system (name → description). Variants
     * are system-wide, but the backend retrieves them in the context of an anchor object,
     * so `ref` is required. An empty result means no variants configured — `runAtc` then
     * falls back to the system default. `query` filters the picker list.
     */
    async listAtcVariants(ref: ObjectRef, opts: { query?: string } = {}): Promise<unknown> {
      const objectUri = await lifecycle.resolveAffUri(ref);
      // The backend rejects an empty query param ("Parameter value must not be empty"), so
      // default to "*" (match all) when no filter is given. Verified live on a4h.
      const query = opts.query?.trim() ? opts.query : '*';
      return lsp.sendRequest('adtLs/atc/getCheckVariants', { objectUri, quickPickUserInput: query });
    },

    /**
     * Run ABAP Test Cockpit (static analysis) on an object. An empty `checkVariant` uses
     * the backend's system-default variant — so callers normally omit it. Findings:
     * `{lineNumber, priority, message, checkId, …}` (report-only). The backend busy-polls
     * until the run finishes, so the call is timeout-guarded.
     */
    async runAtc(ref: ObjectRef, opts: { checkVariant?: string; timeoutMs?: number } = {}): Promise<unknown> {
      const objectUri = await lifecycle.resolveAffUri(ref);
      return withTimeout(
        'runAtc',
        lsp.sendRequest('adtLs/atc/runCheck', { objectUri, checkVariant: opts.checkVariant ?? '' }),
        opts.timeoutMs ?? 60_000,
        'the ATC run did not finish — the backend may be slow or have no ATC variant configured (see listAtcVariants).',
      );
    },

    /**
     * Run ABAP Unit tests WITH code coverage. Two-phase: `abapUnit/runTests` with
     * `measurement:"COVERAGE"` mints a coverage handle, then `coverage/getCoverage`
     * aggregates statement/branch/procedure counts. `coverage` is null when the object has
     * no tests (so no measurement was produced).
     */
    async runUnitTestsWithCoverage(ref: ObjectRef, opts: { timeoutMs?: number } = {}): Promise<unknown> {
      const lsUri = await lifecycle.resolveAffUri(ref);
      const run = (await withTimeout(
        'runUnitTestsWithCoverage',
        lsp.sendRequest('adtLs/abapUnit/runTests', { lsUris: [lsUri], measurement: 'COVERAGE' }),
        opts.timeoutMs ?? 120_000,
        'the unit-test run did not finish.',
      )) as { result?: unknown; status?: unknown; coverageParams?: unknown };
      let coverage: unknown = null;
      if (run?.coverageParams) {
        const cov = (await lsp.sendRequest('adtLs/coverage/getCoverage', run.coverageParams)) as {
          coverage?: unknown;
        } | null;
        coverage = cov?.coverage ?? cov ?? null;
      }
      return { status: run?.status ?? null, result: run?.result ?? null, coverage };
    },
  };
}

export type Quality = ReturnType<typeof createQuality>;
