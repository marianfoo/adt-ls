# Interface: AdtLsDriverOptions

Defined in: [driver.ts:120](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L120)

## Properties

### dataDir?

> `optional` **dataDir?**: `string`

Defined in: [driver.ts:122](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L122)

Working/data dir for adt-ls (`-data`). Defaults to an isolated temp dir.

***

### extraEnv?

> `optional` **extraEnv?**: `Record`\<`string`, `string`\>

Defined in: [driver.ts:124](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L124)

Extra env for the spawned JVM (e.g. JAVA_TOOL_OPTIONS truststore).

***

### extraArgs?

> `optional` **extraArgs?**: `string`[]

Defined in: [driver.ts:129](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L129)

Extra CLI/JVM args prepended ahead of adt-ls's own `-data`/`--pipe` — e.g. SNC/JCo
flags (`-Djco.middleware.snc_lib=…`, `-Djava.library.path=…`) or `-consoleLog`.

***

### requestHandlers?

> `optional` **requestHandlers?**: `Record`\<`string`, [`ServerRequestHandler`](../type-aliases/ServerRequestHandler.md)\>

Defined in: [driver.ts:131](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L131)

server→client request handlers, keyed by LSP method.

***

### clientInfo?

> `optional` **clientInfo?**: `object`

Defined in: [driver.ts:133](https://github.com/marianfoo/adt-ls/blob/main/src/driver.ts#L133)

Client identity advertised in initialize (name is reused as the userAgentInfo).

#### name

> **name**: `string`

#### version

> **version**: `string`
