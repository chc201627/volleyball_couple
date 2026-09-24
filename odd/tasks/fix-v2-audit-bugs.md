# Feature: Fix v2.0.10 Audit Bugs

## Objective

Resolve the production integration, offline reliability, responsive accessibility, and contract-drift defects found in the v2.0.10 ODD audit.

## Problem and Why

The domain and Firebase suites pass, but the production composition layer drops required tournament context, hardcodes workspace state, assumes two-player teams, promises offline retry without implementing it, and leaves mobile/accessibility behavior unverified. These defects can block knockout scoring, hide players, lose scores, or prevent boot.

## Authorized Scope

- Fix the confirmed defects recorded by the v2.0.10 audit.
- Add or extend focused browser/Firebase tests and documentation needed to prove each fix.
- Do not push, open pull requests, deploy, or modify the pre-existing `.atl` changes.
- Preserve schema-v1 read-only behavior, Firebase authorization, opaque player properties, and the current English/Spanish UI.

## Constraints

- Vanilla HTML/CSS/JavaScript; no production build step or framework.
- Mobile-first: verify 320px first and preserve 44×44px interactive targets.
- Script order remains contractual.
- TDD mode: disabled, sourced from `sdd-init/volleyball_couple`; ordinary focused checks still apply. The stored init is architecturally stale, so only its explicit TDD decision is reused.
- RDD: disabled globally; delivery is `disabled/unmanaged`.
- Pre-existing local changes in `.atl/.skill-registry.cache.json` and `.atl/skill-registry.md` remain untouched.

## Actionable Checklist

- [x] **BUG-1 — Restore formatted-tournament progression**
  - Pass standings into every production format-resolution caller.
  - Derive bracket visibility and next-match availability from the resolved tournament projection instead of hardcoded workspace flags.
  - Add production-composition regression coverage for group-to-knockout progression and next-match state.
  - Route: delegated.
  - Trigger evidence: production behavior spans `app-orchestrator.js` plus multiple tournament/results/scoring screens and tests.

- [x] **BUG-2 — Render arbitrary team sizes and valid controls**
  - Render every member in `team.players` for 2v2, 3v3, and 4v4.
  - Preserve compatibility with pair-shaped legacy data.
  - Remove nested interactive controls from team ownership rows and wire locked-navigation feedback.
  - Add focused UI/component coverage.
  - Route: delegated.
  - Trigger evidence: non-trivial changes across Teams screen, shared UI components, orchestrator wiring, and tests.

- [ ] **BUG-3 — Make offline scoring honest and durable**
  - Persist pending result writes locally and retry them after connectivity returns.
  - Reconcile revisions without silently replacing confirmed local intent.
  - Keep visible offline/conflict/denied states and update translations if behavior wording changes.
  - Add repository/orchestrator regression coverage.
  - Route: delegated.
  - Trigger evidence: state, repository, orchestrator, i18n, and tests share the behavior.

- [ ] **BUG-4 — Harden boot and mobile accessibility**
  - Guard i18n storage reads/writes when storage is unavailable.
  - Bring language and match-hit controls to at least 44×44px at 320px.
  - Add focused storage and responsive accessibility regression checks.
  - Route: delegated.
  - Trigger evidence: i18n, CSS, rendered components, and browser tests are coupled.

- [ ] **BUG-5 — Align executable verification and contracts**
  - Establish the implemented `1–5` skill-level range as the canonical current contract unless source evidence contradicts it.
  - Correct stale README/agent-facing architecture references and inaccurate harness claims.
  - Add one deterministic command that runs all standalone browser harnesses, if achievable without adding a production runtime.
  - Run the complete browser and Firebase Rules suites.
  - Route: delegated.
  - Trigger evidence: documentation, package scripts, harness infrastructure, and release consistency require coordinated verification.

## Acceptance Criteria

- Formatted tournaments resolve knockout participants once prerequisite group matches finish.
- The workspace exposes the real next scorable match and does not show an empty bracket for groups-only formats.
- 3v3 and 4v4 team screens display every player.
- Offline score intent survives reload/reconnect and follows revision-conflict rules.
- Blocking storage access does not prevent application boot or language switching.
- All interactive controls meet the 44×44px mobile target and avoid nested interactive markup.
- Level-range and architecture documentation match executable behavior.
- Focused tests, all browser harnesses, and `npm run test:rules` pass.

## Delivery Plan

