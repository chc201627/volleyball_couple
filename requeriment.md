# Beach Volleyball Couple Matching Application
## Requirements Specification Document

---

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | February 16, 2026 |
| **Status** | Draft |

---

## 1. Executive Summary

The Beach Volleyball Couple Matching Application is a web-based system designed to facilitate the pairing of players for beach volleyball games. The application allows users to register individual players with their gender information and automatically generates random couples according to specific pairing rules that prioritize male-female partnerships while accommodating same-gender pairings when necessary.

---

## 2. Project Overview

### 2.1 Purpose

To create a simple, efficient application that randomly matches beach volleyball players into couples while respecting gender balance preferences.

### 2.2 Scope

The application will include player registration, gender-aware random pairing algorithm, and display of generated couples. It will be a web-based interface accessible through modern browsers.

### 2.3 Target Users

- Beach volleyball organizers
- Recreational volleyball groups
- Tournament coordinators
- Social volleyball clubs

---

## 3. Functional Requirements

### 3.1 Player Registration

**REQ-FR-01:** The system shall allow users to input player names through a text input field.

**REQ-FR-02:** The system shall provide a dropdown menu for gender selection with two options: Male and Female.

**REQ-FR-03:** The system shall validate that both name and gender fields are filled before adding a player.

**REQ-FR-04:** The system shall display a list of all registered players with their corresponding gender.

**REQ-FR-05:** The system shall allow users to remove players from the list before generating couples.

**REQ-FR-06:** The system shall display a count of male and female players currently registered.

### 3.1.1 Bulk Player Import

**REQ-FR-20:** The system shall retain single-player registration as the default and provide a Paste list mode.

**REQ-FR-21:** The system shall parse comma, semicolon, tab, or name-only rows and require an editable validated preview before import.

**REQ-FR-22:** The system shall append one fully valid batch with fresh IDs, preserve duplicate names, and reject totals above 200 players.

**REQ-FR-23:** The system shall allow undoing exactly the latest imported batch by player ID until another roster mutation or reload.

**REQ-FR-24:** The import preview shall localize EN/ES gender tokens, disclose locale-dependent M interpretation, announce errors, and avoid horizontal overflow at 320px.

### 3.2 Couple Matching Algorithm

**REQ-FR-07:** The system shall randomly pair players into couples when requested by the user.

**REQ-FR-08:** The system shall prioritize creating male-female couples whenever possible.

**REQ-FR-09:** The system shall create male-male couples only when there are insufficient female players to match all males.

**REQ-FR-10:** The system shall create female-female couples only when there are insufficient male players to match all females.

**REQ-FR-11:** The system shall handle odd numbers of players by leaving one player unmatched.

**REQ-FR-12:** The system shall ensure each player appears in only one couple per matching session.

**REQ-FR-13:** The system shall implement true randomization for pairing order to ensure fairness.

### 3.3 Results Display

**REQ-FR-14 (MODIFIED by REQ-UX-20, v1.9.0):** Generated teams SHALL be displayed as phone-optimized team cards (team number, member names with gender badges, optional level) preceded by a summary bar "{teamSize}v{teamSize} · {random|manual} · {N} players · {M} teams". Unmatched players remain clearly indicated (REQ-FR-18). (Previously: "display generated couples in a clear, readable format".)

**REQ-FR-15:** The system shall identify each couple with a number (Couple 1, Couple 2, etc.).

**REQ-FR-16:** The system shall show player names and their genders within each couple.

**REQ-FR-17:** The system shall allow users to generate new random pairings without re-entering player information.

**REQ-FR-18:** The system shall clearly indicate any unmatched player(s).

**REQ-FR-19:** The system shall provide visual distinction between male-female and same-gender couples (optional styling).

---

## 4. Non-Functional Requirements

### 4.1 Usability

**REQ-NFR-01:** The user interface shall be intuitive and require no training.

**REQ-NFR-02:** All actions shall be completable within three clicks or less.

**REQ-NFR-03:** The interface shall be responsive and work on mobile devices (smartphones and tablets).

**REQ-NFR-04:** The application shall use clear, unambiguous labels and instructions.

**REQ-NFR-05:** Color schemes shall be accessible and meet WCAG 2.1 Level AA standards.

