# Launchpad Journal — Frontend Week 4

**YuvaIntern Frontend Web Developer Intern**  
**Task: Enhancing Web Page Performance and Accessibility**

Week 4 improves the existing Week 3 journal. It preserves the page design, search and filters, reading list, field guide, and learning-plan generator. It adds a reproducible minification build, smaller SVGs, image-loading priorities, stable initial mobile navigation, and improved keyboard, contrast, and text-resizing behavior.

## Open the page

Open `index.html` directly with `styles.css`, `script.js`, and `assets/` beside it. No installation, account, framework, or backend is required. For consistent browser-local storage, start a server **inside this week-4 folder**:

```sh
python3 -m http.server 8024
```

Open <http://127.0.0.1:8024/>. The reading list uses browser-local storage; a generated learning plan disappears after reload. No form content is sent to a server. Core articles, navigation, the skip link, and native expandable guide work with JavaScript disabled.

## What changed

- CSS and JavaScript are minified for delivery. Readable originals are under `src/`.
- SVGs are optimized while retaining their responsive viewBox and external HTML alt text.
- The hero image is eager-loaded with high fetch priority; card images stay lazy-loaded and decode asynchronously.
- A small head script establishes the enhanced header before paint, removing the observed mobile navigation shift. The main script is deferred.
- Search caches button references and avoids rebuilding save-button contents on every keystroke.
- A labelled search landmark, named form, stronger input borders and placeholders, and one shared focus rule improve navigation and control visibility.
- Fragment links focus their destination. Menu links, Escape, and breakpoint changes manage focus predictably.
- Reduced motion, forced colors, and text reflow are supported. The original storage key remains compatible at the same origin.

## Verified results

The HTML, CSS, JavaScript and five SVGs total **39,323 bytes**, compared with **44,927 bytes** for Week 3: a **12.5% reduction** in uncompressed page-file size. This excludes documentation, test assets, dependencies, headers, and compression.

Three local mobile Lighthouse runs per version retained 100 in performance, accessibility, best practices and SEO. Median First Contentful Paint changed from 0.902 s to 0.752 s, Largest Contentful Paint from 1.127 s to 0.977 s, and Cumulative Layout Shift from 0.059 to 0.000. These are local lab results, not field guarantees. The baseline already scored 100; no score increase is claimed.

Eight logic tests, twelve workflow groups, ten viewport widths, and ten additional accessibility/performance checks passed. Axe found zero violations in tested states; the expanded-menu scan includes one manual color-contrast review item for its decorative icon. See `TESTING.md` and the raw evidence for scope and limits.

## Optional build and QA

The webpage needs none of the following tools to run. They are development-only dependencies pinned in the lockfile. Use Node **22.19+**:

```sh
npm ci
npm run build
npm test
npx playwright install chromium
```

Keep the HTTP server running in another terminal, then:

```sh
npm run test:browser
npm run test:a11y
npm run audit
```

The default QA URL is `http://127.0.0.1:8024/`. To choose another URL, set `LAUNCHPAD_BASE_URL`, including a trailing slash. Set `LAUNCHPAD_BROWSER` to a Chromium executable to use an existing installation; the recorded runs used Helium on macOS. All tests use isolated browser profiles. Lighthouse runs both the preserved baseline fixture and the completed page three times and replaces the evidence reports with new results. Axe is injected only by the QA tools, never loaded by the application.

`npm run build` regenerates root `styles.css`, `script.js`, and `assets/*.svg` from `src/`. Edit the readable source and rebuild rather than editing generated files. HTML remains readable and is edited directly. No critical CSS is duplicated inline, and no hosting-specific cache policy is assumed.

## Submission files

- `Week-4-Report.docx`: portal upload report, identical to the numbered report outside this folder.
- `REPORT.md`: complete Markdown report with measurements, decisions, and references.
- `description.txt`: 272-word portal description.
- `TESTING.md`: completed checks and limitations.
- `evidence/`: raw Lighthouse/axe JSON, summaries, file byte counts/hashes, and screenshots.
- `tests/fixtures/week-3/`: unchanged baseline runtime source for comparison.

The containing Week 4 folder has numbered report, description, GitHub upload and submission-step items matching earlier weeks. Upload this **week-4** directory to the repository root. Exclude `node_modules` if you install tools later. This package does not confirm GitHub upload, portal submission, or internship acceptance.
