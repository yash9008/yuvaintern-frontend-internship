# Launchpad Journal — Week 5 (single-page application simulation)

A small client-side SPA built for the YuvaIntern Frontend Web Developer Intern internship.
It is the fifth evolution of one project: Week 3 built the responsive page, Week 4 improved
its performance and accessibility, and Week 5 restructures it into routed views with a
real browser history. No frameworks, no build step required to view, no network requests.

## Open it

Keep `index.html`, `styles.css`, `app.js`, `notes-data.js`, `guide-data.js` and `assets/`
together and open `index.html` in any modern browser, or serve the folder:

```
python3 -m http.server 8025
# open http://127.0.0.1:8025/
```

The page needs no account, installation or backend. Serving instead of opening from
`file://` keeps browser-local storage consistent.

## What it does

- **Home view** (`#/`): the journal hero, topic strip and practice steps.
- **Learning notes** (`#/notes`): search, topic filter, saved-only view with a persistent
  reading list (same browser storage key as Weeks 3 and 4). Active filters are written
  into the URL with `history.replaceState`, so deep links like `#/notes?q=grid&topic=layout&saved=1`
  open the exact filtered view without adding browser history entries while typing.
- **Field guide** (`#/guide`, `#/guide/<topic>`): native `details/summary` notes;
  deep links open the requested note and moves focus to it.
- **Learning plan** (`#/plan`): validated form, generated timed plan, edit keeps drafts.
- **Not-found view**: unknown addresses keep the typed URL and explain the four routes.
- **Legacy anchors** from Weeks 3/4 (`#notes`, `#field-guide`, `#learning-plan`,
  `#guide-layout` …) normalize to their new routes without a second history entry.

## Routing and state design

- Hash-based routing (`#/…`) chosen over the History API's `pushState` so the app works
  identically on `file://` and on GitHub Pages without server rewrites.
- Every navigation creates a real history entry, so back/forward behave like a
  multi-page site while staying in one document.
- State-only changes (typing a search, changing filters) rewrite the current entry.
- Scroll positions are saved per history entry and restored on back; corners where
  content arrives asynchronously wait until the target is actually reachable.
- View content loads on demand from `notes-data.js` and `guide-data.js`, with an
  explained failure view and a working retry path.
- Every text value reaches the page through `textContent`, so input renders as text.

## Files

```
index.html        the shell (header, nav, main landmark, footer)
styles.css        minified styles (readable originals in src/styles.css)
app.js            minified application (readable original in src/app.js)
notes-data.js     on-demand notes library content
guide-data.js     on-demand field-guide content
assets/           optimized local SVG illustrations
REPORT.md         project report with measured results
TESTING.md        how the app was verified and how to reproduce it
evidence/         screenshots and JSON evidence from the test runs
tests/            logic, browser and accessibility test suites (dev only)
scripts/          optional build and audit tools (dev only)
```

The distributed page itself requires nothing installed; `src/`, `tests/`, `scripts/`
and `evidence/` are for review and reproducibility.

## Development

```
npm run build          # regenerate minified root files from src/ (Node 22+, needs dev deps)
npm test               # 15 logic tests on the pure routing/state functions
npm run test:browser   # 16 browser workflow groups + 10 viewport widths
npm run test:a11y      # 12 accessibility check groups + 5 axe scans
```

Browser tests need a Chromium binary; this repository's QA ran with Playwright pointed
at a local Chromium executable (`LAUNCHPAD_BROWSER`).

## Documentation

- `REPORT.md` — outcome, measurements, decisions, accessibility checks, limitations.
- `TESTING.md` — test inventory and reproduction commands.
- `Week-5-Report.docx` — the same report as the portal upload file.

Prepared by Yash Vinod Sawant · YuvaIntern Frontend Web Developer Intern · Week 5, 28 October 2026.
