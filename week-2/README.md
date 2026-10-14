# Launchpad Journal — YuvaIntern Week 2

An independent responsive webpage for **Week 2: Implementation of Responsive Web Design**, Frontend Web Developer Intern.

## Open the project
Open `index.html` in a browser. Keep `styles.css` and the `assets/` folder beside it. No installation, internet connection, or build command is required.

## Responsive behavior
The base layout is a single column. Media queries introduce two card columns at 640px, a split hero and field guide at 880px, and three card columns plus four practice columns at 1040px. Fluid typography and spacing use `clamp()`. Grid, Flexbox, `minmax()`, relative container widths, and proportional SVG images keep the page flexible.

Navigation stays visible and wraps. The field guide uses native HTML `details` and `summary` controls without JavaScript.

## Files
- `index.html` — semantic webpage
- `styles.css` — mobile-first styles and media queries
- `assets/` — four original local SVG illustrations
- `REPORT.md` — technical documentation
- `Week-2-Report.docx` — report to upload to the YuvaIntern form
- `description.txt` — 257-word description to paste into the form
- `TESTING.md` — thirteen viewport checks and verification limits
- `evidence/` — desktop, tablet, and phone screenshots

## Validation
Thirteen widths from 320px to 1920px were checked in Helium (Chromium), including both sides of each breakpoint. All checks passed for expected columns, loaded images, internal targets, hero image proportions, and no horizontal overflow. Keyboard checks covered the skip link and native guide. Screenshots were reviewed at desktop, tablet, and phone sizes. Details and limitations are recorded in `TESTING.md`.

## Internship scope
Only the Week 2 frontend assignment is included. This is a student learning concept with HTML and CSS; it has no course enrollment, accounts, or backend.