### 4.2 Performance

**REQ-NFR-06:** Couple generation shall complete in less than 1 second for up to 100 players.

**REQ-NFR-07:** The application shall load in less than 3 seconds on standard broadband connections.

**REQ-NFR-08:** The application shall remain responsive during all user interactions.

### 4.3 Compatibility

**REQ-NFR-09:** The application shall work on the latest versions of Chrome, Firefox, Safari, and Edge.

**REQ-NFR-10:** The application shall be accessible on iOS and Android mobile browsers.

**REQ-NFR-11:** The application shall function without requiring plugins or extensions.

### 4.4 Reliability

**REQ-NFR-12:** The application shall maintain data integrity throughout the user session.

**REQ-NFR-13:** The application shall handle unexpected inputs gracefully without crashing.

---

## 5. Pairing Logic Specification

### 5.1 Algorithm Overview

The pairing algorithm follows a priority-based approach:

**Priority 1: Create male-female couples**
- Randomly pair available males with available females until one gender is exhausted.
- This ensures maximum gender diversity in couples.

**Priority 2: Create same-gender couples from remaining players**
- If males remain unmatched, randomly pair them together.
- If females remain unmatched, randomly pair them together.
- Same-gender pairing is used only as a fallback when mixed-gender pairing is not possible.

**Priority 3: Handle odd player**
- If one player remains after all pairing, mark them as unmatched.
- Display clear notification to the user about the unmatched player.

### 5.2 Algorithm Pseudocode

```
Function GenerateCouples(playerList):
    1. Separate players into maleList and femaleList
    2. Shuffle both lists randomly
    3. Initialize couples as empty list
    
    4. // Priority 1: Create mixed-gender couples
    5. minCount = minimum(maleList.length, femaleList.length)
    6. For i from 0 to minCount - 1:
    7.     Create couple(maleList[i], femaleList[i])
    8.     Add to couples
    9.     Remove from respective lists
    
    10. // Priority 2: Create same-gender couples from remaining
    11. remainingList = maleList + femaleList
    12. Shuffle remainingList
    13. While remainingList.length >= 2:
    14.     Create couple(remainingList[0], remainingList[1])
    15.     Add to couples
    16.     Remove first two from remainingList
    
    17. // Priority 3: Handle unmatched player
    18. If remainingList.length == 1:
    19.     Mark remainingList[0] as unmatched
    
    20. Return couples
```

### 5.3 Example Scenarios

| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| **Equal males and females** | 4 males, 4 females | 4 male-female couples |
| **More males than females** | 6 males, 3 females | 3 male-female couples<br>1 male-male couple<br>1 unmatched male |
| **More females than males** | 2 males, 5 females | 2 male-female couples<br>1 female-female couple<br>1 unmatched female |
| **Only males** | 8 males, 0 females | 4 male-male couples |
| **Only females** | 0 males, 7 females | 3 female-female couples<br>1 unmatched female |
| **Odd total with balance** | 3 males, 2 females | 2 male-female couples<br>1 unmatched male |

---

## 6. User Interface Requirements

### 6.1 Input Section

**Components:**
- Text input field labeled "Player Name" (placeholder: "Enter player name")
- Dropdown menu labeled "Gender" with options: "Select Gender", "Male", "Female"
- "Add Player" button (primary action style)
- Form validation feedback messages

**Behavior:**
- Input fields should clear after successfully adding a player
- Add Player button should be disabled if form is incomplete
- Visual feedback (success message or animation) when player is added

### 6.2 Player List Section

**Components:**
- Section header: "Registered Players (Total: X)"
- Gender breakdown display: "Males: X | Females: Y"
- Scrollable list/table of players
- Each player entry shows:
  - Player name
  - Gender (with icon or badge)
  - Remove button (×)

**Behavior:**
- List should update immediately when players are added or removed
- Empty state message when no players registered: "No players added yet"
- Confirmation prompt for removing players (optional)

### 6.3 Action Section

**Components:**
- "Generate Couples" button (large, primary action)
- "Regenerate Couples" button (visible only after first generation)
- "Clear All Players" button (secondary/warning style)

