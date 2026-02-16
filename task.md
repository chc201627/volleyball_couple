# Beach Volleyball Couple Matching — Task Breakdown

> Auto-generated from `requeriment.md` v1.0 — February 16, 2026

**Tech Stack:** HTML5, CSS3, JavaScript (ES6+), Animate.css, GitHub Pages

---

## Legend

- **Status:** `[ ]` pending | `[x]` done
- **Priority:** P0 = blocker | P1 = must-have | P2 = nice-to-have
- Each task references one or more requirement IDs so nothing is missed.

---

## Phase 1: Project Setup

### TASK-1.1 — Initialize project structure
- [x] **Priority:** P0
- **Description:** Create the base folder/file structure for the project.
- **Requirements:** REQ-TECH-01
- **Acceptance Criteria:**
  - Project contains: `index.html`, `css/styles.css`, `js/app.js`, `js/pairing.js`
  - Files are committed to a Git repository
- **Notes:** Keep `pairing.js` separate per REQ-TECH-02 (algorithm as reusable module).

### TASK-1.2 — HTML5 boilerplate with semantic elements
- [x] **Priority:** P0
- **Description:** Set up `index.html` with semantic HTML5 (`<header>`, `<main>`, `<section>`, `<footer>`), meta viewport, and lang attribute.
- **Requirements:** REQ-TECH-04, REQ-NFR-03
- **Acceptance Criteria:**
  - Document uses semantic elements matching the wireframe sections (Input, Player List, Actions, Results)
  - Viewport meta tag present for mobile responsiveness
  - Page title set to "Beach Volleyball Couple Matching"

### TASK-1.3 — Include Animate.css CDN
- [x] **Priority:** P1
- **Description:** Add Animate.css via CDN link in `<head>`.
- **Requirements:** Tech Stack
- **Acceptance Criteria:**
  - Animate.css loaded from CDN
  - A test class like `animate__fadeIn` works correctly

### TASK-1.4 — Base CSS with color scheme and mobile-first foundation
- [x] **Priority:** P0
- **Description:** Set up `css/styles.css` with CSS custom properties for the recommended color scheme, a CSS reset/normalize, and mobile-first media queries.
- **Requirements:** REQ-NFR-03, REQ-NFR-05, REQ-TECH-05
- **Acceptance Criteria:**
  - CSS variables defined:
    - `--color-primary: #2196F3`
    - `--color-success: #4CAF50`
    - `--color-warning: #FF9800`
    - `--color-error: #F44336` (also `#DC3545` for form errors)
    - `--color-male: #64B5F6`
    - `--color-female: #F06292`
    - `--color-bg: #F5F5F5`
  - Consistent naming convention (BEM recommended)
  - Layout works on 320px viewport and scales up

---

## Phase 2: Player Registration UI

### TASK-2.1 — Player name input field
- [ ] **Priority:** P0
- **Description:** Create a text input for player names with placeholder "Enter player name".
- **Requirements:** REQ-FR-01, REQ-VAL-04, REQ-VAL-05
- **Acceptance Criteria:**
  - Input has `maxlength="50"` attribute
  - Placeholder text: "Enter player name"
  - Label: "Player Name"
  - Input clears after successful player addition

### TASK-2.2 — Gender dropdown
- [ ] **Priority:** P0
- **Description:** Create a `<select>` element with options: "Select Gender" (disabled default), "Male", "Female".
- **Requirements:** REQ-FR-02
- **Acceptance Criteria:**
  - Default option is "Select Gender" and acts as placeholder (not a valid selection)
  - Resets to default after successful player addition

### TASK-2.3 — Add Player button with disabled state
- [ ] **Priority:** P0
- **Description:** Create an "Add Player" button styled as a primary action. It should be disabled when name is empty or gender is not selected.
- **Requirements:** REQ-FR-03, REQ-NFR-02
- **Acceptance Criteria:**
  - Button is visually disabled (grayed out) when form is incomplete
  - Button enables as soon as both fields have valid values
  - Clicking the button adds the player and clears the form

