# Week 5 verification

Verified on **28 October 2026**, using Helium Chromium 156 on macOS, Lighthouse 13.5.0, axe-core 4.14.0, lightningcss 1.33.0, terser 5.51.2, svgo 4.1.0 and Playwright 1.64.1. QA and build dependencies do not ship to the browser.

## Measurement method and results

Three fresh-profile Lighthouse default-mobile runs for each version, with simulated network/CPU throttling, the same browser executable and launcher flags, and the same local Python HTTP server. The baseline is the Week 3 fixture page used by earlier weeks (`tests/fixtures/week-3/`). Raw JSON records the exact browser, viewport, throttling, timings and audits. These are local lab tests with no HTTP compression.

| Median measure | Week 3 baseline | Week 5 SPA |
| --- | --- | --- |
| Performance | 100 | 95–100 |
| Accessibility | 100 | 100 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |
| First Contentful Paint | 0.925 s | 0.751 s |
| Largest Contentful Paint | 1.126 s | 1.351 s |
| Total Blocking Time | 0 ms | 0 ms |
| Cumulative Layout Shift | 0 | 0–0.138 |

Distribution files, uncompressed and measured after the final build:

| File | Size |
| --- | --- |
| index.html | 2,092 B |
| styles.css | 13,403 B |
| app.js | 26,644 B |
| notes-data.js | 1,017 B |
| guide-data.js | 1,161 B |
| Five SVGs combined | 6,405 B |
| **Total page payload** | **50,722 B** |

The SPA is larger than the Week 4 page (39,323 B) because the router, view modules and URL-state handling are new application code; the visual shell is unchanged. Both data stores are still loaded on demand, so a visit that only opens the home view downloads index.html, styles.css, app.js and one hero illustration, not the full payload.

Performance is reported honestly: two of three runs scored 95 because the client-rendered hero illustration enters the page after first paint (layout shift 0.138); the third run scored 100 with shift 0. The reservation of image dimensions limits the movement, and no run reported blocking time. Axe reported zero violations for both versions.

## Logic and workflow regression

`node --test tests/logic.test.cjs`: **15 passed**. Routing accepts the four routes in any spelling, trailing-slash paths normalize, unknown paths match nothing, legacy Week 3/4 anchors map to live routes, query state round-trips with strict defaults, long search input is truncated, combined searches work, saved data is deduplicated and filtered to known IDs, and plan validation and time totals behave at every boundary.

`node tests/browser-check.cjs`: **16 workflow groups and 10 viewport widths passed**, with no browser page errors. Workflows cover:

1. Boot normalizes the empty address to `#/` and renders the home view.
2. All four routes navigate inside one document (measured with a page marker that a reload would destroy), with URL, document title, heading focus, menu collapse and the routed-view transition.
3. Browser back and forward move between views with no reload.
4. Deep links `#/guide/layout` open the routed view, expand the requested note and move focus into it; `#/notes?topic=images&saved=1` restores filters from the URL.
5. Library filters rewrite the current history entry instead of pushing one; one typing sequence is one entry.
6. The reading list persists across a full reload using the same storage key as Weeks 3 and 4.
7. A refused storage write stays usable and says so in the status line.
8. A blocked dynamic content file shows an explained failure with the missing file name and a real retry path that recovers.
9. Unknown addresses render a 404 view that keeps the typed URL, then route home cleanly.
10. Legacy anchor names (`#learning-plan` etc.) normalize to routes without adding a second history entry.
11. Scroll positions are saved per entry and restored when going back to a scrolled view.
12. The plan form validates, focuses the first error, then focuses the generated result; edit keeps drafts; HTML-like input renders as literal text.
13. The mobile menu opens, closes on Escape, navigates in one document and collapses after choosing.
14. Corrupted saved data recovers without breaking the view.

Widths: 320, 390, 639, 640, 699, 700, 768, 880, 1040 and 1440 CSS px. Each had no horizontal page overflow and the expected phone/desktop navigation state. Screenshots capture home, notes, guide, plan, load-error, not-found, mobile menu and skip-link focus states.

## Additional accessibility checks

`node tests/accessibility-check.cjs`: **12 check groups and 5 axe scans passed**:

1. First Tab exposes the skip link; Enter focuses the main region.
2. Keyboard menu navigation closes the menu and focuses the routed-view heading in the same document.
3. Breakpoint changes recover focus from hidden desktop links and the phone toggle.
4. Guide details open by keyboard.
5. Filtering leaves save-button DOM nodes intact.
6. Reduced motion removes smooth scroll and view/reveal transitions.
7. Forced-colors preferences keep a visible focus outline.
8. Axe reports zero violations in plan-result, plan form, invalid form, home and open phone-menu states.
9. At 320 px and 200% root text size, notes, expanded guide, plan form and home stay inside the viewport.
10. Without JavaScript the shell keeps its skip link and navigation and explains itself with a noscript note.
11. Measured text, button, error and control-boundary colors meet their contrast thresholds (same palette tokens as Weeks 3 and 4, verified by relative-luminance calculation).
12. Every heading level follows the previous one inside each routed view.

## How to reproduce

```
python3 -m http.server 8025          # inside the week-5 folder
LAUNCHPAD_BROWSER=/Applications/Helium.app/Contents/MacOS/Helium \
NODE_PATH="../qa/node_modules" \
node --test tests/logic.test.cjs     # build first: NODE_PATH=... node scripts/build.cjs
LAUNCHPAD_BROWSER=... NODE_PATH=... node tests/browser-check.cjs
LAUNCHPAD_BROWSER=... NODE_PATH=... node tests/accessibility-check.cjs
LAUNCHPAD_BROWSER=... BASELINE_URL=... node scripts/audit.mjs
```

Evidence JSON files and screenshots live in `evidence/`. Manual screen-reader and cross-browser review remain future checks, as in the earlier weeks.
