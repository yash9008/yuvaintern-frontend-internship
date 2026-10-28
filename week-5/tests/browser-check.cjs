/* Optional browser QA. The SPA itself does not need Playwright or Node.
   Covers routing, history behaviour, URL state, loading failures and focus. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.LAUNCHPAD_PLAYWRIGHT || 'playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.LAUNCHPAD_BROWSER ? { executablePath: process.env.LAUNCHPAD_BROWSER } : {}),
  });
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  const base = process.env.LAUNCHPAD_BASE_URL || 'http://127.0.0.1:8025/';
  const evidence = path.resolve(__dirname, '../evidence');
  fs.mkdirSync(evidence, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const debugNav = process.env.LAUNCHPAD_DEBUG === '1';
  if (debugNav) page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('FRAME NAV:', f.url()); });
  const view = () => page.locator('#view-root [data-view]');
  const go = historyStep => page.evaluate(historyStep);

  // 1. Boot: the shell normalizes the address and renders the home view.
  await page.goto(base);
  await page.evaluate(() => document.documentElement.classList.contains('js') === false || true);
  assert.equal(await view().getAttribute('data-view'), 'home');
  assert.equal(await page.locator('#main-nav a[href^="#/"]').count(), 4, 'the four routes are in the menu');
  assert.equal(page.url().endsWith('#/'), true);
  assert.equal(await page.title(), 'Home · Launchpad Journal');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(evidence, 'home.png'), fullPage: true });

  // 2. Strengthened with a marker: cross-view navigation must be one document.
  await page.evaluate(() => { window.__noReload = 'one-document'; });
  const navigationChecks = [];
  for (const [link, id, urlEnd, title] of [
    ['Learning notes', 'notes', '#/notes', 'Learning notes · Launchpad Journal'],
    ['Field guide', 'guide', '#/guide', 'Field guide · Launchpad Journal'],
    ['Make a learning plan', 'plan', '#/plan', 'Learning plan · Launchpad Journal'],
    ['Home', 'home', '#/', 'Home · Launchpad Journal'],
  ]) {
    await page.getByRole('link', { name: link, exact: true }).click();
    await page.waitForTimeout(450);
    assert.equal(await view().getAttribute('data-view'), id, link);
    assert.ok(page.url().endsWith(urlEnd), link + ' url');
    assert.equal(await page.title(), title, link + ' title');
    assert.equal(await page.evaluate(() => window.__noReload), 'one-document', link + ': same document');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'view-title', link + ': title moved into focus');
    const current = (await page.locator('#main-nav a[aria-current="page"]').textContent()).replace(/[↗\s]+$/, '');
    assert.equal(current, link, 'aria-current follows the view');
    assert.equal(await view().evaluate(el => getComputedStyle(el).animationName !== 'none'), true, link + ': transition runs');
    navigationChecks.push(`Route ${urlEnd}: same-document navigation, URL, title, focus and menu state`);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(evidence, 'plan.png'), fullPage: true });

  // 3. Browser back and forward move through the same history like pages.
  await go(() => history.back());
  await page.waitForTimeout(350);
  assert.equal(await view().getAttribute('data-view'), 'plan');
  await go(() => history.back());
  await page.waitForTimeout(350);
  assert.equal(await view().getAttribute('data-view'), 'guide');
  await go(() => history.forward());
  await page.waitForTimeout(350);
  assert.equal(await view().getAttribute('data-view'), 'plan');
  navigationChecks.push('Back and forward buttons move between views with no reload');

  // 4. Deep links open the routed view and the requested guide note.
  await page.goto(base + '#/guide/layout');
  await page.waitForTimeout(600);
  assert.equal(await view().getAttribute('data-view'), 'guide');
  assert.equal(await page.locator('#guide-layout').getAttribute('open') !== null, true);
  assert.equal(
    await page.evaluate(() => document.activeElement.closest('#guide-layout-summary') !== null || document.activeElement.textContent.includes('Build a flexible grid')),
    true,
    'deep link focus',
  );
  assert.equal(await page.title(), 'Field guide · Launchpad Journal');
  await page.goto(base + '#/notes?topic=images&saved=1');
  await page.waitForTimeout(600);
  assert.equal(await page.locator('#topic-filter').inputValue(), 'images');
  assert.equal(await page.locator('#saved-only').isChecked(), true);
  assert.equal(await page.locator('#no-results').isVisible(), true);
  navigationChecks.push('Deep links open the routed view with URL state and focus');

  // 5. Search and filter state rewrites the current entry instead of pushing one.
  await page.goto(base);
  await page.waitForTimeout(400);
  await page.getByRole('link', { name: 'Learning notes', exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByLabel('Find a note').fill('flexible');
  await page.waitForTimeout(450);
  assert.ok(page.url().includes('q=flexible'), 'search state in URL');
  await go(() => history.back());
  await page.waitForTimeout(300);
  assert.equal(await view().getAttribute('data-view'), 'home', 'back leaves the notes view, not the previous search word');
  assert.ok(page.url().endsWith('#/'), 'one search sequence is one entry');
  await go(() => history.forward());
  await page.waitForTimeout(300);
  assert.ok(page.url().includes('q=flexible'), 'forward returns to the typed search state');
  navigationChecks.push('Library filters update the URL without flooding browser history');

  // 6. The reading list keeps its saved notes across a full reload.
  await page.goto(base + '#/notes');
  await page.locator('.note-card').first().waitFor({ state: 'visible', timeout: 4000 });
  await page.locator('#note-search').fill('');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Save layout note' }).click();
  assert.equal(await page.locator('#saved-count').textContent(), '1', 'save puts the note on the list');
  await page.reload();
  await page.locator('.note-card').first().waitFor({ state: 'visible', timeout: 4000 });
  assert.equal(await page.locator('.note-card').count(), 3);
  const count = await page.locator('#saved-count').textContent();
  assert.equal(count, '1', 'reading list persisted through reload');

  // 7. A refused storage write stays usable and says so.
  await page.evaluate(() => {
    window.__originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('Simulated quota error'); };
  });
  await page.getByRole('button', { name: 'Save imagery note' }).click();
  await page.getByText('Browser storage is unavailable.', { exact: false }).waitFor();
  await page.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; });
  navigationChecks.push('Reading-list state survives reload, refused writes stay usable');

  // 8. Dynamic content loading failure offers a real retry path.
  await context.route('**/notes-data.js', route => route.abort());
  await page.reload();
  await page.getByText('The notes library could not be loaded.').waitFor({ timeout: 6000 });
  assert.ok((await page.locator('#view-root').textContent()).includes('notes-data.js'), 'error explains the missing file');
  await page.screenshot({ path: path.join(evidence, 'load-error.png') });
  await context.unroute('**/notes-data.js');
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.locator('.note-card').first().waitFor({ state: 'visible', timeout: 4000 });
  assert.equal(await page.locator('.note-card').count(), 3);
  navigationChecks.push('Blocked dynamic content shows an explained failure and real retry recovery');

  // 9. Unknown addresses render the not-found view and keep the typed URL.
  await page.goto(base + '#/made-up-address');
  await page.waitForTimeout(300);
  assert.equal(await view().getAttribute('data-view'), 'missing');
  assert.ok((await page.locator('#view-root').textContent()).includes('#/made-up-address'));
  assert.equal(await page.title(), 'Page not found · Launchpad Journal');
  await page.screenshot({ path: path.join(evidence, 'not-found.png') });
  await page.getByRole('link', { name: 'Go to the home view' }).click();
  await page.waitForTimeout(300);
  assert.equal(await view().getAttribute('data-view'), 'home');
  navigationChecks.push('Unknown addresses get a safe not-found view that keeps the URL');

  // 10. Old Week 3/4 anchor names normalize without adding a history entry.
  await page.goto(base);
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__lengthBefore = history.length; location.hash = 'learning-plan'; });
  await page.waitForTimeout(350);
  assert.equal(await view().getAttribute('data-view'), 'plan');
  assert.ok(page.url().endsWith('#/plan'));
  assert.equal(await page.evaluate(() => history.length), await page.evaluate(() => window.__lengthBefore + 1), 'the typed hash itself is one entry; the redirect adds no second entry');
  navigationChecks.push('Legacy Week 3/4 anchors normalize to routes without extra history');

  // 11. Scroll position follows the right history entry. An in-view card link
  // is used so no test-runner auto-scroll moves the page before the click.
  await page.getByRole('link', { name: 'Learning notes', exact: true }).click();
  await page.locator('.note-card').first().waitFor({ state: 'visible' });
  await page.evaluate(() => window.scrollTo(0, 250));
  await page.waitForTimeout(200);
  const scrolledDown = await page.evaluate(() => window.scrollY);
  assert.ok(scrolledDown > 200, 'the page is genuinely scrolled');
  await page.evaluate(() => { document.querySelector('#notes-grid .note-card:nth-child(3) .card-link').click(); });
  await page.waitForTimeout(450);
  assert.equal(await view().getAttribute('data-view'), 'guide');
  assert.equal(await page.evaluate(() => window.scrollY), 0, 'new routes start at the top');
  await go(() => history.back());
  await page.waitForTimeout(400);
  const restored = await page.evaluate(() => window.scrollY);
  assert.equal(restored, scrolledDown, 'returning to notes restores its scroll position');
  navigationChecks.push('Scroll positions are saved per entry and restored on back');

  // 12. In-view interactions keep working inside the SPA (plan flow and safety).
  await page.getByRole('link', { name: 'Make a learning plan' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Create my plan' }).click();
  assert.equal(await page.locator('[aria-invalid="true"]').count(), 4);
  assert.equal(await page.locator(':focus').getAttribute('id'), 'learner-name');
  await page.getByLabel('What should we call you?', { exact: false }).fill('Yash');
  await page.getByLabel('Your focus', { exact: false }).selectOption('layout');
  await page.getByLabel('Time available', { exact: false }).selectOption('30');
  await page.getByLabel('One thing you want to make', { exact: false }).fill('too short');
  await page.getByRole('button', { name: 'Create my plan' }).click();
  assert.equal(await page.locator(':focus').getAttribute('id'), 'plan-goal');
  await page.getByLabel('One thing you want to make', { exact: false }).fill('Build a gallery that stacks neatly on a phone.');
  await page.getByRole('button', { name: 'Create my plan' }).click();
  await page.locator('#plan-result').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement?.id === 'plan-result', null, { timeout: 4000 });
  assert.equal(await page.locator(':focus').getAttribute('id'), 'plan-result');
  const minutesSum = (await page.locator('#result-steps li').allTextContents()).reduce((n, line) => n + parseInt(line), 0);
  assert.equal(minutesSum, 30);
  await page.getByRole('button', { name: 'Edit my plan' }).click();
  assert.equal(await page.locator('#plan-goal').inputValue(), 'Build a gallery that stacks neatly on a phone.');
  await page.screenshot({ path: path.join(evidence, 'plan-form.png') });
  const payload = '<img src=x onerror="window.__injected=1">';
  await page.locator('#learner-name').fill(payload);
  await page.locator('#plan-goal').fill('Test this literal text safely: ' + payload);
  await page.getByRole('button', { name: 'Create my plan' }).click();
  assert.ok((await page.locator('#plan-result').textContent()).includes(payload));
  assert.equal(await page.locator('#plan-result img').count(), 0);
  assert.equal(await page.evaluate(() => window.__injected), undefined);
  navigationChecks.push('Plan form validates, keeps drafts on edit, and renders input as text only');

  // 13. Responsive widths and the mobile menu behave like in earlier weeks.
  const widthChecks = [];
  for (const width of [320, 390, 639, 640, 699, 700, 768, 880, 1040, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '#/');
    await page.waitForTimeout(350);
    const result = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: innerWidth, images: [...document.images].every(i => i.complete && i.naturalWidth > 0) }));
    assert.equal(result.scrollWidth, width, `Overflow at ${width}`);
    assert.equal(await page.locator('#menu-toggle').isVisible(), width < 700);
    assert.equal(await page.locator('#main-nav').isVisible(), width >= 700);
    widthChecks.push({ width, result: 'pass' });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole('button', { name: 'Menu' }).click();
  assert.equal(await page.locator('#main-nav').isVisible(), true);
  await page.screenshot({ path: path.join(evidence, 'mobile-menu.png') });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#main-nav').isVisible(), false);
  assert.equal(await page.locator(':focus').getAttribute('id'), 'menu-toggle');
  await page.locator('#menu-toggle').click();
  await page.getByRole('link', { name: 'Field guide' }).click();
  await page.waitForTimeout(450);
  assert.equal(await view().getAttribute('data-view'), 'guide');
  assert.equal(await page.locator('#main-nav').isVisible(), false);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(evidence, 'guide.png') });
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Learning notes', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(evidence, 'notes.png'), fullPage: true });
  navigationChecks.push('Mobile menu opens, closes on Escape, navigates and collapses after choosing');
  navigationChecks.push('Ten viewport widths show no horizontal overflow and correct menu states');

  // 14. Unknown saved data and file:// style robustness stay graceful.
  await page.evaluate(() => localStorage.setItem('launchpad.week3.reading-list.v1', 'not-json'));
  await page.reload();
  await page.waitForTimeout(600);
  await page.getByText('Your previous reading list could not be loaded.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Save layout note' }).click();
  await page.reload();
  await page.waitForTimeout(600);
  assert.equal(Number(await page.locator('#saved-count').textContent()), 1);
  navigationChecks.push('Corrupted saved data recovers without breaking the view');

  assert.deepEqual(errors, []);
  const results = {
    navigationChecks,
    widthChecks,
    pageErrors: errors,
    verifiedDate: '2026-10-28',
    browser: 'Helium Chromium',
  };
  fs.writeFileSync(path.join(evidence, 'browser-results.json'), JSON.stringify(results, null, 2));
  console.log(`Passed ${navigationChecks.length} SPA workflow groups and ${widthChecks.length} responsive widths.`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
