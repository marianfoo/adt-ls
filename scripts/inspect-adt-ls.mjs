#!/usr/bin/env node
/** Print an inspectable, credential-free runtime contract. Run npm run build first. */
import { MINIMUM_ADT_LS_VERSION, VERIFIED_ADT_LS_VERSION, createAdtLs } from '../dist/index.js';

const adt = await createAdtLs({ keepAlive: false });
try {
  const health = adt.health();
  console.log(
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        mode: 'foundation (no backend destination)',
        adtLs: { name: health.adtLsName, version: health.adtLsVersion },
        minimumVersion: MINIMUM_ADT_LS_VERSION,
        verifiedVersion: VERIFIED_ADT_LS_VERSION,
        ...(await adt.capabilities()),
      },
      null,
      2,
    ),
  );
} finally {
  await adt.dispose();
}
