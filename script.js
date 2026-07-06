(() => {
  const manifest = window.CARD_MANIFEST;
  const cards = manifest.cards;
  const categories = manifest.categories;
  const storageKey = 'truthOrDrinkState:v2';

  const categoryDescriptions = {
    'happy-hour': 'Easy warm-up prompts.',
    'on-the-rocks': 'Personal, but still playable.',
    'last-call': 'Deeper late-game questions.',
    'extra-dirty': 'Explicit adult prompts. NSFW.'
  };

  const els = {
    setupPanel: document.getElementById('setupPanel'),
    gamePanel: document.getElementById('gamePanel'),
    addPlayerForm: document.getElementById('addPlayerForm'),
    playerNameInput: document.getElementById('playerNameInput'),
    setupPlayers: document.getElementById('setupPlayers'),
    startGameBtn: document.getElementById('startGameBtn'),
    clearPlayersBtn: document.getElementById('clearPlayersBtn'),
    setupStatus: document.getElementById('setupStatus'),
    playerCount: document.getElementById('playerCount'),
    currentPlayerName: document.getElementById('currentPlayerName'),
    turnStatus: document.getElementById('turnStatus'),
    newGameBtn: document.getElementById('newGameBtn'),
    scoreboardRows: document.getElementById('scoreboardRows'),

    categoryControls: document.getElementById('categoryControls'),
    drawBtn: document.getElementById('drawBtn'),
    resetBtn: document.getElementById('resetBtn'),
    selectAllBtn: document.getElementById('selectAllBtn'),
    clearCatsBtn: document.getElementById('clearCatsBtn'),
    statusLine: document.getElementById('statusLine'),
    cardStage: document.getElementById('cardStage'),
    questionText: document.getElementById('questionText'),
    currentLabels: document.getElementById('currentLabels'),
    cardActionPanel: document.getElementById('cardActionPanel'),
    cardActionTitle: document.getElementById('cardActionTitle'),
    cardActionHint: document.getElementById('cardActionHint'),
    awardButtons: document.getElementById('awardButtons'),
    noPointBtn: document.getElementById('noPointBtn'),

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
    players: [],
    scores: {},
    gameStarted: false,
    turnIndex: 0,
    lastActionMessage: '',
  };

  let state = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved) return structuredCloneSafe(defaultState);

      const players = Array.isArray(saved.players) ? saved.players.filter(isValidPlayer) : [];
      const scores = typeof saved.scores === 'object' && saved.scores ? saved.scores : {};
      const selectedCategories = Array.isArray(saved.selectedCategories)
        ? saved.selectedCategories.filter(slug => categories.some(cat => cat.slug === slug))
        : defaultState.selectedCategories;

      const nextState = {
        ...structuredCloneSafe(defaultState),
        ...saved,
        selectedCategories,
        discardIds: Array.isArray(saved.discardIds) ? saved.discardIds : [],
        players,
        scores,
        turnIndex: Number.isInteger(saved.turnIndex) ? saved.turnIndex : 0,
      };

      if (nextState.players.length < 2) nextState.gameStarted = false;
      nextState.turnIndex = normalizeTurnIndex(nextState.turnIndex, nextState.players.length);
      nextState.scores = normalizeScores(nextState.players, nextState.scores);
      return nextState;
    } catch {
      return structuredCloneSafe(defaultState);
    }
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function isValidPlayer(player) {
    return player && typeof player.id === 'string' && typeof player.name === 'string' && player.name.trim();
  }

  function normalizeScores(players, scores) {
    const next = {};
    for (const player of players) {
      const raw = Number(scores[player.id]);
      next[player.id] = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    }
    return next;
  }

  function normalizeTurnIndex(index, playerCount) {
    if (playerCount <= 0) return 0;
    return ((index % playerCount) + playerCount) % playerCount;
  }

  function makePlayerId() {
    return `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function byId(id) {
    return cards.find(card => card.id === id);
  }

  function categoryBySlug(slug) {
    return categories.find(cat => cat.slug === slug);
  }

  function currentPlayer() {
    if (!state.gameStarted || state.players.length === 0) return null;
    return state.players[normalizeTurnIndex(state.turnIndex, state.players.length)];
  }

  function selectedCards() {
    const selected = new Set(state.selectedCategories);
    return cards.filter(card => selected.has(card.groupSlug));
  }

  function availableCards() {
    const discarded = new Set(state.discardIds);
    return selectedCards().filter(card => !discarded.has(card.id));
  }

  function addPlayer(name) {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (!cleanName) return false;
    state.players.push({ id: makePlayerId(), name: cleanName });
    state.scores = normalizeScores(state.players, state.scores);
    state.lastActionMessage = '';
    saveState();
    update();
    return true;
  }

  function removePlayer(id) {
    const index = state.players.findIndex(player => player.id === id);
    if (index === -1) return;
    state.players = state.players.filter(player => player.id !== id);
    delete state.scores[id];
    if (index < state.turnIndex) state.turnIndex -= 1;
    if (state.players.length < 2) state.gameStarted = false;
    state.turnIndex = normalizeTurnIndex(state.turnIndex, state.players.length);
    state.scores = normalizeScores(state.players, state.scores);
    state.currentId = null;
    state.lastActionMessage = '';
    saveState();
    update();
  }

  function clearPlayers() {
    state.players = [];
    state.scores = {};
    state.gameStarted = false;
    state.turnIndex = 0;
    state.currentId = null;
    state.discardIds = [];
    state.lastActionMessage = '';
    saveState();
    update();
  }

  function startGame() {
    const pendingName = els.playerNameInput.value.trim();
    if (pendingName) {
      addPlayer(pendingName);
      els.playerNameInput.value = '';
    }
    if (state.players.length < 2) {
      state.lastActionMessage = 'Add at least two players to begin.';
      saveState();
      update();
      return;
    }
    state.gameStarted = true;
    state.currentId = null;
    state.turnIndex = normalizeTurnIndex(state.turnIndex, state.players.length);
    state.scores = normalizeScores(state.players, state.scores);
    state.lastActionMessage = `${currentPlayer()?.name || 'First player'} starts.`;
    saveState();
    update();
  }

  function newGame() {
    state.gameStarted = false;
    state.currentId = null;
    state.discardIds = [];
    state.turnIndex = 0;
    state.scores = normalizeScores(state.players, {});
    state.lastActionMessage = 'Ready for a new game. Edit players or begin again.';
    saveState();
    update();
  }

  function advanceTurn() {
    state.turnIndex = normalizeTurnIndex(state.turnIndex + 1, state.players.length);
  }

  function drawCard() {
    if (!state.gameStarted) {
      state.lastActionMessage = 'Add players and begin the game first.';
      update();
      return;
    }
    if (state.currentId) {
      state.lastActionMessage = 'Award or skip the current card before drawing again.';
      update();
      return;
    }
    const pool = availableCards();
    if (pool.length === 0) {
      state.lastActionMessage = state.selectedCategories.length === 0
        ? 'Select at least one category first.'
        : 'No cards left in the selected categories. Reset the discard pile to reshuffle.';
      update();
      return;
    }
    const card = pool[Math.floor(Math.random() * pool.length)];
    state.currentId = card.id;
    state.discardIds = [...state.discardIds, card.id];
    state.lastActionMessage = '';
    saveState();
    update();
  }

  function awardPoint(playerId) {
    if (!state.currentId || !state.gameStarted) return;
    const winner = state.players.find(player => player.id === playerId);
    if (!winner) return;
    state.scores[winner.id] = (state.scores[winner.id] || 0) + 1;
    state.currentId = null;
    advanceTurn();
    state.lastActionMessage = `${winner.name} won the card. ${currentPlayer()?.name || 'Next player'} draws next.`;
    saveState();
    update();
  }

  function skipPoint() {
    if (!state.currentId || !state.gameStarted) return;
    state.currentId = null;
    advanceTurn();
    state.lastActionMessage = `No point awarded. ${currentPlayer()?.name || 'Next player'} draws next.`;
    saveState();
    update();
  }

  function resetDiscard() {
    state.discardIds = [];
    state.currentId = null;
    state.lastActionMessage = 'Discard pile reset. The selected cards are back in play.';
    saveState();
    update();
  }

  function renderSetup() {
    els.setupPanel.classList.toggle('hidden', state.gameStarted);
    els.gamePanel.classList.toggle('hidden', !state.gameStarted);
    els.playerCount.textContent = state.players.length;
    els.setupPlayers.innerHTML = '';

    if (state.players.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'section-note';
      empty.textContent = 'No players yet. Add names in the order you want turns to rotate.';
      els.setupPlayers.appendChild(empty);
    } else {
      state.players.forEach((player, index) => {
        const row = document.createElement('div');
        row.className = 'setup-player';

        const copy = document.createElement('div');
        const order = document.createElement('small');
        order.textContent = `Turn ${index + 1}`;
        const name = document.createElement('span');
        name.textContent = player.name;
        copy.append(order, name);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove-player';
        remove.setAttribute('aria-label', `Remove ${player.name}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => removePlayer(player.id));

        row.append(copy, remove);
        els.setupPlayers.appendChild(row);
      });
    }

    els.startGameBtn.disabled = state.players.length < 2 && !els.playerNameInput.value.trim();
    els.clearPlayersBtn.disabled = state.players.length === 0;
    els.setupStatus.textContent = state.lastActionMessage || (state.players.length < 2
      ? 'Add at least two players to begin.'
      : 'Ready. Begin when the table is set.');
  }

  function renderGamePanel() {
    const player = currentPlayer();
    els.currentPlayerName.textContent = player ? player.name : 'Player';

    if (!state.gameStarted) return;

    const card = state.currentId ? byId(state.currentId) : null;
    if (card) {
      els.turnStatus.textContent = turnInstruction(card);
    } else {
      els.turnStatus.textContent = state.lastActionMessage || `${player?.name || 'Current player'} draws next.`;
    }

    els.scoreboardRows.innerHTML = '';
    const ranked = [...state.players].sort((a, b) => {
      const pointDiff = (state.scores[b.id] || 0) - (state.scores[a.id] || 0);
      if (pointDiff !== 0) return pointDiff;
      return state.players.indexOf(a) - state.players.indexOf(b);
    });

    ranked.forEach((player, index) => {
      const row = document.createElement('div');
      row.className = `score-row${currentPlayer()?.id === player.id ? ' current' : ''}`;

      const rank = document.createElement('span');
      rank.className = 'score-rank';
      rank.textContent = index + 1;

      const name = document.createElement('span');
      name.className = 'score-name';
      name.textContent = player.name;

      const points = document.createElement('span');
      points.className = 'score-points';
      points.textContent = state.scores[player.id] || 0;

      row.append(rank, name, points);
      els.scoreboardRows.appendChild(row);
    });
  }

  function renderCategories() {
    els.categoryControls.innerHTML = '';
    for (const cat of categories) {
      const label = document.createElement('label');
      label.className = 'category-option';
      label.style.setProperty('--cat-color', cat.color);
      label.innerHTML = `
        <input type="checkbox" value="${escapeHtml(cat.slug)}" ${state.selectedCategories.includes(cat.slug) ? 'checked' : ''} />
        <span class="category-copy">
          <span class="category-name">${escapeHtml(cat.name)}</span>
          <span class="category-count">${cat.count} cards</span>
          <span class="category-description">${escapeHtml(categoryDescriptions[cat.slug] || '')}</span>
        </span>
      `;
      label.querySelector('input').addEventListener('change', (event) => {
        const slug = event.target.value;
        if (event.target.checked) {
          state.selectedCategories = Array.from(new Set([...state.selectedCategories, slug]));
        } else {
          state.selectedCategories = state.selectedCategories.filter(item => item !== slug);
        }
        state.lastActionMessage = '';
        saveState();
        update();
      });
      els.categoryControls.appendChild(label);
    }
  }

  function renderCurrent() {
    const card = state.currentId ? byId(state.currentId) : null;
    els.currentLabels.innerHTML = '';
    els.awardButtons.innerHTML = '';

    if (!card) {
      els.cardStage.className = 'card-stage empty-state';
      els.cardStage.innerHTML = `<p>${state.gameStarted ? `${escapeHtml(currentPlayer()?.name || 'Current player')} is up. Draw a card.` : 'Add players, choose categories, then draw.'}</p>`;
      els.questionText.textContent = '';
      els.cardActionPanel.classList.add('hidden');
      return;
    }

    const cat = categoryBySlug(card.groupSlug);
    els.cardStage.className = 'card-stage';
    els.cardStage.innerHTML = `<img src="${card.image}" alt="${escapeHtml(card.group)} card: ${escapeHtml(card.question)}" />`;
    els.questionText.textContent = card.question;

    const groupPill = document.createElement('span');
    groupPill.className = 'pill';
    groupPill.style.setProperty('--cat-color', cat?.color || '#b58b5d');
    groupPill.textContent = card.group;

    const typePill = document.createElement('span');
    typePill.className = 'pill';
    typePill.textContent = card.type;
    els.currentLabels.append(groupPill, typePill);

    els.cardActionPanel.classList.toggle('hidden', !state.gameStarted);
    els.cardActionTitle.textContent = `${card.type}: award the card`;
    els.cardActionHint.textContent = turnInstruction(card);

    for (const player of state.players) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'award-button';
      button.textContent = player.name;
      button.addEventListener('click', () => awardPoint(player.id));
      els.awardButtons.appendChild(button);
    }
  }

  function turnInstruction(card) {
    const asker = currentPlayer()?.name || 'The current player';
    if (!card) return `${asker} draws next.`;
    switch (card.type) {
      case 'Straight Up':
        return `${asker} asks one player. Award the point to the person who answers, or skip if nobody gets it.`;
      case 'Make It a Double':
        return `${asker} asks two players. Award the point to the better answer.`;
      case "This Round's On Me":
        return `${asker} asks the table. Award the point to the favorite answer.`;
      default:
        return `${asker} asks the card. Award the point to the winning answer.`;
    }
  }

  function renderDiscard() {
    const ids = [...state.discardIds].reverse();
    els.discardGrid.innerHTML = '';
    for (const id of ids) {
      const card = byId(id);
      if (!card) continue;
      const item = document.createElement('div');
      item.className = 'discard-item';

      const img = document.createElement('img');
      img.src = card.image;
      img.alt = 'Discarded card';
      img.loading = 'lazy';

      const label = document.createElement('span');
      label.textContent = `${card.group} · ${card.type} — ${card.question}`;

      item.append(img, label);
      els.discardGrid.appendChild(item);
    }
    els.discardPanel.classList.toggle('collapsed', state.discardHidden);
    els.hideDiscardBtn.textContent = state.discardHidden ? 'Show' : 'Hide';
  }

  function updateStats() {
    const selected = selectedCards().length;
    const available = availableCards().length;
    const hasCurrentCard = Boolean(state.currentId);

    els.selectedCount.textContent = selected;
    els.availableCount.textContent = available;
    els.discardCount.textContent = state.discardIds.length;

    els.drawBtn.disabled = !state.gameStarted || hasCurrentCard || state.selectedCategories.length === 0 || available === 0;
    els.resetBtn.disabled = state.discardIds.length === 0;

    const player = currentPlayer();
    els.drawBtn.textContent = state.gameStarted && player ? `Draw for ${player.name}` : 'Draw card';

    if (!state.gameStarted) {
      els.statusLine.textContent = state.lastActionMessage || 'Add players and begin the game first.';
    } else if (hasCurrentCard) {
      els.statusLine.textContent = 'Award or skip this card to move to the next turn.';
    } else if (state.selectedCategories.length === 0) {
      els.statusLine.textContent = 'No categories selected.';
    } else if (available === 0) {
      els.statusLine.textContent = 'Selected categories are exhausted. Reset the discard pile to draw again.';
    } else {
      els.statusLine.textContent = state.lastActionMessage || `${available} card${available === 1 ? '' : 's'} available. ${player?.name || 'Current player'} draws next.`;
    }
  }

  function update() {
    state.turnIndex = normalizeTurnIndex(state.turnIndex, state.players.length);
    state.scores = normalizeScores(state.players, state.scores);
    renderSetup();
    renderGamePanel();
    renderCurrent();
    renderDiscard();
    updateStats();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function setupModals() {
    document.querySelectorAll('[data-open-modal]').forEach(button => {
      button.addEventListener('click', () => {
        const dialog = document.getElementById(button.dataset.openModal);
        if (!dialog) return;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach(button => {
      button.addEventListener('click', () => button.closest('dialog')?.close());
    });

    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  els.addPlayerForm.addEventListener('submit', event => {
    event.preventDefault();
    if (addPlayer(els.playerNameInput.value)) els.playerNameInput.value = '';
  });

  els.playerNameInput.addEventListener('input', renderSetup);
  els.startGameBtn.addEventListener('click', startGame);
  els.clearPlayersBtn.addEventListener('click', clearPlayers);
  els.newGameBtn.addEventListener('click', newGame);
  els.drawBtn.addEventListener('click', drawCard);
  els.resetBtn.addEventListener('click', resetDiscard);
  els.noPointBtn.addEventListener('click', skipPoint);

  els.selectAllBtn.addEventListener('click', () => {
    state.selectedCategories = categories.map(c => c.slug);
    state.lastActionMessage = '';
    saveState();
    renderCategories();
    update();
  });

  els.clearCatsBtn.addEventListener('click', () => {
    state.selectedCategories = [];
    state.lastActionMessage = '';
    saveState();
    renderCategories();
    update();
  });

  els.hideDiscardBtn.addEventListener('click', () => {
    state.discardHidden = !state.discardHidden;
    saveState();
    renderDiscard();
  });

  window.addEventListener('keydown', event => {
    const tag = document.activeElement?.tagName;
    const modalOpen = Boolean(document.querySelector('dialog[open]'));
    if (modalOpen || ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      drawCard();
    }
  });

  setupModals();
  renderCategories();
  update();
})();
