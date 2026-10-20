# Frontend Week 3 verification

Verified on 20 October 2026. The webpage uses plain JavaScript and local assets.

## Logic checks
`node --test tests/logic.test.cjs` — **8 passed, 0 failed**.

1. Case-insensitive search and surrounding whitespace.
2. Combined query, topic, and saved-only criteria.
3. Deduplication and allow-listing of saved note IDs.
4. Rejection of malformed JSON and incorrect storage shapes.
5. Required and whitespace-only form values.
6. International names and all supported time options.
7. Topic, time, and field-length validation.
8. Session allocations add to the chosen time; invalid sessions are rejected.

A JavaScript syntax check also passed.

## Browser interaction groups
Playwright controlled Helium (Chromium) in an isolated profile. All 12 groups passed:

- Combined search, topic selection, and reading-list filters.
- Empty results, Show all notes, and clear-filter focus.
- Save/remove controls, counts, and persistence after a refresh.
- Focus recovery when a removed saved card becomes hidden.
- Simulated storage-write failure and recovery from corrupted saved data.
- A card link opens its guide note and focuses the summary.
- Required-field/short-goal validation and first-error focus.
- Generated plan content, time totals, and result focus.
- Draft-preserving edit and complete form reset.
- HTML-like input is displayed as literal text, with no injected image or script behavior.
- Mobile-menu opening, Escape, section-link closure, and desktop resize recovery.
- Readable cards/navigation and a working native guide with JavaScript disabled.

No browser page errors were recorded in the completed suite. Accessible topic-filter naming was made explicit during verification.

Directly opening the local HTML file also passed search and valid-plan checks. Browser-local storage for file URLs may vary; the HTTP preview is the reference for persistence.

## Responsive widths
All ten widths passed without horizontal page scrolling:

| Width px | Navigation state | Result |
| --- | --- | --- |
| 320 | Collapsed phone menu | Pass |
| 390 | Collapsed phone menu | Pass |
| 639 | Collapsed phone menu | Pass |
| 640 | Collapsed phone menu | Pass |
| 699 | Collapsed phone menu | Pass |
| 700 | Visible navigation | Pass |
| 768 | Visible navigation | Pass |
| 880 | Visible navigation | Pass |
| 1040 | Visible navigation | Pass |
| 1440 | Visible navigation | Pass |

Desktop and phone examples include the active reading-list and generated-plan states. Separate images record the expanded mobile menu, invalid form, learning shelf, and generated plan. All screenshot files are in `evidence/`.

## Reproduce and limits
See the README for running the logic and optional browser scripts. The browser suite writes results and screenshots in `evidence/` and operates on its own browser profile.

Tests use simulated viewport sizes in one Chromium engine; no physical-device, cross-browser, or formal accessibility certification is claimed. The form is an in-page tool, not a server submission. Reloading clears the generated plan by design; the saved list persists only when browser storage permits it.
