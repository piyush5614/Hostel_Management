# Release audit results

Evidence records real commands and observed outputs. Secrets and their values are not recorded.

## 1. DB

| ID | PASS/FAIL/NV | evidence (1 line) | severity (BLOCKER/HIGH/MED/LOW) | note (max 15 words) |
|---|---|---|---|---|
| DB-01 | PASS | `npm run dev:api` output: “Connected to Supabase successfully”; health `GET /api/health` returned 200 `{"status":"ok"}`; no fallback/demo warning appeared. | LOW | Startup used the configured live Supabase project. |
| DB-02 | NV | No write/read/delete smoke command run: current API points at live student data, and no isolated test database is configured. | HIGH | Need isolated test database for safe mutation checks. |
| DB-03 | PASS | API Supabase client `select('id',{head:true}).limit(0)` returned PASS reachable for `gate_movements`, `student_qr_tokens`, and `gate_movement_events`. | LOW | No data rows were fetched. |
| DB-04 | NV | Migration `20261019231000_gate_movement_system.sql` defines `gate_movements_one_open_per_student`; live PostgreSQL catalog was not queried. | HIGH | Live unique-index presence remains unverified. |
| DB-05 | PASS | PowerShell `.env` name check returned true for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, and `ALLOWED_ORIGINS`. | LOW | Repository calls the service key `SUPABASE_SERVICE_ROLE_KEY`. |

## 2. MOCK + ACCOUNTS

| ID | PASS/FAIL/NV | evidence (1 line) | severity (BLOCKER/HIGH/MED/LOW) | note (max 15 words) |
|---|---|---|---|---|
| MOCK-01 | FAIL | `rg` on `apps/web/src`: runtime imports of `mock-data` appear in attendance, credential management, dashboard, leave, maintenance, profile, QR scanner, reports, rooms, settings, staff, visitor, and student pages; `enhanced-mock-data` is imported by student, warden, parent, SMS, dashboard, and photo flows. | BLOCKER | Production-facing pages still import demo stores. |
| MOCK-02 | PASS | `POST http://localhost:3001/api/auth/signup` with `{}` returned HTTP 410. | LOW | Public self-signup is disabled. |
| MOCK-03 | PASS | `POST /api/admin/students` and `/api/admin/staff` without authorization each returned HTTP 401. | LOW | Account provisioning routes require authentication. |
| MOCK-04 | FAIL | `admin-provisioning.ts` calls `provision_managed_user` with `p_auth_id: null`; migration stores managed password hashes in `public.users`, not Supabase Auth. | HIGH | Provisioning does not create Supabase Auth accounts. |
| MOCK-05 | NV | No real staff/student account creation or login attempted; this would mutate production Auth/database and no isolated test project is configured. | HIGH | Need isolated test project and disposable accounts. |
| MOCK-06 | NV | No real-account browser white-screen or API-restart login test run; no disposable credentials available. | HIGH | UI and persisted-login recovery remain unverified. |
| MOCK-07 | NV | `rg` found `MOCK_USERS` only in test names; demo-email mapping and mock stores are present in runtime `mock-data.ts`. | HIGH | Runtime demo fallback remains in shared store code. |

Page data-source inventory (source imports and direct API calls; not browser-verified):

| Page | Source |
|---|---|
| Activity feed | REAL — notification context fetches `/api/notifications` |
| Applications | REAL — applications service |
| Attendance | MOCK — `store/mock-data` |
| Credential management | MOCK — `store/mock-data` |
| Currently out | REAL — gate service |
| Dashboard | MOCK — `store/mock-data` |
| Events | REAL — events service |
| Gate scanner | REAL — gate service |
| Leave management | MOCK — `store/mock-data` |
| Login | REAL — auth store/API |
| Maintenance | MOCK — `store/mock-data`; API export only |
| Messages | REAL — authenticated `/api/messages` requests |
| Movement log | REAL — gate service |
| Profile | MOCK — `store/mock-data` |
| QR scanner | MOCK — `store/mock-data` |
| Reports | MOCK — `store/mock-data` |
| Rooms | MOCK — `store/mock-data` |
| Settings | MOCK — `store/mock-data` |
| Staff | MOCK — `store/mock-data`; export service |
| Staff tasks | REAL — staff-tasks service |
| Task start | LOCAL — decodes token and checks local auth state; no API validation |
| Visitor management | MIXED — visitor service plus mock student/staff lookup |
| Staff student view | MOCK — `store/mock-data` |
| Students | MOCK — `store/mock-data` |

