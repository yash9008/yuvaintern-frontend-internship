# Week 5: Developing a Single Page Application (SPA) Simulation

Launchpad Journal | YuvaIntern Frontend Web Developer Intern

Prepared by: Yash Vinod Sawant
Date: 28 October 2026

## Project outcome

This project restructures the existing Launchpad Journal into a small single-page
application. Instead of one long document with anchor scrolling, the journal now has
four routed views — home, learning notes, field guide and learning plan — driven by a
hash-based client-side router. Navigation changes the address bar, creates real browser
history entries, animates the view transition in 240 ms, and renders the next view into
one persistent shell without a full page reload. When content is needed, the app loads
it on demand from separate data files and explains and recovers from load failures.

The continuation is deliberate: Week 3 built the responsive page, Week 4 improved its
performance and accessibility. Week 5 keeps every Week 4 behaviour — search, topic
filters, reading list (same storage key), field guide, learning plan, skip link, mobile
menu, reduced-motion and forced-colors support — while adding the routing layer.

| Measure | Week 4 page | Week 5 SPA |
| --- | --- | --- |
| Lighthouse performance | 100 / 100 | 95–100 / 100 |
| Lighthouse accessibility | 100 / 100 | 100 / 100 |
| Best practices / SEO | 100 / 100 | 100 / 100 |
| First Contentful Paint | 0.752 s | 0.751 s |
| Largest Contentful Paint | 0.977 s | 1.351 s |
| Total Blocking Time | 0 ms | 0 ms |
| Page payload, uncompressed | 39,323 bytes | 50,722 bytes |

The SPA is 11.4 KB heavier because it adds application code that the Week 4 page did
not have: the route parser and matcher, URL state serialization, per-view modules,
history-entry scroll bookkeeping and on-demand loading with retry. First paint is
unchanged or marginally better. Largest Contentful Paint is longer because the SPA
renders the hero view after JavaScript starts and the illustration can enter after
first paint; two of three Lighthouse runs recorded a 0.138 layout shift from that
single insertion, the third run recorded zero. This is stated rather than hidden.

### Measurement method

Three Lighthouse 13.5.0 runs per version in fresh Helium Chromium profiles, default
mobile preset with simulated throttling, served by the same local Python HTTP server
without compression, against the same Week 3 fixture page as baseline used in Week 4.
Values above are medians; raw JSON evidence keeps the exact browser, viewport, throttle
settings and per-run numbers. Lab timings vary and are not production field data.

## Routing design and browser history

### Hash routing instead of pushState

The project requirement was client-side routing that manipulates browser history. The
implementation uses `#/…` hash routes on top of the History API. `pushState` routing
was considered and rejected for two concrete reasons: this portfolio is reviewed both
from `file://` and from GitHub Pages, and pushState routing breaks on both without a
server rewrite rule that a static reviewer cannot configure. Hash routing gives the
same real-history behaviour — every in-app navigation is a genuine history entry that
the browser's back and forward buttons traverse — while remaining fully portable.
The `#/notes?q=…` requirement is handled by parsing the hash the same way a search
URL would be parsed.

### One shell, four views

`index.html` is a permanent shell: header, navigation, an empty `main` container and
the footer. The router resolves the current address to one of the view modules,
replaces the container's content, updates the document title and meta description per
route, and moves `aria-current` in the menu to the active link. The view container
animates in with a 240 ms fade and rise; `prefers-reduced-motion` disables it, which
the accessibility suite verifies.

### State-only changes do not flood history

Typing in the notes search, changing the topic filter or toggling the saved-only view
re-renders the list and rewrites the current history entry with the new query string
(250 ms debounce) instead of pushing an entry. A test verifies that one typing
sequence adds no extra entry: back leaves the search session entirely, forward returns
to the exact filtered address. Deep links restore filters directly from the URL.
Unknown query values fall back to safe defaults, and search input is capped at 100
characters before it is ever compared to content.

### Scroll and focus belong to the right entry

