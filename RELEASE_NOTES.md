# Release Notes
 
## v2.0.12 — Cache Invalidation for Completed-Result Corrections

- **Version bump only**: `31cbadb` ("Completed-result corrections") landed after the v2.0.11 asset stamp, so the service worker kept serving the pre-fix `js/tournament-day.js` and `js/tournament-day-selectors.js` cache-first to anyone who had already opened the app — the reopen-a-finished-match tap silently did nothing for them. This release re-stamps every asset so returning visitors fetch the fixed build.

## v2.0.11 — Audit Fixes (Prepared, Not Deployed)

- **Formatted tournament progression and team rendering**: prepares the audit fixes that resolve knockout progression from current standings and render every member of 2v2, 3v3, and 4v4 teams while retaining legacy pair compatibility.
- **Durable offline scoring and resilient boot**: prepares durable result-retry/conflict behavior plus storage-safe localization and mobile touch-target hardening.
- **Completed-result corrections**: owners and approved scorers can reopen resolved completed matches and save the next revision; spectators, legacy sessions, unresolved knockout slots, and invalid format stages remain read-only.
- **Deterministic browser verification**: adds `npm run test:browser`, a development-only loopback Chrome/Chromium runner for all standalone browser harnesses; it isolates browser storage and fails on assertion failures, timeouts, and console errors.
- **Canonical contract**: documents optional player skill levels as `1–5` and the current split CSS/state/orchestrator/UI architecture.
- **Release state**: v2.0.11 is prepared on the audit feature branch only. It has not been deployed to Railway or Firebase.

## v2.0.10 — Localized Knockout Match Placeholders

- **Fix "null vs null" match titles**: pre-created knockout stage matches (such as finals or playoffs in `groupsFinal` and `crossover` presets) now render localized slot labels (e.g. "1º del grupo A vs 1º del grupo B" in Spanish or "Group A #1 vs Group B #1" in English) while group play is ongoing, rather than falling back to `null vs null`.
- **Centralized slot token resolution**: added `TournamentText.slotLabel()` to parse group rank (`slot:A1`) and stage winner (`winner:k-sf-1`) descriptor tokens into localized labels across bracket and match list views.
- **Unscorable match interaction guard**: unscorable pending knockout matches are no longer interactive in match lists and do not trigger scoring overlays when clicked.
- **Match search integration**: slot tokens are indexed in match search so pending knockout matches can be found by stage or group terms.

## v2.0.9 — Interactive Tournament Format Customization

- **Direct editing of points per set and overtime**: in the "Personalizar formato" panel of Tournament Configuration, replaced static read-only text spans with interactive controls for each tournament stage.
  - *Points per set*: interactive numeric stepper (`−` / `+`), direct keyboard input (`1–99`), and quick preset pills (`9`, `11`, `15`, `21`, `25`).
  - *Overtime*: segmented toggle group (`No` / `Sí (+2)`) for each stage.
- **Full lifecycle persistence & validation**: custom stage rules and "Reglas de la casa" are stored in application state, validated client-side with real-time feedback, and propagated directly into match generation and live scoring.
- Static assets only; fully compliant with existing Firebase format validation rules.

## v2.0.8 — Styled Roster Clear & Clean Tournament Reset

- **Modern styled bottom sheet for clearing players**: replaced native browser `window.confirm` popup with the application's standard styled modal bottom sheet (`confirmClear`). Accessible directly from the Setup screen roster header (`trash-2` button) as well as the Teams screen options panel.
- **Clean tournament reset without clearing cache/cookies**: fixed an architectural trap where the "Nuevo torneo" action previously navigated to setup without resetting the tournament or removing it from `localStorage`, causing users to be perpetually routed back to the finished tournament due to `workspaceDefaultView` and forcing them to clear browser cookies/cache.
- **Flexible reset confirmation options**: clicking "Nuevo torneo" or "Reiniciar torneo" presents `confirmReset` sheet offering two clear paths:
  1. *Nuevo torneo (conservar jugadores)*: clears tournament, matches, standings, and history while preserving the player roster for a new tournament run.
  2. *Vaciar todo y empezar de cero*: fully purges tournament, matches, history, and roster from state and `localStorage` to start completely fresh.
