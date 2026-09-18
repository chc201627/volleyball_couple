# Feature: Inline Match Finder by Player/Team Name

## Objective
Provide an inline, real-time search filter directly above tournament match lists so organizers and scorers can immediately find any match by team or player name (regardless of group or schedule order) and launch scoring with a single tap.

## Scope & Constraints
- Mobile-first: 320px viewport without horizontal overflow; interactive controls >= 44x44px touch targets.
- Localized in English and Spanish via `js/i18n.js`.
- Case- and accent-insensitive search across:
  - Team names
  - Player names (individual players in each team)
  - Group identifier (e.g., "Group A", "Grupo A")
  - Knockout stage label (e.g., "Quarterfinals", "Cuartos", "Final")
- Action button on matching cards triggers `handleScoreboard(matchId)` directly (Resume, Edit, or Score).
- Reactive: updates live when scores change; clears back to standard tournament layout instantly.
- Preserves all existing tournament flows and security invariants.

## Tasks
- [x] TASK-1: Structure & Styles — Add inline search markup to `index.html` and `tests/integration.test.html`, and style in `css/styles.css`.
- [x] TASK-2: Localization — Add EN and ES dictionary entries for search placeholder, label, clear button, and result counts in `js/i18n.js`.
- [x] TASK-3: Search Engine & Reactive Rendering — Implement search filtering and match list rendering in `js/app.js`.
- [x] TASK-4: Tests & Verification — Add automated tests in `tests/integration.test.html` and verify at 320px mobile viewport with all test suites passing.

## Verification Evidence
- `tests/integration.test.html`: 402/402 tests passing (including `testInlineMatchFinder` covering search query matching, accent-insensitivity, group & stage filtering, clear button, ESC key reset, touch targets >= 44px, and 320px responsive container).
- Full test harness verification against `http://127.0.0.1:4173`:
  - `tests/pairing.test.html`: 84/84 passed
  - `tests/tournament.test.html`: 81/81 passed
  - `tests/tournament-day.test.html`: 52/52 passed
  - `tests/tournament-format.test.html`: 50/50 passed
  - `tests/tournament-repository.test.html`: 38/38 passed
  - `tests/king-of-court.test.html`, `tests/workspace.test.html`, `tests/player-import.test.html`: all passed

