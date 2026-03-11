# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beach Volleyball Couple Matching — a static web app that registers players with gender info and generates random couples using a priority-based pairing algorithm (mixed-gender first, then same-gender, with unmatched player handling).

## Tech Stack

- **Vanilla HTML/CSS/JS** (no frameworks, no build step)
- **Animate.css** via CDN for UI transitions
- **GitHub Pages** for hosting

## Running Locally

Open `index.html` directly in a browser. No dev server or build process required.

## Architecture

- `index.html` — Single-page app with four semantic sections: Input, Player List, Actions, Results
- `js/pairing.js` — **Standalone** pairing algorithm module (global scope). Must remain framework-agnostic and independently testable. Exports `generateCouples(playerList)` and `shuffle(array)`.
- `js/app.js` — UI logic wrapped in an IIFE. Manages state, DOM rendering, validation, and event handling. Depends on `pairing.js` being loaded first.
- `css/styles.css` — Mobile-first BEM styles with CSS custom properties for the color scheme. Breakpoints: 600px (tablet), 960px (desktop).

## Key Design Decisions

- `pairing.js` is deliberately kept as a separate global module (not imported) so it can be tested independently per REQ-TECH-02.
- Script load order matters: `pairing.js` before `app.js` in `index.html`.
- Player IDs use `Date.now() + Math.random()` (session-only, no persistence).
- All user-provided text is escaped via `escapeHTML()` before DOM insertion (XSS prevention).

## Requirements & Tasks

- `requeriment.md` — Full requirements spec with IDs (REQ-FR-XX, REQ-NFR-XX, REQ-VAL-XX, REQ-ERR-XX)
- `task.md` — Implementation task breakdown with checkboxes and requirement traceability matrix

## Color Scheme (CSS Variables)

Primary: `#2196F3` | Success: `#4CAF50` | Warning: `#FF9800` | Error: `#DC3545` | Male: `#64B5F6` | Female: `#F06292` | Background: `#F5F5F5`

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
