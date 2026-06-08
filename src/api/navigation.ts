/**
 * LSP code-intelligence (the SECOND channel — adt-ls is a language server). Thin proxies
 * over standard `textDocument/*` methods: outline, definition, where-used, type hierarchy,
 * syntax check, hover, document-highlight, completion. All READS.
 *
 * Per call: resolve name → repotree AFF URI (lifecycle.resolveAffUri) → readFile →
 * `textDocument/didOpen` (NOTIFICATION) → query → `didClose`.
 */
import type { LspClient } from '../driver.js';
import type { Lifecycle, ObjectRef } from './lifecycle.js';
import { readFile } from './repository.js';

/** Where to point a position-based query: a declared symbol name, OR an explicit 1-based
 * line+character (editor convention; converted to LSP 0-based). */
export interface Locator {
  symbol?: string;
  line?: number;
  character?: number;
}

interface Position {
  line: number;
  character: number;
}
interface DocumentSymbol {
  name: string;
  kind: number;
  selectionRange: { start: Position };
  children?: DocumentSymbol[];
}

export interface NavigationDeps {
  lsp: LspClient;
  /** Reused for name → repotree AFF URI (carries the destination). */
  lifecycle: Pick<Lifecycle, 'resolveAffUri'>;
}

/** LSP code-intelligence surface (the `navigation` namespace). Positions are a declared
 * `symbol` name or explicit 1-based `line` + `character`. */
export interface Navigation {
  /** Object outline (LSP `DocumentSymbol[]` — kinds + ranges + children). */
  documentSymbols(ref: ObjectRef): Promise<unknown>;
  /** ABAP syntax check WITHOUT activating (pull diagnostics). */
  checkSyntax(ref: ObjectRef): Promise<unknown>;
  /** Go to a symbol's definition (the implementation). */
  goToDefinition(ref: ObjectRef, locator: Locator): Promise<unknown>;
  /** Go to a symbol's declaration (the signature). */
  goToDeclaration(ref: ObjectRef, locator: Locator): Promise<unknown>;
  /** Hover info — ABAP signature + ABAP-Doc, or CDS element info. */
  hover(ref: ObjectRef, locator: Locator): Promise<unknown>;
  /** Read/write/text occurrences of the symbol within the document. */
  documentHighlight(ref: ObjectRef, locator: Locator): Promise<unknown>;
  /** Where-used (`Location[]`). Timeout-guarded — heavily-used globals can hang. */
  findReferences(
    ref: ObjectRef,
    locator: Locator,
    opts?: { includeDeclaration?: boolean; timeoutMs?: number },
  ): Promise<unknown>;
  /** Inheritance / implementation tree (prepare → super/sub). */
  typeHierarchy(
    ref: ObjectRef,
    locator: Locator,
    opts?: { direction?: 'supertypes' | 'subtypes' | 'both' },
  ): Promise<unknown>;
  /** Code completion at a position (capped — lists are huge). */
  completion(ref: ObjectRef, locator: Locator, opts?: { maxItems?: number }): Promise<unknown>;
}

