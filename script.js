(() => {
  const manifest = window.CARD_MANIFEST;
  const cards = manifest.cards;
  const categories = manifest.categories;
  const storageKey = 'cardDrawerState:v1';

  const categoryDescriptions = {
    'happy-hour': 'Warm-up prompts for an easy start.',
    'on-the-rocks': 'Personal questions with a little bite.',
    'last-call': 'Deeper prompts for close friends.',
    'extra-dirty': 'Explicit adult prompts. NSFW.'
  };

  const els = {
    categoryControls: document.getElementById('categoryControls'),
    drawBtn: document.getElementById('drawBtn'),
    resetBtn: document.getElementById('resetBtn'),
    selectAllBtn: document.getElementById('selectAllBtn'),
    clearCatsBtn: document.getElementById('clearCatsBtn'),
    statusLine: document.getElementById('statusLine'),
    cardStage: document.getElementById('cardStage'),
    questionText: document.getElementById('questionText'),
    currentLabels: document.getElementById('currentLabels'),
    selectedCount: document.getElementById('selectedCount'),
    availableCount: document.getElementById('availableCount'),
    discardCount: document.getElementById('discardCount'),
    discardGrid: document.getElementById('discardGrid'),
    hideDiscardBtn: document.getElementById('hideDiscardBtn'),
    discardPanel: document.querySelector('.discard-panel'),
  };

  const defaultState = {
    selectedCategories: categories.map(c => c.slug),
    discardIds: [],
    currentId: null,
    discardHidden: false,
  };

  let state = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved) return { ...defaultState };
      return {
        ...defaultState,
        ...saved,
        selectedCategories: Array.isArray(saved.selectedCategories) ? saved.selectedCategories : defaultState.selectedCategories,
        discardIds: Array.isArray(saved.discardIds) ? saved.discardIds : [],
      };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function byId(id) {
    return cards.find(card => card.id === id);
  }

  function categoryBySlug(slug) {
    return categories.find(cat => cat.slug === slug);
  }

  function selectedCards() {
    const selected = new Set(state.selectedCategories);
    return cards.filter(card => selected.has(card.groupSlug));
  }

  function availableCards() {
    const discarded = new Set(state.discardIds);
    return selectedCards().filter(card => !discarded.has(card.id));
  }

  function renderCategories() {
    els.categoryControls.innerHTML = '';
    for (const cat of categories) {
      const label = document.createElement('label');
      label.className = 'category-option';
      label.style.setProperty('--cat-color', cat.color);
      label.innerHTML = `
        <input type="checkbox" value="${cat.slug}" ${state.selectedCategories.includes(cat.slug) ? 'checked' : ''} />
        <span class="category-dot" aria-hidden="true"></span>
        <span class="category-copy">
          <span class="category-name">${cat.name}</span>
          <span class="category-count">${cat.count} cards</span>
          <span class="category-description">${categoryDescriptions[cat.slug] || ''}</span>
        </span>
      `;
      label.querySelector('input').addEventListener('change', (event) => {
        const slug = event.target.value;
        if (event.target.checked) {
          state.selectedCategories = Array.from(new Set([...state.selectedCategories, slug]));
        } else {
          state.selectedCategories = state.selectedCategories.filter(item => item !== slug);
        }
        saveState();
        update();
      });
      els.categoryControls.appendChild(label);
    }
  }

  function drawCard() {
    const pool = availableCards();
    if (pool.length === 0) {
      els.statusLine.textContent = state.selectedCategories.length === 0
        ? 'Select at least one category first.'
        : 'No cards left in the selected categories. Reset the discard pile to reshuffle.';
      return;
    }
    const card = pool[Math.floor(Math.random() * pool.length)];
    state.currentId = card.id;
    state.discardIds = [...state.discardIds, card.id];
    saveState();
    update();
  }

  function resetDiscard() {
    state.discardIds = [];
    state.currentId = null;
    saveState();
    update();
  }

  function renderCurrent() {
    const card = state.currentId ? byId(state.currentId) : null;
    els.currentLabels.innerHTML = '';
    if (!card) {
      els.cardStage.className = 'card-stage empty-state';
      els.cardStage.innerHTML = '<p>Select at least one category, then draw.</p>';
      els.questionText.textContent = '';
      return;
    }
    const cat = categoryBySlug(card.groupSlug);
    els.cardStage.className = 'card-stage';
    els.cardStage.innerHTML = `<img src="${card.image}" alt="${escapeHtml(card.group)} card: ${escapeHtml(card.question)}" />`;
    els.questionText.textContent = card.question;
    const groupPill = document.createElement('span');
    groupPill.className = 'pill';
    groupPill.style.setProperty('--cat-color', cat?.color || '#111');
    groupPill.textContent = card.group;
    const typePill = document.createElement('span');
    typePill.className = 'pill';
    typePill.textContent = card.type;
    els.currentLabels.append(groupPill, typePill);
  }

  function renderDiscard() {
    const ids = [...state.discardIds].reverse();
    els.discardGrid.innerHTML = '';
    for (const id of ids) {
      const card = byId(id);
      if (!card) continue;
      const item = document.createElement('div');
      item.className = 'discard-item';
      item.innerHTML = `
        <img src="${card.image}" alt="Discarded card" loading="lazy" />
        <span>${card.group} · ${card.type}</span>
      `;
      els.discardGrid.appendChild(item);
    }
    els.discardPanel.classList.toggle('collapsed', state.discardHidden);
    els.hideDiscardBtn.textContent = state.discardHidden ? 'Show' : 'Hide';
  }

  function updateStats() {
    const selected = selectedCards().length;
    const available = availableCards().length;
    els.selectedCount.textContent = selected;
    els.availableCount.textContent = available;
    els.discardCount.textContent = state.discardIds.length;
    els.drawBtn.disabled = state.selectedCategories.length === 0 || available === 0;
    els.resetBtn.disabled = state.discardIds.length === 0;

    if (state.selectedCategories.length === 0) {
      els.statusLine.textContent = 'No categories selected.';
    } else if (available === 0) {
      els.statusLine.textContent = 'Selected categories are exhausted. Reset the discard pile to draw again.';
    } else {
      els.statusLine.textContent = `${available} card${available === 1 ? '' : 's'} available from ${state.selectedCategories.length} selected categor${state.selectedCategories.length === 1 ? 'y' : 'ies'}.`;
    }
  }

  function update() {
    renderCurrent();
    renderDiscard();
    updateStats();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  els.drawBtn.addEventListener('click', drawCard);
  els.resetBtn.addEventListener('click', resetDiscard);
  els.selectAllBtn.addEventListener('click', () => {
    state.selectedCategories = categories.map(c => c.slug);
    saveState();
    renderCategories();
    update();
  });
  els.clearCatsBtn.addEventListener('click', () => {
    state.selectedCategories = [];
    saveState();
    renderCategories();
    update();
  });
  els.hideDiscardBtn.addEventListener('click', () => {
    state.discardHidden = !state.discardHidden;
    saveState();
    renderDiscard();
  });
  window.addEventListener('keydown', (event) => {
    if ((event.key === ' ' || event.key === 'Enter') && !['BUTTON', 'INPUT'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      drawCard();
    }
  });

  renderCategories();
  update();
})();
