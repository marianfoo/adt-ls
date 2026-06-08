# Interface: ConnectionOptions

Defined in: [client.ts:57](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L57)

## Properties

### systemUrl

> **systemUrl**: `string`

Defined in: [client.ts:59](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L59)

HTTPS URL of the SAP backend, e.g. `https://host:50001`.

***

### client?

> `optional` **client?**: `string`

Defined in: [client.ts:60](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L60)

***

### language?

> `optional` **language?**: `string`

Defined in: [client.ts:61](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L61)

***

### selfSigned?

> `optional` **selfSigned?**: `boolean`

Defined in: [client.ts:63](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L63)

Backend presents a self-signed cert → engage the localhost TLS reverse proxy.

***

### extraCaCerts?

> `optional` **extraCaCerts?**: `string`[]

Defined in: [client.ts:65](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L65)

Extra CA cert PEM file paths to add to the JVM truststore (corporate PKI).

***

### forwardProxy?

> `optional` **forwardProxy?**: `object`

Defined in: [client.ts:68](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L68)

Route the proxy's backend hop via a consumer-supplied forward proxy (e.g. a Cloud
 Connector bridge). Only used with `selfSigned`. ADR-0006.

#### host

> **host**: `string`

#### port

> **port**: `number`

***

### probe?

> `optional` **probe?**: `object`

Defined in: [client.ts:70](https://github.com/marianfoo/adt-ls/blob/main/src/client.ts#L70)

Liveness probe: a known-present object to search for. Default CL_ABAP_TYPEDESCR.

#### pattern

> **pattern**: `string`

#### types?

> `optional` **types?**: `string`[]
