# Week 2 Responsive Web Design Report

Yash | YuvaIntern Frontend Web Developer Intern | 14 October 2026

Task: Implementation of Responsive Web Design

## Project objective

Launchpad Journal is an independent responsive webpage developed for Week 2 of the YuvaIntern Frontend Web Developer internship. The completed page adapts to desktop, tablet, and smartphone viewports using HTML and CSS. It includes navigation, a hero section, illustrated learning cards, a practice plan, a field guide, and a footer. The project runs locally without installation or a build process.

## Structure and design

The HTML uses header, nav, main, section, article, figure, figcaption, aside, and footer elements to express the page hierarchy. A single h1 introduces the page, with h2 section headings and h3 card titles. The expandable field guide uses native details and summary elements. A warm neutral background, purple accent, and consistent spacing carry the Launchpad visual identity into a newly written Week 2 page.

## Responsive implementation

The stylesheet starts with a single-column layout for narrow screens. Grid controls the hero, learning cards, practice steps, and field guide. Flexbox aligns navigation and repeated content within cards. The main container combines a relative width with a 72rem maximum; clamp controls font sizes, gutters, and section spacing. Explicit media queries add columns when sufficient room is available. minmax(0, 1fr) prevents intrinsic content from widening grid tracks.

## Fluid images and navigation

Four original local SVG illustrations are included. Images use width: 100%, max-width: 100%, and height: auto to scale without distortion. Width and height attributes reserve image space; card images also use an aspect ratio. Navigation stays visible and wraps on small screens. Link targets lead to meaningful page sections. The skip link, visible focus outlines, and native guide controls support keyboard use.

## Layout changes

| Viewport | Hero | Learning cards | Practice steps |
| --- | --- | --- | --- |
| Below 640 px | 1 column | 1 column | 1 column |
| 640 to 879 px | 1 column | 2 columns | 2 columns |
| 880 to 1039 px | 2 columns | 2 columns | 2 columns |
| 1040 px and above | 2 columns | 3 columns | 4 columns |

## Validation method

Local browser checks used Helium, a Chromium-based browser, with simulated viewport widths of 320, 375, 390, 639, 640, 768, 879, 880, 1024, 1039, 1040, 1440, and 1920 pixels. Each check compared document width with viewport width, counted grid columns, verified loaded images and internal anchor targets, and checked the hero image proportions. Desktop, tablet, and phone screenshots were visually reviewed.

## Challenges and solutions

A key layout constraint was preserving readable cards as the available width changed. One, two, and three card columns at the selected breakpoints keep the content within the screen. Grid tracks use a zero minimum to avoid unwanted expansion. The navigation uses wrapping rather than a fixed width. Flexible image sizing preserves the artwork proportions, while clamp-based text and spacing prevent abrupt changes between breakpoints.

## Results and limits

All thirteen viewport checks passed with no horizontal overflow. The expected card and hero column counts were present, all four illustrations loaded, and every section link had a valid target. Keyboard testing confirmed that the skip link receives the first Tab focus and that Enter opens a guide note. The expanded note remained within the phone viewport. These results describe simulated widths in one browser engine; they do not claim physical-device or cross-browser certification.

## Deliverables and outcome

The submission includes index.html, styles.css, four SVG assets, this Word report, Markdown documentation, testing notes, screenshots, and a 257-word submission description. The project demonstrates flexible grids, fluid images, and content-driven media queries required by Week 2. Only the Week 2 frontend assignment is included. The webpage is a student learning concept without accounts or a backend.

## Visual examples

- [Desktop at 1440 pixels](evidence/desktop.png)
- [Tablet at 768 pixels](evidence/tablet.png)
- [Phone at 390 pixels](evidence/mobile.png)