**Behavior:**
- Generate Couples button disabled when fewer than 2 players
- Regenerate creates new random pairings with same players
- Clear All should request confirmation before removing all players

### 6.4 Results Section

**Components:**
- Section header: "Generated Couples"
- Couple cards/containers displaying:
  - Couple number (e.g., "Couple 1")
  - Player 1: Name (Gender)
  - Player 2: Name (Gender)
- Unmatched player notification (if applicable)

**Visual Design:**
- Cards arranged in grid or column layout
- Different background color or border for same-gender couples (subtle distinction)
- Use gender icons or badges for visual clarity
- Prominent display for unmatched player with explanation

---

## 7. Data Validation Rules

### 7.1 Input Validation

**REQ-VAL-01:** Player names must not be empty or contain only whitespace.

**REQ-VAL-02:** Player names should be trimmed of leading/trailing whitespace.

**REQ-VAL-03:** Gender must be selected before adding a player (not "Select Gender").

**REQ-VAL-04:** Player name maximum length: 50 characters.

**REQ-VAL-05:** Player name minimum length: 2 characters.

**REQ-VAL-06:** Duplicate player names are allowed (different players may share names).

### 7.2 System Validation

**REQ-VAL-07:** Minimum of 2 players required to generate couples.

**REQ-VAL-08:** System should handle up to 200 players (practical limit).

**REQ-VAL-09:** Each player can only be assigned to one couple per generation.

---

## 8. Error Handling

### 8.1 User Input Errors

| Error Condition | Error Message | Action |
|-----------------|---------------|--------|
| Empty player name | "Please enter a player name" | Highlight name field, focus input |
| No gender selected | "Please select a gender" | Highlight gender dropdown |
| Name too short | "Name must be at least 2 characters" | Highlight name field |
| Name too long | "Name must be 50 characters or less" | Highlight name field, show character count |
| Fewer than 2 players | "Add at least 2 players to generate couples" | Disable Generate button |

### 8.2 Error Message Style

**REQ-ERR-01:** Error messages shall be displayed near the relevant input field.

**REQ-ERR-02:** Error messages shall use clear, non-technical language.

**REQ-ERR-03 (MODIFIED by REQ-UX-72, v1.9.0):** Errors and every status (sync, access, readiness, step, match state, champion) SHALL be communicated with icon + text; color is supplementary, never the only channel. (Previously: "red or warning color scheme (#DC3545 or similar)".)

**REQ-ERR-04:** Error messages shall auto-dismiss after 5 seconds or include a close button.

**REQ-ERR-05:** Multiple errors should be displayed simultaneously if applicable.

---

## 9. Technical Specifications

### 9.1 Recommended Technology Stack

**Frontend:**
- HTML5
- CSS3 (with Flexbox/Grid for layouts)
- JavaScript (ES6+) or TypeScript
- Optional: React, Vue.js, or vanilla JavaScript

**Styling:**
- CSS Framework: Bootstrap 5, Tailwind CSS, or custom CSS
- Responsive design using media queries
- Mobile-first approach

**Data Management:**
- In-memory storage during session
- Optional: LocalStorage for persistence between sessions
- No backend required for basic functionality

**Hosting:**
- Static web hosting (GitHub Pages, Netlify, Vercel, AWS S3)
- No server-side processing required

### 9.2 Code Structure Requirements

**REQ-TECH-01:** Application code shall be modular and maintainable.

**REQ-TECH-02:** Pairing algorithm shall be implemented as a separate, reusable function.

**REQ-TECH-03:** Code shall include comments explaining the pairing logic.

**REQ-TECH-04:** Application shall use semantic HTML5 elements.

**REQ-TECH-05:** CSS shall follow a consistent naming convention (BEM, SMACSS, etc.).

### 9.3 Browser Support

Minimum browser versions:
- Chrome: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Edge: Latest 2 versions
- Mobile Safari (iOS): 13+
- Chrome Mobile (Android): Latest 2 versions

---

## 10. Future Enhancements (Optional)

### 10.1 Phase 2 Features

- **Team naming:** Allow users to name each generated couple/team
- **Skill level matching:** Add skill level input and pair players of similar skill
- **Export functionality:** Export couples to PDF or share via link
- **Match history:** Save and review previous pairing sessions
- **Custom constraints:** Allow users to specify who cannot be paired together
- **Multi-session support:** Create and manage multiple tournaments

