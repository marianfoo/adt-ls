# Interface: Quality

Defined in: [api/quality.ts:33](https://github.com/arc-mcp/adt-ls/blob/main/src/api/quality.ts#L33)

Quality & test surface (the `quality` namespace). All reads.

## Methods

### listAtcVariants()

> **listAtcVariants**(`ref`, `opts?`): `Promise`\<`unknown`\>

Defined in: [api/quality.ts:35](https://github.com/arc-mcp/adt-ls/blob/main/src/api/quality.ts#L35)

List the ATC check variants on the system (retrieved in the object's context).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### opts?

###### query?

`string`

#### Returns

`Promise`\<`unknown`\>

***

### runAtc()

> **runAtc**(`ref`, `opts?`): `Promise`\<`unknown`\>

Defined in: [api/quality.ts:37](https://github.com/arc-mcp/adt-ls/blob/main/src/api/quality.ts#L37)

Run ABAP Test Cockpit static analysis — empty `checkVariant` = system default. Report-only, timeout-guarded.

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### opts?

###### checkVariant?

`string`

###### timeoutMs?

`number`

#### Returns

`Promise`\<`unknown`\>

***

### runUnitTestsWithCoverage()

> **runUnitTestsWithCoverage**(`ref`, `opts?`): `Promise`\<`unknown`\>

Defined in: [api/quality.ts:39](https://github.com/arc-mcp/adt-ls/blob/main/src/api/quality.ts#L39)

Run ABAP Unit tests WITH code coverage → `{ status, result, coverage }`.

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### opts?

###### timeoutMs?

`number`

#### Returns

`Promise`\<`unknown`\>
