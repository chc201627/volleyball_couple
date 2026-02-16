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

### 3.2 Couple Matching Algorithm

**REQ-FR-07:** The system shall randomly pair players into couples when requested by the user.

**REQ-FR-08:** The system shall prioritize creating male-female couples whenever possible.

**REQ-FR-09:** The system shall create male-male couples only when there are insufficient female players to match all males.

**REQ-FR-10:** The system shall create female-female couples only when there are insufficient male players to match all females.

**REQ-FR-11:** The system shall handle odd numbers of players by leaving one player unmatched.

**REQ-FR-12:** The system shall ensure each player appears in only one couple per matching session.

**REQ-FR-13:** The system shall implement true randomization for pairing order to ensure fairness.

### 3.3 Results Display

**REQ-FR-14:** The system shall display generated couples in a clear, readable format.

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

**REQ-ERR-03:** Error messages shall use red or warning color scheme (#DC3545 or similar).

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

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Gradient, Animate.css
- **Hosting:** GitHub Pages
