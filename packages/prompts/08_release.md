# Codex Prompt 08 — Integration, privacy regression and release readiness

Read `AGENTS.md`, `docs/MVP_ACCEPTANCE.md`, `docs/SAFETY_CONTENT_AI.md`, `docs/SOURCE_TRACEABILITY.md`. Implement **Stage 08 ONLY** (EDS-033–036). No new product features; harden existing MVP.

1. Run and fix build/typecheck/lint/unit tests across actual pnpm workspace; add reproducible CI if absent, no unapproved dependency churn.
2. Add or run E2E smoke for full solo 3-step path + delayed effect + debrief; form authoring/edit/export/preview; classroom 3 clients aggregate and <3 suppression.
3. Verify no participant names, personal profiles, raw votes, vote-based grading, sensitive content or secrets in application state/API/logs. Confirm protected author endpoints. Document infrastructure logging caveat.
4. Fresh-run guidance: pnpm install, local dev, optional DB/compose, migration/seed, smoke test, reproducible demo URLs. Health endpoints and graceful errors.
5. Prepare maintainable docs: README architecture, deterministic rule explanation and limitations; educational/source attribution, current review status, human decisions, AI usage note up to one page. Document potential integration with Moodle/Diia.Osvita; actual SCORM/xAPI adapter optional.
6. Produce a **demo script outline** for 2–5 minute live walkthrough and a <=3-minute video outline. Do not generate final slideshow/PDF unless explicitly asked; team owns final submission and confirms current rules.
7. Do not claim expert-reviewed cases without evidence or attempt real deployments/push without approval.

Acceptance:
- `docs/MVP_ACCEPTANCE.md` gates checked against actual code, with status pass/partial/fail and evidence.
- Regression testing green, or clear blocker report and exact minimal fix.
- No critical open security/privacy issues; demo reliably works from clean instructions.

Stop after this stage and hand off a punch list.
