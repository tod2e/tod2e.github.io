(() => {
  const manifest = window.CARD_MANIFEST;
  const cards = manifest.cards;
  const categories = manifest.categories;
  const storageKey = 'truthOrDrinkState:v4';

  const categoryDescriptions = {
    'happy-hour': 'Warm-up prompts for newer groups.',
    'on-the-rocks': 'Sharper questions for friends.',
    'last-call': 'Deeper late-game honesty.',
    'extra-dirty': 'Explicit adult prompts. NSFW.'
  };

  const moodPresets = {
    'happy-hour': ['happy-hour'],
    'on-the-rocks': ['happy-hour', 'on-the-rocks'],
    'last-call': ['happy-hour', 'on-the-rocks', 'last-call'],
    'extra-dirty': ['happy-hour', 'on-the-rocks', 'last-call', 'extra-dirty']
  };

  const els = {
    roundLabel: document.getElementById('roundLabel'),
    currentPlayerName: document.getElementById('currentPlayerName'),
    turnStatus: document.getElementById('turnStatus'),
    cardStage: document.getElementById('cardStage'),
    currentLabels: document.getElementById('currentLabels'),
    targetPanel: document.getElementById('targetPanel'),
    targetText: document.getElementById('targetText'),
    rerollTargetBtn: document.getElementById('rerollTargetBtn'),
    drawBtn: document.getElementById('drawBtn'),
    showTextBtn: document.getElementById('showTextBtn'),
    skipQuestionBtn: document.getElementById('skipQuestionBtn'),
    questionText: document.getElementById('questionText'),
    cardActionPanel: document.getElementById('cardActionPanel'),
    cardActionTitle: document.getElementById('cardActionTitle'),
    cardActionHint: document.getElementById('cardActionHint'),
    awardButtons: document.getElementById('awardButtons'),
    noPointBtn: document.getElementById('noPointBtn'),
    playerCountMini: document.getElementById('playerCountMini'),
    selectedCount: document.getElementById('selectedCount'),
    discardCount: document.getElementById('discardCount'),
    undoBtn: document.getElementById('undoBtn'),
    scorePanel: document.getElementById('scorePanel'),
    scoreboardRows: document.getElementById('scoreboardRows'),
    winTargetLabel: document.getElementById('winTargetLabel'),
    gameLog: document.getElementById('gameLog'),
    resetGameBtn: document.getElementById('resetGameBtn'),

    playersModal: document.getElementById('playersModal'),
    addPlayerForm: document.getElementById('addPlayerForm'),
    playerNameInput: document.getElementById('playerNameInput'),
    bulkPlayerForm: document.getElementById('bulkPlayerForm'),
    bulkPlayerInput: document.getElementById('bulkPlayerInput'),
    setupPlayers: document.getElementById('setupPlayers'),
    randomizePlayersBtn: document.getElementById('randomizePlayersBtn'),
    clearPlayersBtn: document.getElementById('clearPlayersBtn'),
    startGameBtn: document.getElementById('startGameBtn'),
    setupStatus: document.getElementById('setupStatus'),

    settingsModal: document.getElementById('settingsModal'),
    categoryControls: document.getElementById('categoryControls'),
    moodCategoryControls: document.getElementById('moodCategoryControls'),
    moodSelectionSummary: document.getElementById('moodSelectionSummary'),
    selectMoodAllBtn: document.getElementById('selectMoodAllBtn'),
    clearMoodBtn: document.getElementById('clearMoodBtn'),
    selectAllBtn: document.getElementById('selectAllBtn'),
    clearCatsBtn: document.getElementById('clearCatsBtn'),
    winningScoreInput: document.getElementById('winningScoreInput'),
    penaltyInput: document.getElementById('penaltyInput'),
    resetDiscardBtn: document.getElementById('resetDiscardBtn'),
    newRoundBtn: document.getElementById('newRoundBtn'),
    deckStatus: document.getElementById('deckStatus'),

    discardGrid: document.getElementById('discardGrid'),
    winnerModal: document.getElementById('winnerModal'),
    winnerText: document.getElementById('winnerText'),
    winnerContinueBtn: document.getElementById('winnerContinueBtn'),
    winnerResetBtn: document.getElementById('winnerResetBtn')
  };

  const defaultState = {
    selectedCategories: categories.map(c => c.slug),
    discardIds: [],
    currentId: null,
    currentTargets: [],
    questionVisible: false,
    players: [],
    scores: {},
    gameStarted: false,
    turnIndex: 0,
    roundNumber: 1,
    winningScore: 7,
    penalty: 'drink',
    log: [],
    undoStack: [],
    winnerShown: false,
    lastActionMessage: ''
  };

  let state = loadState();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved) return clone(defaultState);

      const merged = { ...clone(defaultState), ...saved };
      merged.selectedCategories = Array.isArray(saved.selectedCategories)
        ? saved.selectedCategories.filter(slug => categories.some(cat => cat.slug === slug))
        : clone(defaultState.selectedCategories);
      merged.discardIds = Array.isArray(saved.discardIds) ? saved.discardIds.filter(id => byId(id)) : [];
      merged.players = Array.isArray(saved.players) ? saved.players.filter(isValidPlayer) : [];
      merged.scores = normalizeScores(merged.players, saved.scores || {});
      merged.currentTargets = Array.isArray(saved.currentTargets) ? saved.currentTargets : [];
      merged.turnIndex = Number.isInteger(saved.turnIndex) ? saved.turnIndex : 0;
      merged.roundNumber = positiveInt(saved.roundNumber, 1);
      merged.winningScore = positiveInt(saved.winningScore, 7);
      merged.penalty = typeof saved.penalty === 'string' && saved.penalty.trim() ? saved.penalty.trim() : 'drink';
      merged.log = Array.isArray(saved.log) ? saved.log.slice(0, 20) : [];
      merged.undoStack = Array.isArray(saved.undoStack) ? saved.undoStack.slice(0, 12) : [];
      if (merged.players.length < 2) merged.gameStarted = false;
      if (merged.currentId && !byId(merged.currentId)) merged.currentId = null;
      merged.turnIndex = normalizeTurnIndex(merged.turnIndex, merged.players.length);
      return merged;
    } catch {
      return clone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function positiveInt(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
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

  function snapshot() {
    const { undoStack, ...rest } = state;
    return clone(rest);
  }

  function pushUndo(label) {
    state.undoStack = [{ label, state: snapshot() }, ...state.undoStack].slice(0, 12);
  }

  function restoreSnapshot(snap) {
    const undoStack = state.undoStack.slice(1);
    state = { ...clone(defaultState), ...clone(snap), undoStack };
    state.turnIndex = normalizeTurnIndex(state.turnIndex, state.players.length);
    state.scores = normalizeScores(state.players, state.scores);
    saveState();
    update();
  }

  function addLog(html) {
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      html,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.log = [entry, ...state.log].slice(0, 20);
  }

  function addPlayer(name) {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (!cleanName) return false;
    pushUndo('add player');
    state.players.push({ id: makePlayerId(), name: cleanName });
    state.scores = normalizeScores(state.players, state.scores);
    state.lastActionMessage = '';
    saveState();
    update();
    return true;
  }

  function addPlayersFromText(text) {
    const names = text
      .split(/[\n,;]+/)
      .map(name => name.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    const uniqueNames = names.filter((name, index) => names.indexOf(name) === index);
    if (uniqueNames.length === 0) return 0;
    pushUndo('add players');
    for (const name of uniqueNames) state.players.push({ id: makePlayerId(), name });
    state.scores = normalizeScores(state.players, state.scores);
    state.lastActionMessage = `Added ${uniqueNames.length} player${uniqueNames.length === 1 ? '' : 's'}.`;
    saveState();
    update();
    return uniqueNames.length;
  }

  function removePlayer(id) {
    const index = state.players.findIndex(player => player.id === id);
    if (index === -1) return;
    pushUndo('remove player');
    const removed = state.players[index];
    state.players = state.players.filter(player => player.id !== id);
    delete state.scores[id];
    state.currentTargets = state.currentTargets.filter(targetId => targetId !== id);
    if (index < state.turnIndex) state.turnIndex -= 1;
    if (state.players.length < 2) state.gameStarted = false;
    state.turnIndex = normalizeTurnIndex(state.turnIndex, state.players.length);
    state.scores = normalizeScores(state.players, state.scores);
    state.currentId = null;
    state.lastActionMessage = `${removed.name} removed.`;
    saveState();
    update();
  }

  function movePlayer(id, direction) {
    const index = state.players.findIndex(player => player.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= state.players.length) return;
    pushUndo('reorder players');
    const players = [...state.players];
    const [player] = players.splice(index, 1);
    players.splice(nextIndex, 0, player);
    const activePlayerId = currentPlayer()?.id;
    state.players = players;
    if (activePlayerId) state.turnIndex = Math.max(0, state.players.findIndex(p => p.id === activePlayerId));
    state.scores = normalizeScores(state.players, state.scores);
    saveState();
    update();
  }

  function randomizePlayers() {
    if (state.players.length < 2) return;
    pushUndo('randomize players');
    const activePlayerId = currentPlayer()?.id;
    const shuffled = [...state.players];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    state.players = shuffled;
    if (activePlayerId) state.turnIndex = Math.max(0, state.players.findIndex(player => player.id === activePlayerId));
    state.lastActionMessage = 'Turn order randomized.';
    saveState();
    update();
  }

  function clearPlayers() {
    if (state.players.length === 0) return;
    pushUndo('clear players');
    state.players = [];
    state.scores = {};
    state.gameStarted = false;
    state.turnIndex = 0;
    state.currentId = null;
    state.currentTargets = [];
    state.discardIds = [];
    state.log = [];
    state.lastActionMessage = 'Players cleared.';
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
    pushUndo('start game');
    state.gameStarted = true;
    state.currentId = null;
    state.currentTargets = [];
    state.questionVisible = false;
    state.turnIndex = normalizeTurnIndex(state.turnIndex, state.players.length);
    state.scores = normalizeScores(state.players, state.scores);
    state.winnerShown = false;
    state.lastActionMessage = `${currentPlayer()?.name || 'First player'} starts.`;
    addLog(`<strong>${escapeHtml(currentPlayer()?.name || 'First player')}</strong> starts round ${state.roundNumber}.`);
    saveState();
    closeModal(els.playersModal);
    update();
  }

  function resetSamePlayers({ keepStarted = true } = {}) {
    pushUndo('new round');
    state.currentId = null;
    state.currentTargets = [];
    state.questionVisible = false;
    state.discardIds = [];
    state.scores = normalizeScores(state.players, {});
    state.turnIndex = 0;
    state.roundNumber += 1;
    state.gameStarted = keepStarted && state.players.length >= 2;
    state.winnerShown = false;
    state.log = [];
    state.lastActionMessage = state.gameStarted ? `${currentPlayer()?.name || 'First player'} starts the new round.` : 'Ready for a new round.';
    if (state.gameStarted) addLog(`<strong>New round.</strong> ${escapeHtml(currentPlayer()?.name || 'First player')} starts.`);
    saveState();
    update();
  }

  function advanceTurn() {
    state.turnIndex = normalizeTurnIndex(state.turnIndex + 1, state.players.length);
  }

  function drawCard() {
    if (!state.gameStarted) {
      openModal(els.playersModal);
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
      openModal(els.settingsModal);
      update();
      return;
    }
    pushUndo('draw card');
    const card = pool[Math.floor(Math.random() * pool.length)];
    state.currentId = card.id;
    state.currentTargets = chooseTargets(card);
    state.questionVisible = false;
    state.discardIds = [...state.discardIds, card.id];
    state.lastActionMessage = '';
    saveState();
    update();
  }

  function chooseTargets(card) {
    const asker = currentPlayer();
    const others = state.players.filter(player => player.id !== asker?.id);
    const all = [...state.players];
    const pool = others.length > 0 ? others : all;
    const shuffled = shuffle(pool).map(player => player.id);
    if (!card) return [];
    if (card.type === 'Make It a Double') return shuffled.slice(0, Math.min(2, shuffled.length));
    if (card.type === "This Round's On Me") return pool.map(player => player.id);
    return shuffled.slice(0, Math.min(1, shuffled.length));
  }

  function rerollTargets() {
    const card = state.currentId ? byId(state.currentId) : null;
    if (!card) return;
    state.currentTargets = chooseTargets(card);
    saveState();
    update();
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function awardPoint(playerId) {
    if (!state.currentId || !state.gameStarted) return;
    const card = byId(state.currentId);
    const winner = state.players.find(player => player.id === playerId);
    if (!winner || !card) return;
    pushUndo('award card');
    const askerName = currentPlayer()?.name || 'The asker';
    state.scores[winner.id] = (state.scores[winner.id] || 0) + 1;
    state.currentId = null;
    state.currentTargets = [];
    state.questionVisible = false;
    advanceTurn();
    state.lastActionMessage = `${winner.name} won the card. ${currentPlayer()?.name || 'Next player'} draws next.`;
    addLog(`<strong>${escapeHtml(winner.name)}</strong> won ${escapeHtml(card.type)} from ${escapeHtml(askerName)}.`);
    saveState();
    update();
    checkWinner(winner);
  }

  function skipPoint() {
    if (!state.currentId || !state.gameStarted) return;
    const card = byId(state.currentId);
    const askerName = currentPlayer()?.name || 'The asker';
    pushUndo('skip card');
    state.currentId = null;
    state.currentTargets = [];
    state.questionVisible = false;
    advanceTurn();
    state.lastActionMessage = `No point awarded. ${currentPlayer()?.name || 'Next player'} draws next.`;
    addLog(`<strong>No point.</strong> ${escapeHtml(askerName)} skipped ${escapeHtml(card?.type || 'the card')}.`);
    saveState();
    update();
  }

  function skipQuestion() {
    if (!state.currentId || !state.gameStarted) return;
    const card = byId(state.currentId);
    const askerName = currentPlayer()?.name || 'The current player';
    pushUndo('skip question');
    state.currentId = null;
    state.currentTargets = [];
    state.questionVisible = false;
    advanceTurn();
    state.lastActionMessage = `${askerName} skipped the question. ${currentPlayer()?.name || 'Next player'} draws next.`;
    addLog(`<strong>${escapeHtml(askerName)}</strong> skipped asking ${escapeHtml(card?.type || 'the question')}.`);
    saveState();
    update();
  }

  function checkWinner(player) {
    if (state.winnerShown) return;
    if ((state.scores[player.id] || 0) < state.winningScore) return;
    state.winnerShown = true;
    state.winnerText.textContent = `${player.name} reached ${state.scores[player.id]} cards. You can keep playing, or reset for a new round with the same players.`;
    saveState();
    openModal(els.winnerModal);
  }

  function resetDiscard() {
    if (state.discardIds.length === 0 && !state.currentId) return;
    pushUndo('reset discard');
    state.discardIds = [];
    state.currentId = null;
    state.currentTargets = [];
    state.questionVisible = false;
    state.lastActionMessage = 'Discard pile reset. The selected cards are back in play.';
    addLog('<strong>Discard pile reset.</strong> Cards can repeat again.');
    saveState();
    update();
  }

  function setSelectedCategories(nextSlugs, label = '') {
    const validSlugs = categories.map(cat => cat.slug);
    const cleaned = Array.from(new Set(nextSlugs)).filter(slug => validSlugs.includes(slug));
    pushUndo('change categories');
    state.selectedCategories = cleaned;
    state.lastActionMessage = label;
    saveState();
    renderCategories();
    renderMoodCategories();
    update();
  }

  function selectedCategoryNames() {
    return state.selectedCategories
      .map(slug => categoryBySlug(slug)?.name)
      .filter(Boolean);
  }

  function applyMoodPreset(slug) {
    const preset = moodPresets[slug];
    if (!preset) return;
    const names = preset.map(item => categoryBySlug(item)?.name).filter(Boolean);
    const label = names.length
      ? `Draw pile set to ${names.join(', ')}.`
      : 'No categories selected.';
    setSelectedCategories(preset, label);
  }

  function toggleCategory(slug, checked) {
    const current = new Set(state.selectedCategories);
    if (checked) current.add(slug);
    else current.delete(slug);
    const names = Array.from(current).map(item => categoryBySlug(item)?.name).filter(Boolean);
    setSelectedCategories(Array.from(current), names.length ? `Drawing from ${names.join(', ')}.` : 'No categories selected.');
  }

  function setWinningScore(value) {
    state.winningScore = positiveInt(value, 7);
    saveState();
    update();
  }

  function setPenalty(value) {
    state.penalty = value.trim() || 'drink';
    saveState();
    update();
  }

  function undo() {
    if (!state.undoStack.length) return;
    restoreSnapshot(state.undoStack[0].state);
  }

  function renderMainStage() {
    const player = currentPlayer();
    const card = state.currentId ? byId(state.currentId) : null;

    els.roundLabel.textContent = state.gameStarted ? `Round ${state.roundNumber}` : 'Ready when you are';
    els.currentPlayerName.textContent = player ? player.name : 'Set up players';

    if (!state.gameStarted) {
      els.turnStatus.textContent = state.lastActionMessage || 'Add players first. Then draw from the card in the center.';
    } else if (card) {
      els.turnStatus.textContent = turnInstruction(card);
    } else {
      els.turnStatus.textContent = state.lastActionMessage || `${player?.name || 'Current player'} draws next.`;
    }

    renderCard(card);
    renderTarget(card);
    renderAwardPanel(card);
  }

  function renderCard(card) {
    els.currentLabels.innerHTML = '';

    if (!card) {
      els.cardStage.className = 'card-stage empty-card';
      els.cardStage.innerHTML = `
        <div class="empty-card-copy">
          <span>Truth or Drink</span>
          <strong>${state.gameStarted ? 'Draw' : 'Set the table'}</strong>
          <p>${state.gameStarted ? 'The next card lands here.' : 'Add players and choose categories. Then draw.'}</p>
        </div>
      `;
      els.questionText.textContent = '';
      els.questionText.classList.add('hidden');
      els.showTextBtn.classList.add('hidden');
      els.skipQuestionBtn.classList.add('hidden');
      return;
    }

    const cat = categoryBySlug(card.groupSlug);
    els.cardStage.className = 'card-stage';
    els.cardStage.innerHTML = `<img src="${card.image}" alt="${escapeHtml(card.group)} card: ${escapeHtml(card.question)}" />`;

    const groupPill = document.createElement('span');
    groupPill.className = 'pill';
    groupPill.style.setProperty('--cat-color', cat?.color || '#a57957');
    groupPill.textContent = card.group;

    const typePill = document.createElement('span');
    typePill.className = 'pill';
    typePill.textContent = card.type;
    els.currentLabels.append(groupPill, typePill);

    els.questionText.textContent = card.question;
    els.questionText.classList.toggle('hidden', !state.questionVisible);
    els.showTextBtn.classList.remove('hidden');
    els.skipQuestionBtn.classList.remove('hidden');
    els.showTextBtn.textContent = state.questionVisible ? 'Hide text' : 'Show text';
  }

  function renderTarget(card) {
    if (!card || !state.gameStarted || state.players.length < 2) {
      els.targetPanel.classList.add('hidden');
      return;
    }
    const names = state.currentTargets
      .map(id => state.players.find(player => player.id === id)?.name)
      .filter(Boolean);
    els.targetText.textContent = names.length ? names.join(' + ') : 'the table';
    els.rerollTargetBtn.classList.toggle('hidden', card.type === "This Round's On Me");
    els.targetPanel.classList.remove('hidden');
  }

  function renderAwardPanel(card) {
    els.awardButtons.innerHTML = '';
    if (!card || !state.gameStarted) {
      els.cardActionPanel.classList.add('hidden');
      return;
    }

    els.cardActionPanel.classList.remove('hidden');
    els.cardActionTitle.textContent = `${card.type}: award the card`;
    els.cardActionHint.textContent = turnInstruction(card);

    const targetSet = new Set(state.currentTargets);
    for (const player of state.players) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `award-button${targetSet.has(player.id) ? ' suggested' : ''}`;
      button.textContent = player.name;
      button.addEventListener('click', () => awardPoint(player.id));
      els.awardButtons.appendChild(button);
    }
  }

  function turnInstruction(card) {
    const asker = currentPlayer()?.name || 'The current player';
    const penalty = state.penalty || 'drink';
    if (!card) return `${asker} draws next.`;
    switch (card.type) {
      case 'Straight Up':
        return `${asker} asks one player. Award the point to the person who answers, or pass for ${penalty}.`;
      case 'Make It a Double':
        return `${asker} asks two people. Award the point to the better answer.`;
      case "This Round's On Me":
        return `${asker} asks the table. Award the point to the favorite answer.`;
      default:
        return `${asker} asks the card. Award the point to the winning answer.`;
    }
  }

  function renderPlayers() {
    els.playerCountMini.textContent = state.players.length;
    els.setupPlayers.innerHTML = '';

    if (state.players.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'status-line';
      empty.textContent = 'No players yet. Add at least two names.';
      els.setupPlayers.appendChild(empty);
    } else {
      state.players.forEach((player, index) => {
        const row = document.createElement('div');
        row.className = 'setup-player';

        const order = document.createElement('span');
        order.className = 'turn-number';
        order.textContent = index + 1;

        const name = document.createElement('span');
        name.className = 'player-name';
        name.textContent = player.name;

        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'icon-button';
        up.setAttribute('aria-label', `Move ${player.name} earlier`);
        up.textContent = '↑';
        up.disabled = index === 0;
        up.addEventListener('click', () => movePlayer(player.id, -1));

        const down = document.createElement('button');
        down.type = 'button';
        down.className = 'icon-button';
        down.setAttribute('aria-label', `Move ${player.name} later`);
        down.textContent = '↓';
        down.disabled = index === state.players.length - 1;
        down.addEventListener('click', () => movePlayer(player.id, 1));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove-player';
        remove.setAttribute('aria-label', `Remove ${player.name}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => removePlayer(player.id));

        row.append(order, name, up, down, remove);
        els.setupPlayers.appendChild(row);
      });
    }

    els.startGameBtn.disabled = state.players.length < 2 && !els.playerNameInput.value.trim();
    els.randomizePlayersBtn.disabled = state.players.length < 2;
    els.clearPlayersBtn.disabled = state.players.length === 0;
    els.setupStatus.textContent = state.lastActionMessage || (state.players.length < 2
      ? 'Add at least two players to begin.'
      : 'Ready. Begin when the table is set.');
  }

  function renderScoreboard() {
    els.scorePanel.classList.toggle('hidden', !state.gameStarted);
    els.scoreboardRows.innerHTML = '';
    els.winTargetLabel.textContent = `First to ${state.winningScore}`;

    const ranked = [...state.players].sort((a, b) => {
      const pointDiff = (state.scores[b.id] || 0) - (state.scores[a.id] || 0);
      if (pointDiff !== 0) return pointDiff;
      return state.players.indexOf(a) - state.players.indexOf(b);
    });

    for (const [index, player] of ranked.entries()) {
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
    }

    els.gameLog.innerHTML = '';
    if (state.log.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'log-entry';
      empty.textContent = 'Game events will appear here.';
      els.gameLog.appendChild(empty);
    } else {
      for (const entry of state.log) {
        const item = document.createElement('div');
        item.className = 'log-entry';
        item.innerHTML = `${entry.html} <span aria-label="time">${escapeHtml(entry.time)}</span>`;
        els.gameLog.appendChild(item);
      }
    }
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
        toggleCategory(event.target.value, event.target.checked);
      });
      els.categoryControls.appendChild(label);
    }
  }

  function renderMoodCategories() {
    if (!els.moodCategoryControls) return;

    els.moodCategoryControls.innerHTML = '';
    const selectedNames = selectedCategoryNames();
    const selectedCardCount = selectedCards().length;
    const availableCardCount = availableCards().length;

    if (els.moodSelectionSummary) {
      els.moodSelectionSummary.textContent = selectedNames.length
        ? `${selectedNames.join(' + ')} · ${selectedCardCount} selected cards · ${availableCardCount} still drawable`
        : 'No categories selected. Pick at least one set before drawing.';
    }

    categories.forEach((cat, index) => {
      const checked = state.selectedCategories.includes(cat.slug);
      const label = document.createElement('label');
      label.className = `mood-category-card${checked ? ' selected' : ''}`;
      label.style.setProperty('--cat-color', cat.color);
      label.innerHTML = `
        <input type="checkbox" value="${escapeHtml(cat.slug)}" ${checked ? 'checked' : ''} />
        <span class="mood-rank">${String(index + 1).padStart(2, '0')}</span>
        <span class="mood-card-copy">
          <strong>${escapeHtml(cat.name)}</strong>
          <small>${escapeHtml(categoryDescriptions[cat.slug] || '')}</small>
        </span>
        <em>${cat.count} cards</em>
      `;
      label.querySelector('input').addEventListener('change', event => {
        toggleCategory(event.target.value, event.target.checked);
      });
      els.moodCategoryControls.appendChild(label);
    });
  }

  function renderDiscard() {
    const ids = [...state.discardIds].reverse();
    els.discardGrid.innerHTML = '';
    if (ids.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'status-line';
      empty.textContent = 'No discarded cards yet.';
      els.discardGrid.appendChild(empty);
      return;
    }

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
  }

  function updateStats() {
    const selected = selectedCards().length;
    const available = availableCards().length;
    const hasCurrentCard = Boolean(state.currentId);

    els.selectedCount.textContent = selected;
    els.discardCount.textContent = state.discardIds.length;
    els.drawBtn.disabled = hasCurrentCard || state.selectedCategories.length === 0 || available === 0;
    els.showTextBtn.disabled = !hasCurrentCard;
    els.skipQuestionBtn.disabled = !hasCurrentCard || !state.gameStarted;
    els.undoBtn.disabled = state.undoStack.length === 0;
    els.resetDiscardBtn.disabled = state.discardIds.length === 0;
    els.newRoundBtn.disabled = state.players.length < 2;
    els.resetGameBtn.disabled = state.players.length < 2;

    if (!state.gameStarted) {
      els.drawBtn.disabled = false;
      els.drawBtn.textContent = 'Set up players';
    } else if (hasCurrentCard) {
      els.drawBtn.textContent = 'Resolve card first';
    } else if (available === 0) {
      els.drawBtn.textContent = 'Pile empty';
    } else {
      els.drawBtn.textContent = `Draw for ${currentPlayer()?.name || 'player'}`;
    }

    els.deckStatus.textContent = state.selectedCategories.length === 0
      ? 'No categories selected.'
      : `${selected} selected, ${available} still drawable, ${state.discardIds.length} discarded.`;
    els.winningScoreInput.value = state.winningScore;
    els.penaltyInput.value = state.penalty;
  }

  function update() {
    state.turnIndex = normalizeTurnIndex(state.turnIndex, state.players.length);
    state.scores = normalizeScores(state.players, state.scores);
    renderMainStage();
    renderPlayers();
    renderScoreboard();
    renderCategories();
    renderMoodCategories();
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

  function openModal(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeModal(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function setupModals() {
    document.querySelectorAll('[data-open-modal]').forEach(button => {
      button.addEventListener('click', () => openModal(document.getElementById(button.dataset.openModal)));
    });

    document.querySelectorAll('[data-close-modal]').forEach(button => {
      button.addEventListener('click', () => closeModal(button.closest('dialog')));
    });

    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.addEventListener('click', event => {
        if (event.target === dialog) closeModal(dialog);
      });
    });
  }

  els.addPlayerForm.addEventListener('submit', event => {
    event.preventDefault();
    if (addPlayer(els.playerNameInput.value)) els.playerNameInput.value = '';
  });

  els.bulkPlayerForm.addEventListener('submit', event => {
    event.preventDefault();
    const added = addPlayersFromText(els.bulkPlayerInput.value);
    if (added) els.bulkPlayerInput.value = '';
  });

  els.playerNameInput.addEventListener('input', renderPlayers);
  els.startGameBtn.addEventListener('click', startGame);
  els.randomizePlayersBtn.addEventListener('click', randomizePlayers);
  els.clearPlayersBtn.addEventListener('click', clearPlayers);
  els.drawBtn.addEventListener('click', drawCard);
  els.rerollTargetBtn.addEventListener('click', rerollTargets);
  els.noPointBtn.addEventListener('click', skipPoint);
  els.skipQuestionBtn.addEventListener('click', skipQuestion);
  els.undoBtn.addEventListener('click', undo);
  els.resetDiscardBtn.addEventListener('click', resetDiscard);
  els.resetGameBtn.addEventListener('click', () => resetSamePlayers({ keepStarted: true }));
  els.newRoundBtn.addEventListener('click', () => resetSamePlayers({ keepStarted: true }));

  els.showTextBtn.addEventListener('click', () => {
    if (!state.currentId) return;
    state.questionVisible = !state.questionVisible;
    saveState();
    update();
  });

  els.selectAllBtn.addEventListener('click', () => {
    setSelectedCategories(categories.map(c => c.slug), 'Drawing from every category.');
  });

  els.clearCatsBtn.addEventListener('click', () => {
    setSelectedCategories([], 'No categories selected.');
  });

  els.selectMoodAllBtn?.addEventListener('click', () => {
    setSelectedCategories(categories.map(c => c.slug), 'Drawing from every category.');
  });

  els.clearMoodBtn?.addEventListener('click', () => {
    setSelectedCategories([], 'No categories selected.');
  });

  els.winningScoreInput.addEventListener('change', event => setWinningScore(event.target.value));
  els.penaltyInput.addEventListener('change', event => setPenalty(event.target.value));

  document.querySelectorAll('[data-preset]').forEach(button => {
    button.addEventListener('click', () => applyMoodPreset(button.dataset.preset));
  });

  els.winnerContinueBtn.addEventListener('click', () => closeModal(els.winnerModal));
  els.winnerResetBtn.addEventListener('click', () => {
    closeModal(els.winnerModal);
    resetSamePlayers({ keepStarted: true });
  });

  window.addEventListener('keydown', event => {
    const tag = document.activeElement?.tagName;
    const modalOpen = Boolean(document.querySelector('dialog[open]'));
    if (modalOpen || ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if ((event.key === ' ' || event.key === 'Enter') && !els.drawBtn.disabled) {
      event.preventDefault();
      drawCard();
    }
    if ((event.key === 'u' || event.key === 'U') && !els.undoBtn.disabled) {
      event.preventDefault();
      undo();
    }
  });

  setupModals();
  renderCategories();
  renderMoodCategories();
  update();
})();