- **Responsive & accessible**: verified at 320px mobile width with 0px horizontal overflow; touch targets >= 44x44px.
- Static assets only; no Firebase schema or Rules changes required.

## v2.0.7 — Score Direct Keyboard Input & Touch Focus Fixes

- **Direct score typing without + / −**: fixed a critical closure bug in `js/ui/screens/scoring.js` where the `blur` event committed a stale render-time variable instead of the typed value in `draft`, previously causing typed numbers (e.g. 9, 5, 7) to be wiped and reverted back to 0 on exit.
- **In-place highlight and validation updates**: updated winning side indicators and the "Guardar resultado" state in real-time without tearing down the overlay DOM on blur, enabling seamless tabbing and tapping between team score inputs.
- **Auto-select on focus**: score input fields now auto-select their contents on focus, allowing one-tap replacement of initial zeros with typed numbers.
- **Keyboard navigation**: added Enter key handling on score inputs to commit and blur gracefully.
- Static assets only; no Firebase schema or Rules changes required.

## v2.0.6 — Eliminate Overlay Ghosting and Screen Flashing

- **Complete elimination of overlay flashing and ghosting**: resolved the visual flicker/cross-fade occurring across full-screen overlays (manual pairing, bulk import, tournament configuration, scoring, history, and search). Removed `anim-screen-in` opacity fades (`0 -> 1` keyframe) from all full-screen overlay components and enforced `animation: none !important; opacity: 1 !important;` in `css/screens.css`.
- **Background isolation during fullscreen overlays**: added `has-fullscreen-overlay` shell state and rule `body.has-fullscreen-overlay .app, body.has-overlay:has(.overlay-screen) .app { visibility: hidden; }` in `css/app-shell.css` to guarantee the underlying background screen (`.app`) is completely hidden and invisible when any full-screen overlay is mounted.
- Static assets only; no Firebase schema or Rules changes required.

## v2.0.5 — Manual Pairing Persistence & Overlay Action Bar Fixes

- **Manual pairing persistence and application**: fixed an issue where manually created pairs were ignored and randomly shuffled upon closing the manual pairing sheet. Now, setting manual pairs or clicking "Listo" / "Volver" automatically activates manual pairing mode (`pairingMode: 'manual'`) and immediately updates the generated teams.
- **Overlay action bar positioning**: fixed `.overlay-screen .app__action-bar` sticky positioning so action buttons sit directly at `bottom: 0` without an unnecessary 56px tab bar gap floating above content.
- **Background scroll lock**: added `overflow: hidden` to `body.has-overlay` to prevent scroll chaining and background window movement during overlay interactions.
- **Remaining pairs indicator**: hidden the "Las 0 parejas restantes se generan al azar" status strip when all players are already manually paired (`remaining === 0`).
- Static assets only; no Firebase schema or Rules changes required.

## v2.0.4 — Restore Footer Version Display

- **Application footer and version restored**: restored the footer in the application shell with dynamic `footer.copyright` localization and static fallback, ensuring the running version (`v2.0.4`) and copyright are visibly displayed at the bottom of the page across both desktop and mobile viewports.
- **Automated footer version bump**: updated `scripts/bump-version.js` to keep the HTML footer in sync automatically alongside asset query strings, service worker cache, and dictionary entries.
- Static assets only; no Firebase schema or Rules changes required.

## v2.0.3 — Fix Overlay Action Bar Visibility

- **Action bar isolation in overlays**: scoped `body.has-overlay` hiding rule strictly to the background `.app` shell (`body.has-overlay .app .app__action-bar`), ensuring action buttons inside modal overlays (such as "Revisar lista" / "Importar jugadores" in bulk player import) remain visible and accessible.
- Static assets only; no Firebase schema or Rules changes required.