### TASK-2.4 — Form validation and error messages
- [ ] **Priority:** P0
- **Description:** Implement client-side validation for all input rules. Display error messages near the relevant field.
- **Requirements:** REQ-VAL-01, REQ-VAL-02, REQ-VAL-03, REQ-VAL-04, REQ-VAL-05, REQ-ERR-01, REQ-ERR-02, REQ-ERR-03, REQ-ERR-04, REQ-ERR-05
- **Acceptance Criteria:**
  - Empty name → "Please enter a player name"
  - Name < 2 chars → "Name must be at least 2 characters"
  - Name > 50 chars → "Name must be 50 characters or less"
  - No gender → "Please select a gender"
  - Names are trimmed of leading/trailing whitespace (REQ-VAL-02)
  - Error messages styled in `#DC3545` red
  - Errors appear next to the related field
  - Errors auto-dismiss after 5 seconds or have a close button
  - Multiple errors can display simultaneously

### TASK-2.5 — Player list display
- [ ] **Priority:** P0
- **Description:** Display all registered players in a scrollable list. Each entry shows name, gender badge (colored), and a remove button (×).
- **Requirements:** REQ-FR-04, REQ-FR-05
- **Acceptance Criteria:**
  - Section header: "Registered Players (Total: X)" — updates dynamically
  - Each player shows name + gender badge (blue for Male, pink for Female)
  - Remove button (×) on each player removes them from the list
  - Empty state message: "No players added yet"
  - List updates immediately on add/remove

### TASK-2.6 — Gender count display
- [ ] **Priority:** P1
- **Description:** Show a live count of males and females below the section header.
- **Requirements:** REQ-FR-06
- **Acceptance Criteria:**
  - Displays: "Males: X | Females: Y"
  - Updates in real-time when players are added or removed

### TASK-2.7 — Visual feedback on player addition
- [ ] **Priority:** P1
- **Description:** Add Animate.css animation when a new player appears in the list.
- **Requirements:** REQ-NFR-01 (intuitive UX)
- **Acceptance Criteria:**
  - New player entry animates in (e.g., `animate__fadeInUp`)
  - Animation does not block interaction

---

## Phase 3: Pairing Algorithm

### TASK-3.1 — Implement Fisher-Yates shuffle utility
- [ ] **Priority:** P0
- **Description:** Create a `shuffle(array)` function using Fisher-Yates algorithm for true randomization.
- **Requirements:** REQ-FR-13
- **Acceptance Criteria:**
  - Function shuffles in-place and returns the array
  - Distribution is uniform (no bias)

### TASK-3.2 — Implement `generateCouples(playerList)` function
- [ ] **Priority:** P0
- **Description:** Implement the pairing algorithm in `js/pairing.js` as a standalone, reusable function following the pseudocode in Section 5.2 of requirements.
- **Requirements:** REQ-FR-07, REQ-FR-08, REQ-FR-09, REQ-FR-10, REQ-FR-11, REQ-FR-12, REQ-TECH-02, REQ-TECH-03
- **Acceptance Criteria:**
  - Function accepts an array of `{ name, gender }` objects
  - Returns `{ couples: [...], unmatched: player|null }`
  - Priority 1: Creates mixed-gender couples first
  - Priority 2: Pairs remaining same-gender players
  - Priority 3: Flags leftover player as unmatched
  - Each player appears in exactly one couple (REQ-VAL-09)
  - Code includes comments explaining the pairing logic
- **Notes:** Must pass all 6 example scenarios from Section 5.3.

### TASK-3.3 — Verify algorithm against all example scenarios
- [ ] **Priority:** P0
- **Description:** Manually or programmatically verify the algorithm output for each scenario in the requirements table.
- **Requirements:** REQ-FR-07 to REQ-FR-13
- **Acceptance Criteria:**

  | Scenario | Input | Expected |
  |----------|-------|----------|
  | Equal M/F | 4M, 4F | 4 mixed couples |
  | More males | 6M, 3F | 3 mixed + 1 M-M + 1 unmatched M |
  | More females | 2M, 5F | 2 mixed + 1 F-F + 1 unmatched F |
  | Only males | 8M, 0F | 4 M-M couples |
  | Only females | 0M, 7F | 3 F-F + 1 unmatched F |
  | Odd balanced | 3M, 2F | 2 mixed + 1 unmatched M |