## 3. FEATURES LIVE

| ID | PASS/FAIL/NV | evidence (1 line) | severity (BLOCKER/HIGH/MED/LOW) | note (max 15 words) |
|---|---|---|---|---|
| LIVE-01 | NV | No real-account attendance workflow run; no disposable account or isolated project is available. | HIGH | Use an isolated test tenant and real test account. |
| LIVE-02 | NV | No real-account leave workflow run; production submissions would modify live student data. | HIGH | Leave submission and approval remain unverified. |
| LIVE-03 | NV | No real-account visitor workflow run; no authorized test identity/session supplied. | HIGH | Visitor create/check-out remains unverified. |
| LIVE-04 | NV | No real-account room workflow run; production room/student assignments were not changed. | HIGH | Room changes remain unverified. |
| LIVE-05 | NV | No real-account maintenance workflow run; production records were not changed. | HIGH | Maintenance submission and resolution remain unverified. |
| LIVE-06 | NV | No authenticated real-account notification workflow run; notification rows were not changed. | MED | Read, mark-read, and realtime delivery remain unverified. |
| LIVE-07 | NV | Gate live flow was not replayed in this audit; no shared browser page or disposable credentials available. | HIGH | Reason, approve, OUT, return, and IN remain unverified now. |
| LIVE-08 | NV | Gate negative paths not exercised: bad reason, reject, expiry, duplicate scan, revoked QR. | HIGH | Security/state edge cases need isolated live tests. |
| LIVE-09 | NV | Gate “Currently Out” UI not checked against the live test movement. | HIGH | Live list consistency remains unverified. |
| LIVE-10 | NV | Excel export was not generated with real data; production export could disclose personal records. | HIGH | Excel formatting and injection protections remain unverified. |

## 4. QUALITY

| ID | PASS/FAIL/NV | evidence (1 line) | severity (BLOCKER/HIGH/MED/LOW) | note (max 15 words) |
|---|---|---|---|---|
| QUALITY-01 | PASS | `npm --prefix services/api run test -- --run`: 17 files passed, 171 tests passed. | LOW | Full API unit suite passed. |
| QUALITY-02 | PASS | `npm --prefix apps/web run test -- --run`: 7 files passed, 31 tests passed. | LOW | Full web unit suite passed. |
| QUALITY-03 | PASS | `npm --prefix services/api run test:integration`: 2 files passed, 12 tests passed. | LOW | Auth/leave integration suite passed. |
| QUALITY-04 | NV | `npm run test:e2e` not run: test files hard-code account credentials and include leave create/approve/reject mutations against configured app. | HIGH | E2E requires isolated seeded test environment. |
| QUALITY-05 | PASS | `npm --prefix apps/web run lint`: exit 0; ESLint reported 130 warnings, 0 errors. | MED | Existing warnings remain. |
| QUALITY-06 | PASS | `npm --prefix services/api run lint`: exit 0; ESLint reported 27 warnings, 0 errors. | MED | Existing warnings remain. |
| QUALITY-07 | PASS | `npm run typecheck:web`: `tsc --noEmit` exited 0. | LOW | Web typecheck passed. |
| QUALITY-08 | PASS | `npm run typecheck:api`: `tsc --noEmit` exited 0. | LOW | API typecheck passed. |
| QUALITY-09 | PASS | `npm --prefix services/api run build -- --outDir <temporary-directory>`: `tsc` exited 0; temporary output removed. | LOW | Build kept workspace unchanged. |
| QUALITY-10 | PASS | `npm --prefix apps/web run build -- --outDir <temporary-directory>`: Vite exited 0; generated main JS 1,104.49 kB; temporary output removed. | HIGH | Main bundle exceeds 600 kB warning threshold. |
| QUALITY-11 | FAIL | `gh run list --repo piyush5614/Hostel_Management --limit 5 --json ...`: latest run for `353b1e8` concluded `failure`; test job failed, build/Docker skipped. | BLOCKER | Current main commit has failing CI. |
| QUALITY-12 | NV | `actionlint` check: `actionlint unavailable`; `gh run view 39311768383 --log-failed` returned `log not found`. | MED | Workflow syntax not independently linted; failure cause unavailable. |
| QUALITY-13 | NV | Skipped E2E tests: Student Login & View Dashboard; Student View Attendance History; Student View Room Information; Student Submit Leave Application; Student Logout; Navigation between pages; Warden Login & View Dashboard; Warden View Leave Approval Page; Warden View Pending Leave Applications; Warden Approve Leave Application (CRITICAL WORKFLOW); Warden Reject Leave Application; Warden View Students List; Warden View Attendance / Check-in Records; Warden View Visitors; Warden Logout. | HIGH | All listed browser tests need safe test accounts. |

