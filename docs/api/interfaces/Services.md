# Interface: Services

Defined in: [api/services.ts:20](https://github.com/marianfoo/adt-ls/blob/main/src/api/services.ts#L20)

Runtime + business-service surface (the `services` namespace).

## Methods

### runApplication()

> **runApplication**(`ref`): `Promise`\<\{ `output`: `string`; \}\>

Defined in: [api/services.ts:22](https://github.com/marianfoo/adt-ls/blob/main/src/api/services.ts#L22)

Run an executable object (classrun / program) and return its console output.

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

#### Returns

`Promise`\<\{ `output`: `string`; \}\>

***

### serviceBindingDetails()

> **serviceBindingDetails**(`ref`): `Promise`\<`unknown`\>

Defined in: [api/services.ts:24](https://github.com/marianfoo/adt-ls/blob/main/src/api/services.ts#L24)

Read a service binding's details (binding type, OData version, service list).

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

#### Returns

`Promise`\<`unknown`\>

***

### publishServiceBinding()

> **publishServiceBinding**(`ref`): `Promise`\<`unknown`\>

Defined in: [api/services.ts:26](https://github.com/marianfoo/adt-ls/blob/main/src/api/services.ts#L26)

Publish (or unpublish) a service binding — mutating.

#### Parameters

##### ref

[`ObjectRef`](ObjectRef.md)

#### Returns

`Promise`\<`unknown`\>