## v2.0.2 — Manual Pairing Gender & Overlay Rerender Fixes

- **Candidate gender and level indicators**: candidate player buttons and fixed pair rows in the Manual Pairing sheet now display their gender (`Hombre` / `Mujer` / `Sin género`) and skill level (`N1`, `N2`, `N3`).
- **Overlay rerender scoping**: fixed an issue where tapping candidates or modal options triggered full screen transitions. Overlays now use `rerenderOverlay()`, preserving background view state without triggering reflow animations.
- **Background ghosting prevention**: guarded `anim-screen-in` against repeated reflows on the same destination screen, hid bottom action bars and tab bars under active modal overlays (`body.has-overlay`), and deepened modal scrim opacity with background blur.
- Static assets only; no Firebase schema or Rules changes required.

## v2.0.1 — WhatsApp & Flexible List Import Support

- **Flexible bulk import**: `js/player-import.js` now strips numbered prefixes (`1. `, `1) `, `1- `), bullet points (`- `, `* `, `• `), and chat header lines (e.g. `Confirmados:`, `Suplentes:`, `Lista de hoy:`).
- **Extended delimiters**: supports dashes (`-`, `—`, `–`), slashes (`/`), colons (`:`), and pipes (`|`) alongside commas, semicolons, and tabs. Compound names with hyphens (e.g. `Ana-María`) are preserved without triggering mixed-delimiter errors.
- **Test coverage**: added unit tests for flexible list formats in `tests/player-import.test.html`.
- Static assets only; no Firebase schema or Rules changes required.

## v2.0.0 — TO-BE Redesign