## 5. SECURITY

| ID | PASS/FAIL/NV | evidence (1 line) | severity (BLOCKER/HIGH/MED/LOW) | note (max 15 words) |
|---|---|---|---|---|
| SEC-01 | PASS | Live `POST /api/gate/scan` and `POST /api/gate/movements/not-a-real-id/approve` with signed student-role token each returned 403. | LOW | Student cannot scan or approve. |
| SEC-02 | PASS | Same live gate scan and approval endpoints without Authorization each returned 401. | LOW | Unauthenticated gate calls rejected. |
| SEC-03 | NV | No cross-college live data read attempted; gate movement query derives college from JWT and filters `college_id` in source. | HIGH | Need isolated multi-tenant test fixture. |
| SEC-04 | NV | No cross-student live read attempted; student history query resolves profile by JWT user ID and filters student ID. | HIGH | Need isolated multi-student fixture. |
| SEC-05 | PASS | `rg` across route code found tenant scopes sourced from `req.user?.collegeId`; `getRequestCollegeId` prioritizes JWT over headers/query/body. | LOW | Tenant selection is JWT-first in reviewed paths. |
| SEC-06 | NV | Secret scanner check: `gitleaks` and `trufflehog` unavailable; no substitute repository/history scanner run. | HIGH | Repository and Git history not fully scanned. |
| SEC-07 | PASS | PowerShell evaluated configured `JWT_SECRET` without displaying it: present, 64 characters, 45 unique characters. | LOW | Length and character diversity meet baseline. |
| SEC-08 | PASS | PowerShell evaluated `ALLOWED_ORIGINS`: 2 entries, not empty, wildcard false. | LOW | Localhost origin is configured. |
| SEC-09 | PASS | `npm run build` exited 0; focused auth tests passed 3/3; local in-memory Socket.IO handshake connected with an app-issued token and rejected missing/invalid tokens. | LOW | Shared application JWT verification works in local handshake checks. |
| SEC-10 | PASS | `rg` for log calls containing token, phone, mobile, or contact-number fields in API source returned no matches. | LOW | Static log search only; runtime logs not exhaustively audited. |
| SEC-11 | FAIL | `npm audit --audit-level=high`: root 66 vulnerabilities (41 high, 4 critical); API 47 (22 high, 2 critical); both exit 1. | BLOCKER | Remediate high and critical dependencies before launch. |

## 6. OPS