export function createNavigation(deps: NavigationDeps): Navigation {
  const { lsp, lifecycle } = deps;

  // Per-URI serialization: didOpen/didClose share ONE LSP connection, so two concurrent
  // ops on the SAME object would duplicate-open and let the first's didClose pull the
  // document out from under the second's in-flight query. Different objects still run in
  // parallel.
  const tails = new Map<string, Promise<void>>();
  function runExclusive<T>(uri: string, op: () => Promise<T>): Promise<T> {
    const prev = tails.get(uri) ?? Promise.resolve();
    const run = prev.then(op, op);
    const tail = run.then(
      () => {},
      () => {},
    );
    tails.set(uri, tail);
    tail.then(() => {
      if (tails.get(uri) === tail) tails.delete(uri);
    });
    return run;
  }

  /** Open the object's document, run fn (with its source), always didClose. */
  async function withOpenDocument<T>(ref: ObjectRef, fn: (uri: string, content: string) => Promise<T>): Promise<T> {
    const uri = await lifecycle.resolveAffUri(ref);
    return runExclusive(uri, async () => {
      const text = await readFile(lsp, uri);
      await lsp.sendNotification('textDocument/didOpen', {
        textDocument: { uri, languageId: 'abap', version: 1, text },
      });
      try {
        return await fn(uri, text);
      } finally {
        await lsp.sendNotification('textDocument/didClose', { textDocument: { uri } }).catch(() => {});
      }
    });
  }

  function findSymbol(symbols: DocumentSymbol[], name: string): DocumentSymbol | undefined {
    const lower = name.toLowerCase();
    for (const s of symbols) {
      if (s.name?.toLowerCase() === lower) return s;
      const c = s.children ? findSymbol(s.children, name) : undefined;
      if (c) return c;
    }
    return undefined;
  }
  function symbolNames(symbols: DocumentSymbol[]): string[] {
    return symbols.flatMap((s) => [s.name, ...(s.children ? symbolNames(s.children) : [])]);
  }

  /** Locate a name's first word-boundary occurrence → 0-based position. Fallback for when
   * documentSymbol misses the symbol (notably CDS/DDLS, whose outline is empty headless). */
  function findInSource(content: string, name: string): Position | undefined {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    const lines = content.split('\n');
    for (let line = 0; line < lines.length; line++) {
      const m = re.exec(lines[line]);
      if (m) return { line, character: m.index };
    }
    return undefined;
  }

  /** Strip an LSP node's opaque `data` blob (resolve payload) — dead weight + token sink. */
  function stripData<T>(node: T): T {
    if (node && typeof node === 'object' && 'data' in node) {
      const { data: _data, ...rest } = node as Record<string, unknown>;
      return rest as T;
    }
    return node;
  }

  /** Point at the symbol's NAME token. adt-ls's selectionRange for a class/interface spans
   * the whole body and starts at column 0 (the keyword), which breaks position queries, so
   * locate the name within its declaration line; fall back to selectionRange.start. */
  function positionOfSymbol(content: string, hit: DocumentSymbol): Position {
    const start = hit.selectionRange.start;
    if (start.character > 0) return start;
    const lineText = content.split('\n')[start.line] ?? '';
    const escaped = hit.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = new RegExp(`\\b${escaped}\\b`, 'i').exec(lineText);
    return m ? { line: start.line, character: m.index } : start;
  }

  /** Prime the ABAP token cache so hover/documentHighlight pass the backend gate. adt-ls's
   * hover/highlight services short-circuit to null/[] unless the token under the cursor is
   * in AbapDocumentTokenCache — populated ONLY by `semanticTokens/full` (same doc version).
   * Best-effort (DDLS/JSON parse inline and don't need it). */
  async function primeTokens(uri: string): Promise<void> {
    await lsp.sendRequest('textDocument/semanticTokens/full', { textDocument: { uri } }).catch(() => {});
  }

  /** Resolve a locator → 0-based LSP position. Doc must already be open (symbol lookup). */
  async function resolvePosition(uri: string, content: string, locator: Locator): Promise<Position> {
    if (locator.line !== undefined && locator.character !== undefined) {
      return { line: Math.max(0, locator.line - 1), character: Math.max(0, locator.character - 1) };
    }
    if (locator.symbol) {
      const symbols =
        (await lsp.sendRequest<DocumentSymbol[]>('textDocument/documentSymbol', { textDocument: { uri } })) ?? [];
      const hit = findSymbol(symbols, locator.symbol);
      if (hit) return positionOfSymbol(content, hit);
      const fromSource = findInSource(content, locator.symbol);
      if (fromSource) return fromSource;
      throw new Error(
        `Symbol "${locator.symbol}" not found in the outline or source. Declared symbols: ${
          symbolNames(symbols).slice(0, 40).join(', ') || '(none)'
        }. For CDS, pass explicit 1-based line + character instead.`,
      );
    }
    throw new Error('Provide a `symbol` name or explicit `line` + `character` (1-based).');
  }

  return {
    /** Object outline (LSP DocumentSymbol[] — kinds + ranges + children). */
    documentSymbols(ref: ObjectRef): Promise<unknown> {
      return withOpenDocument(ref, (uri) => lsp.sendRequest('textDocument/documentSymbol', { textDocument: { uri } }));
    },

    /** ABAP syntax check WITHOUT activating (pull diagnostics). */
    checkSyntax(ref: ObjectRef): Promise<unknown> {
      return withOpenDocument(ref, (uri) => lsp.sendRequest('textDocument/diagnostic', { textDocument: { uri } }));
    },

    /** Jump to a symbol's definition (LocationLink[]). */
    goToDefinition(ref: ObjectRef, locator: Locator): Promise<unknown> {
      return withOpenDocument(ref, async (uri, content) => {
        const position = await resolvePosition(uri, content, locator);
        return lsp.sendRequest('textDocument/definition', { textDocument: { uri }, position });
      });
    },

    /** Jump to a symbol's declaration/signature (LocationLink[]). */
    goToDeclaration(ref: ObjectRef, locator: Locator): Promise<unknown> {
      return withOpenDocument(ref, async (uri, content) => {
        const position = await resolvePosition(uri, content, locator);
        return lsp.sendRequest('textDocument/declaration', { textDocument: { uri }, position });
      });
    },

    /** Hover info at a position (ABAP signature + ABAP-Doc, or CDS element info). Primes the
     * token cache first; null when there's no element under the cursor. */
    hover(ref: ObjectRef, locator: Locator): Promise<unknown> {
      return withOpenDocument(ref, async (uri, content) => {
        await primeTokens(uri);
        const position = await resolvePosition(uri, content, locator);
        return lsp.sendRequest('textDocument/hover', { textDocument: { uri }, position });
      });
    },

    /** Occurrences of the symbol at a position (DocumentHighlight[]). Same gate as hover. */
    documentHighlight(ref: ObjectRef, locator: Locator): Promise<unknown> {
      return withOpenDocument(ref, async (uri, content) => {
        await primeTokens(uri);
        const position = await resolvePosition(uri, content, locator);
        return lsp.sendRequest('textDocument/documentHighlight', { textDocument: { uri }, position });
      });
    },

    /** Where-used (Location[]). Timeout-guarded: heavily-used global symbols can hang. */
    findReferences(
      ref: ObjectRef,
      locator: Locator,
      opts: { includeDeclaration?: boolean; timeoutMs?: number } = {},
    ): Promise<unknown> {
      return withOpenDocument(ref, async (uri, content) => {
        const position = await resolvePosition(uri, content, locator);
        const timeoutMs = opts.timeoutMs ?? 20_000;
        const narrowHint =
          'the symbol is likely too heavily used (e.g. a global class/method); narrow to a local or less-referenced symbol.';
        const req = lsp.sendRequest('textDocument/references', {
          textDocument: { uri },
          position,
          context: { includeDeclaration: opts.includeDeclaration ?? true },
        });
        req.catch(() => {});
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            req,
            new Promise((_, reject) => {
              timer = setTimeout(
                () => reject(new Error(`findReferences timed out after ${timeoutMs}ms — ${narrowHint}`)),
                timeoutMs,
              );
            }),
          ]);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (/internal error/i.test(msg)) throw new Error(`findReferences failed (${msg}) — ${narrowHint}`);
          throw e;
        } finally {
          if (timer) clearTimeout(timer);
        }
      });
    },

    /** Inheritance / implementation tree (prepareTypeHierarchy → super/sub). */
    typeHierarchy(
      ref: ObjectRef,
      locator: Locator,
      opts: { direction?: 'supertypes' | 'subtypes' | 'both' } = {},
    ): Promise<unknown> {
      const direction = opts.direction ?? 'both';
      return withOpenDocument(ref, async (uri, content) => {
        const position = await resolvePosition(uri, content, locator);
        const items =
          (await lsp.sendRequest<unknown[]>('textDocument/prepareTypeHierarchy', {
            textDocument: { uri },
            position,
          })) ?? [];
        if (!Array.isArray(items) || !items[0]) return { item: null, supertypes: [], subtypes: [] };
        const item = items[0];
        const stripList = (v: unknown) => (Array.isArray(v) ? v.map(stripData) : v);
        const result: { item: unknown; supertypes?: unknown; subtypes?: unknown } = { item: stripData(item) };
        if (direction === 'supertypes' || direction === 'both') {
          result.supertypes = stripList(await lsp.sendRequest('typeHierarchy/supertypes', { item }));
        }
        if (direction === 'subtypes' || direction === 'both') {
          result.subtypes = stripList(await lsp.sendRequest('typeHierarchy/subtypes', { item }));
        }
        return result;
      });
    },

    /** Code completion at a position (capped — completion lists are huge). */
    completion(ref: ObjectRef, locator: Locator, opts: { maxItems?: number } = {}): Promise<unknown> {
      return withOpenDocument(ref, async (uri, content) => {
        const position = await resolvePosition(uri, content, locator);
        const res = await lsp.sendRequest<{ items?: unknown[]; isIncomplete?: boolean } | unknown[]>(
          'textDocument/completion',
          { textDocument: { uri }, position },
        );
        const items = Array.isArray(res) ? res : (res?.items ?? []);
        const isIncomplete = Array.isArray(res) ? undefined : res?.isIncomplete;
        const slim = items.slice(0, opts.maxItems ?? 50).map((it) => {
          if (it && typeof it === 'object' && 'data' in it) {
            const { data: _data, ...rest } = it as Record<string, unknown>;
            return rest;
          }
          return it;
        });
        return { isIncomplete, total: items.length, items: slim };
      });
    },
  };
}
