// Complements axe with keyboard, contrast, preference, and focus checks
// across the routed views of the Week 5 single-page application.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.LAUNCHPAD_BASE_URL || 'http://127.0.0.1:8025/';
const evidence = path.resolve(__dirname, '../evidence');
const checks = [];
const contrast = (hex1, hex2) => {
  const luminance = hex => hex.match(/[a-f\d]{2}/gi).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((a, x, i) => a + x * [.2126, .7152, .0722][i], 0);
  const a = luminance(hex1), b = luminance(hex2);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
};
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.LAUNCHPAD_BROWSER ? { executablePath: process.env.LAUNCHPAD_BROWSER } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  // 1. Skip link still works on the SPA shell and lands inside main.
  await page.goto(base, 'domcontentloaded');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('class'), 'skip-link');
  await page.screenshot({ path: path.join(evidence, 'skip-link.png') });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement.id === 'main');
  checks.push('First Tab exposes the skip link; Enter focuses the main region');

  // 2. The keyboard-operable menu routes between views in one document.
  await page.locator('#menu-toggle').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  assert.equal((await page.locator(':focus').textContent()).trim(), 'Home');
  await page.keyboard.press('Tab');
  assert.equal((await page.locator(':focus').textContent()).trim(), 'Learning notes');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement.id === 'view-title' && location.hash === '#/notes');
  assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'false', 'menu collapses');
  checks.push('Keyboard menu link closes the menu and transfers focus to the routed view heading');

  // 3. Breakpoint changes recover focus from hidden desktop links and the phone toggle.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(() => document.getElementById('menu-toggle').hidden);
  await page.locator('#main-nav a').first().focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.activeElement.id === 'menu-toggle');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(() => document.location && document.activeElement === document.querySelector('#main-nav a'));
  checks.push('Breakpoint changes recover focus from hidden desktop links and the phone toggle');

  // 4. View navigation moves the accessible name of the current page and focus.
  await page.getByRole('link', { name: 'Field guide' }).click();
  await page.locator('#guide-notes details').first().waitFor({ state: 'visible' });
  await page.keyboard.press('Tab'); // from the view heading into the first guide summary
  assert.equal(await page.locator(':focus').evaluate(el => el.tagName), 'SUMMARY');
  await page.keyboard.press('Enter'); // open the first details by keyboard
  assert.equal(await page.locator('#guide-notes details').first().getAttribute('open') !== null, true);
  checks.push('Guide details open by keyboard and reveal their content');

  // 5. Search re-filters list items without replacing save-button DOM.
  await page.getByRole('link', { name: 'Learning notes', exact: true }).click();
  await page.locator('.note-card').first().waitFor({ state: 'visible' });
  const originalButton = await page.locator('[data-save="layout"]').elementHandle();
  await page.locator('#note-search').fill('grid');
  assert.equal(await originalButton.evaluate(el => el.isConnected), true);
  await page.locator('#note-search').fill('');
  checks.push('Search does not replace save-button DOM inside the routed view');

  // 6. Reduced motion disables view transitions and page-level effects.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  assert.equal(await page.locator('#view-root [data-view]').evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.equal(await page.locator('.save-note').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  checks.push('Reduced motion disables smooth scroll, view transitions, and button transitions');

  // 7. The plan flow under reduced motion and its reveal.
  await page.getByRole('link', { name: 'Make a learning plan' }).click();
  await page.locator('#plan-form').waitFor({ state: 'visible' });
  await page.locator('#learner-name').fill('Yash');
  await page.locator('#plan-topic').selectOption('layout');
  await page.locator('#plan-minutes').selectOption('30');
  await page.locator('#plan-goal').fill('Build a responsive project gallery.');
  await page.getByRole('button', { name: 'Create my plan' }).click();
  await page.locator('#plan-result').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement?.id === 'plan-result', null, { timeout: 4000 });
  assert.equal(await page.locator('#plan-result').evaluate(el => getComputedStyle(el).animationName), 'none');
  checks.push('Reduced motion also disables the plan result reveal; focus reaches the result');

  // 8. Forced-colors preference retains a visible focus outline.
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('#edit-plan').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'new-plan');
  assert.notEqual(await page.locator('#new-plan').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  checks.push('Forced-colors preference retains a visible focus outline');
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });

  // 9. Axe scans across routed views, the invalid form, and the mobile menu.
  const scans = [];
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  async function scan(state) {
    await page.waitForTimeout(450); // let the view fade-in settle before measuring
    const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
    scans.push({ state, violations: result.violations, incomplete: result.incomplete.map(x => ({ id: x.id, targets: x.nodes.map(n => n.target) })), passes: result.passes.length });
    assert.equal(result.violations.length, 0, state + ': ' + JSON.stringify(result.violations.map(v => v.id)));
  }
  await scan('plan result');
  await page.getByRole('button', { name: 'Edit my plan' }).click();
  await scan('plan form');
  await page.locator('#learner-name').fill('');
  await page.getByRole('button', { name: 'Create my plan' }).click();
  await page.locator('#form-error-summary').waitFor({ state: 'visible' });
  await scan('invalid plan form');
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.waitForTimeout(400);
  await scan('home view');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#menu-toggle').click();
  await scan('open mobile menu over the home view');
  checks.push('Axe reports zero violations in plan result, plan form, invalid form, home, and mobile-menu states');

  // 10. At 320px and 200% root text size the routed views stay inside the viewport.
  await page.setViewportSize({ width: 320, height: 800 });
  await page.keyboard.press('Escape');
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  for (const [view, prepare] of [
    ['notes', async () => { await page.goto(base + '#/notes'); await page.locator('.note-card').first().waitFor({ state: 'visible' }); }],
    ['guide', async () => { await page.goto(base + '#/guide'); await page.locator('#guide-notes details').first().waitFor({ state: 'visible' }); await page.locator('#guide-notes details').first().locator('summary').click(); }],
    ['plan form', async () => { await page.goto(base + '#/plan'); await page.locator('#plan-form').waitFor({ state: 'visible' }); }],
    ['home', async () => { await page.goto(base + '#/'); await page.waitForTimeout(400); }],
  ]) {
    await prepare();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320, view + ' at 200% text');
  }
  checks.push('At 320px and 200% root text size, notes, expanded guide, plan form, and home have no horizontal overflow');

  // 11. Without JavaScript the shell explains itself and keeps navigation usable.
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await noJs.newPage();
  await fallback.goto(base);
  await fallback.keyboard.press('Tab');
  await fallback.keyboard.press('Enter');
  assert.equal(await fallback.locator(':focus').getAttribute('id'), 'main');
  assert.equal(await fallback.locator('#main-nav').isVisible(), true);
  assert.ok((await fallback.locator('#main noscript').textContent()).length > 40);
  checks.push('Without JavaScript the skip link focuses main and the noscript note explains the SPA shell');
  await noJs.close();

  // 12. Measured palette contrast (same tokens as Weeks 3 and 4).
  const ratios = [
    ['Body ink on paper', '#25272c', '#faf9f5', 4.5],
    ['Muted text on paper', '#61636b', '#faf9f5', 4.5],
    ['Button white on purple', '#ffffff', '#5147b7', 4.5],
    ['Input boundary on white', '#85838f', '#ffffff', 3],
    ['Error text on white', '#a43737', '#ffffff', 4.5],
  ].map(([name, a, b, min]) => ({ name, ratio: Number(contrast(a, b).toFixed(2)), minimum: min }));
  ratios.forEach(r => assert.ok(r.ratio >= r.minimum, r.name));
  checks.push('Measured text, button, error, and control-boundary colors meet their contrast thresholds');

  fs.writeFileSync(path.join(evidence, 'accessibility-results.json'), JSON.stringify({ date: '2026-10-28', checks, ratios, scans }, null, 2));
  console.log(`Passed ${checks.length} accessibility regression checks across ${scans.length} axe scans.`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1) });
