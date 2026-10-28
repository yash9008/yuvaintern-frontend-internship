/* Week 5 logic tests: routing, URL state and carried-over journal logic. */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TOPICS, LEGACY_ANCHORS,
  parseRoute, matchRoute, parseQuery, serializeQuery,
  matchesNote, parseSaved, validatePlan, sessionSteps,
} = require('../app.js');

test('routing accepts the four application routes in any spelling', () => {
  assert.deepEqual(parseRoute('').path, '/');
  assert.equal(parseRoute('#/').path, '/');
  assert.equal(parseRoute('#/notes').path, '/notes');
  assert.equal(parseRoute('#/notes?q=x').path, '/notes');
  assert.equal(parseRoute('#/plan').path, '/plan');
  assert.equal(parseRoute('#/guide').path, '/guide');
  assert.equal(parseRoute('#/notes/?q=grid').path, '/notes/');
  assert.equal(matchRoute('/notes/').view, 'notes');
});

test('deep guide links resolve only for real topics', () => {
  assert.deepEqual(matchRoute('/guide/layout'), { view: 'guide', open: 'layout' });
  assert.deepEqual(matchRoute('/guide/images'), { view: 'guide', open: 'images' });
  assert.deepEqual(matchRoute('/guide/screens'), { view: 'guide', open: 'screens' });
  assert.equal(matchRoute('/guide/history'), null);
  assert.equal(matchRoute('/guide/Layout'), null, 'topics are case-sensitive');
});

test('unknown addresses do not match any view', () => {
  for (const path of ['/missing', '/notes/extra', '/PLAN', '/', '/planz']) {
    if (path === '/') continue;
    assert.equal(matchRoute(path), null, path);
  }
  assert.deepEqual(matchRoute('/'), { view: 'home' });
});

test('legacy Week 3 and Week 4 anchor names redirect into routes', () => {
  assert.deepEqual(parseRoute('#learning-plan'), { path: 'learning-plan', params: { q: '', topic: 'all', saved: false }, legacy: '/plan' });
  assert.deepEqual(parseRoute('#field-guide'), { path: 'field-guide', params: { q: '', topic: 'all', saved: false }, legacy: '/guide' });
  assert.deepEqual(parseRoute('#guide-images'), { path: 'guide-images', params: { q: '', topic: 'all', saved: false }, legacy: '/guide/images' });
  assert.deepEqual(parseRoute('#top'), { path: 'top', params: { q: '', topic: 'all', saved: false }, legacy: '/' });
  assert.deepEqual(parseRoute('#made-up'), { path: 'made-up', params: { q: '', topic: 'all', saved: false }, legacy: null });
  const names = new Set(Object.values(LEGACY_ANCHORS));
  assert.ok(names.has('/plan') && names.has('/guide/layout'));
  // Every mapped target must itself be a working route.
  for (const target of Object.values(LEGACY_ANCHORS)) {
    assert.ok(matchRoute(parseRoute(`#${target}`).path), `legacy target ${target} must exist`);
  }
});

test('query state survives round-trips with defaults omitted', () => {
  assert.deepEqual(parseQuery('q=flexible&topic=images&saved=1'), { q: 'flexible', topic: 'images', saved: true });
  const state = { q: 'grid', topic: 'layout', saved: false };
  assert.equal(serializeQuery(state), '?q=grid&topic=layout');
  assert.deepEqual(parseQuery(serializeQuery(state).slice(1)), { q: 'grid', topic: 'layout', saved: false });
});

test('unknown query values fall back to safe defaults', () => {
  assert.deepEqual(parseQuery('topic=injection&saved=maybe&q='), { q: '', topic: 'all', saved: false });
  assert.deepEqual(parseQuery(''), { q: '', topic: 'all', saved: false });
});

test('very long search input is truncated, not trusted', () => {
  assert.equal(parseQuery('q=' + 'x'.repeat(400)).q.length, 100);
});

test('search is case-insensitive and ignores surrounding whitespace', () => {
  const note = { id: 'layout', topic: 'layout', text: 'Give your content a flexible home. Use a grid.' };
  assert.equal(matchesNote(note, ' FLEXIBLE ', 'all', false, new Set()), true);
  assert.equal(matchesNote(note, 'image', 'all', false, new Set()), false);
});

test('search, topic and saved-only criteria combine', () => {
  const note = { id: 'layout', topic: 'layout', text: 'Give your content a flexible home. Use a grid.' };
  assert.equal(matchesNote(note, 'grid', 'layout', true, new Set(['layout'])), true);
  assert.equal(matchesNote(note, 'grid', 'images', true, new Set(['layout'])), false);
  assert.equal(matchesNote(note, 'grid', 'layout', true, new Set()), false);
});

test('saved data is restricted to known note IDs and deduplicated', () => {
  assert.deepEqual(parseSaved('["layout","unknown","layout",3,"images"]', ['layout', 'images']), ['layout', 'images']);
  assert.deepEqual(parseSaved(null, ['layout']), []);
  assert.throws(() => parseSaved('broken', ['layout']));
  assert.throws(() => parseSaved('{"layout":true}', ['layout']), /Invalid reading list/);
});

test('empty and whitespace-only fields produce all required errors', () => {
  assert.deepEqual(Object.keys(validatePlan({ name: ' ', topic: '', minutes: '', goal: '    ' })), ['name', 'topic', 'minutes', 'goal']);
});

test('valid plans accept international names and supported session times', () => {
  for (const minutes of ['15', '30', '45', '60']) {
    assert.deepEqual(validatePlan({ name: 'যশ', topic: 'layout', minutes, goal: 'Build a flexible gallery.' }), {});
  }
});

test('invalid topics, times and length limits are rejected', () => {
  const fields = validatePlan({ name: 'x'.repeat(81), topic: '__proto__', minutes: '31', goal: 'x'.repeat(281) });
  assert.deepEqual(Object.keys(fields), ['name', 'topic', 'minutes', 'goal']);
});

test('session allocations sum to the chosen total without invalid sessions', () => {
  for (const minutes of ['15', '30', '45', '60']) {
    assert.equal(sessionSteps('screens', minutes).reduce((sum, line) => sum + parseInt(line, 10), 0), Number(minutes));
  }
  assert.throws(() => sessionSteps('missing', 15));
  assert.throws(() => sessionSteps('layout', 0));
});

test('the topic table matches the notes library and form options', () => {
  assert.deepEqual([...Object.keys(TOPICS)], ['layout', 'images', 'screens']);
});