### 10.2 Phase 3 Features

- **User accounts:** Save preferences and history across sessions
- **Tournament bracket generation:** Create elimination or round-robin brackets
- **Score tracking:** Record and display match scores
- **Statistics:** Show player statistics and win rates
- **Social features:** Share pairings on social media

---

## 11. Testing Requirements

### 11.1 Unit Testing

**Test Cases:**
1. Pairing algorithm with various player counts and gender distributions
2. Input validation for player names and gender selection
3. Player addition and removal functionality
4. Randomization verification (multiple generations produce different results)

### 11.2 Integration Testing

**Test Cases:**
1. Complete user workflow from adding players to viewing couples
2. Regenerate couples functionality
3. Clear all functionality
4. Error handling across all components

### 11.3 User Acceptance Testing

**Test Scenarios:**
1. New user completes entire workflow without assistance
2. User generates couples multiple times with same players
3. User handles all error conditions gracefully
4. Mobile user completes all tasks on smartphone

### 11.4 Cross-Browser Testing

**Test on:**
- Chrome (desktop and mobile)
- Firefox
- Safari (desktop and iOS)
- Edge
- Various screen sizes (320px to 1920px width)

---

## 12. Acceptance Criteria

The application will be considered complete when:

1. ✅ Users can add players with name and gender
2. ✅ Users can remove players from the list
3. ✅ System correctly implements the prioritized pairing algorithm
4. ✅ Mixed-gender couples are always created first when possible
5. ✅ Same-gender couples are created only when necessary
6. ✅ Couples are displayed clearly with all information
7. ✅ Users can regenerate couples with same players
8. ✅ All validation rules are enforced
9. ✅ Error messages are clear and helpful
10. ✅ Application works on desktop and mobile browsers
11. ✅ Application performs efficiently (sub-second response)
12. ✅ All test cases pass successfully

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **Couple** | A pair of two players matched to play together |
| **Mixed-gender couple** | A couple consisting of one male and one female player |
| **Same-gender couple** | A couple consisting of two males or two females |
| **Unmatched player** | A player who cannot be paired due to odd total number |
| **Regenerate** | Creating a new random pairing with the same set of players |
| **Priority-based pairing** | Algorithm approach that prefers mixed-gender couples first |

---

## 14. Appendix

### 14.1 Sample UI Wireframe Description

**Layout Structure:**
```
+------------------------------------------+
|           Application Header             |
+------------------------------------------+
|  Input Section                           |
|  [Name Input] [Gender Dropdown] [Add]    |
+------------------------------------------+
|  Player List Section                     |
|  Registered Players (10)                 |
|  Males: 6 | Females: 4                   |
|  +-------------------------------------+  |
|  | Player 1 (Male)            [Remove] |  |
|  | Player 2 (Female)          [Remove] |  |
|  | ...                                 |  |
|  +-------------------------------------+  |
+------------------------------------------+
|  Action Buttons                          |
|  [Generate Couples] [Clear All]          |
+------------------------------------------+
|  Results Section                         |
|  Generated Couples                       |
|  +------------+  +------------+          |
|  | Couple 1   |  | Couple 2   |          |
|  | Player A(M)|  | Player C(F)|          |
|  | Player B(F)|  | Player D(F)|          |
|  +------------+  +------------+          |
+------------------------------------------+
```

### 14.2 Color Scheme Recommendations

- **Primary Color:** #2196F3 (Blue - for main actions)
- **Success Color:** #4CAF50 (Green - for confirmations)
- **Warning Color:** #FF9800 (Orange - for warnings)
- **Error Color:** #F44336 (Red - for errors)
- **Male Indicator:** #64B5F6 (Light Blue)
- **Female Indicator:** #F06292 (Pink)
- **Background:** #F5F5F5 (Light Gray)

---

**Document End**

*For questions or clarifications, please contact the project team.*

## Lenguages

- **English:** Primary language for documentation and communication
- **Spanish:** Secondary language for documentation and communication

## Collaborative Tournament Scoring (v1.7.0)

