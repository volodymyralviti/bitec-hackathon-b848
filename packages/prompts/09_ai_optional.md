# Codex Prompt 09 — OPTIONAL AI Scenario Copilot (POLICY GATED)

Read `AGENTS.md`, `docs/SAFETY_CONTENT_AI.md`, `docs/SCENARIO_DSL.md`, `docs/ARCHITECTURE.md`. Implement **Stage 09 ONLY** if P0 product is complete and the team has supplied/confirmed official AI policy and allowed provider(s). If policy is absent: **do not make any external LLM call**, implement just a safe provider abstraction/mock and report blocked external integration.

Goal: AI helps an authorized author design **editable drafts**, not judge participants or give unreviewed legal conclusions.

1. Add `AiModule` with provider interface `LlmProvider` and `AI_ENABLED=false` default. Keep keys on server, with redacted logs and input size limits.
2. Curated retrieval layer over allowlisted *public* methodological/normative sources stored with source IDs, exact clauses and version metadata. Prefer simple deterministic keyword/full-text retrieval for hackathon; full pgvector RAG only later.
3. POST authorized draft request `{topic,audience,complexity,depth}`; build prompt with retrieved evidence; expect structured `Scenario` JSON plus explicit unverified citation list. No model-provided source URL accepted unless verified against retrieval registry.
4. Validate with shared Zod + graph validator (≥3 sequential decisions on every path) and provenance. Reject fabricated source IDs, unsafe content, invalid JSON; no auto-publish.
5. Angular Studio UI: Generate draft → show citations/uncertainty → edit/preview → request human review. Mark `aiAssisted=true`, `reviewStatus='draft'`.
6. Use mock provider for unit tests; add tests for unsupported citations, invalid scenarios, malicious prompt injection from retrieved documents, disabled feature, no PII ingress.

Acceptance:
- Without approved policy/provider: safe disabled/mock flow, zero external calls, clearly documented.
- With approved policy/provider: structured editable draft and source pointers with human-check warnings; runtime engine never calls AI or assigns learner morality scores.
- No individual learner decisions sent to model; no hidden grading.

Stop before production RAG, scheduled legal updates or auto-publish. Report which policy/approval gates were actually satisfied.
