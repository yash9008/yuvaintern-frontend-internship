const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesNote, parseSaved, validatePlan, sessionSteps } = require('../script.js');
const note = { id: 'layout', topic: 'layout', text: 'Give your content a flexible home. Use a grid.' };

test('search is case-insensitive and ignores surrounding whitespace', () => {
  assert.equal(matchesNote(note, ' FLEXIBLE ', 'all', false, new Set()), true);
  assert.equal(matchesNote(note, 'image', 'all', false, new Set()), false);
});
test('search, topic and saved-only criteria combine', () => {
  assert.equal(matchesNote(note, 'grid', 'layout', true, new Set(['layout'])), true);
  assert.equal(matchesNote(note, 'grid', 'images', true, new Set(['layout'])), false);
  assert.equal(matchesNote(note, 'grid', 'layout', true, new Set()), false);
});
test('saved data is restricted to known note IDs and deduplicated', () => {
  assert.deepEqual(parseSaved('["layout","unknown","layout",3,"images"]', ['layout', 'images']), ['layout', 'images']);
  assert.deepEqual(parseSaved(null, ['layout']), []);
});
test('malformed and incorrect storage shapes are rejected', () => {
  assert.throws(() => parseSaved('broken', ['layout']));
  assert.throws(() => parseSaved('{"layout":true}', ['layout']), /Invalid reading list/);
});
test('empty and whitespace-only fields produce all required errors', () => {
  assert.deepEqual(Object.keys(validatePlan({ name: ' ', topic: '', minutes: '', goal: '    ' })), ['name', 'topic', 'minutes', 'goal']);
});
test('valid plans accept international names and supported session times', () => {
  for (const minutes of ['15', '30', '45', '60']) {
    assert.deepEqual(validatePlan({ name: 'यश', topic: 'layout', minutes, goal: 'Build a flexible gallery.' }), {});
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