| ID | PASS/FAIL/NV | evidence (1 line) | severity (BLOCKER/HIGH/MED/LOW) | note (max 15 words) |
|---|---|---|---|---|
| OPS-01 | PASS | `docker --version`: Docker 29.3.1; `docker compose version`: v5.1.1; `docker compose config --quiet`: exit 0, obsolete `version` warning. | LOW | Compose config parses with a deprecated field warning. |
| OPS-02 | NV | Docker image build/run not performed because it creates persistent Docker artifacts outside the one-file write allowance. | MED | Need approval for isolated Docker artifact creation. |
| OPS-03 | NV | No production frontend/API hostname or certificate supplied; deployment docs contain example placeholder domains. | HIGH | Public HTTPS readiness cannot be verified. |
| OPS-04 | PASS | `GET http://localhost:3001/api/health`: HTTP 200, body `{"status":"ok"}`. | LOW | Local API health endpoint responds. |
| OPS-05 | FAIL | `npm run dev:api` output warned `SENTRY_DSN not set. Error tracking disabled.`; environment name check found no `SENTRY_DSN`. | HIGH | Error monitoring is disabled in the tested environment. |
| OPS-06 | NV | `rg -i backup|restore README.md docs`: deployment guide says configure automated Supabase backups; no active backup/restore proof found. | HIGH | Backup configuration and restore drill unverified. |
| OPS-07 | FAIL | Web build output: main JS 1,104.49 kB (294.32 kB gzip), above Vite 600 kB chunk warning threshold. | MED | Reduce initial bundle or document measured impact. |
| OPS-08 | NV | No shared browser or phone device available; mobile layout was not visually tested. | MED | Responsive behavior remains unverified. |
| OPS-09 | NV | `git ls-files README.md docs` listed README and deployment/testing guides; no end-user manual was identified. | MED | User-facing operational guides may be incomplete. |

## 7. CAPACITY

| ID | PASS/FAIL/NV | evidence (1 line) | severity (BLOCKER/HIGH/MED/LOW) | note (max 15 words) |
|---|---|---|---|---|
| CAP-01 | NV | `k6 version`: `k6 unavailable`; existing `tests/load/load-test.js` targets 100 VUs and outdated `/auth/register`, not 300 logins/min. | HIGH | No valid load harness or isolated target. |
| CAP-02 | PASS | `rg` in `middleware/security.ts`: API limiter max 100 per 15 minutes; login limiter max 5 per 15 minutes. | LOW | Static limits confirmed. |
| CAP-03 | NV | No single-IP concurrency test run; it could rate-limit or mutate the configured live project. | HIGH | Shared-IP blocking impact unmeasured. |
| CAP-04 | NV | No 300 logins/min run: k6 unavailable and no isolated test database/account set. | HIGH | Login capacity unmeasured. |
| CAP-05 | NV | No five-scanner/200-student gate rush test; no seeded isolated tenant. | HIGH | Duplicate and rush capacity unmeasured. |
| CAP-06 | NV | No 500 Socket.IO client test run; k6 unavailable and no synthetic socket harness. | HIGH | Realtime capacity unmeasured. |
| CAP-07 | NV | No 1,000 Socket.IO client test run; k6 unavailable and no synthetic socket harness. | HIGH | Realtime capacity unmeasured. |
| CAP-08 | NV | No `EXPLAIN ANALYZE` run; direct SQL/catalog access and test database unavailable. | HIGH | Query plans and execution costs unverified. |
| CAP-09 | NV | API `.env` has no `DATABASE_URL`; Supabase project compute/DB connection limits were not available from the account. | HIGH | Connection headroom unknown. |
| CAP-10 | NV | 100,000-row export not generated; no isolated fake-data DB or export fixture exists. | HIGH | Export memory/time limits unmeasured. |
| CAP-11 | NV | 30-minute soak not run; no staging environment and k6 unavailable. | HIGH | Long-run stability unmeasured. |
| CAP-12 | PASS | Stopped `audit-api`; restarted with `npm run dev:api`; Supabase reconnect logged; post-restart `GET /api/health` returned 200 `{"status":"ok"}`. | LOW | Recovery verified once while idle. |
| CAP-13 | NV | Official docs `https://supabase.com/docs/guides/platform/compute-and-disk` show plan-dependent sizes; current project plan/compute size is unavailable. | HIGH | Cannot assess plan-specific limits. |

