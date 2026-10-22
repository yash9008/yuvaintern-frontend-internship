# Week 4: Enhancing Web Page Performance and Accessibility

Launchpad Journal | YuvaIntern Frontend Web Developer Intern

Prepared by: Yash Vinod Sawant
Date: 22 October 2026

## Project outcome

This project improves the existing Week 3 Launchpad Journal while preserving its responsive layout, note search, saved reading list, native field guide, and learning-plan form. The distributed page files are 12.5% smaller. The measured mobile layout shift fell from 0.059 to zero in three local Lighthouse runs.

The baseline already earned 100 in every Lighthouse category and had no axe violations. Week 4 retains those scores while improving the underlying measurements and keyboard behavior; an increase in accessibility score is not claimed.

| Measure | Week 3 baseline | Week 4 |
| --- | --- | --- |
| Lighthouse performance | 100 / 100 | 100 / 100 |
| Lighthouse accessibility | 100 / 100 | 100 / 100 |
| First Contentful Paint | 0.902 s | 0.752 s |
| Largest Contentful Paint | 1.127 s | 0.977 s |
| Cumulative Layout Shift | 0.059 | 0.000 |
| Total Blocking Time | 0 ms | 0 ms |
| Page files, uncompressed | 44,927 bytes | 39,323 bytes |

### Measurement method

Each version was tested three times with Lighthouse 13.5.0 in fresh Helium Chromium profiles using the default mobile preset and simulated throttling. Values above are medians. Both were served by the same local Python HTTP server without compression. File sizes count HTML, CSS, JavaScript and five SVGs, not documentation or QA dependencies. Lab timings vary and are not production field measurements.

## Performance: analysis and changes

Initial analysis found an unminified render-blocking stylesheet and readable JavaScript being served directly. The mobile header initially painted with full navigation, then changed after deferred JavaScript initialized it. Search also rebuilt all save-button contents for every query. The original images were already small SVGs with dimensions; replacing them with raster images would add unnecessary weight.

### Smaller delivery files

| Resource | Before | After |
| --- | --- | --- |
| styles.css | 14,977 B | 12,652 B |
| script.js | 9,913 B | 6,478 B |
| Five SVGs combined | 6,517 B | 6,405 B |

A reproducible build uses Lightning CSS, Terser and SVGO to generate the root stylesheet, script and illustrations. Readable originals remain under src/. The HTML stays readable for review. Shared focus rules and reduced-motion rules were consolidated instead of maintaining duplicate declarations. The build has no role at runtime; the page opens directly in a browser.

### Loading and layout stability

A small head script establishes the JavaScript enhancement class before first paint. Narrow-screen CSS therefore reserves the final compact header instead of displaying and then removing full navigation. A 5:4 aspect ratio complements the hero image dimensions. This eliminated the observed layout shift in the tested runs.

The hero image remains directly discoverable in HTML and eager-loaded, with fetchpriority="high". Below-the-fold card illustrations retain lazy loading and use asynchronous decoding. All SVGs retain their viewBox for responsive scaling. System fonts and local assets avoid third-party font and image requests. The main script remains deferred.

### Less interaction work

Card button references and labels are cached. Filtering changes card visibility and the results status without recreating save-button nodes. Reading-list buttons are refreshed when saved state changes. The existing storage key is intentionally preserved, so saved note IDs remain compatible on the same origin.

### Choices kept proportionate

Critical CSS was not inlined: the page has one small stylesheet, and duplicating CSS would add maintenance cost. No framework, service worker or production caching policy was added. Hosting compression and cache headers remain deployment concerns; this project measures uncompressed local delivery.

## Accessibility: implementation and checks

### Structure and navigation

The page retains one main landmark, one h1, ordered h2/h3 sections, semantic articles, labelled navigation, native buttons and native details/summary notes. A named search landmark and labelled learning-plan form make those regions easier to locate. Informative illustrations keep descriptive alt text; decorative marks are hidden from assistive technology.

