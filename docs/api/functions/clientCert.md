# Function: clientCert()

> **clientCert**(`opts`): [`LogonStrategy`](../interfaces/LogonStrategy.md)

Defined in: [auth/strategy.ts:101](https://github.com/arc-mcp/adt-ls/blob/main/src/auth/strategy.ts#L101)

Client certificate (mutual TLS) — passwordless, headless, NO browser. The library's
reverse proxy presents `cert`/`key` to the backend on every upstream hop, so the TLS
connection authenticates the user (e.g. AS ABAP `icm/HTTPS/verify_client=1` + CERTRULE
maps the cert subject → user). The reentrance handler runs with NO credential — the cert
authenticates the GET, so the backend issues the ticket for the cert-mapped user.

Requires `connection.selfSigned` (the proxy does the mutual-TLS hop). License-free on the
server; nothing to install on the client. Re-auth on a lapsed session is silent (the proxy
just re-presents the cert) — no browser pop, unlike `interactive`.

## Parameters

### opts

#### cert

`string` \| `Buffer`\<`ArrayBufferLike`\>

#### key

`string` \| `Buffer`\<`ArrayBufferLike`\>

#### user?

`string`

## Returns

[`LogonStrategy`](../interfaces/LogonStrategy.md)