Outgoing views save their scroll position into their own history entry before the next
route opens it. A restored scroll waits until the target is actually reachable — the
notes and guide views build their lists after an asynchronous data load, and a
synchronous scroll at route-change time would clamp to zero. The pending restore lets
real user scrolling cancel it. Every route change moves keyboard focus to the view
heading (or, for a deep-linked guide note, into that note), so keyboard and screen
reader users land inside the new view and know where they are.

### Legacy addresses keep working

Week 3 and Week 4 used anchors such as `#notes`, `#field-guide`, `#learning-plan` and
`#guide-layout`. The router recognizes these names and normalizes them to their new
routes without adding a second history entry, so bookmarks and notes made against the
earlier pages still land on the right view. Anything unrecognized renders the
not-found view, which keeps the typed URL visible in the page and explains the four
routes this application has.

## Dynamic content loading

The notes library and the field guide live in two separate data files. On the first
visit to the notes (or guide) view, the app injects a script tag for the matching file
and builds the view from the resolved data; the file is fetched once and cached for
the rest of the visit. This keeps the initial payload small — a visitor who only reads
the home view never downloads the library data — and simulates real dynamic loading
with honest mechanics. Failures are treated as part of the design: the view shows a
role=alert error naming the missing file, and Try again clears the cache and re-runs
the load. The browser suite forces this failure by blocking the data request, then
verifies the recovery.

## Accessibility in a stateful shell

A routed app changes what "the same accessibility guarantees" mean: content appears,
disappears and moves focus programmatically. Week 5 keeps the Week 4 structure inside
each view (one h1 per view, ordered headings, landmark roles, labelled controls,
44 px minimum touch targets) and adds what routing needs. Heading order is now verified
inside every routed view after a first-pass audit found the plan result reusing an h3
in place of an h2; card titles follow the view's h1 correctly.

Axe reports zero violations across plan-result, plan-form, invalid-form, home and
open-phone-menu states. Twelve additional checks cover the skip link, keyboard menu
routing, focus recovery on breakpoint changes, guide details by keyboard, save-button
DOM stability, reduced-motion and forced-colors preferences, 320 px at 200% root text
size, the JavaScript-disabled shell (which keeps its navigation and shows a note
explaining that the views are JavaScript-built), and measured color contrast using the
same palette tokens as the earlier weeks.

## Verification summary

- `node --test tests/logic.test.cjs` — **15/15 passed** on the pure router and state
  functions (route parsing, trailing-slash handling, legacy anchors, query
  round-trips, reading-list validation, plan validation and time totals).
- `node tests/browser-check.cjs` — **16 workflow groups and 10 viewport widths passed**
  with zero page errors, covering single-document navigation (verified with a page
  marker no reload survives), back/forward, deep links with URL state, history
  non-flooding, reload persistence, refused storage writes, blocked-dynamic-load
  recovery, the 404 view, legacy-anchor normalization, per-entry scroll restoration,
  the full plan flow with XSS-safe rendering, the mobile menu, and corrupted-saved-data
  recovery.
- `node tests/accessibility-check.cjs` — **12 check groups and 5 axe scans passed**.
- Lighthouse: 95/100–100/100 performance, 100/100 accessibility, best-practices and
  SEO across three runs; zero axe violations for the distributed page.

## Decisions kept proportionate

No framework was added: the routing layer is roughly 90 lines and the whole
application stays reviewable in one file. A client-side router library, a UI framework
or a service worker would add dependency weight the page does not need at this scale.
The 240 ms transition is the only animation; content is never replaced by animation.
`file://` and GitHub Pages friendliness constrained the router to hash navigation, and
that constraint is stated in the README so reviewers understand it was a deliberate
portability trade-off, not an unknown limitation.

## Limitations

Lighthouse runs here are local lab measurements without HTTP compression; production
hosting changes timing and caching. The client-rendered shell keeps the Week 4
no-JavaScript story partially true: navigation and the explanatory note still work,
but the views themselves need JavaScript, which the noscript note states plainly.
Manual screen-reader and cross-browser review remain future work, as recorded in the
previous weeks.
