# Interface: ConnectionOptions

Defined in: [client.ts:58](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L58)

## Properties

### systemUrl

> **systemUrl**: `string`

Defined in: [client.ts:60](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L60)

HTTPS URL of the SAP backend, e.g. `https://host:50001`.

***

### client?

> `optional` **client?**: `string`

Defined in: [client.ts:61](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L61)

***

### language?

> `optional` **language?**: `string`

Defined in: [client.ts:62](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L62)

***

### selfSigned?

> `optional` **selfSigned?**: `boolean`

Defined in: [client.ts:64](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L64)

Backend presents a self-signed cert → engage the localhost TLS reverse proxy.

***

### extraCaCerts?

> `optional` **extraCaCerts?**: `string`[]

Defined in: [client.ts:66](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L66)

Extra CA cert PEM file paths to add to the JVM truststore (corporate PKI).

***

### forwardProxy?

> `optional` **forwardProxy?**: `object`

Defined in: [client.ts:69](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L69)

Route the proxy's backend hop via a consumer-supplied forward proxy (e.g. a Cloud
 Connector bridge). Only used with `selfSigned`. ADR-0006.

#### host

> **host**: `string`

#### port

> **port**: `number`

***

### probe?

> `optional` **probe?**: `object`

Defined in: [client.ts:71](https://github.com/arc-mcp/adt-ls/blob/main/src/client.ts#L71)

Liveness probe: a known-present object to search for. Default CL_ABAP_TYPEDESCR.

#### pattern

> **pattern**: `string`

#### types?

> `optional` **types?**: `string`[]
