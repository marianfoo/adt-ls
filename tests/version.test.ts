import { describe, expect, it } from 'vitest';
import {
  MINIMUM_ADT_LS_VERSION,
  VERIFIED_ADT_LS_VERSION,
  assertSupportedAdtLsVersion,
  isSupportedAdtLsVersion,
  parseAdtLsVersion,
} from '../src/version.js';

describe('adt-ls version compatibility', () => {
  it('parses the semver prefix from SAP build versions', () => {
    expect(parseAdtLsVersion(VERIFIED_ADT_LS_VERSION)).toEqual([1, 0, 1]);
    expect(parseAdtLsVersion('not-a-version')).toBeUndefined();
  });

  it('requires at least the 1.0.1 protocol baseline', () => {
    expect(MINIMUM_ADT_LS_VERSION).toBe('1.0.1');
    expect(isSupportedAdtLsVersion('1.0.0.202605281240')).toBe(false);
    expect(isSupportedAdtLsVersion('1.0.1.202606111342')).toBe(true);
    expect(isSupportedAdtLsVersion('1.0.2.0')).toBe(true);
  });

  it('throws a clear error for older or missing adt-ls builds', () => {
    expect(() => assertSupportedAdtLsVersion(undefined)).toThrow(/requires adt-ls >= 1\.0\.1/);
    expect(() => assertSupportedAdtLsVersion('1.0.0.202605281240')).toThrow(/Unsupported adt-ls version/);
  });
});
