# Interface: CreationField

Defined in: [api/lifecycle.ts:76](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L76)

One field of an object type's creation form (from the native UI model). Unlike the MCP
`getObjectTypeDetails` (just field names + required), this carries the **legal values**:
the value-help target object types, the name regex, and labels.

## Properties

### path

> **path**: `string`

Defined in: [api/lifecycle.ts:78](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L78)

Field key (the bindingPath, e.g. `packageName`, `superclass`, `referencedObject`).

***

### label?

> `optional` **label?**: `string`

Defined in: [api/lifecycle.ts:79](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L79)

***

### required

> **required**: `boolean`

Defined in: [api/lifecycle.ts:80](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L80)

***

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [api/lifecycle.ts:81](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L81)

***

### pattern?

> `optional` **pattern?**: `string`

Defined in: [api/lifecycle.ts:83](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L83)

Validation regex (e.g. `^[A-Z0-9_/]*$` for `name`).

***

### valueHelpTypes?

> `optional` **valueHelpTypes?**: `string`[]

Defined in: [api/lifecycle.ts:86](https://github.com/arc-mcp/adt-ls/blob/main/src/api/lifecycle.ts#L86)

ADT object types this field accepts (e.g. `superclass` → `["CLAS/OC"]`,
`referencedObject` → `["TABL/DT","STOB"]`).
