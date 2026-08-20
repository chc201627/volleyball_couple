# Release Notes

## v1.8.0 — Configurable Tournament Formats

- Owners can pick a preset format when starting a tournament — classic, groups + final, or the 2-group crossover reference format — with light editing only (no free-form stage builder).
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
