# Frontend Week 3 Interactive Webpage Report

Yash | Frontend Web Developer Intern | YuvaIntern

20 October 2026

Task: Integrating JavaScript for Interactive User Experience

## Project outcome

Week 3 extends the responsive Launchpad Journal webpage with plain JavaScript for the YuvaIntern Frontend Web Developer internship. The completed page supports a phone navigation menu, live search and topic filters, a saved reading list, guide-note navigation, and a validated learning-plan form. The project uses separate HTML, CSS, and JavaScript files and requires no framework or backend.

## Review of the existing page

The Week 2 learning shelf, card links, navigation, and practice section provided suitable places for interaction. The responsive layout and original SVG illustrations were retained. New controls let readers find relevant notes, keep a reading list, and turn a learning goal into a short practice session. If JavaScript is disabled, the original cards, visible navigation, and native field guide remain readable; enhanced controls are hidden.

## JavaScript structure and DOM updates

The script loads with defer after HTML parsing and groups behavior into menu, reading-library, guide-link, and form sections. Event listeners handle clicks, input, changes, form submission, reset, keyboard Escape, and viewport changes. Delegated card clicks avoid repeating handlers for each save button. One renderNotes function combines search, topic, and saved-only state, then updates hidden cards, result counts, pressed-button labels, and empty feedback. Pure helper functions separate matching, saved-data parsing, validation, and session allocation for testing.

## Form validation and safe output

The form validates a name, an allowed topic, a time choice of 15, 30, 45, or 60 minutes, and a goal of 10 to 280 characters. Invalid submissions show field errors and focus the first invalid control. A valid submission creates reading, building, and reflection steps whose durations add to the selected time. User input is inserted with textContent or text nodes, so HTML-like text remains literal. Edit preserves the draft; Start over resets it. No form information is transmitted or retained after a refresh.

## Interaction challenges and solutions

Combined filters can create inconsistent counts if each control updates the page independently. A shared rendering function derives all visible results from the same state. Reading-list storage is wrapped in error handling; blocked writes remain usable for the current visit with a clear persistence message, and unreadable saved data does not break the form. When removing a saved card hides the focused button, focus moves to the reading-list checkbox. The mobile menu synchronizes hidden and aria-expanded states and resets across the 700-pixel boundary.

## Verification results

Eight logic tests passed for filtering, storage parsing, required fields, limits, international names, and session totals. Twelve browser workflow groups passed in an isolated Helium Chromium profile, including saving and refreshing, combined filters, keyboard behavior, form errors, editing/reset, simulated storage failures, and literal rendering of HTML-like input. Ten widths from 320 to 1440 pixels passed without horizontal page scrolling. Direct local-file opening also passed search and valid-plan checks.

## Scope and verification limits

The checks use simulated widths in one Chromium engine, rather than physical-device or cross-browser certification. The reading list persists only when browser storage is available; the learning plan is intentionally temporary. Native field-guide elements remain usable without JavaScript. This submission covers only Frontend Web Developer Week 3 and does not implement server submission, accounts, or later-week SPA routing.

## Deliverables and local use

The package includes index.html, styles.css, script.js, local assets, the Word and Markdown reports, a 275-word submission description, logic/browser tests, and screenshots. Open index.html to use the webpage, or serve this folder with a local static server for consistent browser-storage behavior. The README explains the implementation and test commands. Upload the extracted week-3 folder to the frontend internship repository, and use this Word report for the portal upload.

## Browser examples

- [Interactive learning shelf](evidence/reading-library.png)
- [Generated learning plan](evidence/learning-plan.png)
- [Expanded phone menu](evidence/mobile-menu.png)
- [Form validation](evidence/validation.png)
- [Complete verification notes](TESTING.md)