---

## Phase 4: Action Buttons

### TASK-4.1 — Generate Couples button
- [ ] **Priority:** P0
- **Description:** Add a large primary "Generate Couples" button. Disabled when fewer than 2 players are registered.
- **Requirements:** REQ-FR-07, REQ-VAL-07
- **Acceptance Criteria:**
  - Button is disabled and shows tooltip/message when < 2 players
  - Message: "Add at least 2 players to generate couples"
  - Clicking triggers `generateCouples()` and renders results

### TASK-4.2 — Regenerate Couples button
- [ ] **Priority:** P0
- **Description:** After first generation, show a "Regenerate Couples" button that re-runs the algorithm with the same player list.
- **Requirements:** REQ-FR-17
- **Acceptance Criteria:**
  - Hidden before first generation
  - Visible after couples are generated
  - Produces new random pairings (not identical to previous)

### TASK-4.3 — Clear All Players button
- [ ] **Priority:** P1
- **Description:** Add a "Clear All Players" button with warning/secondary styling. Must show a confirmation dialog before clearing.
- **Requirements:** REQ-FR-05 (bulk remove)
- **Acceptance Criteria:**
  - Styled as secondary/warning action
  - Confirmation prompt: "Are you sure you want to remove all players?"
  - On confirm: removes all players, hides results, resets counts

---

## Phase 5: Results Display

### TASK-5.1 — Couple cards layout
- [ ] **Priority:** P0
- **Description:** Render generated couples as cards in a responsive grid/column layout.
- **Requirements:** REQ-FR-14, REQ-FR-15, REQ-FR-16
- **Acceptance Criteria:**
  - Section header: "Generated Couples"
  - Each card shows: "Couple N", Player 1 name (Gender), Player 2 name (Gender)
  - Cards use a responsive grid (1 column on mobile, 2-3 on desktop)

### TASK-5.2 — Visual distinction for couple types
- [ ] **Priority:** P1
- **Description:** Apply different background colors or border styles to distinguish mixed-gender from same-gender couples.
- **Requirements:** REQ-FR-19
- **Acceptance Criteria:**
  - Mixed-gender couples have a default card style
  - Same-gender couples have a subtly different background or border color
  - Distinction is accessible (not color-only — include an icon or label)

### TASK-5.3 — Unmatched player notification
- [ ] **Priority:** P0
- **Description:** If there is an unmatched player, display a prominent notification with the player's name and explanation.
- **Requirements:** REQ-FR-11, REQ-FR-18
- **Acceptance Criteria:**
  - Notification shows: "Unmatched Player: [Name] ([Gender])"
  - Includes explanation: "This player could not be paired due to an odd number of players"
  - Styled prominently (warning color) so it's not missed

### TASK-5.4 — Animate results appearance
- [ ] **Priority:** P1
- **Description:** Use Animate.css to animate couple cards appearing when generated.
- **Requirements:** REQ-NFR-01
- **Acceptance Criteria:**
  - Cards animate in with staggered delay (e.g., `animate__fadeInUp`)
  - Animation is smooth and does not hinder readability

---

## Phase 6: Validation & Error Handling

### TASK-6.1 — Consolidate all validation rules
- [ ] **Priority:** P0
- **Description:** Ensure every validation rule from Section 7 is enforced in the UI and in the add-player flow.
- **Requirements:** REQ-VAL-01 to REQ-VAL-09
- **Acceptance Criteria:**
  - REQ-VAL-01: Empty/whitespace-only names rejected
  - REQ-VAL-02: Names trimmed before storage
  - REQ-VAL-03: "Select Gender" is not accepted as valid
  - REQ-VAL-04: Max 50 characters enforced
  - REQ-VAL-05: Min 2 characters enforced
  - REQ-VAL-06: Duplicate names allowed
  - REQ-VAL-07: Generate button disabled when < 2 players
  - REQ-VAL-08: System handles up to 200 players without issues
  - REQ-VAL-09: Each player in one couple only (algorithm guarantees this)

