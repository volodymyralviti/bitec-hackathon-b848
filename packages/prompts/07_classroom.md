# Codex Prompt 07 — Instructor-led anonymous classroom mode

Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/SAFETY_CONTENT_AI.md`, `docs/MVP_ACCEPTANCE.md`, `docs/IMPLEMENTATION_PLAN.md`. Implement **Stage 07 ONLY** (EDS-024–028, privacy subtests EDS-033).

NestJS:
- Session state machine: `created -> voting_open -> voting_closed -> advanced/ended` with room PIN, short TTL, host-only capability separate from participant PIN.
- Socket.IO Gateway/events (or existing realtime system), rigorous DTO validation and host authorization. Host may open/close round, show results, pick branch/advance and end. Use the same deterministic engine for next state.
- Participants join without name/login, use ephemeral anonymous token; one active vote per token/round (document replacement/idempotence). Do not write identifiable vote history or raw vote log to persistence.
- On close, publish aggregate **ONLY**; suppress precise distribution if fewer than configured minimum 3 participants; never broadcast per-user vote or live progressive results. Handle reconnect/expiration/races.

Angular:
- Host screen: create room, show PIN/QR or sharable join URL, control rounds, after-close aggregate results and branch selection.
- Participant screen: PIN join, context, choice, confirmation, wait state, result/next round; no identity prompt.
- Robust errors for invalid PIN, room full/ended, no network, late vote, duplicate, host disconnected.

Acceptance:
- Test with >=3 separate clients/browsers: open round, cast votes, close, see only aggregate; advance and repeat.
- Attempts to call host controls without host secret rejected; duplicates don't inflate aggregate; no personal data in payload/log.
- For 1–2 clients, precise distribution hidden. Expired room cleaned, vote rejected.
- Automated gateway integration tests and basic UI smoke tests pass; document any network-anonymity caveats.

Do not implement leaderboards, profiles, command reporting, chat, or analytics. Stop.
