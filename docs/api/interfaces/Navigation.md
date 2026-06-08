# Interface: Navigation

Defined in: [api/navigation.ts:40](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L40)

LSP code-intelligence surface (the `navigation` namespace). Positions are a declared
`symbol` name or explicit 1-based `line` + `character`.

## Methods

### documentSymbols()

> **documentSymbols**(`ref`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:42](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L42)

Object outline (LSP `DocumentSymbol[]` — kinds + ranges + children).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

#### Returns

`Promise`\<`unknown`\>

***

### checkSyntax()

> **checkSyntax**(`ref`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:44](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L44)

ABAP syntax check WITHOUT activating (pull diagnostics).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

#### Returns

`Promise`\<`unknown`\>

***

### goToDefinition()

> **goToDefinition**(`ref`, `locator`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:46](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L46)

Go to a symbol's definition (the implementation).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### locator

[`Locator`](Locator.md)

#### Returns

`Promise`\<`unknown`\>

***

### goToDeclaration()

> **goToDeclaration**(`ref`, `locator`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:48](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L48)

Go to a symbol's declaration (the signature).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### locator

[`Locator`](Locator.md)

#### Returns

`Promise`\<`unknown`\>

***

### hover()

> **hover**(`ref`, `locator`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:50](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L50)

Hover info — ABAP signature + ABAP-Doc, or CDS element info.

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### locator

[`Locator`](Locator.md)

#### Returns

`Promise`\<`unknown`\>

***

### documentHighlight()

> **documentHighlight**(`ref`, `locator`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:52](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L52)

Read/write/text occurrences of the symbol within the document.

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### locator

[`Locator`](Locator.md)

#### Returns

`Promise`\<`unknown`\>

***

### findReferences()

> **findReferences**(`ref`, `locator`, `opts?`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:54](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L54)

Where-used (`Location[]`). Timeout-guarded — heavily-used globals can hang.

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### locator

[`Locator`](Locator.md)

##### opts?

###### includeDeclaration?

`boolean`

###### timeoutMs?

`number`

#### Returns

`Promise`\<`unknown`\>

***

### typeHierarchy()

> **typeHierarchy**(`ref`, `locator`, `opts?`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:60](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L60)

Inheritance / implementation tree (prepare → super/sub).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### locator

[`Locator`](Locator.md)

##### opts?

###### direction?

`"supertypes"` \| `"subtypes"` \| `"both"`

#### Returns

`Promise`\<`unknown`\>

***

### completion()

> **completion**(`ref`, `locator`, `opts?`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:66](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L66)

Code completion at a position (capped — lists are huge).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### locator

[`Locator`](Locator.md)

##### opts?

###### maxItems?

`number`

#### Returns

`Promise`\<`unknown`\>