- Full rewrite of the presentation layer against `design/volleyball-couple.pen` (35 artboards, 9 flows), delivered as slices A–L on a single branch (`feat/redesign-v2`); see `redesign-plan.md`. `js/app.js` (3,685 lines) and `css/styles.css` (2,489 lines) are gone, replaced by one module per screen (`js/ui/screens/*.js`) and per layer (`css/design-tokens.css`, `app-shell.css`, `components.css`, `screens.css`, `animations.css`).
- New navigation shell: app bar + bottom tab bar + sub-tabs (Torneo · Hoy/Grupos) + bottom sheets for overlays, replacing the single long conditional page.
- **Change history**: every result revision is now visible — a full history behind the tournament menu, a per-match timeline, and day-grouped filters (Todo/Nuevos/Ediciones/Conflictos). Backed by `resultHistory` (append-only, monotonic revision) alongside `results/{matchId}`.
- **Every match, and finding one by name** (board C6): a searchable list of every match across all groups from Results, independent of stage — replaces the v1.9.2 inline match finder (`js/app.js`), which this redesign deletes.
- Animate.css is gone. `css/animations.css` centralizes every `@keyframes` and utility class, with a `prefers-reduced-motion` guard; the removal fixes a production bug where `removePlayer()` silently failed to delete a player if the CDN did not load (the exit animation's `animationend` never fired).
- Responsive: two columns at ≥600px, three at ≥960px, driven by `[data-col]` markers the shell reads back from the rendered screen rather than a duplicated list.
- Design/verified at 320px first; zero horizontal overflow across the full flow (create tournament → score → standings → search → menu → history) in both languages.
- Static assets only; no Firebase Rules change beyond the `resultHistory` node and `ownerLabel` added during the redesign (already covered by `firebase-rules.json` and `tests/firebase-rules.test.js`).

## v1.9.1 — Round-Robin Match Order Preservation

- Fixed match schedule ordering in tournament repository decoding and group match views:
  - When sessions are synchronized with Firebase, matches stored in `structure/matchesById` were previously deserialized in object-key order (`A-t0-t1`, `A-t0-t2`, `A-t0-t3`), which clustered team 0's matches consecutively.
  - Matches are now explicitly sorted by `order` upon decoding in `TournamentRepository` and before rendering in `renderMatchList`, preserving the intended polygon/circle round-robin schedule across courts and rounds.
- Static assets only; no Firebase Rules change.

## v1.9.0 — Guided Organizer Workspace

- Reorganized the single long conditional page into four guided destinations — **Setup → Teams → Tournament → Results** — behind a persistent, role-scoped bottom nav with a raised contextual center action (Generate teams → Start tournament → Score next match → Share results for organizers; Score next match for scorers; Request scoring access → Share for spectators). View state is memory/localStorage only; the share URL is unchanged.
- **Setup**: compact event summary, readiness checklist (enough players, teams generated, unmatched-player warning, format validity, Firebase connectivity warning), and exactly one enabled primary action; Start is impossible while a blocking item is unmet, and the unmet item is named next to the disabled CTA. The Format stays editable until the tournament starts; afterwards it is read-only with a "Locked — reset tournament to change" note reachable from Setup and Tournament.
- **Teams**: phone-optimized team cards behind a summary bar, progressive disclosure for Regenerate/Edit pairs, and an explicit mode fork — Start tournament or King of the Court — once teams are ready.
- **Tournament command center**: a Next Match card (first content block above the fold at 320px), stacked Live / Pending / Recently finished sections (replacing the old pending/live/finished filter, collapsing behind "Show all (N)" past 5), stage/progress indicators, and an inline scorer-access-request card with Approve/Deny and a nav badge — no modal, no leaving the destination.
- **Scoring view**: outdoor-readable ≥56×56px controls and ≥40px score digits, in-view non-modal Finish confirmation (`window.confirm` is no longer used for scoring), and a full in-view state set (saving, synced, offline, conflict, denied, revoked, invalid). A conflict shows the server's confirmed result with Retry/Discard reachable without leaving the view; a confirmed result is never silently replaced. Revoked access mid-scoring disables controls in place without losing the server result.
- **Results/completion**: champion resolution across five outcome kinds (knockout champion, single-group winner, tied lead, per-group winners for multi-group classic tournaments, and King of the Court champion), a live "Tournament in progress" banner pre-completion, final standings/bracket reused read-only, plain-text export via Web Share with a clipboard fallback, and "Start another tournament".
- **Dark + neon-lime visual system** is now the default theme: every color is a `:root` custom property (zero hard-coded hex/`rgba()` literals outside the token block), with outdoor-glare contrast targets (≥7:1 primary text/CTA labels, ≥4.5:1 secondary text, ≥3:1 icons/borders/focus rings) verified on every token pair. `--radius` moved from 8px to 12px as part of the restyle. Status is always communicated with icon + text, never color alone.
- Fixed two reload-time regressions surfaced while building the workspace shell: the nav and sync/status strip now render outside the per-snapshot tournament re-render, so an open scoring view, active destination, and scroll position all survive a Firebase snapshot instead of resetting.
- Fixed the nav center action so it performs its contextual action directly — generates teams, starts the tournament, opens the next match's scoring view, shares results, or opens the access-request form — instead of merely switching destinations (REQ-UX-04). The empty Setup destination now auto-focuses the name input once per entry (REQ-UX-80).
- Two new pure, DOM-free modules — `js/workspace.js` (view/nav/readiness machine) and `js/tournament-day.js` (next-match/lists/stage-progress/outcome selectors) — with dedicated browser test harnesses; `tests/integration.test.html` gained a workspace-shell DOM mirror and 320px/44px/600px assertions.
- Known/deferred items, tracked for a future pass: `.workspace-status` is `position: static` rather than sticky per the original wireframe; the export/share "Copied!"/"Shared" confirmation label does not yet restore from `data-i18n` after ~2.5s; gender/level chip accent colors are contrast-verified but not organizer-pixel-confirmed against the mockup; the Results summary does not show a date (no reliable timestamp on local-only saves); a pre-existing (not introduced this release) CSS-specificity quirk lets `:hover` outrank a selected `--active` chip style on desktop pointers only (touch devices, i.e. production mobile use, are unaffected).
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
