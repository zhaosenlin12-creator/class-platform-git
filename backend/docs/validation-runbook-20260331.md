# Validation Runbook - 2026-03-31

This document records the current repeatable validation flow for the upgrade work.

## Current local commands

Backend:

```bash
cd backend
npm run verify:ci
```

What it does:

- checks syntax for all backend `src/**/*.js`
- runs backend production dependency audit

Frontend:

```bash
cd web
npm run verify:ci
```

What it does:

- builds the production frontend bundle
- runs a smoke-style health check over critical source files and `dist/index.html`

OpenMAIC:

```bash
cd D:\kaifa\OpenMAIC
pnpm lint
pnpm typecheck
pnpm build
```

What it does:

- verifies the React / Next app lint rules
- verifies TypeScript across client and server modules
- validates that the production build, route handlers, and homepage deep-link import flow compile end to end

## Advisory frontend audit command

```bash
cd web
npm run audit:prod -- --json > audit-prod.json
```

Current truth:

- backend production audit is green
- frontend production build is green
- OpenMAIC lint, typecheck, and production build are green
- frontend production audit is not green yet
- frontend production audit is now down to `7` advisory vulnerabilities with `0` high and `0` critical findings
- remaining frontend audit pressure is concentrated in:
  - Vue 2 / Vuex / vue-template-compiler
  - ant-design-vue 1.x
  - TinyMCE 5 wrapper stack
- `pdfjs-dist` and the `viser-vue` / AntV runtime chain have been removed from the active production bundle
- the teaching-platform homework grading route, homework manager page, class schedule flow, and classroom/teaching route registration are currently green after the 2026-03-31 stabilization pass
- resource preview/download is still intentionally compatibility-preserving on the generic authenticated route
- backend now logs `Resource access is using generic authenticated fallback` when a request is not classroom-bound or teacher/admin scoped
- these warnings are audit signals for the future policy-closure phase, not immediate release blockers unless they appear unexpectedly across core classroom flows
- resource delivery is now aligned across local, remote, OSS, and external-access paths for filename normalization, transfer headers, and preview/download counters
- high-frequency classroom read-path logs are now debug-only in production for student classroom list, notes, chat history, and demo-content fetch/save flows
- classroom realtime recovery is currently green for the latest non-breaking hardening batch:
  - backend now emits `classroom-started` from the start endpoint
  - backend now accepts guarded `projector-mode-change` events
  - backend now accepts compatibility `broadcast-language-switch` and `share-work` events instead of dropping them silently
  - the teacher classroom page now restores projector mode and active broadcast state after reconnect
  - the online classroom page and shared websocket utility now both accept legacy `classroom:newMessage` chat payloads for realtime compatibility
  - the classroom manager page no longer depends on a dormant shared websocket listener layer that was not establishing a real classroom connection
  - the online classroom page now backfills late student status events into the local student list and clears student-side broadcast/follow state when the classroom ends or is archived
- legacy teacher compatibility pages are now green for the latest mock-retirement batch:
  - mounted teacher pages no longer display fabricated fallback rows or counters when requests fail
  - teacher dashboard statistics, course completion, recent activity, and today schedule now resolve from teacher-scoped data or explicit zero payloads
  - teacher student management now resolves real progress, detail metrics, learning-mark persistence, and CSV export instead of fabricated success payloads
  - teacher course management now receives real `statsOnly` aggregates and real per-course statistics from the backend
  - classroom detail lookups now fail closed with a real not-found response instead of honoring `mock-classroom-*` compatibility ids

## One-time DB migration for this release lane

If the production database was created before class schedule persistence was added, run this once after uploading the backend code and before final smoke testing:

```bash
cd backend
npm run migrate:class-schedule
```

This migration only adds missing `teaching_class.schedule_weekdays` and `teaching_class.schedule_time_slots` columns. It is idempotent and safe to rerun.

## Release references

Use these documents together with this validation flow:

- `docs/release-readiness-checklist-20260331.md`
- `docs/rollback-runbook-20260331.md`

## GitHub Actions workflow

Workflow file:

- `.github/workflows/validation.yml`

Current behavior:

- backend job fails on syntax or production audit regressions
- frontend job fails on build or smoke-check regressions
- frontend production audit is uploaded as an advisory artifact and does not currently block the workflow
- OpenMAIC is still locally validated and has not yet been wired into this repo's GitHub Actions workflow

## Why the frontend audit is advisory

The remaining frontend vulnerabilities are not isolated low-risk packages anymore. They are tied to legacy framework and editor/chart subsystems. Blocking CI on them right now would turn the workflow red without giving a safe short-term remediation path.

That work remains part of the later frontend modernization phase, not the current stable-upgrade lane.
