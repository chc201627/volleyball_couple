# Release Notes

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
