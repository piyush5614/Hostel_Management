---
description: "Use the release audit to remediate production-readiness blockers in safe, tested phases"
name: "Remediate Production Readiness"
argument-hint: "Optional: specify a release-audit finding or phase"
agent: "agent"
---

Act as a cautious release engineer. Use [the release audit](../../docs/audit/results.md) as the starting evidence, and inspect [the environment template](../../.env.example) without ever printing local environment values or secrets.

## Guardrails

- Recheck each finding against current code and current command output before changing it; the audit can become stale.
- Never expose or echo secret values, student data, account credentials, tokens, or phone numbers.
- Never mutate the configured production Supabase project. Do not create/delete real accounts, movements, visitors, attendance, rooms, or other records.
- Load and browser tests must use an isolated test database/project and fake seeded data. If unavailable, mark that phase blocked and ask for the required staging access; do not redirect tests to production.
- Preserve pre-existing worktree changes. Do not revert unrelated changes, and do not claim a finding is fixed until its exact acceptance check passes.
- Make the smallest complete change, add focused regression coverage, and run the narrowest relevant tests plus typecheck/build. Do not use `npm audit fix --force` or make broad upgrades without reviewing every breaking change.
- Stop for user approval when a choice changes account identity/authentication architecture, data migration, user-visible behavior, production configuration, or required access.
- Work in one phase at a time; keep findings and evidence distinct as PASS, FAIL, or NV. Do not claim production readiness while any blocker remains.

## Remaining work, ordered by risk

1. **P0 Socket authentication:** use the same application JWT verifier and payload as HTTP auth; remove the insecure fallback; test valid app-issued tokens and missing/invalid tokens.
2. **P0 dependency vulnerabilities:** audit root and API dependency trees; update only reviewed compatible packages, rerun tests/builds/audits, and isolate any required breaking upgrade.
3. **P0 account provisioning:** resolve whether managed local credentials or Supabase Auth is authoritative. Ask before changing architecture; then verify account provisioning, login, tenant binding, and restart behavior in isolated staging.
4. **P0 runtime demo-data removal:** trace each mock-backed page, add/use authenticated tenant-scoped APIs, preserve behavior, and test each flow. Do not silently replace missing API data with demo records.
5. **P1 CI and quality:** reproduce the current CI failure from available logs, fix its actual cause, verify workflow and tests/build jobs, and make the current commit green.
6. **P1 business workflows:** verify attendance, leave, visitors, rooms, maintenance, notifications, gate transitions/negative paths, and exports against staging fixtures only.
7. **P1 operations:** prove Docker build/run, public HTTPS, health/monitoring, backup restore, mobile layout, and usable operational documentation in the deployment environment.
8. **P2 capacity:** create deterministic fake-data load tests for login/rate limits, gate rush/duplicate protection, sockets, query plans, 100k-row export, 30-minute soak, restart recovery, and the actual Supabase plan.

## Execution protocol

1. Report the current remaining finding counts and the exact phase selected.
2. Inspect every affected caller, test, fixture, environment name, and user-visible behavior before editing.
3. Implement only the selected safe phase. If a prerequisite is missing, stop that phase and record what is needed instead of guessing.
4. Run the focused regression test, typecheck, and relevant build; report exact commands and outcomes.
5. Update [the audit evidence](../../docs/audit/results.md) only when new evidence was actually produced. Do not rewrite or inflate prior evidence.
6. Continue to the next independent phase only when safe and no user decision or external staging access is required.
7. Finish with remaining PASS/FAIL/NV counts, blockers, tests run, and the precise next prerequisite. Do not deploy, push, or modify live data unless explicitly requested and confirmed.
