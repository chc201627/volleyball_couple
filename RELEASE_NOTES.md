# Release Notes

## v1.9.0 — Guided Organizer Workspace

- Reorganized the single long conditional page into four guided destinations — **Setup → Teams → Tournament → Results** — behind a persistent, role-scoped bottom nav with a raised contextual center action (Generate teams → Start tournament → Score next match → Share results for organizers; Score next match for scorers; Request scoring access → Share for spectators). View state is memory/localStorage only; the share URL is unchanged.
- **Setup**: compact event summary, readiness checklist (enough players, teams generated, unmatched-player warning, format validity, Firebase connectivity warning), and exactly one enabled primary action; Start is impossible while a blocking item is unmet, and the unmet item is named next to the disabled CTA. The Format stays editable until the tournament starts; afterwards it is read-only with a "Locked — reset tournament to change" note reachable from Setup and Tournament.
- **Teams**: phone-optimized team cards behind a summary bar, progressive disclosure for Regenerate/Edit pairs, and an explicit mode fork — Start tournament or King of the Court — once teams are ready.
- **Tournament command center**: a Next Match card (first content block above the fold at 320px), stacked Live / Pending / Recently finished sections (replacing the old pending/live/finished filter, collapsing behind "Show all (N)" past 5), stage/progress indicators, and an inline scorer-access-request card with Approve/Deny and a nav badge — no modal, no leaving the destination.
- **Scoring view**: outdoor-readable ≥56×56px controls and ≥40px score digits, in-view non-modal Finish confirmation (`window.confirm` is no longer used for scoring), and a full in-view state set (saving, synced, offline, conflict, denied, revoked, invalid). A conflict shows the server's confirmed result with Retry/Discard reachable without leaving the view; a confirmed result is never silently replaced. Revoked access mid-scoring disables controls in place without losing the server result.
- **Results/completion**: champion resolution across five outcome kinds (knockout champion, single-group winner, tied lead, per-group winners for multi-group classic tournaments, and King of the Court champion), a live "Tournament in progress" banner pre-completion, final standings/bracket reused read-only, plain-text export via Web Share with a clipboard fallback, and "Start another tournament".
- **Dark + neon-lime visual system** is now the default theme: every color is a `:root` custom property (zero hard-coded hex/`rgba()` literals outside the token block), with outdoor-glare contrast targets (≥7:1 primary text/CTA labels, ≥4.5:1 secondary text, ≥3:1 icons/borders/focus rings) verified on every token pair. `--radius` moved from 8px to 12px as part of the restyle. Status is always communicated with icon + text, never color alone.
- Fixed two reload-time regressions surfaced while building the workspace shell: the nav and sync/status strip now render outside the per-snapshot tournament re-render, so an open scoring view, active destination, and scroll position all survive a Firebase snapshot instead of resetting.
- Two new pure, DOM-free modules — `js/workspace.js` (view/nav/readiness machine) and `js/tournament-day.js` (next-match/lists/stage-progress/outcome selectors) — with dedicated browser test harnesses; `tests/integration.test.html` gained a workspace-shell DOM mirror and 320px/44px/600px assertions.
- Known/deferred items, tracked for a future pass: `.workspace-status` is `position: static` rather than sticky per the original wireframe; the export/share "Copied!"/"Shared" confirmation label does not yet restore from `data-i18n` after ~2.5s; gender/level chip accent colors are contrast-verified but not organizer-pixel-confirmed against the mockup; the Results summary does not show a date (no reliable timestamp on local-only saves); the Setup empty state does not auto-focus the name input; `renderTournamentOps()` still labels Deny the same as Approve/Revoke instead of a distinct wording; a pre-existing (not introduced this release) CSS-specificity quirk lets `:hover` outrank a selected `--active` chip style on desktop pointers only (touch devices, i.e. production mobile use, are unaffected).
- No Firebase schema or Rules change; no new write paths; `npm run test:rules` stays green unmodified.

## v1.8.1 — Hotfix: knockout stages breaking after online sync

- Fixed a production defect where, after the Firebase session sync round-trip, Semifinal and Final stages of a formatted tournament (e.g. the crossover reference format) were incorrectly marked "Invalid configuration" and became unscorable. Quarterfinals were unaffected.
- Root cause: knockout stage pairings are intentionally never persisted to Firebase (matches are the source of truth), but the format decoder did not rebuild them, so any stage referencing a prior stage's winner (`winner:` tokens) failed validation once the tournament synced online.
- Fix: the format decoder now rehydrates each knockout stage's pairings from its own match nodes when a shared session is decoded. No change to what is written to Firebase or to `firebase-rules.json` — this is a client-side read-path fix only.
- Static assets only; no rules deploy required for this release.

## v1.8.0 — Configurable Tournament Formats

- Owners can pick a preset format when starting a tournament — classic, groups + final, or the crossover reference format (two groups of at least 4 teams each, including uneven groups such as 5+4; the top 4 of each group advance) — with light editing only (no free-form stage builder).
- Each stage carries its own set rules: a points target and an overtime on/off toggle; the owner may attach one plain-text custom-rules note (max 500 characters), shown read-only to every role.
- Knockout matches are pre-created at session start and pair up deterministically as prior stages finish, so every device renders the identical bracket from the same results.
- The scoreboard enforces each match's stage rules client-side: without overtime, the first team to reach the target wins immediately; with overtime, play continues until a 2-point lead. A finished result auto-saves through the existing per-match revision-safe transaction.
- Final standings resolve ties deterministically (points → set diff → sets for → head-to-head → stable team order); exact ties are no longer possible.
- New format sessions use schema v3, storing the format and knockout matches under `structure`. Classic (formatless) sessions keep schema v2 unchanged, and schema-v1 links remain read-only. A client that only understands v2 opening a v3 link fails closed with the existing unsupported-schema state and writes nothing.
- King of the Court is unaffected by this release.

## v1.7.0 — Collaborative Tournament Scoring

- Organizers can approve and revoke anonymous scorer devices from a private roster.
- Approved scorers can save Live progress or Finish an existing match from mobile.
- Spectators receive live results and standings without edit controls.
- Per-match transactions detect stale revisions instead of silently overwriting scores.
- Offline, denied, invalid, and conflict outcomes preserve the confirmed result and offer recovery guidance.
- Match filters, 44px controls, localized states, and zero 320px overflow improve phone operation.
- New Firebase sessions use schema v2; legacy schema-v1 links remain read-only.
- Firebase Auth/Database emulator and browser regression runbooks are documented.

Deployment requires the static assets and `firebase-rules.json` to be released together.
