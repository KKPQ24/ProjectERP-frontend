# ERP History Views Implementation Plan

**Goal:** Expose existing stock movements and add automatic audit records, then deliver both read-only frontend pages.
**Architecture:** Keep stock calculations unchanged. Add authenticated paginated read endpoints, record successful authenticated HTTP mutations once, redact secrets, and reuse backend role rules in frontend.
**Stack:** Express 5, Prisma 7, PostgreSQL, Next.js 16, React 19, TypeScript, Tailwind.
**Spec:** User requests backend first, push to its existing Git remote, user deploys, then frontend. User explicitly confirms automatic audit logging after database inspection found no audit triggers and zero logs (27 stock movements).

## Constraints
- Do not modify stock calculations, database schema, or existing business data.
- Audit records describe successful HTTP operations and sanitized submitted changes, not before/after database snapshots.
- Audit reads: ADMIN. Stock movement reads: ADMIN, ACCOUNTING, PURCHASING.
- Keep existing backend user edits (package.json, deleted seed, untracked docs) out of our commit.
- New pages follow the established blue #244582 UI with concise Thai copy.
- No deployment performed by the agent. Frontend handles missing endpoints until user deploys backend.

## Review focus
- Missing/invalid JWT and cross-role access must be rejected before database reads.
- Invalid pagination/filter objects must return 400, never unbounded reads.
- Audit must omit secrets, failed requests and reads; logging failure must not misreport an already committed business operation as failed.
- Each mutation produces at most one audit row and identifies the authenticated actor.
- Frontend must handle empty/error/loading states, paging, stale requests and deployment-not-ready errors.

## Tasks
- [x] Add endpoint and audit behavior tests; run and observe failures.
- [x] Add query validation, history controller/routes and audit middleware; preserve stock service.
- [x] Run tests, Prisma generation/build, read-only database smoke checks and independent review.
- [x] Apply only intended backend files, commit and push normally to origin/main.
- [x] Add frontend types/API adapters, role rules, navigation and two history pages.
- [x] Run frontend access tests, type/lint/build checks and inspect desktop/mobile UI.

## Ledger
- Database inspected in READ ONLY transaction: 27 movements, zero audit logs, no public audit triggers.
- Backend work is prepared in a temporary staging copy because its checkout is outside the writable workspace; explicit file copy and Git operations require sandbox escalation.
- Existing backend npm test is an unconfigured placeholder. New tests run through node --import tsx --test without altering the user's package.json changes.

- Backend pushed: 97d39f2bcaae8fb00facbd697e1d9b78fedae48f (origin/main verified equal). 13 HTTP/unit tests pass; Prisma build passes; read-only live API smoke succeeds; independent review finding fixed and retested.

- Frontend: 8 access tests and TypeScript/lint checks pass; production build includes both new routes. Browser verified live stock total27, paging 1/2→2/2, search ST-001→4 records, shipment filter→2, audit empty state0, mobile390px has no page overflow and table scrolls. No live business writes performed.

- User additionally requested explicit backend unit tests. Added 14 pure unit cases plus npm test/test:unit scripts. npm test:27/27; npm run test:unit:14/14. Pushed second backend commit6537744, preserving uncommitted seed:tx script separately.