### TASK-6.2 — Error message display system
- [ ] **Priority:** P0
- **Description:** Build a reusable error display function that shows messages near the relevant input, auto-dismisses after 5s, and supports multiple simultaneous errors.
- **Requirements:** REQ-ERR-01 to REQ-ERR-05
- **Acceptance Criteria:**
  - Errors render adjacent to relevant field
  - Non-technical language
  - Red color (`#DC3545`)
  - Auto-dismiss after 5 seconds OR close button
  - Multiple errors can display at once

---

## Phase 7: Polish & Responsiveness

### TASK-7.1 — Mobile-first responsive design
- [ ] **Priority:** P0
- **Description:** Ensure the full layout works seamlessly from 320px to 1920px using CSS media queries and Flexbox/Grid.
- **Requirements:** REQ-NFR-03, REQ-NFR-10
- **Acceptance Criteria:**
  - Usable on 320px width (small phones)
  - Input section stacks vertically on mobile, horizontal on desktop
  - Couple cards: 1 column on mobile, 2+ on tablet/desktop
  - No horizontal scrolling at any breakpoint
  - Touch targets are at least 44×44px on mobile

### TASK-7.2 — WCAG 2.1 Level AA color accessibility
- [ ] **Priority:** P1
- **Description:** Verify all text/background color combinations meet WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text).
- **Requirements:** REQ-NFR-05
- **Acceptance Criteria:**
  - All foreground/background pairs pass a contrast checker
  - Gender badges are readable on their backgrounds
  - Error messages are readable
  - Focus indicators are visible

### TASK-7.3 — Animate.css transitions for key interactions
- [ ] **Priority:** P1
- **Description:** Apply subtle animations to: adding a player, removing a player, generating couples, and clearing all.
- **Requirements:** REQ-NFR-01
- **Acceptance Criteria:**
  - Player added → fade/slide in
  - Player removed → fade out
  - Couples generated → staggered card entrance
  - Animations respect `prefers-reduced-motion`

### TASK-7.4 — Performance optimization
- [ ] **Priority:** P1
- **Description:** Ensure the app loads in < 3 seconds and couple generation completes in < 1 second for 100 players.
- **Requirements:** REQ-NFR-06, REQ-NFR-07, REQ-NFR-08
- **Acceptance Criteria:**
  - Page load time < 3s on standard broadband
  - Generation of 100 players completes in < 1 second
  - UI remains responsive during all interactions

### TASK-7.5 — Clear labels, instructions, and empty states
- [ ] **Priority:** P1
- **Description:** Add clear labels, placeholder text, and helpful empty states throughout the app.
- **Requirements:** REQ-NFR-01, REQ-NFR-02, REQ-NFR-04
- **Acceptance Criteria:**
  - All form fields have visible labels
  - Empty player list shows "No players added yet"
  - Empty results section shows nothing (or instructional text)
  - All actions completable within 3 clicks

---

## Phase 8: Cross-Browser & Device Testing

### TASK-8.1 — Unit tests for pairing algorithm
- [ ] **Priority:** P0
- **Description:** Write unit tests covering all 6 scenarios from Section 5.3, plus edge cases (0 players, 1 player, 200 players).
- **Requirements:** Section 11.1
- **Acceptance Criteria:**
  - All 6 scenario table outcomes are verified
  - Edge cases: 0 players → empty result, 1 player → unmatched
  - Randomization test: running 100 times produces at least 2 different orderings
  - Each player appears in exactly one couple

### TASK-8.2 — Integration tests for user workflow
- [ ] **Priority:** P1
- **Description:** Test the complete flow: add players → generate → view results → regenerate → clear all.
- **Requirements:** Section 11.2
- **Acceptance Criteria:**
  - Full workflow completes without errors
  - Regenerate produces new pairings
  - Clear All resets the entire app state
  - Error scenarios handled gracefully

