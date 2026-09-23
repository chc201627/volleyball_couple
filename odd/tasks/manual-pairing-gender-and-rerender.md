# Feature: Manual Pairing Gender Indicators and Overlay Rerender Fix

Objective: Show gender and level indicators on player buttons in the manual pairing screen, and replace global rerender with rerenderOverlay to eliminate background window flashing.

## Actionable Checklist
- [x] TASK-1: Update `js/ui/screens/manual-pairing.js` to render gender/level indicators and use `rerenderOverlay()`
- [x] TASK-2: Update `css/screens.css` to format candidate cards with gender/level meta
- [x] TASK-3: Guard background screen animation in `app-orchestrator.js` and hide `.app__action-bar` / `.app__tab-bar` behind active overlays
- [x] TASK-4: Add backdrop blur and higher scrim opacity in `css/components.css` and `css/design-tokens.css`
- [x] TASK-5: Bump version to 2.0.2, update release notes, and commit

## Rationale
- Inline task implementation with browser verification and CSS token adjustments

