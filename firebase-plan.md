# Firebase Realtime Database — Implementation Plan

## Goal
Replace the static URL-hash sharing approach with Firebase Realtime Database so that viewers of a shared tournament link see score updates in real time without any manual re-sharing.

---

## How It Works (End-to-End)

1. **Organizer** clicks "Start Tournament" → app generates a short random `sessionId`, writes tournament state to Firebase at `tournaments/<sessionId>`, and updates the browser URL to `#s=<sessionId>`.
2. **Organizer** enters scores → each save writes the updated state to Firebase.
3. **Viewer** opens the shared URL (`#s=<sessionId>`) → app detects the hash, recognises it is NOT the owner (no match in localStorage), subscribes to `tournaments/<sessionId>` with `on('value', ...)`. Every time Firebase data changes the UI re-renders automatically.
4. If Firebase is **not configured** (placeholder config values), the app silently falls back to the old `#t=<base64>` URL-hash approach — zero breakage for existing users.

---

## Architecture

```
[Organizer browser]                    [Firebase RTDB]               [Viewer browser(s)]
  handleSaveScore()
      └─ writeToFirebase(state)  ──►  tournaments/<sessionId>  ──►  on('value') listener
                                                                          └─ renderTournament()
```

Ownership is tracked in the organizer's own `localStorage` under the key `bv-owned-sessions` (a JSON array of session IDs). No authentication or server-side rules needed for this use case.

---

## Files to Create / Modify

| File | Action | Summary |
|------|--------|---------|
| `js/firebase-config.js` | **Create** | Placeholder config — user fills in their Firebase project values |
| `firebase-rules.json` | **Create** | Reference rules file (paste into Firebase console) |
| `index.html` | **Modify** | Add Firebase compat SDK scripts + `firebase-config.js` before `app.js` |
| `js/app.js` | **Modify** | Firebase init, session management, real-time listener, write-on-save |
| `js/i18n.js` | **Modify** | Update `tournament.readonlyBanner` text (real-time instead of "ask organizer") |

---

## Detailed Changes

### 1. `js/firebase-config.js` (new)
Placeholder object `FIREBASE_CONFIG` with all seven Firebase project fields. Include step-by-step setup instructions as comments. When `apiKey === 'YOUR_API_KEY'` the app skips Firebase entirely.

### 2. `firebase-rules.json` (new reference file)
```json
{
  "rules": {
    "tournaments": {
      "$sessionId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```
User pastes this into Firebase Console → Realtime Database → Rules. Allows public read/write (appropriate for a session-ID-gated tournament; no personal data is stored).

### 3. `index.html`
Add before `app.js`:
```html
<!-- Firebase Realtime Database (compat SDK) -->
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
<script src="js/firebase-config.js"></script>
```

### 4. `js/app.js`

#### New state variables
```javascript
var db = null;        // Firebase Database instance (null when not configured)
var sessionId = null; // Active session ID — set on start or loaded from URL
```

#### New functions

**`initFirebase()`**
Checks `typeof firebase !== 'undefined'` and `FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY'`.
Calls `firebase.initializeApp(FIREBASE_CONFIG)` (guarded against double-init).
Sets `db`. Returns `true` on success.

**`generateSessionId()`**
Returns `Date.now().toString(36) + Math.random().toString(36).slice(2,8)` — short, URL-safe, unique enough for this use case.

**`getSessionIdFromURL()`**
Parses `window.location.hash` for `#s=` prefix. Returns the session ID string or `null`.

**`isSessionOwner(sid)`**
Reads `bv-owned-sessions` array from `localStorage`. Returns `true` if `sid` is present.

**`markSessionOwner(sid)`**
Appends `sid` to `bv-owned-sessions` in `localStorage`.

**`writeToFirebase(state)`**
Calls `db.ref('tournaments/' + sessionId).set({ state, updatedAt: ServerValue.TIMESTAMP })`.

**`subscribeToSession(sid)`**
Calls `db.ref('tournaments/' + sid).on('value', callback)`.
Callback: updates `tournamentState`, calls `saveTournamentState()` (local backup), calls `renderTournament()`.

**`loadSessionOnce(sid, callback)`**
Uses `.once('value')` to fetch current state — used by the organizer when re-opening an existing session.

#### Modified `init()`
```
initFirebase()
  ├─ Firebase ready + #s= in URL
  │     ├─ isSessionOwner → organizer re-open → loadSessionOnce → render
  │     └─ not owner      → isReadOnly=true, subscribeToSession
  ├─ Firebase ready, no #s= → check localStorage → render if found
  └─ Firebase NOT ready
        ├─ #t= in URL (legacy) → isReadOnly=true, load base64 state, render
        └─ localStorage        → render if found
```

#### Modified `handleStartTournament()`
After building `tournamentState`:
- If `db`: `sessionId = generateSessionId()`, `markSessionOwner(sessionId)`, `history.replaceState(..., '#s=' + sessionId)`, `writeToFirebase(tournamentState)`
- Else: `pushShareURL()` (legacy base64 fallback)
- Always: `saveTournamentState()`, `renderTournament()`

#### Modified `handleSaveScore()`
After updating `tournamentState`:
- `saveTournamentState()` always (local backup)
- If `db && sessionId`: `writeToFirebase(tournamentState)`
- Else: `pushShareURL()`
- Always: `renderTournament()`

#### Modified `handleResetTournament()`
- If `db && sessionId`: `db.ref('tournaments/' + sessionId).remove()`, `sessionId = null`
- Clear URL hash: `history.replaceState(null, '', location.pathname)`
- Existing cleanup: `localStorage.removeItem`, hide section, reset selector

#### Modified `handleShareTournament()`
```javascript
var url = db ? window.location.href : getShareURL();
```
In Firebase mode the URL already carries `#s=<sessionId>` — just copy it.

### 5. `js/i18n.js`
Update `tournament.readonlyBanner` in both languages:
- EN: `'👁 View only — updates in real time'`
- ES: `'👁 Solo lectura — se actualiza en tiempo real'`

---

## Data Shape in Firebase

```
tournaments/
  └─ <sessionId>/
       ├─ updatedAt: <server timestamp>
       └─ state:
            ├─ teams:   [ { id, name, player1, player2, type } ]
            ├─ groups:  [ { id, teams[] } ]
            └─ matches: [ { id, groupId, team1Id, team2Id, score1, score2, played } ]
```

---

## Fallback Behaviour

| Condition | Behaviour |
|-----------|-----------|
| `firebase-config.js` has placeholder values | App uses old `#t=<base64>` URL sharing |
| Firebase configured but network offline | Organizer continues writing (Firebase queues writes); viewer sees last known state |
| Old `#t=` link opened with Firebase configured | Falls through to base64 decode path (backwards compatible) |

---

## Implementation Order

1. `firebase-rules.json` — create reference file
2. `js/firebase-config.js` — already created (placeholder)
3. `index.html` — add SDK script tags
4. `js/i18n.js` — update two banner strings
5. `js/app.js` — add Firebase functions, update init + handlers

---

## Verification Steps

1. Fill in `firebase-config.js` with a real Firebase project.
2. Open `index.html` → add 4+ players → generate couples → click "Start Tournament".
3. Verify URL changes to `#s=<sessionId>`.
4. Copy URL → open in a second browser tab/window.
5. Enter a score in the **organizer** tab.
6. Confirm the **viewer** tab updates automatically (no refresh needed).
7. Verify "Reset Tournament" removes the Firebase entry and clears the URL hash.
8. Clear `firebase-config.js` (restore placeholders) → verify old `#t=` flow still works.