The skip link targets a main element with tabindex="-1" so it accepts focus with JavaScript disabled. Fragment links transfer focus to the destination heading or note summary. The phone menu keeps aria-expanded, visibility and its open class synchronized. Escape returns focus to its toggle; section navigation focuses its destination. Resize handling recovers focus when a focused control becomes hidden.

### Readable controls and feedback

Input boundaries were darkened for stronger contrast. Explicit placeholder colors avoid faint browser defaults. One focus-visible rule covers interactive controls and programmatic destinations; card links use an inset outline to avoid clipping. Forced-colors CSS preserves system focus colors and control boundaries. Required fields use visible labels, aria-describedby, aria-invalid and an alert summary. Result counts and reading-list feedback use status regions.

| Color pair | Measured ratio | Threshold |
| --- | --- | --- |
| Body ink on paper | 14.19:1 | 4.5:1 |
| Muted text on darkest section | 5.14:1 | 4.5:1 |
| Button white on purple | 7.16:1 | 4.5:1 |
| Input boundary on white | 3.72:1 | 3:1 |
| Error text on white | 6.6:1 | 4.5:1 |

### Preferences and reflow

Reduced-motion settings disable smooth scrolling, plan reveal animation and button transitions. Headings, summary labels and buttons can wrap at increased text size. At 320 CSS pixels and 200% root text size, the generated plan, empty form and expanded guide had no horizontal page overflow. This text-size simulation complements the viewport checks; it is not a physical-device or browser-zoom certification.

### Verified behavior

Eight logic tests, twelve browser workflow groups, ten viewport widths and ten additional accessibility/performance regression checks passed. Axe 4.14.0 found zero violations in the initial page, desktop form, invalid form, generated plan and expanded phone-menu states. Keyboard testing covered skip navigation, destination focus, menu dismissal and breakpoint focus recovery. Full machine-readable results and screenshots accompany the project.

## Reproduction, evidence and learning

### Run and inspect

Open index.html directly, keeping styles.css, script.js and assets/ beside it. For consistent browser-local storage, serve the week-4 folder with python3 -m http.server 8024 and open http://127.0.0.1:8024/. The page itself needs no account, installation or backend.

For optional QA, use Node 22.19 or newer, run npm ci, then npm run build and npm test. Install a Playwright Chromium browser or set LAUNCHPAD_BROWSER to an installed Chromium executable. With the server running, npm run test:browser and npm run test:a11y run the workflow and accessibility suites. Set LAUNCHPAD_BASE_URL=http://127.0.0.1:8024/ for both commands. Run npm run audit for before/after Lighthouse and axe evidence. The README gives the full commands.

### Evidence included

evidence/ includes six raw Lighthouse JSON reports, before/after summary files, axe results, workflow results, additional accessibility results, asset byte counts and SHA-256 hashes, and desktop/phone/validation/menu/skip-link screenshots. tests/fixtures/week-3/ preserves the baseline runtime files so the comparison can be reproduced. TESTING.md records the tested environment, completed checks and limitations.

### Limits and next checks

These are local Chromium lab results. No Safari, Firefox, physical-device, production hosting, WebPageTest or WAVE result is claimed. Automated accessibility scans cannot establish full WCAG conformance. Screen-reader reading order, spoken announcements, image-description usefulness and native select behavior still need manual VoiceOver or NVDA review. Axe items marked incomplete remain manual-review items in the raw results.

Lighthouse best-practices and SEO also remained 100. Host extensions can influence lab timing; both versions were measured with the same Helium executable and launcher configuration. Production compression, network conditions and device speed can change timing. Generated learning plans remain in-page only; the reading list persists only when browser storage permits it.

### Learning outcomes

A perfect audit score can coexist with small usability and efficiency problems. Comparing raw timings, layout shifts, file bytes and keyboard behavior reveals improvements that a single score misses. Keeping readable source separate from delivery files also makes optimization repeatable and easier to review.

### References

Google web.dev, Fetch Priority API: https://web.dev/articles/fetch-priority

W3C WAI, G1: bypass repeated blocks: https://www.w3.org/WAI/WCAG21/Techniques/general/G1

Deque, axe scan guidance: https://docs.deque.com/devtools-for-web/4/en/devtools-scanning/

