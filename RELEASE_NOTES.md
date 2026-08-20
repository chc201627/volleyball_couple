# Release Notes

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
