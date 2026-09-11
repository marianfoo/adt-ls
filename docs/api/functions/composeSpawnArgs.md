# Function: composeSpawnArgs()

> **composeSpawnArgs**(`opts`): `string`[]

Defined in: [driver.ts:93](https://github.com/arc-mcp/adt-ls/blob/main/src/driver.ts#L93)

Build adt-ls's spawn argv. `extraArgs` (e.g. SNC/JCo JVM flags like
`-Djco.middleware.snc_lib=…`, or `-consoleLog`) are prepended ahead of adt-ls's own
`-data`/`--pipe`, where JVM launchers expect leading flags. Pure (no I/O).

## Parameters

### opts

#### dataDir

`string`

#### pipeName

`string`

#### extraArgs?

`string`[]

## Returns

`string`[]
