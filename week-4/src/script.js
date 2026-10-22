/* Launchpad Week 4 — plain JavaScript, with no frameworks or external requests. */
(() => {
  'use strict';

  const TOPICS = Object.freeze({
    layout: 'Flexible layouts',
    images: 'Fluid images',
    screens: 'Responsive design',
  });
  const ALLOWED_MINUTES = ['15', '30', '45', '60'];
  // Keep Week 3's key for same-origin reading-list compatibility.
  const STORAGE_KEY = 'launchpad.week3.reading-list.v1';

  // Pure helpers are also exposed to Node's built-in test runner.
  function matchesNote(note, query, topic, savedOnly, saved) {
    return (!query.trim() || note.text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
      && (topic === 'all' || note.topic === topic)
      && (!savedOnly || saved.has(note.id));
  }

  function parseSaved(raw, allowedIds) {
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid reading list');
    return [...new Set(parsed.filter(id => typeof id === 'string' && allowedIds.includes(id)))];
  }

  function validatePlan(values) {
    const errors = {};
    const name = String(values.name || '').trim();
    const goal = String(values.goal || '').trim();
    if (!name || name.length > 80) errors.name = 'Enter a name between 1 and 80 characters.';
    if (!Object.hasOwn(TOPICS, values.topic)) errors.topic = 'Choose a focus topic.';
    if (!ALLOWED_MINUTES.includes(String(values.minutes))) errors.minutes = 'Choose 15, 30, 45, or 60 minutes.';
    if (goal.length < 10 || goal.length > 280) errors.goal = 'Describe your goal using 10–280 characters.';
    return errors;
  }

  function sessionSteps(topic, minutes) {
    const total = Number(minutes);
    if (!Object.hasOwn(TOPICS, topic) || !ALLOWED_MINUTES.includes(String(minutes))) throw new Error('Invalid session');
    const reading = Math.floor(total * 0.2);
    const reflection = Math.floor(total * 0.2);
    return [
      `${reading} minutes · Read the ${TOPICS[topic].toLowerCase()} field-guide note.`,
      `${total - reading - reflection} minutes · Build one small example around your goal.`,
      `${reflection} minutes · Resize your example and write down what you learned.`,
    ];
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { matchesNote, parseSaved, validatePlan, sessionSteps };
  }
  if (typeof document === 'undefined') return;

  const byId = id => document.getElementById(id);

  // 1. A responsive menu: maintain its hidden and expanded states together.
  const menu = byId('main-nav');
  const menuToggle = byId('menu-toggle');
  const narrowScreen = window.matchMedia('(max-width: 699px)');
  // CSS may hide a focused link before the media-query change event runs.
  let lastFocused = document.activeElement;
  document.addEventListener('focusin', event => { lastFocused = event.target; });
  document.addEventListener('pointerdown', event => { lastFocused = event.target; });
  function setMenu(open) {
    menuToggle.setAttribute('aria-expanded', String(open && narrowScreen.matches));
    menu.hidden = narrowScreen.matches && !open;
    menu.classList.toggle('is-open', open && narrowScreen.matches);
  }
  function syncMenu() {
    const active = document.activeElement === document.body ? lastFocused : document.activeElement;
    menuToggle.hidden = !narrowScreen.matches;
    setMenu(false);
    if (narrowScreen.matches && menu.contains(active)) menuToggle.focus();
    if (!narrowScreen.matches && active === menuToggle) menu.querySelector('a').focus();
  }
  menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', event => {
    if (event.target.closest('a') && narrowScreen.matches) {
      setMenu(false);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuToggle.focus();
    }
  });
  narrowScreen.addEventListener('change', syncMenu);
  syncMenu();

  // 2. Search, topic filters and a persistent reading list share one render path.
  const cards = [...document.querySelectorAll('.note-card')];
  const notes = cards.map(card => ({
    id: card.dataset.note,
    topic: card.dataset.topic,
    text: `${card.querySelector('h3').textContent} ${card.querySelector('.card-content > p:not(.card-label)').textContent}`,
    card,
    button: card.querySelector('[data-save]'),
    label: card.querySelector('.card-label').textContent.split('/')[1].trim().toLowerCase(),
  }));
  const allowedIds = notes.map(note => note.id);
  let saved = new Set();
  const storageNote = byId('storage-note');
  try {
    saved = new Set(parseSaved(window.localStorage.getItem(STORAGE_KEY), allowedIds));
  } catch {
    storageNote.textContent = 'Your previous reading list could not be loaded. You can start a new list for this visit.';
  }
  const queryInput = byId('note-search');
  const topicInput = byId('topic-filter');
  const savedOnlyInput = byId('saved-only');
  function renderNotes() {
    let visible = 0;
    for (const note of notes) {
      const show = matchesNote(note, queryInput.value, topicInput.value, savedOnlyInput.checked, saved);
      note.card.hidden = !show;
      if (show) visible += 1;
    }
    const countText = `Showing ${visible} of ${notes.length} notes`;
    if (byId('results-count').textContent !== countText) byId('results-count').textContent = countText;
    byId('no-results').hidden = visible > 0;
    byId('clear-filters').hidden = !queryInput.value && topicInput.value === 'all' && !savedOnlyInput.checked;
  }
  // Update save-button DOM only when reading-list state changes, not on each search.
  function renderSaved() {
    for (const { id, button, label } of notes) {
      const selected = saved.has(id);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', selected ? `Remove ${label} note from list` : `Save ${label} note`);
      const mark = document.createElement('span');
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = selected ? '✓' : '＋';
      button.replaceChildren(mark, document.createTextNode(selected ? ' Saved to list' : ' Save note'));
      button.hidden = false;
    }
    byId('saved-count').textContent = String(saved.size);
  }
  function clearFilters() {
    queryInput.value = '';
    topicInput.value = 'all';
    savedOnlyInput.checked = false;
    renderNotes();
    queryInput.focus();
  }
  queryInput.addEventListener('input', renderNotes);
  topicInput.addEventListener('change', renderNotes);
  savedOnlyInput.addEventListener('change', renderNotes);
  byId('clear-filters').addEventListener('click', clearFilters);
  byId('reset-search').addEventListener('click', clearFilters);
  byId('notes-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-save]');
    if (!button) return;
    const id = button.dataset.save;
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved]));
      storageNote.textContent = 'Reading list saved in this browser. Your learning plan stays on this page.';
    } catch {
      storageNote.textContent = 'Browser storage is unavailable. Your reading-list changes work for this visit, but may not survive a refresh.';
    }
    renderSaved();
    renderNotes();
    if (button.closest('.note-card').hidden) savedOnlyInput.focus();
  });
  byId('library-tools').hidden = false;
  renderSaved();
  renderNotes();

  // 3. Fragment links move keyboard focus along with the visual destination.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = byId(link.getAttribute('href').slice(1));
    if (!target) return;
    let focusTarget = target;
    if (target.tagName === 'DETAILS') {
      target.open = true;
      focusTarget = target.querySelector('summary');
    } else if (target.id !== 'main') {
      focusTarget = target.querySelector('h1, h2') || target;
    }
    if (!focusTarget.matches('summary, a, button, input, select, textarea, [tabindex]')) focusTarget.tabIndex = -1;
    requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  });

  // 4. Form validation and dynamic content use textContent, never user HTML.
  const form = byId('plan-form');
  const result = byId('plan-result');
  const errorSummary = byId('form-error-summary');
  const fields = {
    name: [byId('learner-name'), byId('name-error')],
    topic: [byId('plan-topic'), byId('topic-error')],
    minutes: [byId('plan-minutes'), byId('minutes-error')],
    goal: [byId('plan-goal'), byId('goal-error')],
  };
  function values() {
    return Object.fromEntries(Object.entries(fields).map(([key, [input]]) => [key, input.value]));
  }
  function showErrors(errors) {
    for (const [key, [input, message]] of Object.entries(fields)) {
      const text = errors[key] || '';
      input.setAttribute('aria-invalid', String(Boolean(text)));
      message.textContent = text;
      message.hidden = !text;
    }
    const count = Object.keys(errors).length;
    errorSummary.hidden = count === 0;
    errorSummary.textContent = count ? `Check ${count} ${count === 1 ? 'field' : 'fields'} below, then try again.` : '';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = values();
    const errors = validatePlan(input);
    showErrors(errors);
    if (Object.keys(errors).length) {
      fields[Object.keys(errors)[0]][0].focus();
      return;
    }
    byId('result-title').textContent = `${input.name.trim()}, your ${input.minutes}-minute plan is ready.`;
    byId('result-goal').textContent = `Your goal: ${input.goal.trim()}`;
    const steps = sessionSteps(input.topic, input.minutes).map(text => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    });
    byId('result-steps').replaceChildren(...steps);
    byId('result-guide').setAttribute('href', `#guide-${input.topic}`);
    byId('result-guide').textContent = `Open the ${TOPICS[input.topic].toLowerCase()} note ↗`;
    form.hidden = true;
    result.hidden = false;
    result.focus();
  });
  function editPlan() {
    result.hidden = true;
    form.hidden = false;
    fields.name[0].focus();
  }
  form.addEventListener('reset', () => {
    showErrors({});
    byId('goal-count').textContent = '0 / 280';
    result.hidden = true;
    form.hidden = false;
    // Reset's default action runs after its event; focus does not alter values.
    fields.name[0].focus();
  });
  byId('edit-plan').addEventListener('click', editPlan);
  byId('new-plan').addEventListener('click', () => form.reset());
  fields.goal[0].addEventListener('input', () => {
    byId('goal-count').textContent = `${fields.goal[0].value.length} / 280`;
  });
  byId('learning-plan').hidden = false;
  byId('plan-nav').hidden = false;
})();
