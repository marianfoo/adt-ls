import { describe, expect, it } from 'vitest';
import { parseFederated } from '../src/channels/federated.js';

describe('parseFederated', () => {
  it('prefers the parsed full content text over the (lossy) structuredContent', () => {
    const res = {
      content: [{ text: '{"odataVersion":"V4","name":"X"}' }],
      structuredContent: { name: 'X' }, // omits odataVersion
    };
    expect(parseFederated(res)).toEqual({
      ok: true,
      data: { odataVersion: 'V4', name: 'X' },
      text: '{"odataVersion":"V4","name":"X"}',
    });
  });

  it('falls back to structuredContent when the text is not JSON', () => {
    const out = parseFederated({ content: [{ text: 'plain report' }], structuredContent: { a: 1 } });
    expect(out).toEqual({ ok: true, data: { a: 1 }, text: 'plain report' });
  });

  it('returns the raw text when there is no JSON and no structuredContent', () => {
    expect(parseFederated({ content: [{ text: 'hello' }] })).toEqual({ ok: true, data: 'hello', text: 'hello' });
  });

  it('marks ok=false when isError is set', () => {
    const out = parseFederated({ content: [{ text: '{"msg":"boom"}' }], isError: true });
    expect(out.ok).toBe(false);
    expect(out.data).toEqual({ msg: 'boom' });
  });
});