- **REQ-FR-25:** A device may request scoring access and remains read-only until owner approval.
- **REQ-FR-26:** The owner may approve or revoke a device; revocation applies before its next write.
- **REQ-FR-27:** Owners and approved scorers may update only an existing match result.
- **REQ-FR-28 (MODIFIED by REQ-UX-42, v1.9.0):** Result writes use exact monotonic revisions (`expectedRevision` from the latest snapshot) and preserve newer confirmed data on conflict. A conflict MUST be surfaced in the scoring view itself: the server's confirmed result is shown, the local attempt is labelled as not saved, and Retry (re-reads the new revision) and Discard are reachable without leaving the view. The app MUST NEVER silently replace a confirmed result. (Previously: conflict preserved server data; state shown only in `#sync-status` inside tournament ops.)
- **REQ-FR-29 (MODIFIED by REQ-UX-60, v1.9.0):** Spectators receive live results and standings without editing controls, through the Tournament and Results destinations only; Setup and Teams are not rendered for them. The nav shows a "Request scoring access" center action until approved. (Previously: "read-only results only".)
- **REQ-NFR-14 (MODIFIED by REQ-UX-75, v1.9.0):** All destinations — not only tournament operations — support 320px width, ≥44px targets and non-color status feedback. (Previously: scoped to mobile tournament operations.)
- **REQ-TECH-06:** New sessions use schema v2; schema v1 remains readable and unknown versions fail closed.

## Configurable Tournament Formats (v1.8.0)

- **REQ-FMT-01:** A Format is an ordered list of Stages, each `roundRobin` or `knockout`, with per-stage Set Rules: `pointsTo` (positive integer) and `overtime` (boolean).
- **REQ-FMT-02:** Format creation offers stage presets (classic, groups+final, reference format) with light editing only (group count 1–4, teams per group, stage list, per-stage `pointsTo`/`overtime`). No free-form stage builder. The reference (crossover) preset is offered for two groups of at least 4 teams each, including uneven groups (e.g. 5+4); the top 4 of each group advance to the knockout stage and any remaining team is eliminated in the group stage.
- **REQ-FMT-03:** Validation rejects an empty stage list, non-positive/non-integer `pointsTo`, a knockout Slot referencing a nonexistent group rank or match, and cycles/forward references. Invalid formats do not create a session.
- **REQ-FMT-04:** Knockout matches are pre-created at session creation with slot-descriptor team IDs (`slot:` group-rank, `winner:` match). No byes, no third-place match, no losers bracket.
- **REQ-FMT-05:** Slot resolution is a pure, deterministic client-side projection: identical format + results yield identical bracket pairings on every device. Unresolved slots render a localized placeholder and the match is not scorable.
- **REQ-FMT-06 (MODIFIED by REQ-UX-13, v1.9.0):** The Format is editable in Setup until the tournament starts. Once started (session created or local tournament created) no edit path exists in any role's UI; the only way back is the existing reset-tournament action, which discards results after the existing confirmation. (Previously: "frozen after session creation; no edit path" — unchanged intent, now explicit about the pre-start window and the reset path.)
- **REQ-FMT-07:** The owner may attach one plain-text custom-rules note, max 500 characters, in one language; it is visible to owner, scorers, and spectators.
- **REQ-FMT-08:** Stage names, set-rule labels, overtime labels, placeholders, and all new UI strings have EN and ES entries in `js/i18n.js`.
- **REQ-FMT-09:** New format/bracket UI shows no horizontal overflow at 320px and gives interactive controls ≥44×44px targets.
- **REQ-FMT-10:** King of the Court remains unchanged. Classic (formatless) tournament creation remains available and behaves exactly as today.
- **REQ-FMT-20:** The scoreboard enforces the match's stage Set Rules client-side. With `overtime=false`, the first team reaching `pointsTo` wins immediately (win by 1 at target); scores above target are impossible. With `overtime=true`, play continues past `pointsTo` until a 2-point lead (win by 2); a result cannot finish at less than a 2-point margin.
- **REQ-FMT-21:** When a finish condition is met, the result auto-finishes via the existing `saveResult` per-match transaction with `expectedRevision` unchanged; conflicts preserve the last confirmed result.
- **REQ-FMT-22:** Final standings ordering is fully deterministic: points → set diff → sets for → head-to-head → stable original team order. Exact ties are impossible.
- **REQ-FMT-23:** A knockout match becomes scorable only after all its source slots resolve.
- **REQ-FMT-30:** Format sessions use schema v3, storing the format under `structure/format` and knockout matches under `structure/matchesById` with slot-descriptor team IDs.
- **REQ-FMT-31:** Classic sessions keep schema v2 read/write; v1 stays read-only; unknown schemas fail closed with the existing unsupported-schema state.
- **REQ-FMT-32:** Firebase Rules accept schema `2 or 3`; `structure` (including `format`) remains owner-only writable; scorers can write only `results/{matchId}` for pre-existing match IDs; access policy remains owner-only.
- **REQ-FMT-33:** Point-target enforcement stays client-side (documented trust boundary); rules keep structural invariants only (no draws, no negatives). No rules-language target enforcement.

