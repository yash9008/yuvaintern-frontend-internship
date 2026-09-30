# Week 1 validation

Local browser: Helium (Chromium-based), automated through Playwright in a fresh headless profile.

| Viewport width | Document width | Learning cards | Result |
| --- | --- | --- | --- |
| 1440 px | 1440 px | Three columns | Pass |
| 768 px | 768 px | Three columns | Pass |
| 390 px | 390 px | One column | Pass |
| 320 px | 320 px | One column | Pass |

- All internal anchor links have existing targets.
- One h1 is present.
- First Tab focuses the skip link.
- The Explore the tracks link reaches #tracks.
- Desktop and phone screenshots were visually inspected.
- A narrow-screen illustration clipping issue was corrected and the checks repeated.

Limitations: simulated viewport tests in one browser engine; no physical-device or multi-browser test claim. This is a static concept page, without enrollment, data storage, or JavaScript.
