# Beach Volleyball Couple Matching

A static web app that registers beach volleyball players and generates random couples using a priority-based pairing algorithm: mixed-gender first, then same-gender, with unmatched player handling.

**Live Demo:** https://chc201627.github.io/volleyball_couple/

## Features

- Player registration with name and gender
- Real-time validation (min/max length, required fields)
- Priority-based pairing algorithm (mixed > same-gender > unmatched)
- Regenerate couples with new random pairings
- Responsive design (320px to 1920px)
- Bilingual support (English / Spanish)
- Animate.css transitions

## Tech Stack

- Vanilla HTML5, CSS3, JavaScript (ES6+)
- [Animate.css](https://animate.style/) via CDN
- GitHub Pages for hosting

## Getting Started

No build step required. Open `index.html` in any modern browser:

```bash
# Clone the repo
git clone https://github.com/chc201627/volleyball_couple.git
cd volleyball_couple

# Open in browser
open index.html
```

## Project Structure

```
index.html              Single-page app
css/styles.css          Mobile-first BEM styles with CSS custom properties
js/pairing.js           Standalone pairing algorithm module
js/i18n.js              Internationalization (EN/ES)
js/app.js               UI logic (IIFE, depends on pairing.js + i18n.js)
tests/
  pairing.test.html     Unit tests for pairing algorithm (all 6 scenarios + edge cases)
  integration.test.html Integration tests for full user workflow
```

## Pairing Algorithm

1. Separate players by gender and shuffle both lists
2. **Priority 1:** Create mixed-gender couples (male + female)
3. **Priority 2:** Pair remaining same-gender players
4. **Priority 3:** Flag leftover player as unmatched (odd total)

## Running Tests

Open the test files directly in a browser:

- `tests/pairing.test.html` — Unit tests (6 scenarios, edge cases 0/1/200 players, randomization, uniqueness)
- `tests/integration.test.html` — Full workflow (add players, validate, generate, regenerate, clear all)

## Browser Support

Chrome, Firefox, Safari, Edge (latest 2 versions), iOS Safari 13+