## Guided Organizer Workspace (v1.9.0)

Four guided destinations (Setup → Teams → Tournament → Results) behind a persistent, role-scoped bottom nav with a raised contextual center action; a Next Match command center; an outdoor-readable scoring view; a champion/results screen; and a dark + neon-lime token system. No feature removal, no Firebase schema/rules change, no hash/URL routing. Full scenario-level detail lives in `sdd/organizer-workspace/spec` (SDD change `organizer-workspace`); this table is the condensed, ID-traceable summary.

### workspace-navigation

- **REQ-UX-01:** Exactly four destinations (Setup, Teams, Tournament, Results) through one bottom-nav component, `position: sticky` inside the view container; only the active destination's content is in the accessibility tree.
- **REQ-UX-02:** View state is local (memory/localStorage only); the URL hash/query string never encodes the view; the share URL is unchanged.
- **REQ-UX-03:** Each nav item shows a step status (`done`/`current`/`locked`/`attention`) as icon + text/aria-label plus an optional badge; locked items are disabled (not hidden), with the blocking reason exposed via `aria-describedby`/title and a toast on tap.
- **REQ-UX-04:** The nav center slot renders the single contextual primary action for the current state/role; it is never a fifth destination and is disabled (with reason) when unavailable.
- **REQ-UX-05:** Default destination on load is derived from player/team/tournament state and role/session context (see spec for the full derivation table).
- **REQ-UX-06:** A per-snapshot re-render must not change the active destination, reset scroll, or close an open scoring view.
- **REQ-UX-07:** Nav labels exist in EN and ES and fit four items at 320px without wrapping or truncation.

### guided-setup

- **REQ-UX-10:** Setup shows, top to bottom: event summary, player entry, team-size/pairing-mode selection, tournament/King configuration, readiness checklist, and exactly one enabled primary action.
- **REQ-UX-11:** The readiness checklist lists ok/not-ok items with text: enough players, teams generated, unmatched players (warning), group configuration feasible, format valid, and Firebase connectivity (warning only).
- **REQ-UX-12:** Start tournament / Start King is impossible while any blocking readiness item is not-ok; the CTA is disabled and the first unmet item is named.
- **REQ-UX-13 (MODIFIES REQ-FMT-06):** see the updated REQ-FMT-06 entry above.

### teams-workspace

- **REQ-UX-20 (MODIFIES REQ-FR-14):** see the updated REQ-FR-14 entry above.
- **REQ-UX-21:** Teams offers Regenerate/Edit pairs as secondary actions under progressive disclosure, and an explicit "Ready to start" state.
- **REQ-UX-22:** The end of Teams presents the mode fork: Start tournament (primary) | King of the Court (secondary); King starts inside the Tournament destination.
- **REQ-UX-23:** Once a tournament or King game has started, team cards are read-only and Regenerate/Edit are not rendered.

### tournament-command-center