### TASK-8.3 — Cross-browser testing checklist
- [ ] **Priority:** P1
- **Description:** Manually verify the app on all supported browsers and screen sizes.
- **Requirements:** REQ-NFR-09, REQ-NFR-10, REQ-NFR-11, Section 11.4
- **Acceptance Criteria:**
  - [ ] Chrome (desktop) — latest 2 versions
  - [ ] Chrome (Android) — latest 2 versions
  - [ ] Firefox — latest 2 versions
  - [ ] Safari (macOS) — latest 2 versions
  - [ ] Safari (iOS 13+)
  - [ ] Edge — latest 2 versions
  - [ ] Screen sizes: 320px, 768px, 1024px, 1440px, 1920px
  - No plugins or extensions required (REQ-NFR-11)

---

## Phase 9: Deployment

### TASK-9.1 — Deploy to GitHub Pages
- [ ] **Priority:** P1
- **Description:** Configure the repository for GitHub Pages deployment from the `main` branch.
- **Requirements:** Tech Stack (GitHub Pages)
- **Acceptance Criteria:**
  - App is accessible via GitHub Pages URL
  - All assets load correctly (CSS, JS, Animate.css CDN)
  - No console errors on production

---

## Requirements Traceability Matrix

| Requirement | Task(s) |
|-------------|---------|
| REQ-FR-01 | TASK-2.1 |
| REQ-FR-02 | TASK-2.2 |
| REQ-FR-03 | TASK-2.3 |
| REQ-FR-04 | TASK-2.5 |
| REQ-FR-05 | TASK-2.5, TASK-4.3 |
| REQ-FR-06 | TASK-2.6 |
| REQ-FR-07 | TASK-3.2, TASK-4.1 |
| REQ-FR-08 | TASK-3.2 |
| REQ-FR-09 | TASK-3.2 |
| REQ-FR-10 | TASK-3.2 |
| REQ-FR-11 | TASK-3.2, TASK-5.3 |
| REQ-FR-12 | TASK-3.2 |
| REQ-FR-13 | TASK-3.1, TASK-3.2 |
| REQ-FR-14 | TASK-5.1 |
| REQ-FR-15 | TASK-5.1 |
| REQ-FR-16 | TASK-5.1 |
| REQ-FR-17 | TASK-4.2 |
| REQ-FR-18 | TASK-5.3 |
| REQ-FR-19 | TASK-5.2 |
| REQ-NFR-01 | TASK-7.5 |
| REQ-NFR-02 | TASK-7.5 |
| REQ-NFR-03 | TASK-1.4, TASK-7.1 |
| REQ-NFR-04 | TASK-7.5 |
| REQ-NFR-05 | TASK-7.2 |
| REQ-NFR-06 | TASK-7.4 |
| REQ-NFR-07 | TASK-7.4 |
| REQ-NFR-08 | TASK-7.4 |
| REQ-NFR-09 | TASK-8.3 |
| REQ-NFR-10 | TASK-8.3 |
| REQ-NFR-11 | TASK-8.3 |
| REQ-NFR-12 | TASK-6.1 |
| REQ-NFR-13 | TASK-6.1, TASK-6.2 |
| REQ-VAL-01 | TASK-2.4, TASK-6.1 |
| REQ-VAL-02 | TASK-2.4, TASK-6.1 |
| REQ-VAL-03 | TASK-2.4, TASK-6.1 |
| REQ-VAL-04 | TASK-2.1, TASK-2.4, TASK-6.1 |
| REQ-VAL-05 | TASK-2.4, TASK-6.1 |
| REQ-VAL-06 | TASK-6.1 |
| REQ-VAL-07 | TASK-4.1, TASK-6.1 |
| REQ-VAL-08 | TASK-6.1 |
| REQ-VAL-09 | TASK-3.2, TASK-6.1 |
| REQ-ERR-01 | TASK-2.4, TASK-6.2 |
| REQ-ERR-02 | TASK-6.2 |
| REQ-ERR-03 | TASK-6.2 |
| REQ-ERR-04 | TASK-6.2 |
| REQ-ERR-05 | TASK-6.2 |
| REQ-TECH-01 | TASK-1.1 |
| REQ-TECH-02 | TASK-3.2 |
| REQ-TECH-03 | TASK-3.2 |
| REQ-TECH-04 | TASK-1.2 |
| REQ-TECH-05 | TASK-1.4 |
