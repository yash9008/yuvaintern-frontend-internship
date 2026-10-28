/* Launchpad Journal Week 5 — a small single-page application simulation.
   Plain JavaScript only: hash-based routing on top of the browser history API,
   one persistent shell with routed views, URL state, dynamic content loading,
   and focus + scroll management. No frameworks and no network requests. */
(() => {
  'use strict';

  /* ===== 1. Pure application logic, shared with the Node test runner. ===== */

  const TOPICS = Object.freeze({
    layout: 'Flexible layouts',
    images: 'Fluid images',
    screens: 'Responsive design',
  });
  const ALLOWED_MINUTES = ['15', '30', '45', '60'];
  // Same key as Weeks 3 and 4 so an existing reading list keeps working.
  const STORAGE_KEY = 'launchpad.week3.reading-list.v1';
  const SEARCH_LIMIT = 100;

  // Names used by the Week 3 and Week 4 pages still resolve to their new views.
  const LEGACY_ANCHORS = Object.freeze({
    'top': '/',
    'notes': '/notes',
    'field-guide': '/guide',
    'learning-plan': '/plan',
    'guide-layout': '/guide/layout',
    'guide-images': '/guide/images',
    'guide-screens': '/guide/screens',
  });

  // "#/notes?q=grid&saved=1" -> { path, params, legacy }.
  function parseRoute(raw) {
    let value = String(raw == null ? '' : raw);
    if (value.startsWith('#')) value = value.slice(1);
    const queryIndex = value.indexOf('?');
    const query = queryIndex === -1 ? '' : value.slice(queryIndex + 1);
    const path = queryIndex === -1 ? value : value.slice(0, queryIndex);
    if (!path || path === '/') return { path: '/', params: parseQuery(query), legacy: null };
    if (!path.startsWith('/')) {
      // Old anchor names normalize to their new route; anything else is missing.
      return { path, params: parseQuery(query), legacy: Object.hasOwn(LEGACY_ANCHORS, path) ? LEGACY_ANCHORS[path] : null };
    }
    return { path, params: parseQuery(query), legacy: null };
  }

  function matchRoute(rawPath) {
    let path = String(rawPath == null ? '' : rawPath);
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    if (path === '/') return { view: 'home' };
    if (path === '/notes') return { view: 'notes' };
    if (path === '/plan') return { view: 'plan' };
    if (path === '/guide' || path === '/guide/') return { view: 'guide', open: null };
    const guide = /^\/guide\/([a-z]+)$/.exec(path);
    if (guide) return Object.hasOwn(TOPICS, guide[1]) ? { view: 'guide', open: guide[1] } : null;
    return null;
  }

  // Library filters are validated strictly: unknown values fall back to defaults.
  function parseQuery(query) {
    const params = new URLSearchParams(query || '');
    const topic = params.get('topic') || '';
    return {
      q: (params.get('q') || '').slice(0, SEARCH_LIMIT),
      topic: Object.hasOwn(TOPICS, topic) ? topic : 'all',
      saved: params.get('saved') === '1',
    };
  }

  function serializeQuery(state) {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.topic && state.topic !== 'all') params.set('topic', state.topic);
    if (state.saved) params.set('saved', '1');
    const text = params.toString();
    return text ? `?${text}` : '';
  }

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
    module.exports = {
      TOPICS, LEGACY_ANCHORS, SEARCH_LIMIT, STORAGE_KEY,
      parseRoute, matchRoute, parseQuery, serializeQuery,
      matchesNote, parseSaved, validatePlan, sessionSteps,
    };
  }
  if (typeof document === 'undefined') return;

  /* ===== 2. Small DOM helper. Every text value reaches the page via textContent. ===== */

  const byId = id => document.getElementById(id);
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else if (name === 'dataset') Object.assign(node.dataset, value);
      else if (name.startsWith('on') && typeof value === 'function') node.addEventListener(name.slice(2), value);
      else node.setAttribute(name, value === true ? '' : String(value));
    }
    for (const child of [].concat(children)) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  /* ===== 3. On-demand content files, loaded like real dynamic content. ===== */

  const DATA_FILES = { notes: 'notes-data.js', guide: 'guide-data.js' };
  const dataCache = {};

  function loadData(kind) {
    if (dataCache[kind]) return Promise.resolve(dataCache[kind]);
    if (window.LaunchpadData && window.LaunchpadData[kind]) {
      dataCache[kind] = window.LaunchpadData[kind];
      return Promise.resolve(dataCache[kind]);
    }
    return new Promise((resolve, reject) => {
      const script = el('script', { src: DATA_FILES[kind], 'data-loaded-resource': DATA_FILES[kind] });
      script.addEventListener('load', () => {
        const data = (window.LaunchpadData || {})[kind];
        if (!data || !data.length) reject(new Error(`${DATA_FILES[kind]} loaded but contained no ${kind} content.`));
        else { dataCache[kind] = data; resolve(data); }
      });
      script.addEventListener('error', () => {
        script.remove();
        reject(new Error(`${DATA_FILES[kind]} could not be loaded. Keep it beside index.html and reload the page.`));
      });
      document.head.append(script);
    });
  }

  function clearData(kind) {
    delete dataCache[kind];
  }

  /* ===== 4. Shell and shared services ===== */

  const shell = {
    root: byId('view-root'),
    main: byId('main'),
    nav: byId('main-nav'),
    menuToggle: byId('menu-toggle'),
    narrow: window.matchMedia('(max-width: 699px)'),
  };
  let firstRender = true;       // the first paint must not steal keyboard focus

  const ROUTE_DEFAULTS = {
    q: '',
    topic: 'all',
    saved: false,
  };

  // Reading-list state lives outside the views so it survives view changes.
  const readingList = {
    ids: new Set(),
    target: null,
    note(text) {
      const element = this.target || byId('storage-note');
      if (element) element.textContent = text;
    },
    load(allowedIds) {
      try {
        this.ids = new Set(parseSaved(window.localStorage.getItem(STORAGE_KEY), allowedIds));
      } catch {
        this.ids = new Set();
        this.note('Your previous reading list could not be loaded. You can start a new list for this visit.');
      }
    },
    write() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.ids]));
        this.note('Reading list saved in this browser. Your learning plan stays on this page.');
      } catch {
        this.note('Browser storage is unavailable. Your reading-list changes work for this visit, but may not survive a refresh.');
      }
    },
  };

  /* --- Router services: entries, scroll and titles --- */

  // Navigation is hash-based: every pushed link creates a real history entry,
  // so the browser back and forward buttons work like in a multi-page site.
  // State-only changes reuse history.replaceState on the current entry instead.
  function replaceViewUrl(path) {
    history.replaceState(history.state, '', `#${path}`);
  }

  function saveScrollForCurrentEntry() {
    history.replaceState({ ...(history.state || {}), scroll: window.scrollY }, '', location.href);
  }

  // Capture clicks on in-view hash links so the outgoing entry keeps its scroll.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) saveScrollForCurrentEntry();
  }, true);

  /* --- Scroll restoration for views whose content arrives asynchronously --- */

  // A restored scroll drops out only when the target is really reachable;
  // otherwise the next apply attempt (after content loads) finishes the job.
  let pendingScroll = null;
  function applyPendingScroll() {
    if (pendingScroll === null) return;
    window.scrollTo({ top: pendingScroll, left: 0, behavior: 'instant' });
    if (Math.abs(window.scrollY - pendingScroll) < 2) pendingScroll = null;
  }
  // Real user scrolling always wins over an in-flight restore.
  window.addEventListener('wheel', () => { pendingScroll = null; }, { passive: true });
  window.addEventListener('touchmove', () => { pendingScroll = null; }, { passive: true });

  /* ===== 5. Views. Each returns the element for #view-root. ===== */

  function viewTitle(text) {
    return el('h1', { class: 'view-title', id: 'view-title', tabindex: '-1' }, [text]);
  }

  function homeView() {
    const practice = [
      ['01', 'Start small', 'Arrange the content for a narrow screen first. Keep the reading order clear.'],
      ['02', 'Make it flexible', 'Use relative widths, scalable images, and a grid that can grow.'],
      ['03', 'Add room', 'Introduce more columns only when the content has enough space.'],
      ['04', 'Check the details', 'Resize the page. Look for cramped text, stretched images, and overflow.'],
    ];
    return el('div', { class: 'view', 'data-view': 'home' }, [
      el('section', { class: 'hero container', 'aria-labelledby': 'view-title' }, [
        el('div', { class: 'hero-copy' }, [
          el('p', { class: 'eyebrow' }, [el('span', { class: 'small-dot', 'aria-hidden': 'true' }), ' A LITTLE LEARNING, EVERY DAY']),
          viewTitle('Room to learn. Space to build.'),
          el('p', { class: 'hero-intro' }, 'Good ideas deserve a little room to grow. Explore practical notes on creating webpages that feel at home on every screen.'),
          el('a', { class: 'button', href: '#/notes' }, [
            el('span', { class: 'button-label', text: 'Find your next idea' }),
            el('span', { class: 'button-mark', 'aria-hidden': 'true', text: '↗' }),
          ]),
          el('p', { class: 'hero-caption' }, 'Read a note. Save an idea. Make a little plan.'),
        ]),
        el('figure', { class: 'hero-figure' }, [
          el('img', { src: 'assets/workspace.svg', width: 900, height: 720, fetchpriority: 'high', loading: 'eager', alt: 'Illustrated creative workspace with a laptop, tablet, and phone showing the same flexible webpage.' }),
          el('figcaption', {}, [el('span', { text: 'THE SAME IDEA, EVERY SCREEN' }), el('span', { 'aria-hidden': 'true', text: '01 / 03' })]),
        ]),
      ]),
      el('section', { class: 'reading-strip', 'aria-label': 'Topics covered' }, [
        el('div', { class: 'container strip-inner' }, ['Flexible grids', '✳', 'Fluid images', '✳', 'Thoughtful breakpoints']),
      ]),
      el('section', { class: 'practice-section', 'aria-label': 'A simple practice plan' }, [
        el('div', { class: 'container section' }, [
          el('div', { class: 'section-heading' }, [
            el('div', {}, [el('p', { class: 'eyebrow', text: 'MAKE IT A PRACTICE' }), el('h2', { text: 'One small route at a time.' })]),
            el('p', {}, 'The same practice steps, always a click from the navigation.'),
          ]),
          el('ol', { class: 'practice-grid' }, practice.map(([number, title, text]) => el('li', {}, [
            el('span', { class: 'step-number', text: number }),
            el('h3', { text: title }),
            el('p', { text }),
          ]))),
        ]),
      ]),
      el('aside', { class: 'project-note container', 'aria-label': 'About this project' }, [
        el('p', {}, [
          el('strong', { text: 'Built to adapt.' }),
          ' This Week 5 project restructures the Launchpad Journal into a small single-page application: routed views, browser history entries, URL state, and dynamic content loading, all in plain JavaScript. The journal is a student learning concept.',
        ]),
        el('a', { href: 'REPORT.md' }, ['Project documentation ', el('span', { 'aria-hidden': 'true', text: '↗' })]),
      ]),
    ]);
  }

  function noteCard(note) {
    return el('article', { class: 'note-card', dataset: { note: note.id, topic: note.topic } }, [
      el('img', { class: 'card-image', src: note.image, width: 720, height: 460, alt: note.alt, loading: 'lazy', decoding: 'async' }),
      el('div', { class: 'card-content' }, [
        el('p', { class: 'card-label', text: note.label }),
        el('h2', { text: note.title }),
        el('p', { text: note.intro }),
        el('a', { class: 'card-link', href: `#/guide/${note.topic}` }, [
          `Read the ${note.labelShort} note `,
          el('span', { 'aria-hidden': 'true', text: '↗' }),
        ]),
        el('button', { class: 'save-note', type: 'button', dataset: { save: note.id }, 'aria-pressed': 'false', hidden: true }, [
          el('span', { 'aria-hidden': 'true', text: '＋' }), ' Save note',
        ]),
      ]),
    ]);
  }

  function notesView(route) {
    const state = { ...ROUTE_DEFAULTS, ...route.params };
    const counter = el('p', { id: 'results-count', role: 'status', text: 'Loading notes…' });
    const storageNote = el('p', { class: 'storage-note', id: 'storage-note', role: 'status' });
    const searchInput = el('input', { id: 'note-search', type: 'search', placeholder: 'Search titles and descriptions…', autocomplete: 'off', oninput: () => onFilterChange() });
    const topicSelect = el('select', { id: 'topic-filter', 'aria-label': 'Topic', onchange: () => onFilterChange() }, [
      el('option', { value: 'all', text: 'All topics' }),
      ...Object.entries(TOPICS).map(([value, label]) => el('option', {
        value,
        text: { layout: 'Layout', images: 'Imagery', screens: 'Responsive design' }[value],
      })),
    ]);
    const savedCheckbox = el('input', { type: 'checkbox', id: 'saved-only', onchange: () => onFilterChange() });
    const savedCount = el('span', { class: 'saved-count', id: 'saved-count', text: '0' });
    const clearButton = el('button', { class: 'text-button', type: 'button', id: 'clear-filters', hidden: true, text: 'Clear filters' });
    const toolbar = el('div', { class: 'library-toolbar' }, [
      el('label', { class: 'search-field', for: 'note-search' }, [el('span', { text: 'Find a note' }), searchInput]),
      el('label', { for: 'topic-filter' }, [el('span', { text: 'Topic' }), topicSelect]),
      el('label', { class: 'saved-filter', for: 'saved-only' }, [savedCheckbox, ' My reading list ', savedCount]),
    ]);
    const feedback = el('div', { class: 'library-feedback' }, [counter, clearButton]);
    const tools = el('div', { class: 'library-tools', id: 'library-tools', role: 'search', 'aria-label': 'Learning notes', hidden: true }, [toolbar, feedback, storageNote]);
    const grid = el('div', { class: 'notes-grid', id: 'notes-grid', 'aria-live': 'polite' });
    const noResults = el('div', { class: 'no-results', id: 'no-results', hidden: true }, [
      el('span', { 'aria-hidden': 'true', text: '✳' }),
      el('h2', { text: 'No notes match this view.' }),
      el('p', { text: 'Try another search or topic, or add a note to your reading list.' }),
      el('button', { class: 'button', type: 'button', id: 'reset-search', onclick: clearFilters }, [
        el('span', { class: 'button-label', text: 'Show all notes' }),
        el('span', { class: 'button-mark', 'aria-hidden': 'true', text: '↗' }),
      ]),
    ]);
    const view = el('section', { class: 'view container section', 'data-view': 'notes', 'aria-labelledby': 'view-title' }, [
      el('div', { class: 'section-heading' }, [
        el('div', {}, [el('p', { class: 'eyebrow', text: 'THE LEARNING SHELF' }), viewTitle('Small notes. Useful ideas.')]),
        el('p', {}, 'Three foundations for a page that grows with its content.'),
      ]),
      tools,
      grid,
      noResults,
    ]);
    // Storage notices belong to this view's own status line.
    readingList.target = storageNote;

    let notes = [];
    let replaceTimer = 0;

    function clearFilters() {
      state.q = '';
      state.topic = 'all';
      state.saved = false;
      clearTimeout(replaceTimer);
      replaceViewUrl('/notes');
      renderSavedButtons();
      renderNotes();
      searchInput.focus();
    }
    function onFilterChange() {
      state.q = searchInput.value.slice(0, SEARCH_LIMIT);
      state.topic = topicSelect.value;
      state.saved = savedCheckbox.checked;
      // Typing is view state, not navigation: rewrite the entry, do not add one.
      clearTimeout(replaceTimer);
      replaceTimer = setTimeout(() => replaceViewUrl(`/notes${serializeQuery(state)}`), 250);
      renderNotes();
    }
    function renderNotes() {
      if (!notes.length) return;
      const shown = notes.filter(note => matchesNote(note, state.q, state.topic, state.saved, readingList.ids));
      for (const note of notes) note.card.hidden = !shown.includes(note);
      counter.textContent = `Showing ${shown.length} of ${notes.length} notes`;
      noResults.hidden = shown.length > 0;
      clearButton.hidden = !state.q && state.topic === 'all' && !state.saved;
    }
    function renderSavedButtons() {
      for (const note of notes) {
        const button = note.button;
        const selected = readingList.ids.has(note.id);
        button.setAttribute('aria-pressed', String(selected));
        button.setAttribute('aria-label', selected ? `Remove ${note.labelShort} note from list` : `Save ${note.labelShort} note`);
        const mark = el('span', { 'aria-hidden': 'true', text: selected ? '✓' : '＋' });
        button.replaceChildren(mark, document.createTextNode(selected ? ' Saved to list' : ' Save note'));
        button.hidden = false;
      }
      savedCount.textContent = String(readingList.ids.size);
    }
    grid.addEventListener('click', event => {
      const button = event.target.closest('[data-save]');
      if (!button) return;
      const id = button.dataset.save;
      if (readingList.ids.has(id)) readingList.ids.delete(id); else readingList.ids.add(id);
      readingList.write();
      renderSavedButtons();
      renderNotes();
      // Removing the last visible saved note must not strand keyboard focus.
      if (button.closest('.note-card')?.hidden) savedCheckbox.focus();
    });
    clearButton.addEventListener('click', clearFilters);
    noResults.querySelector('#reset-search').addEventListener('click', clearFilters);

    loadData('notes')
      .then(loadedNotes => {
        notes = loadedNotes.map(raw => {
          const card = noteCard(raw);
          return { ...raw, text: `${raw.title} ${raw.intro}`, card, button: card.querySelector('[data-save]') };
        });
        readingList.load(notes.map(note => note.id));
        // Deep links restore the active filters directly from the URL.
        searchInput.value = state.q;
        topicSelect.value = state.topic;
        savedCheckbox.checked = state.saved;
        grid.replaceChildren(...notes.map(note => note.card));
        tools.hidden = false;
        renderSavedButtons();
        renderNotes();
        // Content is tall enough now: a pending scroll restore can complete.
        applyPendingScroll();
      })
      .catch(error => {
        counter.textContent = '';
        grid.replaceChildren(el('div', { class: 'load-error', role: 'alert' }, [
          el('h1', { class: 'view-title', id: 'view-title', tabindex: '-1', text: 'The notes library could not be loaded.' }),
          el('p', { text: String(error.message || error) }),
          el('div', { class: 'form-actions' }, [
            el('button', {
              class: 'button', type: 'button',
              onclick: () => { clearData('notes'); renderCurrent(); },
            }, [el('span', { class: 'button-label', text: 'Try again' }), el('span', { class: 'button-mark', 'aria-hidden': 'true', text: '↗' })]),
            el('a', { class: 'text-button', href: '#/', text: 'Back to home' }),
          ]),
        ]));
        view.querySelector('.view-title').focus({ preventScroll: true });
      });
    return view;
  }

  function guideView(route, matched) {
    const open = matched.open || null;
    const view = el('section', {
      class: 'view container section field-guide', 'data-view': 'guide', 'aria-labelledby': 'view-title',
    }, [
      el('div', { class: 'guide-intro' }, [
        el('p', { class: 'eyebrow', text: 'KEEP THIS CLOSE' }),
        viewTitle('The responsive field guide.'),
        el('p', { text: 'Practical reminders for your next build. Expand a note to see how it works.' }),
        el('span', { class: 'guide-symbol', 'aria-hidden': 'true', text: '✳' }),
      ]),
      el('div', { class: 'guide-notes', id: 'guide-notes' }, 'Loading the guide…'),
    ]);
    loadData('guide')
      .then(loadedGuide => {
        const container = byId('guide-notes');
        if (!container) return;
        container.replaceChildren(...loadedGuide.map(entry => el('details', { id: `guide-${entry.id}` }, [
          el('summary', {}, [
            entry.marker, ' ',
            el('span', { text: entry.title }),
            el('span', { class: 'details-icon', 'aria-hidden': 'true', text: '+' }),
          ]),
          el('div', { class: 'detail-content' }, entry.paragraphs.map(text => el('p', { text }))),
        ])));
        applyPendingScroll();
        if (open) {
          const opened = byId(`guide-${open}`);
          if (opened) {
            opened.setAttribute('open', '');
            // A deep link lands on its note: cancel any pending restore so the
            // note position is not overruled by a back-to-top scroll.
            pendingScroll = null;
            opened.scrollIntoView({ block: 'start' });
            const summary = opened.querySelector('summary');
            requestAnimationFrame(() => summary.focus({ preventScroll: true }));
            return;
          }
        }
        view.querySelector('.view-title').focus({ preventScroll: true });
      })
      .catch(error => {
        const container = byId('guide-notes');
        if (!container) return;
        container.replaceChildren(el('div', { class: 'load-error', role: 'alert' }, [
          el('h1', { class: 'view-title', id: 'view-title', tabindex: '-1', text: 'The field guide could not be loaded.' }),
          el('p', { text: String(error.message || error) }),
          el('div', { class: 'form-actions' }, [
            el('button', {
              class: 'button', type: 'button',
              onclick: () => { clearData('guide'); renderCurrent(); },
            }, [el('span', { class: 'button-label', text: 'Try again' }), el('span', { class: 'button-mark', 'aria-hidden': 'true', text: '↗' })]),
            el('a', { class: 'text-button', href: '#/', text: 'Back to home' }),
          ]),
        ]));
        view.querySelector('.view-title').focus({ preventScroll: true });
      });
    return view;
  }

  function planView() {
    const workspace = el('div', { class: 'plan-workspace' });
    const view = el('section', {
      class: 'view plan-section', 'data-view': 'plan', 'aria-labelledby': 'view-title',
    }, [
      el('div', { class: 'container section plan-layout' }, [
        el('div', { class: 'plan-intro' }, [
          el('p', { class: 'eyebrow', text: 'TURN AN IDEA INTO A NEXT STEP' }),
          viewTitle('Make time for a little progress.'),
          el('p', { text: 'Choose a topic and the time you have. Get a simple plan for your next practice session.' }),
          el('p', { class: 'plan-privacy', text: 'A local planning tool: nothing is submitted to a server, and the plan is not kept after you leave this view.' }),
          el('span', { class: 'guide-symbol', 'aria-hidden': 'true', text: '✳' }),
        ]),
        workspace,
      ]),
    ]);
    const form = el('form', { id: 'plan-form', 'aria-labelledby': 'view-title', novalidate: true }, [
      el('p', { class: 'form-error-summary', id: 'form-error-summary', role: 'alert', hidden: true }),
      el('label', { for: 'learner-name' }, ['What should we call you? ', el('span', { text: 'Required' })]),
      el('input', { id: 'learner-name', name: 'learner', type: 'text', autocomplete: 'given-name', maxlength: 80, required: true, 'aria-describedby': 'name-error' }),
      el('p', { class: 'field-error', id: 'name-error', hidden: true }),
      el('div', { class: 'plan-fields' }, [
        el('div', {}, [
          el('label', { for: 'plan-topic' }, ['Your focus ', el('span', { text: 'Required' })]),
          el('select', { id: 'plan-topic', name: 'topic', required: true, 'aria-describedby': 'topic-error' }, [
            el('option', { value: '', text: 'Choose a topic' }),
            ...Object.entries(TOPICS).map(([value, text]) => el('option', { value, text })),
          ]),
          el('p', { class: 'field-error', id: 'topic-error', hidden: true }),
        ]),
        el('div', {}, [
          el('label', { for: 'plan-minutes' }, ['Time available ', el('span', { text: 'Required' })]),
          el('select', { id: 'plan-minutes', name: 'minutes', required: true, 'aria-describedby': 'minutes-error' }, [
            el('option', { value: '', text: 'Choose your time' }),
            ...ALLOWED_MINUTES.map(value => el('option', { value, text: `${value} minutes` })),
          ]),
          el('p', { class: 'field-error', id: 'minutes-error', hidden: true }),
        ]),
      ]),
      el('label', { for: 'plan-goal' }, ['One thing you want to make ', el('span', { text: 'Required' })]),
      el('textarea', {
        id: 'plan-goal', name: 'goal', rows: 3, minlength: 10, maxlength: 280,
        placeholder: 'For example, build a two-column gallery that stacks on a phone.',
        required: true, 'aria-describedby': 'goal-hint goal-error',
        oninput: () => { byId('goal-count').textContent = `${byId('plan-goal').value.length} / 280`; },
      }),
      el('div', { class: 'goal-help' }, [el('p', { id: 'goal-hint', text: 'Use 10–280 characters.' }), el('span', { id: 'goal-count', text: '0 / 280' })]),
      el('p', { class: 'field-error', id: 'goal-error', hidden: true }),
      el('div', { class: 'form-actions' }, [
        el('button', { class: 'button', type: 'submit' }, [
          el('span', { class: 'button-label', text: 'Create my plan' }), el('span', { class: 'button-mark', 'aria-hidden': 'true', text: '↗' }),
        ]),
        el('button', { class: 'text-button', type: 'reset', text: 'Start over' }),
      ]),
    ]);
    workspace.append(form);
    const fields = {
      name: [form.querySelector('#learner-name'), form.querySelector('#name-error')],
      topic: [form.querySelector('#plan-topic'), form.querySelector('#topic-error')],
      minutes: [form.querySelector('#plan-minutes'), form.querySelector('#minutes-error')],
      goal: [form.querySelector('#plan-goal'), form.querySelector('#goal-error')],
    };
    const summary = form.querySelector('#form-error-summary');
    function showErrors(errors) {
      for (const [key, [input, message]] of Object.entries(fields)) {
        const text = errors[key] || '';
        input.setAttribute('aria-invalid', String(Boolean(text)));
        message.textContent = text;
        message.hidden = !text;
      }
      const count = Object.keys(errors).length;
      summary.hidden = count === 0;
      summary.textContent = count ? `Check ${count} ${count === 1 ? 'field' : 'fields'} below, then try again.` : '';
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const input = Object.fromEntries(Object.entries(fields).map(([key, [node]]) => [key, node.value]));
      const errors = validatePlan(input);
      showErrors(errors);
      if (Object.keys(errors).length) {
        fields[Object.keys(errors)[0]][0].focus();
        return;
      }
      const result = el('section', { class: 'plan-result', id: 'plan-result', 'aria-labelledby': 'result-title', tabindex: '-1' }, [
        el('p', { class: 'eyebrow', text: 'YOUR NEXT SMALL STEP' }),
        el('h2', { id: 'result-title' }, [el('span', { class: 'result-name', text: input.name.trim() }), ', your ', el('span', { class: 'result-minutes', text: input.minutes }), '-minute plan is ready.']),
        el('p', { id: 'result-goal' }, ['Your goal: ', el('span', { class: 'result-goal-text', text: input.goal.trim() })]),
        el('ol', { id: 'result-steps' }, sessionSteps(input.topic, input.minutes).map(text => el('li', { text }))),
        el('a', { class: 'text-link', id: 'result-guide', href: `#/guide/${input.topic}` }, ['Open the ', el('span', { text: TOPICS[input.topic].toLowerCase() }), ' note ', el('span', { 'aria-hidden': 'true', text: '↗' })]),
        el('div', { class: 'form-actions' }, [
          el('button', { class: 'button', type: 'button', id: 'edit-plan', onclick: editPlan }, [
            el('span', { class: 'button-label', text: 'Edit my plan' }), el('span', { class: 'button-mark', 'aria-hidden': 'true', text: '↗' }),
          ]),
          el('button', { class: 'text-button', type: 'button', id: 'new-plan', onclick: restart, text: 'Start over' }),
        ]),
        el('p', { class: 'plan-privacy', text: 'Keep this view open while you practise. Going to another view or refreshing clears this plan.' }),
      ]);
      // The form element stays alive with its draft; only its container is hidden.
      form.hidden = true;
      form.setAttribute('aria-hidden', 'true');
      workspace.append(result);
      requestAnimationFrame(() => result.focus({ preventScroll: true }));
    });
    function editPlan() {
      byId('plan-result')?.remove();
      showErrors({});
      form.hidden = false;
      form.removeAttribute('aria-hidden');
      fields.name[0].focus();
    }
    function restart() {
      editPlan();
      form.reset();
      byId('goal-count').textContent = '0 / 280';
    }
    form.addEventListener('reset', () => {
      showErrors({});
      setTimeout(() => { const count = byId('goal-count'); if (count) count.textContent = '0 / 280'; });
    });
    return view;
  }

  function missingView(route) {
    const address = `#${String(route.path || '').slice(0, 60) || '(nothing)'}`;
    return el('section', { class: 'view container section missing-view', 'data-view': 'missing', 'aria-labelledby': 'view-title' }, [
      el('p', { class: 'eyebrow', text: 'ROUTER · 404' }),
      viewTitle('No view for this address.'),
      el('p', { class: 'missing-path' }, [
        'This application has four routes, and ',
        el('code', { text: address }),
        ' is not one of them. Direct links only open home, the learning notes, the field guide, or the learning plan.',
      ]),
      el('div', { class: 'form-actions' }, [
        el('a', { class: 'button', href: '#/' }, [
          el('span', { class: 'button-label', text: 'Go to the home view' }),
          el('span', { class: 'button-mark', 'aria-hidden': 'true', text: '↗' }),
        ]),
      ]),
    ]);
  }

  /* ===== 6. Rendering pipeline ===== */

  function renderCurrent() {
    renderRoute();
  }

  const VIEW_TITLES = {
    home: ['Home', 'Learn. Make. Repeat. Practical, accessible web-building notes.'],
    notes: ['Learning notes', 'Searchable, filterable learning notes with a saved reading list.'],
    guide: ['Field guide', 'The responsive field guide: practical reminders for your next build.'],
    plan: ['Learning plan', 'Turn an idea into a next step with a small, timed practice plan.'],
    missing: ['Page not found', 'That address has no view in this single-page application.'],
  };

  function renderRoute() {
    // Every entry of this application is hash-based, including the first one.
    // This keeps back and forward traversals same-document at the initial entry.
    if (!location.hash || location.hash === '#') history.replaceState(history.state, '', '#/');
    const route = parseRoute(location.hash);
    // A legacy Week 3/4 anchor normalizes to its new route without a new entry.
    if (route.legacy) replaceViewUrl(route.legacy);
    const resolvedPath = route.legacy ? route.legacy : route.path;
    const matched = matchRoute(resolvedPath.split('?')[0]);

    history.scrollRestoration = 'manual';

    // Each view re-registers its own storage-note target when it mounts.
    readingList.target = null;
    if (matched) shell.root.replaceChildren(VIEWS[matched.view]({ ...route, path: resolvedPath }, matched));
    else shell.root.replaceChildren(missingView(route));
    const viewId = matched ? matched.view : 'missing';

    // Titles, descriptions and the current-page indicator.
    document.title = `${VIEW_TITLES[viewId][0]} · Launchpad Journal`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', VIEW_TITLES[viewId][1]);
    for (const link of shell.nav.querySelectorAll('a[href^="#/"]')) {
      const targetRoute = matchRoute(parseRoute(link.getAttribute('href')).path);
      if (targetRoute && targetRoute.view === viewId) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    if (firstRender) {
      firstRender = false;
      // Arriving directly: no focus grab, the browser handles its own scroll.
      return;
    }
    // Restoring too early clamps: async views (notes, guide) render their
    // content after this call. The restore therefore stays pending until the
    // scroll target is reachable, and real user scrolling cancels it.
    const state = history.state || {};
    pendingScroll = typeof state.scroll === 'number' ? state.scroll : 0;
    requestAnimationFrame(applyPendingScroll);
    const heading = shell.root.querySelector('.view-title');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }
  }

  const VIEWS = { home: homeView, notes: notesView, guide: guideView, plan: planView };

  /* ===== 7. Mobile menu: same behaviour as Weeks 3 and 4, now routing between views. ===== */

  let lastFocused = document.activeElement;
  document.addEventListener('focusin', event => { lastFocused = event.target; });
  document.addEventListener('pointerdown', event => { lastFocused = event.target; });
  function setMenu(open) {
    const expanded = open && shell.narrow.matches;
    shell.menuToggle.setAttribute('aria-expanded', String(expanded));
    shell.nav.hidden = shell.narrow.matches && !expanded;
    shell.nav.classList.toggle('is-open', expanded);
  }
  function syncMenu() {
    const active = document.activeElement === document.body ? lastFocused : document.activeElement;
    shell.menuToggle.hidden = !shell.narrow.matches;
    setMenu(false);
    if (shell.narrow.matches && shell.nav.contains(active)) shell.menuToggle.focus();
    if (!shell.narrow.matches && active === shell.menuToggle) shell.nav.querySelector('a').focus();
  }
  shell.menuToggle.addEventListener('click', () => setMenu(shell.menuToggle.getAttribute('aria-expanded') !== 'true'));
  shell.nav.addEventListener('click', event => {
    if (event.target.closest('a') && shell.narrow.matches) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && shell.menuToggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      shell.menuToggle.focus();
    }
  });
  shell.narrow.addEventListener('change', syncMenu);
  syncMenu();

  /* ===== 8. Skip link: focus main without creating a new history entry. ===== */

  byId('skip-link').addEventListener('click', event => {
    event.preventDefault();
    shell.main.focus({ preventScroll: false });
  });

  /* ===== 9. Boot ===== */

  window.addEventListener('hashchange', () => {
    // Skip-link and decorative anchors never re-render the active view.
    if (location.hash === '#main' || location.hash === '') return;
    renderRoute();
  });
  renderRoute();
})();