- **REQ-UX-30:** Tournament renders, in order: status strip, Next Match card, scorer-access request card (organizer only), stage/progress indicator, stacked Live/Pending/Recently finished, quick links to Standings/Bracket, Share, Reset.
- **REQ-UX-31:** Next Match is the first `live` match, else the first scorable `pending` match by order; the card states why when none exists.
- **REQ-UX-32:** Live/Pending/Recently finished partition by status; lists longer than 5 collapse behind "Show all (N)".
- **REQ-UX-33:** Stage progress shows played/total per group or per stage as text, not color-only.
- **REQ-UX-34:** Pending scorer-access requests surface as a nav badge and an inline card with Approve/Deny; no modal.
- **REQ-UX-35:** King of the Court renders inside Tournament with the same status strip; its queue replaces Next Match and lists.

### scoring-experience

- **REQ-UX-40:** The scoring view opens inside Tournament for one match with both team names, stage/group context, rules, large controls (≥56×56px) and score digits (≥40px), Save progress, Finish match, Cancel/back.
- **REQ-UX-41:** Finish match requires a non-modal in-view confirmation step; `window.confirm` MUST NOT be used for scoring.
- **REQ-UX-42 (MODIFIES REQ-FR-28):** see the updated REQ-FR-28 entry above.
- **REQ-UX-43:** Every scoring action ends in exactly one visible in-view state from {saving, synced, offline, conflict, denied, revoked, invalid}, mirrored in the persistent status strip.
- **REQ-UX-44:** Local/no-Firebase mode reuses the same view and states.

### completion-results

- **REQ-UX-50:** Champion resolution: knockout final winner; single-group `standings[0]`; tied-lead state on a full tiebreak tie; classic multi-group without knockout → group-winner cards; King → `kingState.winner`.
- **REQ-UX-51:** Results shows champion (or group winners/tied lead), summary, final standings, bracket, Share, Export, and "Start another tournament" — no further navigation required.
- **REQ-UX-52:** Export produces a plain-text summary copied to clipboard or handed to Web Share, with a visible confirmation.
- **REQ-UX-53:** Results is reachable for all roles once the tournament completes; before completion it shows live standings with a "Tournament in progress" banner.

### role-visibility

- **REQ-UX-60 (MODIFIES REQ-FR-29):** see the updated REQ-FR-29 entry above.
- **REQ-UX-61:** Role changes arriving via snapshot re-render the nav and controls within the same destination without a page reload.
- **REQ-UX-62:** Session-not-found renders a dedicated state inside Tournament with a "Start a local setup" link; nav shows Tournament only.

### visual-system

- **REQ-UX-70:** All colors are CSS custom properties on `:root` (no hard-coded hex outside the token block); dark + neon-lime is the default and only shipped theme, themeable by construction.
- **REQ-UX-71:** Minimum contrast ratios (outdoor-glare, hard requirement): primary text ≥7:1, secondary/muted text ≥4.5:1, icons/borders/focus rings ≥3:1, primary CTA label on accent ≥7:1, score digits/team names in the scoring view ≥7:1.
- **REQ-UX-72 (MODIFIES REQ-ERR-03):** see the updated REQ-ERR-03 entry above.
- **REQ-UX-73:** All interactive controls ≥44×44px; `prefers-reduced-motion` disables entrance/transition animations; long names wrap with at most 2 clamped lines; no horizontal overflow at 320px.
- **REQ-UX-74:** Every new string exists in EN and ES; no raw keys render at 320px.
- **REQ-UX-75 (MODIFIES REQ-NFR-14):** see the updated REQ-NFR-14 entry above.

### state-matrix

- **REQ-UX-80:** Every applicable cell of the state × destination matrix (empty, ready, loading, syncing, offline, conflict, denied, revoked, completed, session-not-found) renders its required visible outcome; each cell is a test case (full matrix in `sdd/organizer-workspace/spec`).

### release-and-verification

- **REQ-UX-90:** `tests/integration.test.html` mirrors the new markup and asserts nav role-scoping, default-view derivation, Next Match above the fold, 320px no-overflow, ≥44×44 targets, and in-view conflict surfacing; two new pure-module harnesses cover `workspace.js` and `tournament-day.js`; `npm run test:rules` stays green.
- **REQ-UX-91:** Release bump to v1.9.0 per the CLAUDE.md checklist (all `?v=`, footer, both `footer.copyright` strings, CLAUDE.md stale version corrected, RELEASE_NOTES, requeriment/task).

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Gradient, Animate.css
- **Hosting:** GitHub Pages
