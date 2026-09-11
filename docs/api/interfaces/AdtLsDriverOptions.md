# Interface: AdtLsDriverOptions

Defined in: [driver.ts:121](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L121)

## Properties

### dataDir?

> `optional` **dataDir?**: `string`

Defined in: [driver.ts:124](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L124)

Working/data dir for adt-ls (`-data`). Caller-provided directories are preserved;
the default isolated temp directory is removed on disposal.

***

### extraEnv?

> `optional` **extraEnv?**: `Record`\<`string`, `string`\>

Defined in: [driver.ts:126](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L126)

Extra env for the spawned JVM (e.g. JAVA_TOOL_OPTIONS truststore).

***

### extraArgs?

> `optional` **extraArgs?**: `string`[]

Defined in: [driver.ts:131](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L131)

Extra CLI/JVM args prepended ahead of adt-ls's own `-data`/`--pipe` — e.g. SNC/JCo
flags (`-Djco.middleware.snc_lib=…`, `-Djava.library.path=…`) or `-consoleLog`.

***

### requestHandlers?

> `optional` **requestHandlers?**: `Record`\<`string`, [`ServerRequestHandler`](../type-aliases/ServerRequestHandler.md)\>

Defined in: [driver.ts:133](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L133)

server→client request handlers, keyed by LSP method.

***

### clientInfo?

> `optional` **clientInfo?**: `object`

Defined in: [driver.ts:135](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L135)

Client identity advertised in initialize (name is reused as the userAgentInfo).

#### name

> **name**: `string`

#### version

> **version**: `string`
