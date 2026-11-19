# Codex Prompt 04 — Two complete educational scenario files (CIDS-inspired)

Read `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/SCENARIO_DSL.md`, `docs/SAFETY_CONTENT_AI.md`, `docs/SOURCE_TRACEABILITY.md`. If the original local `task.pdf` and CIDS PDF are present, inspect the **actual** pages: task PDF pp.1–5 and CIDS PDF #16 on p.14, #1 on p.13, 6-step model p.11 and five tests p.12. Otherwise use the faithful summary in documentation and explicitly disclose no original PDF checked.

Implement **Stage 04 ONLY** (EDS-011–014). Do NOT claim professional legal review.

Content A: `content/scenarios/urgent-supply.json` — CIDS #16 inspired urgent procurement / generators; operational speed vs due diligence, technical specification, accountability.
Content B: `content/scenarios/truth-under-pressure.json` — CIDS #1 inspired expert advice conflicting with leadership preference; evidence integrity vs loyalty and uncertainty.

Mandatory:
- Ukrainian narration appropriate to public-educational demo; no names/units/real military operations, no restricted data.
- Each scenario has ≥3 sequential **decision** stages on every reachable path (validate mathematically), ≥2 materially meaningful alternatives per stage, branches affecting narrative/outcome, immediate AND delayed consequences.
- Provide explicit values in tension, short/long impact on actor/team/institution/public, reflect uncertainty and possible consultation. Avoid obvious 'take a bribe / refuse bribe' as entire learning conflict; unlawful actions cannot be portrayed as equally lawful.
- CIDS attribution + document metadata. For any Ukrainian law/norm, include exact verifiable source revision/clause or leave `unverified` and label in UI; never invent legal citations.
- `contentReview.status='draft'` and `demoOnly=true`, unless team provides actual expert-reviewed evidence; `aiAssisted=true` if this assistant generated text.
- Provide compact route map and content validation tests, including all branch combinations and delayed triggers.

Acceptance:
- Both cases pass current schema/graph validator and engine path tests.
- All complete playable paths have >=3 sequential choices; at least one delayed event fires per case on a documented path.
- No fabricated norms, fake legal approval, identifiable people/units. Cases can be changed without modifying engine code.

Report coverage/path counts, actual sources and unverified questions requiring review. Stop.
