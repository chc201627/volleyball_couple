# Feature: Edit Completed Scores

## Objective

Allow owners and approved scorers to reopen resolved completed matches and save revision-safe score corrections without widening spectator, legacy-session, or unresolved-bracket permissions.

## Problem and Why

The lower save path already supports monotonic result revisions, but the tournament-day UI reuses `scorable = !match.played` as the entrypoint gate. Completed matches therefore become non-interactive even for authorized editors.

## Authorized Scope

- Separate first-time scoreability from result editability in the production tournament-day projection/UI.
- Preserve spectator denial, schema-v1 read-only behavior, unresolved slot blocking, revision conflict handling, and the durable offline queue.
- Add a focused production-surface regression for owner/scorer editing and spectator/legacy/unresolved denial.
- Update prepared v2.0.11 release/task evidence where required.
- Do not modify or stage the pre-existing `.atl` changes; do not push, create a PR, merge, or deploy.

## Constraints

- Vanilla HTML/CSS/JavaScript; contractual script order.
- TDD mode: disabled per stored project decision; ordinary focused checks apply.
- RDD: disabled globally; delivery is `disabled/unmanaged`.
- Current work builds on the prepared v2.0.11 audit-fix branch.

## Actionable Checklist

- [x] **SCORE-1 — Restore completed-result editing**
  - Model editability separately from unplayed-match scoreability.
  - Allow owner/scorer access only when the match participants are resolved and the session is writable.
  - Keep spectators, schema-v1 sessions, and unresolved bracket matches blocked.
  - Add production UI and revision-save regression coverage.
  - Update v2.0.11 release/task evidence.
  - Route: delegated.
  - Trigger evidence: selector, production screen, authorization context, tests, and release evidence require coordinated changes.

## Acceptance Criteria

- An owner or approved scorer can reopen a completed resolved match and save a corrected result as the next revision.
- A spectator cannot open the editor.
- A schema-v1 session remains read-only.
- An unresolved knockout match cannot be opened.
- Existing first-time scoring, conflict handling, and offline retry tests remain green.

## Delivery Plan

- Strategy: `ask-on-risk`; forecast below 400 authored lines, so one focused PR/work unit is expected.
- Branch: `fix/edit-completed-scores`.
- Review boundary: `3e2511f` plus the verified runner corrections already inherited from the parent branch.
- Running authored line count: 313 (306 additions + 7 deletions).

## Applicable Checks

- Focused completed-score UI harness.
- `npm run test:browser`.
- `npm run test:rules` only if rules/repository behavior changes.
- `node --test tests/browser-runner.test.js` only if runner behavior changes.
- `git diff --check`.

## Progress and Evidence

- 2026-09-25: read-only reproduction confirmed the UI entrypoint gate as the root cause; revisioned save from revision 1 to 2 already works below the UI.
- 2026-09-25: restored the production entrypoint by exposing `editable` separately from first-time `scorable`. The tournament-day screen now permits owner/scorer result correction only for editable views and rejects legacy sessions before opening scoring.
- Runtime scenario: a completed classic match at revision 1 opens the real scoring overlay for an owner, changes 21–18 to 21–19, and saves through `AppState.applyResult()` with expected revision 1 to produce revision 2. The same production rows deny spectator, schema-v1, unresolved knockout, and invalid-stage access.
- Checks: `npm run test:browser` PASS — completed-score-edit 7/7; tournament-day-selectors 84/84; score-input 38/38; offline-scoring 6/6; match-history 39/39; workspace-view-machine 88/88; full suite 17/17 harnesses, 750/750 assertions. `node --check js/tournament-day-selectors.js` PASS. `node --check js/ui/screens/tournament-day.js` PASS. `git diff --check` PASS.
- Rollback boundary: revert the completed-result editability projection, tournament-day entrypoint gate, focused production regression, and v2.0.11 evidence together; existing revisioned save, offline queue, conflict, and history paths are untouched.
- Authored lines: 313 (306 additions + 7 deletions, including this work unit's code, regression, and evidence).
- Assessment: native `medium` / `under_budget`; RDD disabled/unmanaged. Writer verification passed, and the parent repeated the full 17-harness suite, JavaScript syntax checks, and diff check successfully.
- Commit: `31cbadb` (`fix(scoring): allow completed result corrections`).

## Next Step

User-owned delivery remains: push `fix/edit-completed-scores` and create a PR when the repository's approved-issue workflow is available.
