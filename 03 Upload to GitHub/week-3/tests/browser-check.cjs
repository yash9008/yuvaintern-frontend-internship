/* Optional browser QA. The webpage itself does not need Playwright or Node. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.LAUNCHPAD_PLAYWRIGHT || 'playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.LAUNCHPAD_BROWSER ? { executablePath: process.env.LAUNCHPAD_BROWSER } : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const base = process.env.LAUNCHPAD_BASE_URL || 'http://127.0.0.1:8024/';
  const evidence = path.resolve(__dirname, '../evidence');
  fs.mkdirSync(evidence, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const visibleCards = () => page.locator('.note-card:visible');
  const widthChecks = [];
  for (const width of [320, 390, 639, 640, 699, 700, 768, 880, 1040, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await page.locator('#library-tools').waitFor({ state: 'visible' });
    const result = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, images: [...document.images].every(i => i.complete && i.naturalWidth > 0) }));
    assert.equal(result.scrollWidth, width, `Overflow at ${width}`);
    assert.equal(await page.locator('#menu-toggle').isVisible(), width < 700);
    assert.equal(await page.locator('#main-nav').isVisible(), width >= 700);
    widthChecks.push({ width, result: 'pass' });
  }
  assert.equal(await visibleCards().count(), 3);
  await page.getByLabel('Find a note').fill(' FLEXIBLE ');
  assert.equal(await visibleCards().count(), 1);
  await page.getByLabel('Topic', { exact: true }).selectOption('images');
  await page.locator('#no-results').waitFor({ state: 'visible' });
  assert.equal(await visibleCards().count(), 0);
  await page.getByRole('button', { name: 'Show all notes' }).click();
  assert.equal(await visibleCards().count(), 3);
  assert.equal(await page.locator(':focus').getAttribute('id'), 'note-search');
  await page.getByRole('button', { name: 'Save layout note', exact: true }).click();
  await page.getByRole('button', { name: 'Save imagery note', exact: true }).click();
  assert.equal(await page.locator('#saved-count').textContent(), '2');
  await page.getByLabel('My reading list', { exact: false }).check();
  assert.equal(await visibleCards().count(), 2);
  await page.getByRole('button', { name: 'Remove layout note from list', exact: true }).click();
  assert.equal(await visibleCards().count(), 1);
  assert.equal(await page.locator(':focus').getAttribute('id'), 'saved-only');
  await page.getByLabel('My reading list', { exact: false }).uncheck();
  await page.reload();
  await page.locator('#library-tools').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#saved-count').textContent(), '1');
  assert.equal(await page.getByRole('button', { name: 'Remove imagery note from list' }).getAttribute('aria-pressed'), 'true');
  // A refused write must remain usable and clearly say it was not persisted.
  await page.evaluate(() => {
    window.__originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('Simulated quota error'); };
  });
  await page.getByRole('button', { name: 'Save layout note', exact: true }).click();
  await page.getByText('Browser storage is unavailable.', { exact: false }).waitFor();
  assert.equal(await page.locator('#saved-count').textContent(), '2');
  await page.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; });
  await page.reload();
  await page.locator('#library-tools').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#saved-count').textContent(), '1');
  await page.getByRole('link', { name: 'Read the layout note' }).click();
  assert.equal(await page.locator('#guide-layout').getAttribute('open') !== null, true);
  await page.waitForFunction(() => document.activeElement === document.querySelector('#guide-layout summary'));
  // Required fields, error focus and invalid-input feedback.
  await page.getByRole('button', { name: 'Create my plan' }).click();
  assert.equal(await page.locator('[aria-invalid="true"]').count(), 4);
  assert.equal(await page.locator(':focus').getAttribute('id'), 'learner-name');
  await page.getByLabel('What should we call you?', { exact: false }).fill('Yash');
  await page.getByLabel('Your focus', { exact: false }).selectOption('layout');
  await page.getByLabel('Time available', { exact: false }).selectOption('30');
  await page.getByLabel('One thing you want to make', { exact: false }).fill('too short');
  await page.getByRole('button', { name: 'Create my plan' }).click();
  assert.equal(await page.locator(':focus').getAttribute('id'), 'plan-goal');
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator('#plan-form').screenshot({ path: path.join(evidence, 'validation.png') });
  await page.getByLabel('One thing you want to make', { exact: false }).fill('Build a gallery that stacks neatly on a phone.');
  await page.getByRole('button', { name: 'Create my plan' }).click();
  await page.locator('#plan-result').waitFor({ state: 'visible' });
  assert.equal(await page.locator(':focus').getAttribute('id'), 'plan-result');
  assert.ok((await page.locator('#result-title').textContent()).includes('Yash, your 30-minute plan'));
  const sum = (await page.locator('#result-steps li').allTextContents()).reduce((n, line) => n + parseInt(line), 0);
  assert.equal(sum, 30);
  await page.getByRole('button', { name: 'Edit my plan' }).click();
  assert.equal(await page.locator('#plan-goal').inputValue(), 'Build a gallery that stacks neatly on a phone.');
  const payload = '<img src=x onerror="window.__injected=1">';
  await page.locator('#learner-name').fill(payload);
  await page.locator('#plan-goal').fill('Test this literal text safely: ' + payload);
  await page.getByRole('button', { name: 'Create my plan' }).click();
  assert.ok((await page.locator('#result-title').textContent()).includes(payload));
  assert.equal(await page.locator('#plan-result img').count(), 0);
  assert.equal(await page.evaluate(() => window.__injected), undefined);
  await page.locator('#new-plan').click();
  assert.equal(await page.locator('#learner-name').inputValue(), '');
  assert.equal(await page.locator('#plan-goal').inputValue(), '');
  assert.equal(await page.locator('#goal-count').textContent(), '0 / 280');
  assert.equal(await page.locator('[aria-invalid="true"]').count(), 0);
  // Mobile menu handles keyboard dismissal, section navigation and resizing.
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByRole('button', { name: 'Menu', exact: false }).click();
  assert.equal(await page.locator('#main-nav').isVisible(), true);
  await page.screenshot({ path: path.join(evidence, 'mobile-menu.png') });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#main-nav').isVisible(), false);
  assert.equal(await page.locator(':focus').getAttribute('id'), 'menu-toggle');
  await page.locator('#menu-toggle').click();
  await page.getByRole('link', { name: 'Make a learning plan' }).click();
  assert.equal(await page.locator('#main-nav').isVisible(), false);
  assert.ok(page.url().endsWith('#learning-plan'));
  await page.locator('#menu-toggle').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await page.locator('#main-nav').isVisible(), true);
  assert.equal(await page.locator('#menu-toggle').isVisible(), false);
  // Capture a clean example with real saved-list and form state.
  await page.locator('#learner-name').fill('Yash');
  await page.locator('#plan-topic').selectOption('layout');
  await page.locator('#plan-minutes').selectOption('30');
  await page.locator('#plan-goal').fill('Build a responsive project gallery.');
  await page.getByRole('button', { name: 'Create my plan' }).click();
  for (const [width, name] of [[1440, 'desktop'], [390, 'mobile']]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(evidence, name + '.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
  }
  // Invalid saved data is handled without breaking the page.
  await page.evaluate(() => localStorage.setItem('launchpad.week3.reading-list.v1', 'not-json'));
  await page.reload();
  await page.getByText('Your previous reading list could not be loaded.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Save layout note', exact: true }).click();
  await page.reload();
  await page.locator('#library-tools').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#saved-count').textContent(), '1');
  // JavaScript disabled: original content and native field guide still work.
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noJs.newPage();
  await fallback.goto(base);
  assert.equal(await fallback.locator('.note-card:visible').count(), 3);
  assert.equal(await fallback.locator('#main-nav').isVisible(), true);
  assert.equal(await fallback.locator('#library-tools').isVisible(), false);
  assert.equal(await fallback.locator('#learning-plan').isVisible(), false);
  await fallback.locator('#guide-layout summary').click();
  assert.equal(await fallback.locator('#guide-layout').getAttribute('open') !== null, true);
  await noJs.close();
  assert.deepEqual(errors, []);
  const results = {
    widthChecks,
    workflows: [
      'Combined search, topic and saved-only filters', 'Empty results and clear filters',
      'Save, remove and restore reading-list items after refresh', 'Focus recovery when a saved card disappears',
      'Storage-write failure and corrupted-data recovery', 'Card link opens and focuses its field-guide note',
      'Required fields, short-goal validation and first-error focus', 'Generated plan totals and result focus',
      'Draft-preserving edit and full form reset', 'User input rendered as text instead of HTML',
      'Mobile menu, Escape, link navigation and resize', 'Readable fallback with JavaScript disabled',
    ],
    pageErrors: errors,
    verifiedDate: '2026-10-20',
    browser: 'Helium Chromium',
  };
  fs.writeFileSync(path.join(evidence, 'browser-results.json'), JSON.stringify(results, null, 2));
  console.log(`Passed ${widthChecks.length} responsive widths and ${results.workflows.length} browser workflow groups.`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