## Final assessment (derived only from results above)

### Verdict

**NOT READY.** Multiple BLOCKER findings remain: runtime mock-backed product pages, failed latest CI, and high/critical dependency advisories.

### Scorecard

| Section | PASS | FAIL | NV |
|---|---:|---:|---:|
| 1. DB | 3 | 0 | 2 |
| 2. MOCK + ACCOUNTS | 2 | 2 | 3 |
| 3. FEATURES LIVE | 0 | 0 | 10 |
| 4. QUALITY | 9 | 1 | 3 |
| 5. SECURITY | 7 | 1 | 3 |
| 6. OPS | 2 | 2 | 5 |
| 7. CAPACITY | 2 | 0 | 11 |

### Blockers (priority order)

1. **Root audit reports 41 high and 4 critical; API audit reports 22 high and 2 critical.** Fix: upgrade or replace affected dependencies, then rerun both audits.
2. **Runtime pages still consume demo stores.** Fix: replace mock-backed page data/actions with authenticated tenant-scoped APIs.
3. **Latest CI run for current commit failed; build and Docker jobs were skipped.** Fix: obtain the failed job logs, resolve the cause, and require a green run.

### Other issues

1. Admin provisioning passes `p_auth_id: null` and creates managed database credentials, not Supabase Auth users.
2. Runtime error monitoring is disabled because `SENTRY_DSN` is absent.
3. Web main bundle is 1,104.49 kB (294.32 kB gzip), exceeding Vite's 600 kB warning threshold.
4. Current API/login limits are 100 requests/15 minutes and 5 login requests/15 minutes per IP; shared-IP blocking impact is unmeasured.
5. No end-user manual was identified; Docker Compose emits a deprecated `version` warning.

### Not verified; required input

- Safe write/read/delete smoke, live unique-index catalog check: provide an isolated Supabase test project/tenant and disposable accounts.
- Real-account workflows, account provisioning/Auth parity, UI/no-white-screen/restart login, and all listed Playwright tests: provide isolated seeded test accounts and staging URL.
- Cross-college/cross-student authorization, revoked QR, gate edge paths, full Excel semantics: provide isolated multi-tenant test fixtures.
- Secret scan of repository/history: provide an approved scanner or environment with `gitleaks`/`trufflehog`.
- HTTPS, backup/restore, monitoring alert, mobile layout, and production Docker run: provide deployment/domain access and approve generated Docker artifacts.
- Capacity, `EXPLAIN ANALYZE`, database connections, 100k export, 30-minute soak, Supabase plan limits: provide isolated staging, k6/test harness, SQL access, and current Supabase plan/compute details.
- E2E tests skipped: Student Login & View Dashboard; Student View Attendance History; Student View Room Information; Student Submit Leave Application; Student Logout; Navigation between pages; Warden Login & View Dashboard; Warden View Leave Approval Page; Warden View Pending Leave Applications; Warden Approve Leave Application (CRITICAL WORKFLOW); Warden Reject Leave Application; Warden View Students List; Warden View Attendance / Check-in Records; Warden View Visitors; Warden Logout.
- `docs/audit/FINAL.md` was not created because the read-only scope permits writing only `docs/audit/results.md`.

### Fix order

1. Remediate all high/critical root and API dependency advisories.
2. Remove runtime mock data from production workflows.
3. Retrieve current CI failure logs and make required checks green.
4. Decide the account model; provision and verify matching Auth/database accounts.
5. Stand up isolated staging with disposable multi-tenant fixtures.
6. Run Playwright/live workflows and verify gate indexes, exports, and security cases there.
7. Configure HTTPS, monitoring, backups/restores, and end-user guides.
8. Benchmark documented query plans, rate limits, gate rush, sockets, exports, and soak against the target Supabase plan.
9. Reduce initial bundle size and validate mobile layouts.

Given no measured capacity evidence and unresolved blockers, safe for about **0 concurrent production users can be claimed** on the current setup.
