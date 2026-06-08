# ADR-0005 — Cross-platform transport & process

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

adt-ls speaks LSP over a pipe: the client **listens**, adt-lsc **connects**
(`--pipe=<name>`). arc-1-lsp used a hand-built unix socket (mac/Linux only); openADT
used `vscode-jsonrpc`'s `generateRandomPipeName()` which yields a Windows named pipe
(`\\.\pipe\…`) or a unix socket transparently. The library must support Windows, macOS,
and Linux. Only **four** VSIX targets ship: `darwin-arm64`, `darwin-x64`, `linux-x64`,
`win32-x64` (no arm64 Linux/Windows).

## Decision

- Use a **`net.Server` on a SHORT self-generated pipe name** (`\\.\pipe\adt-ls-<id>` on
  Windows, `<tmpdir>/adt-ls-<id>.sock` on unix) + vscode-jsonrpc `createMessageConnection`
  (`StreamMessageReader`/`Writer`); the client listens, adt-lsc connects. **Do NOT use
  `generateRandomPipeName()`** — its 42-char random plus the long macOS system tmpdir
  yields a ~103-char path that hits the unix-socket `sun_path` limit (104), so adt-lsc
  never connects (verified 2026-06-08, connect timed out at 103 chars; a short name
  connects in ~1s). Swallow the `reader`/`writer` `onError` events on teardown to avoid a
  dangling `ERR_STREAM_DESTROYED`.
- Spawn `adt-lsc` with `-Djco.trace_path <dir> -data <dir> --pipe=<pipe>`; pass extra
  JVM env via `JAVA_TOOL_OPTIONS` (launcher-agnostic).
- Keep arc-1-lsp's `routeServerRequest` (safe defaults for `workspace/configuration`
  etc.) and `userAgentInfos` in `initialize` (without it every backend HTTP call NPEs).
- Windows niceties: patch a minimal env if the inherited `PATH` is stripped; terminate
  via `taskkill /T /F` (fallback `SIGTERM`).
- **Support matrix = the four shipped targets.** arm64 Linux/Windows deferred until SAP
  ships them.

## Consequences

- One transport path for all OSes.
- Windows runtime is unverified until **S-win** runs on a Windows self-hosted runner
  (paths already confirmed from the VSIX).

## Revisit when

- SAP ships new platform VSIX targets, or changes the launch contract / pipe model.
