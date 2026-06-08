# Interface: DiscoverOptions

Defined in: [discovery.ts:37](https://github.com/marianfoo/adt-ls/blob/main/src/discovery.ts#L37)

## Properties

### explicitPath?

> `optional` **explicitPath?**: `string`

Defined in: [discovery.ts:39](https://github.com/marianfoo/adt-ls/blob/main/src/discovery.ts#L39)

Explicit binary path; also read from the `ADT_LS_PATH` env var.

***

### repoRoot?

> `optional` **repoRoot?**: `string`

Defined in: [discovery.ts:41](https://github.com/marianfoo/adt-ls/blob/main/src/discovery.ts#L41)

Consumer repo root to look for `vendor/adt-ls/`. Defaults to `process.cwd()`.

***

### extensionsDir?

> `optional` **extensionsDir?**: `string`

Defined in: [discovery.ts:43](https://github.com/marianfoo/adt-ls/blob/main/src/discovery.ts#L43)

Single extension dir override (mainly for tests).

***

### extensionsDirs?

> `optional` **extensionsDirs?**: `string`[]

Defined in: [discovery.ts:45](https://github.com/marianfoo/adt-ls/blob/main/src/discovery.ts#L45)

Multiple extension dirs to scan; defaults to VS Code / Cursor / Insiders.

***

### platform?

> `optional` **platform?**: `Platform`

Defined in: [discovery.ts:46](https://github.com/marianfoo/adt-ls/blob/main/src/discovery.ts#L46)

***

### arch?

> `optional` **arch?**: `string`

Defined in: [discovery.ts:47](https://github.com/marianfoo/adt-ls/blob/main/src/discovery.ts#L47)
