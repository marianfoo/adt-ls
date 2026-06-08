# Interface: AdtLsDriverOptions

Defined in: [driver.ts:104](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L104)

## Properties

### dataDir?

> `optional` **dataDir?**: `string`

Defined in: [driver.ts:106](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L106)

Working/data dir for adt-ls (`-data`). Defaults to an isolated temp dir.

***

### extraEnv?

> `optional` **extraEnv?**: `Record`\<`string`, `string`\>

Defined in: [driver.ts:108](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L108)

Extra env for the spawned JVM (e.g. JAVA_TOOL_OPTIONS truststore).

***

### requestHandlers?

> `optional` **requestHandlers?**: `Record`\<`string`, [`ServerRequestHandler`](../type-aliases/ServerRequestHandler.md)\>

Defined in: [driver.ts:110](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L110)

server→client request handlers, keyed by LSP method.

***

### clientInfo?

> `optional` **clientInfo?**: `object`

Defined in: [driver.ts:112](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L112)

Client identity advertised in initialize (name is reused as the userAgentInfo).

#### name

> **name**: `string`

#### version

> **version**: `string`
