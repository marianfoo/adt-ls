/**
 * Navigation unit tests — the pure helpers (applyTextEdits, decodeSemanticTokens) and the
 * new methods (format, completion+resolve, semanticTokens) driven by a fake LspClient, so
 * the request wiring + result mapping are covered without a live SAP system.
 */
import { describe, expect, it } from 'vitest';
import {
  type SemanticTokensLegend,
  applyTextEdits,
  createNavigation,
  decodeSemanticTokens,
} from '../src/api/navigation.js';
import type { LspClient } from '../src/driver.js';

const URI = 'abap:/repotree-v1/ADTLS/x/zcl_x.clas.abap';

/** A fake LspClient: requests resolve from `handlers[method]`; notifications are no-ops. */
function fakeLsp(handlers: Record<string, (params: unknown) => unknown>): LspClient {
  return {
    sendRequest: async <T>(method: string, params?: unknown): Promise<T> => {
      const h = handlers[method];
      if (!h) throw new Error(`unexpected request: ${method}`);
      return h(params) as T;
    },
    sendNotification: async () => {},
  };
}
const lifecycle = { resolveAffUri: async () => URI };

describe('applyTextEdits', () => {
  it('returns the text unchanged for no edits', () => {
    expect(applyTextEdits('abc', [])).toBe('abc');
  });
  it('applies a full-document replace', () => {
    const edits = [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } }, newText: 'XYZ' }];
    expect(applyTextEdits('abc', edits)).toBe('XYZ');
  });
  it('applies multiple non-overlapping edits regardless of order', () => {
    const edits = [
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, newText: 'HI' },
      { range: { start: { line: 0, character: 6 }, end: { line: 0, character: 11 } }, newText: 'EARTH' },
    ];
    expect(applyTextEdits('hello world', edits)).toBe('HI EARTH');
  });
  it('applies a multi-line edit at the right offset', () => {
    const edits = [{ range: { start: { line: 1, character: 0 }, end: { line: 1, character: 1 } }, newText: 'B' }];
    expect(applyTextEdits('a\nb\nc', edits)).toBe('a\nB\nc');
  });
  it('treats an out-of-range end line as end-of-text (whole-document replace via sentinel)', () => {
    // The ABAP pretty-printer / many LSP servers emit a sentinel end like {line: 1e9, char: 0}.
    const edits = [
      { range: { start: { line: 0, character: 0 }, end: { line: 1_000_000, character: 0 } }, newText: 'Z' },
    ];
    expect(applyTextEdits('a\nb\nc', edits)).toBe('Z');
  });
  it('clamps a character past the line end to the line boundary', () => {
    const edits = [{ range: { start: { line: 1, character: 0 }, end: { line: 1, character: 999 } }, newText: 'X' }];
    expect(applyTextEdits('a\nbbbb\nc', edits)).toBe('a\nX\nc');
  });
});

describe('decodeSemanticTokens', () => {
  const legend: SemanticTokensLegend = {
    tokenTypes: ['keyword', 'class', 'method'],
    tokenModifiers: ['declaration', 'static'],
  };
  it('returns [] for missing data', () => {
    expect(decodeSemanticTokens(undefined, legend)).toEqual([]);
  });
  it('decodes deltas to absolute positions + resolved names', () => {
    // token1: line0 char0 len5 keyword (no mods); token2: same line, char 0+6=6, len3 class +declaration
    const data = [0, 0, 5, 0, 0, 0, 6, 3, 1, 1];
    expect(decodeSemanticTokens(data, legend)).toEqual([
      { line: 0, character: 0, length: 5, tokenType: 'keyword', tokenModifiers: [] },
      { line: 0, character: 6, length: 3, tokenType: 'class', tokenModifiers: ['declaration'] },
    ]);
  });
  it('advances the line and resets the column on a non-zero line delta + multi-bit modifiers', () => {
    // after a token on line 0: next is line 0+2=2, char 4, method, mods declaration+static (bits 0b11=3)
    const data = [0, 0, 1, 0, 0, 2, 4, 6, 2, 3];
    const decoded = decodeSemanticTokens(data, legend);
    expect(decoded[1]).toEqual({
      line: 2,
      character: 4,
      length: 6,
      tokenType: 'method',
      tokenModifiers: ['declaration', 'static'],
    });
  });
});

describe('navigation.format', () => {
  it('applies the pretty-printer TextEdits to the source', async () => {
    const edits = [
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 8 } }, newText: 'CLASS x.' },
    ];
    const nav = createNavigation({
      lsp: fakeLsp({
        'adtLs/fileSystem/readFile': () => ({ content: 'class x.' }),
        'textDocument/formatting': () => edits,
      }),
      lifecycle,
    });
    const res = await nav.format({ name: 'ZCL_X', objectType: 'CLAS/OC' });
    expect(res.formatted).toBe('CLASS x.');
    expect(res.edits).toEqual(edits);
  });
});

describe('navigation.completion', () => {
  const items = [
    { label: 'ADD', kind: 14 }, // keyword, no data
    { label: 'get', kind: 2, data: { adtUri: '/x' } }, // member, resolvable
  ];
  it('strips data and does not resolve by default', async () => {
    const nav = createNavigation({
      lsp: fakeLsp({
        'adtLs/fileSystem/readFile': () => ({ content: 'x' }),
        'textDocument/completion': () => ({ items, isIncomplete: false }),
        'completionItem/resolve': () => {
          throw new Error('should not resolve when resolve:false');
        },
      }),
      lifecycle,
    });
    const res = (await nav.completion({ name: 'ZCL_X', objectType: 'CLAS/OC' }, { line: 1, character: 1 })) as {
      items: Array<Record<string, unknown>>;
    };
    expect(res.items.every((i) => !('data' in i))).toBe(true);
  });
  it('enriches resolvable items and strips data when resolve:true', async () => {
    let resolveCalls = 0;
    const nav = createNavigation({
      lsp: fakeLsp({
        'adtLs/fileSystem/readFile': () => ({ content: 'x' }),
        'textDocument/semanticTokens/full': () => ({ data: [] }),
        'textDocument/completion': () => ({ items, isIncomplete: false }),
        'completionItem/resolve': (p) => {
          resolveCalls++;
          return { ...(p as object), documentation: { kind: 'markdown', value: 'sig' } };
        },
      }),
      lifecycle,
    });
    const res = (await nav.completion(
      { name: 'ZCL_X', objectType: 'CLAS/OC' },
      { line: 1, character: 1 },
      {
        resolve: true,
      },
    )) as { resolved: number; items: Array<Record<string, unknown>> };
    expect(resolveCalls).toBe(1); // only the item with `data`
    expect(res.resolved).toBe(1);
    const get = res.items.find((i) => i.label === 'get') as Record<string, unknown>;
    expect(get.documentation).toEqual({ kind: 'markdown', value: 'sig' });
    expect('data' in get).toBe(false);
  });
});

describe('navigation.semanticTokens', () => {
  it('fetches + decodes via the deps legend', async () => {
    const nav = createNavigation({
      lsp: fakeLsp({
        'adtLs/fileSystem/readFile': () => ({ content: 'CLASS x.' }),
        'textDocument/semanticTokens/full': () => ({ data: [0, 0, 5, 0, 0] }),
      }),
      lifecycle,
      semanticTokensLegend: { tokenTypes: ['keyword'], tokenModifiers: [] },
    });
    const res = await nav.semanticTokens({ name: 'ZCL_X', objectType: 'CLAS/OC' });
    expect(res.tokens).toEqual([{ line: 0, character: 0, length: 5, tokenType: 'keyword', tokenModifiers: [] }]);
  });
});
