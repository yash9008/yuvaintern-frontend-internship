# Week 1 Static Webpage Report

Yash | YuvaIntern Frontend Web Developer Intern

Task: Transforming Wireframes into Static Web Pages

## Project overview

Launchpad is a static learning hub webpage developed for Week 1 of the YuvaIntern Frontend Web Developer internship. The project translates an original desktop and mobile wireframe into a complete HTML page with a separate CSS stylesheet. It demonstrates semantic structure, visual hierarchy, consistent styling, and basic responsive behavior. The scope is limited to Week 1.

## Wireframe and layout

The original wireframe defines seven regions: a header with navigation, a two-column hero, a learning principles strip, three learning track cards, a three-step process, an about section, and a footer. The desktop page retains this order and uses a centered content area with a maximum width of 1120 pixels. On phones, the hero and repeated content blocks stack vertically. The reference concept is supplied as wireframe.svg.

## Visual design decisions

A warm neutral background reduces visual noise, while purple emphasizes the main action and key details. Dark text establishes a clear reading hierarchy. Generous section spacing separates topics, and consistent card padding keeps related content aligned. Arial and Helvetica provide readable system typography; a Georgia italic accent adds emphasis to the hero heading. The project-board illustration uses HTML and CSS shapes, so the page does not require downloaded images, fonts, or external libraries.

## HTML and CSS implementation

Semantic header, nav, main, section, article, and footer elements identify the main content regions. One h1 introduces the page, followed by h2 section headings and h3 card titles. CSS Grid controls the hero, cards, process steps, and about section. Flexbox aligns the navigation, labels, and card footers. Shared CSS variables centralize colors and repeated values. Styles are organized into defaults, navigation, hero, content, and media-query sections.

## Responsive behavior and challenges

Media queries at 960, 700, and 360 pixels adjust spacing, typography, and column structure. Below 700 pixels, the main grids become single columns, and the navigation remains visible with wrapping where needed. A challenge was keeping the decorative browser preview inside its container on narrow screens. Smaller preview typography and padding corrected the clipped illustration. Flexible card columns, wrapping skill labels, and automatic card heights prevent fixed-width content from forcing horizontal scrolling.

## Validation and results

Local Chromium-based browser checks covered viewport widths of 1440, 768, 390, and 320 pixels. At every width, the document scroll width matched the viewport, indicating no horizontal overflow. The card layout changed from three columns to one column on phones. All internal anchor targets existed; the main Explore link navigated to the tracks section. A keyboard check confirmed that the skip link receives the first Tab focus. Desktop and phone screenshots were visually reviewed. These checks use simulated viewports and do not claim physical-device or cross-browser certification.

## Outcome and deliverables

The deliverables include index.html, styles.css, the original wireframe, this Word report, a Markdown report, testing notes, and a 247-word submission description. Opening index.html locally displays the page without a build process. The learning tracks are illustrative content, and the page offers no enrollment or account service. The completed work covers only Week 1; no JavaScript, backend, or later-week functionality is included.
