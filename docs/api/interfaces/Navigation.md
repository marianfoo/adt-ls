# Interface: Navigation

Defined in: [api/navigation.ts:119](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L119)

LSP code-intelligence surface (the `navigation` namespace). Positions are a declared
`symbol` name or explicit 1-based `line` + `character`.

## Methods

### documentSymbols()

> **documentSymbols**(`ref`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:121](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L121)

Object outline (LSP `DocumentSymbol[]` — kinds + ranges + children).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

#### Returns

`Promise`\<`unknown`\>

***

### checkSyntax()

> **checkSyntax**(`ref`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:123](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L123)

ABAP syntax check WITHOUT activating (pull diagnostics).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

#### Returns

`Promise`\<`unknown`\>

***

### goToDefinition()

> **goToDefinition**(`ref`, `locator`): `Promise`\<`unknown`\>

Defined in: [api/navigation.ts:125](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L125)

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

Defined in: [api/navigation.ts:127](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L127)

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

Defined in: [api/navigation.ts:129](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L129)

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

Defined in: [api/navigation.ts:131](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L131)

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

Defined in: [api/navigation.ts:133](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L133)

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

Defined in: [api/navigation.ts:139](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L139)

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

Defined in: [api/navigation.ts:146](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L146)

Code completion at a position (capped — lists are huge). When `resolve` is set, each
returned item is enriched via `completionItem/resolve` (adds signatures / ABAP-Doc).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### locator

[`Locator`](Locator.md)

##### opts?

###### maxItems?

`number`

###### resolve?

`boolean`

###### resolveLimit?

`number`

#### Returns

`Promise`\<`unknown`\>

***

### format()

> **format**(`ref`, `opts?`): `Promise`\<\{ `formatted`: `string`; `edits`: [`TextEdit`](TextEdit.md)[]; \}\>

Defined in: [api/navigation.ts:154](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L154)

Format source via the ABAP Pretty-Printer (whole document). Returns the formatted
source plus the raw LSP `TextEdit[]`. (`tabSize`/`insertSpaces` are passed through; the
pretty-printer largely applies its own ABAP rules.)

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

##### opts?

###### tabSize?

`number`

###### insertSpaces?

`boolean`

#### Returns

`Promise`\<\{ `formatted`: `string`; `edits`: [`TextEdit`](TextEdit.md)[]; \}\>

***

### semanticTokens()

> **semanticTokens**(`ref`): `Promise`\<\{ `legend`: [`SemanticTokensLegend`](SemanticTokensLegend.md); `tokens`: [`DecodedToken`](DecodedToken.md)[]; \}\>

Defined in: [api/navigation.ts:160](https://github.com/marianfoo/adt-ls/blob/main/src/api/navigation.ts#L160)

Semantic tokens for the object, decoded to absolute, name-resolved tokens (the same
pass that primes hover/highlight). Returns `{ legend, tokens }`.

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

#### Returns

`Promise`\<\{ `legend`: [`SemanticTokensLegend`](SemanticTokensLegend.md); `tokens`: [`DecodedToken`](DecodedToken.md)[]; \}\>
