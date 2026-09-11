/** SAP ADT VS Code / adt-ls build this SDK is validated against. */
export const REQUIRED_SAPSE_ADT_VSCODE_VERSION = '1.1.2';
export const MINIMUM_ADT_LS_VERSION = '1.1.2';
export const VERIFIED_ADT_LS_VERSION = '1.1.2.202608131517';

export type ParsedAdtLsVersion = readonly [major: number, minor: number, patch: number];

export function parseAdtLsVersion(version: string | undefined): ParsedAdtLsVersion | undefined {
  const m = version?.match(/^(\d+)\.(\d+)\.(\d+)(?:\.|$)/);
  if (!m) return undefined;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareVersion(a: ParsedAdtLsVersion, b: ParsedAdtLsVersion): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

export function isSupportedAdtLsVersion(version: string | undefined): boolean {
  const actual = parseAdtLsVersion(version);
  const minimum = parseAdtLsVersion(MINIMUM_ADT_LS_VERSION);
  return Boolean(actual && minimum && compareVersion(actual, minimum) >= 0);
}

export function assertSupportedAdtLsVersion(version: string | undefined): void {
  if (isSupportedAdtLsVersion(version)) return;
  throw new Error(
    `Unsupported adt-ls version ${version ?? '<missing>'}. @arc-mcp/adt-ls requires adt-ls >= ${MINIMUM_ADT_LS_VERSION} (verified ${VERIFIED_ADT_LS_VERSION}). Update the SAPSE.adt-vscode extension or provide a newer ADT_LS_PATH.`,
  );
}
