# Launchpad Journal — Frontend Week 3

**YuvaIntern Frontend Web Developer Intern**  
**Task:** Integrating JavaScript for Interactive User Experience

This is the Week 3 version of the responsive Launchpad Journal page. It uses plain HTML, CSS, and JavaScript, building on the static Week 2 design.

## Open the webpage
Open `index.html` in a modern browser. Keep `styles.css`, `script.js`, and `assets/` beside it. No installation, framework, account, or backend is required.

For a local HTTP preview, run a static server in this folder, for example:

```sh
python3 -m http.server 8024
```

Then open `http://127.0.0.1:8024`. Reading-list storage is specific to the browser and page origin. Storage for `file:` pages varies between browsers; use a local server for consistent persistence. The search and form were also checked by directly opening the local HTML file.

## Interactive features
- A phone navigation toggle maintains `aria-expanded` and hidden state, closes with Escape or a section link, and resets when the viewport crosses 700px.
- Live search, topic selection, and saved-only filtering combine in one render function, updating cards, result counts, and empty-state feedback.
- Save/remove buttons update their label, pressed state, and reading-list count. Known note IDs are stored in localStorage; blocked or unreadable storage produces a clear status message without breaking the other controls.
- Clicking a learning card opens its native field-guide note and moves focus to the summary.
- The learning-plan form checks four required fields, validates lengths and allowed values, reports errors, and focuses the first invalid field.
- A valid form creates a time-based plan in the DOM. Edit keeps the draft; Start over clears the form. Generated plans are not stored after a reload.
- User-entered strings are assigned with `textContent` or text nodes. No form data is sent to a server.

If JavaScript is disabled, the original three cards, visible navigation, and native field guide remain readable. Enhanced controls are hidden and a noscript message explains their availability.

## Code structure and decisions
`index.html` defines the content and controls. `styles.css` keeps the Week 2 layout and adds clearly marked interaction styles. `script.js` runs after HTML parsing with `defer` and groups menu, reading-library, guide-link, and form behavior inside one isolated function.

The JavaScript uses event listeners, delegated card-button clicks, `classList`, `hidden`, ARIA attributes, DOM element creation, and text updates. `matchesNote`, `parseSaved`, `validatePlan`, and `sessionSteps` are pure helpers exposed to Node only for testing; browser usage remains a classic script, so it also works when opened directly.

Storage uses `launchpad.week3.reading-list.v1` and stores only known note IDs. Saved-list state is the source of truth for counts and controls. One render path combines all filters, preventing mismatched card and count states. A disappearing saved card returns focus to the reading-list checkbox. Reduced-motion preferences disable the plan reveal effect and button transitions.

## Files
- `index.html`, `styles.css`, `script.js` — complete webpage source
- `assets/` — four original Week 2 SVG illustrations and a local favicon
- `Week-3-Report.docx` — Word report for the YuvaIntern upload field
- `REPORT.md` — readable technical report for GitHub
- `description.txt` — 275-word submission description
- `TESTING.md` — verified checks and limitations
- `tests/` — eight Node logic tests and an optional browser suite
- `evidence/` — browser screenshots and workflow results

## Validation
Eight logic tests, twelve browser workflow groups, and ten viewport widths passed. Full details are in `TESTING.md`.

```sh
node --test tests/logic.test.cjs
```

The optional browser script uses Playwright as a QA tool only. With Playwright and its Chromium browser installed, start the static server first, then run:

```sh
node tests/browser-check.cjs
```

`LAUNCHPAD_BASE_URL` changes the server URL. `LAUNCHPAD_BROWSER` can select an installed Chromium executable, and `LAUNCHPAD_PLAYWRIGHT` can point to an existing Playwright package. No testing dependency is loaded by the webpage.

## Scope
Only the Frontend Web Developer Week 3 task is included. It is separate from the TaskNest full stack internship. This package does not implement a backend, course enrollment, account system, later-week performance work, or SPA routing.