- Strategy: `ask-on-risk` (default).
- Forecast: approximately 650–900 authored changed lines, excluding generated output.
- Chain strategy: `feature-branch-chain` (user-selected).
- Review boundary: branch point `a5aa167fccb43bd27988680d3ca734ece5c86521`.
- Running authored line count: 629.
- Slice boundaries: keep the tracker branch as the integration target; each review slice will branch from the previous slice and target its immediate predecessor, while only the tracker branch ultimately targets `main`. Slice 1 is `codex/fix-v2-audit-bugs-01-tournament-flow` with BUG-1 commit `b4ba47fa5028cbfdf23dcd145d813e1b4bd35da8`. Slice 2 is `codex/fix-v2-audit-bugs-02-team-controls` with the BUG-2 work-unit commit `PENDING-COMMIT`.

## Progress and Evidence

- 2026-09-24: `origin/main` confirmed current at `a5aa167`; feature branch `codex/fix-v2-audit-bugs` created.
- Baseline: Firebase Rules 25/25 passed; browser harnesses 709/709 passed while integration/accessibility defects remained uncovered.
- 2026-09-24 BUG-1: centralized the production tournament projection so standings enter `resolveFormat` with every formatted screen and workspace computation. The projection now derives persisted format validation, bracket visibility, completion, and next-match availability from the current tournament.
- BUG-1 focused checks (loopback server + headless Chrome): `tests/tournament-format.test.html` 50/50 passed; `tests/tournament-day-selectors.test.html` 81/81 passed; `tests/workspace-view-machine.test.html` 88/88 passed. Structural search finds the sole production `resolveFormat` call in `js/tournament-day-selectors.js`, with `groups`, `matches`, and `standings` supplied.
- BUG-1 runtime scenario: completed `groupsFinal` group matches resolve `slot:A1` and `slot:A2`, expose `k-final-1` as the next scorable match, and retain the Bracket tab; groups-only projection hides that tab.
- BUG-1 rollback boundary: revert the BUG-1 work-unit commit to restore the prior per-screen resolution calls and workspace flags without affecting BUG-2 through BUG-5.
- BUG-1 delivery: slice branch `codex/fix-v2-audit-bugs-01-tournament-flow`; authored changes: 200 additions + 64 deletions = 264 lines; commit: `b4ba47fa5028cbfdf23dcd145d813e1b4bd35da8`.
- BUG-1 independent verification: PASS. A fresh verifier inspected the committed diff, confirmed the single production `resolveFormat` seam supplies standings, repeated the three focused harnesses (50/50, 81/81, 88/88), and found no product-code or scope-integrity defect. Native risk assessment was unavailable because its temporary `.git` index write was sandbox-denied; RDD remains disabled/unmanaged.
- 2026-09-24 BUG-2: Teams now pass complete `team.players` arrays into a member-list row while retaining the legacy `player1`/`player2` compatibility adapter. The team-mode cards use a separate 44px selection button, so the owner input and King toggles are no longer nested inside an interactive control. Both shell navigations surface their existing lock reason through `onLocked` feedback.
- BUG-2 focused checks (loopback server + headless Chrome at 320px): `tests/teams-ui.test.html` 12/12 passed; `tests/workspace-view-machine.test.html` 88/88 passed; `tests/app-state.test.html` 63/63 passed. `node --check` passed for every changed JavaScript file and `git diff --check` passed. The production UI harness mounts the real components, Teams/mode-fork screens, and app orchestrator; its DOM assertions prove no nested interactive controls remain and its 2v2/3v3/4v4 fixtures render all nine names while preserving opaque properties.
- BUG-2 runtime scenario: a Teams screen with pair-shaped legacy data still shows two members; 3v3 and 4v4 teams show every member; tapping locked Teams in the app bar or tab bar keeps navigation locked and announces the translated reason.
- BUG-2 rollback boundary: revert the BUG-2 work-unit commit to restore two-name rows, card-wide mode selection, and silent locked navigation without affecting BUG-1 or BUG-3 through BUG-5.
- BUG-2 delivery: slice branch `codex/fix-v2-audit-bugs-02-team-controls`; authored changes: 288 additions + 77 deletions = 365 lines; commit: `PENDING-COMMIT`.

## Applicable Checks

- Focused browser harnesses for each work unit.
- All standalone `tests/*.test.html` harnesses through the established browser runner.
- `npm run test:rules`.
- 320px visual/interaction verification with accessible-name and 44×44px checks.
- Release/version consistency check if shipped asset content changes.

## Next Step

Delegate BUG-3 as the next work unit after reconciling the BUG-2 commit identity.
