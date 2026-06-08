# Interface: AdtLsClient

Defined in: [client.ts:349](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L349)

The unified adt-ls client returned by [createAdtLs](../functions/createAdtLs.md). One coherent surface over
both adt-ls channels (LSP + adt-ls's own MCP) — the channel split is hidden. Always
call [dispose()](#dispose) when finished.

## Properties

### repository

> **repository**: `object`

Defined in: [client.ts:351](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L351)

Repository queries + file operations + the name→URI resolver.

#### search()

> **search**(`pattern`, `opts?`): `Promise`\<[`QuickSearchResult`](QuickSearchResult.md)\>

Search ABAP repository objects by name pattern (e.g. `"CL_ABAP*"`), optionally filtered by ADT type. `cold` retries the cold-index window.

##### Parameters

###### pattern

`string`

###### opts?

###### maxResults?

`number`

###### types?

`string`[]

###### cold?

`boolean`

##### Returns

`Promise`\<[`QuickSearchResult`](QuickSearchResult.md)\>

#### getUsers()

> **getUsers**(): `Promise`\<[`UserRef`](UserRef.md)[]\>

List user master records visible to the logged-on user.

##### Returns

`Promise`\<[`UserRef`](UserRef.md)[]\>

#### getLsUri()

> **getLsUri**(`adtUri`): `Promise`\<`string`\>

Resolve an ADT object path to the canonical repotree AFF URI used by file ops.

##### Parameters

###### adtUri

`string`

##### Returns

`Promise`\<`string`\>

#### readFile()

> **readFile**(`uri`): `Promise`\<`string`\>

Read an AFF file's content by repotree URI.

##### Parameters

###### uri

`string`

##### Returns

`Promise`\<`string`\>

#### writeFile()

> **writeFile**(`uri`, `content`): `Promise`\<`unknown`\>

Write an AFF file (plain multi-line source) by repotree URI.

##### Parameters

###### uri

`string`

###### content

`string`

##### Returns

`Promise`\<`unknown`\>

#### delete()

> **delete**(`uri`): `Promise`\<`unknown`\>

Delete by AFF URI (use the `.json` metadata URI for objects).

##### Parameters

###### uri

`string`

##### Returns

`Promise`\<`unknown`\>

#### listInactive()

> **listInactive**(): `Promise`\<`unknown`[]\>

List inactive (draft) objects on the connected destination.

##### Returns

`Promise`\<`unknown`[]\>

***

### source

> **source**: `object`

Defined in: [client.ts:371](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L371)

Read object source by name.

#### read()

> **read**(`args`): `Promise`\<`string`\>

Read an object's source (per include for classes, e.g. `include: 'testclasses'`).

##### Parameters

###### args

[`ObjectRef`](ObjectRef.md) & `object`

##### Returns

`Promise`\<`string`\>

***

### lifecycle

> **lifecycle**: `object`

Defined in: [client.ts:376](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L376)

The authoring lifecycle (modern ABAP-Cloud / RAP types; classic types throw a clear error).

#### resolveAffUri()

> **resolveAffUri**(`ref`): `Promise`\<`string`\>

Resolve `{name, objectType}` → repotree AFF URI (search → getLsUri).

##### Parameters

###### ref

[`ObjectRef`](ObjectRef.md)

##### Returns

`Promise`\<`string`\>

#### create()

> **create**(`args`): `Promise`\<[`CreateResult`](CreateResult.md)\>

Create an object. `transportRequestNumber` is `''` for `$TMP`/local packages.

##### Parameters

###### args

###### objectType

`string`

###### name

`string`

###### packageName

`string`

###### description

`string`

###### transportRequestNumber?

`string`

##### Returns

`Promise`\<[`CreateResult`](CreateResult.md)\>

#### update()

> **update**(`args`): `Promise`\<`void`\>

Update an object's source (optionally a specific include).

##### Parameters

###### args

[`ObjectRef`](ObjectRef.md) & `object`

##### Returns

`Promise`\<`void`\>

#### activate()

> **activate**(`args`): `Promise`\<[`ActivateResult`](ActivateResult.md)\>

Activate; on failure `success:false` with structured `diagnostics` (ranges).

##### Parameters

###### args

[`ObjectRef`](ObjectRef.md)

##### Returns

`Promise`\<[`ActivateResult`](ActivateResult.md)\>

#### runUnitTests()

> **runUnitTests**(`args`): `Promise`\<`unknown`\>

Run the object's ABAP Unit tests.

##### Parameters

###### args

[`ObjectRef`](ObjectRef.md)

##### Returns

`Promise`\<`unknown`\>

#### delete()

> **delete**(`args`): `Promise`\<`void`\>

Delete the object (targets its `.json` metadata).

##### Parameters

###### args

[`ObjectRef`](ObjectRef.md)

##### Returns

`Promise`\<`void`\>

#### generate()

> **generate**(`args`): `Promise`\<`unknown`\>

Run a RAP generator → a full object set (table/CDS/BDEF/SRVD/SRVB).

##### Parameters

###### args

###### generatorId

`string`

###### content

`string`

###### packageName

`string`

###### transportRequestNumber?

`string`

###### referencedObjectType?

`string`

###### referencedObjectName?

`string`

##### Returns

`Promise`\<`unknown`\>

#### validate()

> **validate**(`args`): `Promise`\<`unknown`\>

Validate creation input before create (read-only verdict).

##### Parameters

###### args

###### objectType

`string`

###### name

`string`

###### packageName

`string`

###### description

`string`

##### Returns

`Promise`\<`unknown`\>

***

### navigation

> **navigation**: [`Navigation`](Navigation.md)

Defined in: [client.ts:408](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L408)

LSP code-intelligence (symbols, definition, references, type-hierarchy, hover, completion, syntax check).

***

### quality

> **quality**: [`Quality`](Quality.md)

Defined in: [client.ts:410](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L410)

Quality: ATC static analysis + ABAP Unit code coverage.

***

### services

> **services**: [`Services`](Services.md)

Defined in: [client.ts:412](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L412)

Runtime + business services: run a console app, service-binding details/publish.

***

### transport

> **transport**: `object`

Defined in: [client.ts:414](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L414)

CTS transport + lock operations.

#### find()

> **find**(`args`): `Promise`\<`unknown`\>

Object-scoped transport lookup (read-only).

##### Parameters

###### args

###### objectName

`string`

###### objectType

`string`

###### developmentPackage

`string`

###### isCreation

`boolean`

##### Returns

`Promise`\<`unknown`\>

#### create()

> **create**(`args`): `Promise`\<`unknown`\>

Create a CTS transport request (refuses local `$`-packages).

##### Parameters

###### args

###### developmentPackage

`string`

###### transportDescription

`string`

###### isCreation

`boolean`

###### objectName?

`string`

###### objectType?

`string`

##### Returns

`Promise`\<`unknown`\>

#### assign()

> **assign**(`args`): `Promise`\<\{ `assigned`: `boolean`; `object`: `string`; `objectType`: `string`; `transport`: `string`; \}\>

Assign an existing transport to an object.

##### Parameters

###### args

[`ObjectRef`](ObjectRef.md) & `object`

##### Returns

`Promise`\<\{ `assigned`: `boolean`; `object`: `string`; `objectType`: `string`; `transport`: `string`; \}\>

#### list()

> **list**(`opts?`): `Promise`\<`unknown`\>

List your modifiable transports (capped + filterable).

##### Parameters

###### opts?

###### limit?

`number`

###### query?

`string`

##### Returns

`Promise`\<`unknown`\>

#### getLockStatus()

> **getLockStatus**(`args`): `Promise`\<\{ `lockingSupported`: `boolean`; `lockId`: `string` \| `null`; \}\>

Read an object's lock status.

##### Parameters

###### args

[`ObjectRef`](ObjectRef.md)

##### Returns

`Promise`\<\{ `lockingSupported`: `boolean`; `lockId`: `string` \| `null`; \}\>

***

### raw

> **raw**: `object`

Defined in: [client.ts:440](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L440)

Escape hatches for the long tail (ADR-0002).

#### lsp()

> **lsp**\<`T`\>(`method`, `params?`): `Promise`\<`T`\>

Raw LSP / `adtLs/*` request.

##### Type Parameters

###### T

`T` = `unknown`

##### Parameters

###### method

`string`

###### params?

`unknown`

##### Returns

`Promise`\<`T`\>

#### tool()

> **tool**(`name`, `args?`): `Promise`\<`unknown`\>

Raw call to a tool on adt-ls's own MCP server (e.g. a backend-dynamic tool).

##### Parameters

###### name

`string`

###### args?

`Record`\<`string`, `unknown`\>

##### Returns

`Promise`\<`unknown`\>

## Methods

### reconnect()

> **reconnect**(): `Promise`\<`boolean`\>

Defined in: [client.ts:447](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L447)

Force a SAP re-logon; `true` when the session is live afterwards (also auto-heals on dead-session detection).

#### Returns

`Promise`\<`boolean`\>

***

### health()

> **health**(): [`HealthInfo`](HealthInfo.md)

Defined in: [client.ts:449](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L449)

Connection + liveness snapshot.

#### Returns

[`HealthInfo`](HealthInfo.md)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [client.ts:451](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L451)

Shut down: stop the keep-alive, kill adt-ls, close the proxy, and clean temp dirs.

#### Returns

`Promise`\<`void`\>
