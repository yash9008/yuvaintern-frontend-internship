# Week 2 browser validation

Tested on 14 October 2026 using Helium (Chromium) in a fresh headless profile. Viewports were simulated with Playwright.

| Width px | Document width px | Hero columns | Card columns | Result |
| --- | --- | --- | --- | --- |
| 320 | 320 | 1 | 1 | Pass |
| 375 | 375 | 1 | 1 | Pass |
| 390 | 390 | 1 | 1 | Pass |
| 639 | 639 | 1 | 1 | Pass |
| 640 | 640 | 1 | 2 | Pass |
| 768 | 768 | 1 | 2 | Pass |
| 879 | 879 | 1 | 2 | Pass |
| 880 | 880 | 2 | 2 | Pass |
| 1024 | 1024 | 2 | 2 | Pass |
| 1039 | 1039 | 2 | 2 | Pass |
| 1040 | 1040 | 2 | 3 | Pass |
| 1440 | 1440 | 2 | 3 | Pass |
| 1920 | 1920 | 2 | 3 | Pass |

Additional checks passed:
- Four local illustrations loaded at every width.
- Hero image proportions remained within rounding tolerance of the original 5:4 ratio.
- One h1 was present, and all internal section anchors had existing targets.
- The hero action reached #notes.
- The first Tab focused the skip link.
- Enter opened a native field-guide note, without phone-width overflow.
- No browser page errors were recorded.
- Desktop, tablet, and phone screenshots were visually reviewed.

Limitations: simulated widths in one Chromium-based browser. No claim of physical-device testing, multi-browser certification, or an accessibility audit.

To review manually, open index.html, resize the browser, follow the navigation links, expand each guide note, and check keyboard focus. Compare the page with the screenshots in evidence/.
