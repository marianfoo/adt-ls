# ADR-0007 — Session resilience built-in

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

A SAP security session held by adt-ls **expires on inactivity, fast and silently**
(a4h: < 3 min idle). The death does **not** reliably announce itself as "logged off" —
most often repository searches return **empty** and CTS throws a generic **"Internal
error"** while destination metadata still reports connected. There is no `logoff`/
refresh; `ensureLoggedOn` re-fires the registered reentrance handler and heals it.
Separately, the SAP-side caches are **cold** on a fresh connect / after idle — the first
search returns `[]` / "Internal error" for a few seconds.

## Decision

Resilience is **built-in and transparent**:
- **cold-retry** — bounded backoff retry on an empty result OR a transient "Internal
  error" for cold-window calls (search, resolve, transport list).
- **dead-session revive** — detect a silently-dead session by **probing a known
  object**; an empty/failed probe ⇒ re-logon, then retry the original call. (String-
  matching "logged off" is necessary but insufficient.)
- **activity-gated keep-alive** — a heartbeat only within an activity window of the last
  user call (warm during use, quiet when idle; self-heal on the next call).
- **`relogon`** — de-duplicated single in-flight re-logon shared by concurrent callers.
- **`health.backendLive`** — last-known real round-trip liveness, distinct from
  destination-connected metadata.

## Consequences

- Unattended agents/servers survive idle expiry without restarts.
- A genuine empty/error still surfaces once guards are exhausted (never hides a real
  outcome).

## Revisit when

- SAP lengthens/abolishes idle expiry, or adds a refresh/keep-warm hook.
