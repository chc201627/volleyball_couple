# CLAUDE.md

Repository guidance for coding agents. The production application is currently **v1.7.0**.

## Project

Beach Volleyball Couple Matching is a mobile-first static web app for registering or bulk-importing players, generating balanced 2vs2, 3vs3, or 4vs4 teams, running group tournaments or King of the Court, and sharing live tournament results. The UI is available in English and Spanish.

## Runtime and hosting

- Vanilla HTML, CSS, and JavaScript; no framework and no production build step.
- Firebase Authentication (anonymous) and Realtime Database compat SDKs are loaded from a CDN.
- `package.json` is **development-only** tooling for Firebase emulator tests; Node is not a production runtime.
- Railway auto-deploys `main` at https://volleyball-couple-production.up.railway.app.
- Railway must retain `RAILPACK_SPA_OUTPUT_DIR=.`. Without it, the development-only `package.json` makes Railpack detect a Node service and fail because there is no start command.

## Quick path

Serve the repository as static files; opening `index.html` directly is also supported for non-Firebase flows.

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

For the Auth and Realtime Database security-rule suite:

```bash
npm install
npm run test:rules
```

Browser suites remain standalone `tests/*.test.html` harnesses. Open them in a browser or headless Chrome and inspect their pass/fail output. To exercise the app against local emulators, run the emulator command documented in `README.md` and open `http://127.0.0.1:4173/?firebaseEmulator=1`.

## Architecture

| File | Responsibility |
| --- | --- |
| `index.html` | Single-page UI and dependency ordering. |
| `js/pairing.js` | Framework-agnostic team generation and level balancing; independently testable without the DOM. |
| `js/player-import.js` | Pure parser, normalizer, and validator for pasted player lists. |
| `js/i18n.js` | Flat EN/ES dictionaries; `t(key)` falls back to English, then the key. |
| `js/tournament.js` | Group creation, schedule, match states, scores, and standings. |
| `js/tournament-format.js` | Pure tournament-format engine: presets, validation, knockout stage generation with slot descriptors, deterministic client-side resolution, and per-match rules. |
| `js/tournament-day.js` | Pure, DOM-free selectors for the Tournament command center and Results screen: next match, live/pending/recently-finished lists, stage progress, and champion/outcome resolution. |
| `js/tournament-repository.js` | Repository boundary for shared tournaments: schema codecs, in-memory tests, Firebase subscriptions, access requests, and transactional result saves. |
| `js/king-of-court.js` | Throne/challenger queue and win conditions. |
| `js/app.js` | IIFE-based application state, rendering, events, localStorage, localization, and repository orchestration. |
| `js/firebase-config.js` | Firebase initialization and loopback-only emulator selection. |
| `firebase-rules.json` | Least-privilege Realtime Database authorization and validation. |
| `css/styles.css` | Mobile-first BEM styles and design tokens; breakpoints at 600px and 960px. |

Script order is contractual. Firebase CDN SDKs load first, followed by:

`firebase-config.js` → `pairing.js` → `player-import.js` → `i18n.js` → `tournament.js` → `tournament-format.js` → `tournament-day.js` → `tournament-repository.js` → `king-of-court.js` → `app.js`.

## Collaborative scoring model

- Firebase anonymous Auth identifies a **device/browser profile**, not a person or durable account. Clearing site data or switching browser profiles creates a new identity.
- The session creator's UID is the **owner**. An approved device is a **scorer**. Everyone else is a **spectator** until the owner approves their request; the owner can later revoke access.
- New sessions use schema v2: tournament structure and `results/{matchId}` are separate. Each result carries a monotonic revision, actor UID, and server timestamp.
- `TournamentRepository.saveResult()` uses a per-match Firebase transaction with an expected revision. Conflicts must preserve the last confirmed result rather than silently overwrite it.
- Schema-v1 links remain readable but are intentionally read-only. Unknown future schemas fail closed.
- Keep authorization in Firebase Rules, not only in UI state. Scorers may update results for existing matches; they may not modify tournament structure or access policy.
- Firebase writes are session-scoped. Player entry and ordinary team generation continue to persist locally.

## Product invariants

- Player IDs use `Date.now() + Math.random()`.
- Optional levels are omitted when unset; never write `undefined` to Firebase. Only `1|2|3` are valid.
- Level balancing is a post-generation, same-gender swap pass that preserves team type and balances average level.
- Duplicate player names are allowed by REQ-VAL-06.
- Escape all user-provided text with `escapeHTML()` before inserting HTML.
- Preserve opaque player properties when tournament and King of the Court modules copy players.

## Mobile and accessibility bar

- Design and verify at **320px width** first, then the 600px and 960px breakpoints; horizontal overflow at 320px is a release blocker.
- Interactive scoring, access, import, and navigation controls must provide at least **44×44px** touch targets.
- Preserve visible sync/error states, keyboard focus, semantic labels, and reduced-motion behavior.

## Release checklist

Static assets and Firebase Rules form one release and must be deployed and verified together.

1. Run browser suites and `npm run test:rules`.
2. Bump every local asset `?v=X.Y.Z` in `index.html`.
3. Bump the footer version in `index.html` and both `footer.copyright` translations in `js/i18n.js`.
4. Update release and requirements/task documentation when behavior changes.
5. Deploy static assets through Railway and rules with `firebase deploy --only database`.
6. Verify the production URL on a 320px mobile viewport and confirm Firebase permissions with separate devices/profiles.

The query-string bump is mandatory because the static host does not provide reliable cache invalidation for local assets.

## Requirements and workflow

- `requeriment.md` — requirements and traceability IDs.
- `task.md` — implementation tasks and completion matrix.
- `firebase-plan.md` — Firebase schema, deployment, migration, and rollback guidance.
- `RELEASE_NOTES.md` — shipped behavior by version.

Use the repository's active branch/PR workflow, keep commits atomic, and use conventional commit messages. Never add AI attribution or `Co-Authored-By` trailers.
