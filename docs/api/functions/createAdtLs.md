# Function: createAdtLs()

> **createAdtLs**(`opts`): `Promise`\<[`AdtLsClient`](../interfaces/AdtLsClient.md)\>

Defined in: [client.ts:114](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L114)

`@marianfoo/adt-ls` — a generic TypeScript SDK over SAP's headless adt-ls (`adt-lsc`,
shipped in the `sapse.adt-vscode` extension). One unified, namespaced client over both
adt-ls channels (LSP + its own MCP); BYO binary; pluggable auth; cross-platform.

Quickstart:
```ts
import { createAdtLs, basic } from '@marianfoo/adt-ls';
const adt = await createAdtLs({
  connection: { systemUrl: 'https://host:50001', selfSigned: true },
  auth: basic('MARIAN', process.env.SAP_PW!),
});
const hits = await adt.repository.search('CL_ABAP*');
await adt.dispose();
```

Full guide: [docs/usage.md](https://github.com/marianfoo/adt-ls/blob/main/docs/usage.md).

## Parameters

### opts

[`CreateAdtLsOptions`](../interfaces/CreateAdtLsOptions.md)

## Returns

`Promise`\<[`AdtLsClient`](../interfaces/AdtLsClient.md)\>
