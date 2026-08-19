# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

Beach Volleyball Couple Matching — a static web app that registers players (name, optional gender, optional skill level 1–3) and generates random teams for 2vs2, 3vs3, or 4vs4 matches using a priority-based pairing algorithm (mixed-gender first, then same-gender, with unmatched player handling) plus a level-balancing pass that evens out team skill averages. Includes manual pairing, a group tournament mode, a King of the Court mode, EN/ES localization, and Firebase-backed session sharing.

## Tech Stack

- **Vanilla HTML/CSS/JS** (no frameworks, no build step, no Node toolchain)
- **Animate.css** via CDN for UI transitions
- **Firebase Realtime Database** (compat SDK via CDN) for shared live sessions
- **Hosting**: GitHub Pages and Railway (project `volleyball-couple`, auto-deploys on push to `main`): https://volleyball-couple-production.up.railway.app

## Running Locally

Open `index.html` directly in a browser, or serve the directory with any static server. No dev server or build process required.

## Architecture

- `index.html` — Single-page app: Input, Player List, Actions (match type, pairing mode, tournament/king setup), Results, King of the Court, Tournament sections
- `js/pairing.js` — **Standalone** pairing algorithm module (global scope). Must remain framework-agnostic and independently testable (runs in bare Node, no DOM). Exports `generateCouples(playerList)`, `generateTeams(playerList, teamSize)`, `shuffle(array)`, and the level helpers (`isValidLevel`, `getPlayerLevel`, `balanceTeamsByLevel`, …).
- `js/app.js` — UI logic wrapped in an IIFE. Manages state, DOM rendering, validation, event handling, localStorage persistence, and Firebase sync. Depends on `pairing.js` and `i18n.js` being loaded first.
- `js/i18n.js` — EN/ES translations as flat dictionaries keyed like `form.levelLabel`; `t(key)` falls back EN → key. UI elements carry `data-i18n` attributes.
- `js/tournament.js` — Group tournament mode (groups, match schedule, scores). Copies player objects opaquely.
- `js/king-of-court.js` — King of the Court mode (throne/challenger queue, win conditions). Copies player objects opaquely.
- `js/firebase-config.js` — Firebase initialization config; `firebase-rules.json` holds the database rules.
- `css/styles.css` — Mobile-first BEM styles with CSS custom properties for the color scheme. Breakpoints: 600px (tablet), 960px (desktop).
- `tests/*.test.html` — Browser-run test harnesses (pairing, tournament, king-of-court, integration). No CLI test runner exists; open them in a browser (or headless Chrome) and read the pass/fail list.

## Key Design Decisions

- `pairing.js` is deliberately kept as a separate global module (not imported) so it can be tested independently per REQ-TECH-02.
- Script load order matters: `firebase-config.js` → `pairing.js` → `i18n.js` → `tournament.js` → `king-of-court.js` → `app.js` in `index.html`.
- Player IDs use `Date.now() + Math.random()`. State persists in localStorage (`bv-players`, `bv-tournament`, `bv-king`, `bv-owned-sessions`).
- Skill level is optional: the `level` key is **omitted** when unset (never `undefined` — Firebase `set()` rejects it). Valid values are whitelisted to `1|2|3` via `isValidLevel`; anything else counts as Intermediate (2) and never activates balancing.
- Level balancing (`balanceTeamsByLevel`) runs as a post-generation pass: same-gender swaps only (team `type` stays invariant), equalizes **average** team level, no-ops when no player has a valid level, keeps regenerate non-deterministic.
- Firebase writes happen **only** when a tournament/king session is started or joined via a `#s=` URL (`sessionId` guard) — adding players and generating teams is localStorage-only.
- All user-provided text is escaped via `escapeHTML()` before DOM insertion (XSS prevention).
- **Cache busting**: local scripts/styles are referenced with a `?v=X.Y.Z` query string in `index.html`. On every release, bump that string together with the footer version (in `index.html` and both `footer.copyright` keys in `js/i18n.js`) — the static host sends no `Cache-Control` header, so this is the only cache invalidation.
- Duplicate player names are allowed by spec (REQ-VAL-06) — never "fix" this.

## Requirements & Tasks

- `requeriment.md` — Full requirements spec with IDs (REQ-FR-XX, REQ-NFR-XX, REQ-VAL-XX, REQ-ERR-XX)
- `task.md` — Implementation task breakdown with checkboxes and requirement traceability matrix
- `firebase-plan.md` — Firebase sync design notes

## Color Scheme (CSS Variables)

Primary: `#2196F3` | Success: `#4CAF50` | Warning: `#FF9800` | Error: `#DC3545` | Male: `#64B5F6` | Female: `#F06292` | Level badges: purple ramp (`#7e57c2` → `#4527a0`) | Background: `#F5F5F5`

## Git Workflow
When completing tasks from TASKS.md:
1. Create a new branch named `feature/<task-number>-<brief-description>` before starting work
2. Make atomic commits with conventional commit messages:
   - feat: for new features
   - fix: for bug fixes
   - docs: for documentation
   - test: for tests
   - refactor: for refactoring
3. After completing a task, create a pull request with:
   - A descriptive title matching the task
   - A summary of changes made
   - Any testing notes or considerations
4. Update the task checkbox in TASKS.md to mark it complete
