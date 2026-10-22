# Week 4 verification

Verified on **22 October 2026**, using Helium Chromium 155 on macOS, Lighthouse 13.5.0, axe-core 4.14.0 and Playwright 1.64.1. QA dependencies do not ship to the browser.

## Measurement method and results

Three fresh-profile Lighthouse default-mobile runs for each version, with simulated network/CPU throttling, the same browser executable and launcher flags, and the same Python HTTP server. The baseline lives under `tests/fixtures/week-3/`. Raw JSON records the exact browser, viewport, throttling, runtime warnings, timings and audits. These are local lab tests with no HTTP compression; installed host extensions may still affect timings.

| Median measure | Week 3 | Week 4 |
| --- | --- | --- |
| Performance | 100 | 100 |
| Accessibility | 100 | 100 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |
| First Contentful Paint | 0.902 s | 0.752 s |
| Largest Contentful Paint | 1.127 s | 0.977 s |
| Total Blocking Time | 0 ms | 0 ms |
| Cumulative Layout Shift | 0.059 | 0.000 |

The baseline already passed the automated audits. Improvements are in bytes, timing, stability, focus behavior and reflow; an increase in score is not claimed. `asset-sizes.json` contains byte counts and SHA-256 hashes for each page file. The total falls from 44,927 to 39,323 bytes (12.5%); it excludes source copies, tests, evidence, reports, dependencies and HTTP headers.

## Logic and workflow regression

`npm test`: **8 passed**. Covers combined filters, malformed saved data, validation boundaries, international names and time allocations.

`npm run test:browser`: **12 workflow groups and 10 viewport widths passed**, with no browser page errors. Workflows cover combined search/topic/saved-only filtering, empty state and clear filters, saved-list persistence, focus recovery after hiding a card, blocked storage/corrupt-data recovery, guide links, required/short-goal errors and first-error focus, generated-plan content and time totals, edit/reset, literal rendering of HTML-like input, mobile menu/Escape/navigation/resize, and the JavaScript-disabled fallback.

Widths: 320, 390, 639, 640, 699, 700, 768, 880, 1040 and 1440 CSS px. Each had no horizontal page scrolling and the expected phone/desktop navigation state. Screenshots capture desktop, phone, expanded mobile menu, validation and skip-link focus.

## Additional accessibility checks

`npm run test:a11y`: **10 check groups passed**:

1. First Tab exposes the skip link; Enter focuses main; next Tab reaches the hero action.
2. Keyboard menu navigation closes the menu and focuses the selected heading.
3. Breakpoint changes recover focus from hidden navigation/toggle controls.
4. Search leaves save-button DOM nodes intact.
5. Reduced motion removes smooth scroll, button transitions and plan reveal animation.
6. Keyboard focus stays visible with forced-colors preferences.
7. Axe reports zero violations in desktop form, invalid form, generated plan and open phone-menu states.
8. At 320px and 200% root text size, the generated plan, form and expanded guide reflow without horizontal page overflow.
9. With JavaScript disabled, skip navigation and visible navigation remain usable.
10. Text, buttons, errors and input-boundary colors meet the tested contrast thresholds.

The initial phone-page axe scan also reports zero violations. Scans use WCAG 2 A/AA, 2.1 AA, 2.2 AA and best-practice tags supported by axe. The expanded-menu scan marks color contrast on its decorative menu glyph as incomplete; it is retained for manual review in `accessibility-results.json`, not counted as an automatic pass. All other scanned state results contain no incomplete items. Contrast ratios and their thresholds are recorded in the same file.

## Reproduce and limits

Follow the README commands. Set `LAUNCHPAD_BASE_URL` and, if needed, `LAUNCHPAD_BROWSER` for a different server or Chromium installation. The HTML, stylesheet, script and SVGs are self-contained; the build and test tools are optional.

Testing used one browser engine with simulated viewport sizes and preference settings. The text-size check changes root font size rather than claiming a physical zoom test. No Safari, Firefox, physical-device, production field, WAVE or WebPageTest results are claimed. VoiceOver/NVDA announcements, reading order, alt-text usefulness and native select behavior need manual assistive-technology review. Zero automated violations and perfect Lighthouse scores do not establish full WCAG conformance.

Word report layout was rendered and visually checked separately. Portal submission and GitHub upload are not performed by these tests.
