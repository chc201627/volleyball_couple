# ODD Task: Fix Unresolved Knockout Matches Rendering "null vs null"

## Problem & Objective
When creating tournaments with knockout stages (e.g. `groupsFinal` or `crossover`), pre-created knockout matches have slot tokens (e.g. `slot:A1`, `slot:B1`). While groups are in progress, `resolveFormat` sets `resolved: false` and `team1Id: null, team2Id: null`. `TournamentText.matchTitle` formatted `teamName(tournament, null) + ' vs ' + teamName(tournament, null)`, resulting in `"null vs null"`. In addition, unscorable matches were clickable in `matchRowFor`.

Objective:
1. Provide localized slot labels in `TournamentText` (e.g. "1º del grupo A vs 1º del grupo B" in ES, "Group A #1 vs Group B #1" in EN).
2. Fallback to slot tokens (`team1Slot`/`team2Slot`) when `team1Id`/`team2Id` are null.
3. Prevent unscorable/unresolved matches from opening scoring overlay.
4. Support projected team resolution in scoring and slot searching in match search.

## Mirror Status
Engram mirror: `odd/fix-unresolved-match-title/tasks` (pending: Engram tools unavailable in current session).

## Tasks

- [x] TASK-1: In `js/ui/tournament-text.js`, export `slotLabel(token)` using `translate()`, update `teamName()` to resolve slot tokens and avoid `null`/`undefined` strings, and update `matchTitle()` to fallback to `match.team1Slot`/`match.team2Slot`.
- [x] TASK-2: In `js/ui/screens/tournament-day.js` and `js/ui/screens/scoring.js`, delegate slot labeling to `TournamentText.slotLabel`, guard `matchRowFor` scoring click with `view.scorable !== false`, and project resolved teams in `scoring.js`.
- [x] TASK-3: In `js/tournament-day-selectors.js`, include `team1Slot`/`team2Slot` in `searchMatchViews` terms.
- [x] TASK-4: Add automated tests verifying unresolved knockout matches render localized placeholder titles and are not scorable. Verify all browser/Node suites pass.

## Evidence
- Commit: `d4476ce1b7185d7c03f5410e8a65a89259c627d3`
- Tests: 76/76 in `tournament-day-selectors.test.html`, regression suite 100% pass across all 9 suites.

