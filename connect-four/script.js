(function () {
  'use strict';
  const G = window.ConnectFour;
  const $ = id => document.getElementById(id);
  let board = G.emptyBoard(), turn = 1, starter = 1, mode = 'computer', difficulty = 'normal', ended = false, thinking = false, version = 0, last = -1;
  let worker = null, computerTimer = null;
  const scores = Object.create(null), cells = [], buttons = [];
  function score() {const key = mode === 'local' ? 'local' : `computer:${difficulty}`; return scores[key] || (scores[key] = {1: 0, 2: 0, draws: 0});}
  for (let c = 0; c < G.COLS; c++) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'column-button';
    button.textContent = `↓ ${c + 1}`; button.setAttribute('aria-label', `Drop a disc in column ${c + 1}`);
    button.addEventListener('click', () => {if (!ended && !thinking && !(mode === 'computer' && turn === 2)) play(c);});
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const step = event.key === 'ArrowLeft' ? -1 : 1;
      let target = event.key === 'Home' ? 0 : event.key === 'End' ? 6 : (c + step + G.COLS) % G.COLS;
      for (let n = 0; n < G.COLS; n++) {if (!buttons[target].disabled) {buttons[target].focus(); break;} target = (target + (event.key === 'End' ? -1 : step) + G.COLS) % G.COLS;}
    });
    buttons.push(button); $('drop-buttons').append(button);
  }
  for (let r = 0; r < G.ROWS; r++) {
    const row = document.createElement('tr');
    for (let c = 0; c < G.COLS; c++) {const cell = document.createElement('td'); const disc = document.createElement('span'); disc.className = 'disc'; disc.setAttribute('aria-hidden', 'true'); cell.append(disc); row.append(cell); cells.push({cell, disc});}
    $('board-body').append(row);
  }
  function playerName(player) {return mode === 'computer' ? player === 1 ? 'You' : 'Computer' : player === 1 ? 'Blue' : 'Gold';}
  function render() {
    const won = new Set(G.winningCells(board));
    cells.forEach(({cell, disc}, i) => {
      const value = board[i];
      disc.className = `disc${value ? ` p${value}` : ''}${last === i ? ' last' : ''}${won.has(i) ? ' winning' : ''}`;
      disc.textContent = value || '';
      cell.setAttribute('aria-label', `Row ${Math.floor(i / G.COLS) + 1}, column ${i % G.COLS + 1}: ${value ? value === 1 ? 'Blue, player 1' : 'Gold, player 2' : 'empty'}${won.has(i) ? ', winning line' : ''}${last === i ? ', last move' : ''}`);
    });
    buttons.forEach((button, c) => {button.disabled = ended || thinking || board[c] !== 0 || (mode === 'computer' && turn === 2); button.setAttribute('aria-label', board[c] !== 0 ? `Column ${c + 1} is full` : `Drop a disc in column ${c + 1}`);});
    $('p1-label').textContent = mode === 'computer' ? 'You · Blue' : 'Player 1 · Blue';
    $('p2-label').textContent = mode === 'computer' ? 'Computer · Gold' : 'Player 2 · Gold';
    $('score1-label').textContent = playerName(1); $('score2-label').textContent = playerName(2);
    $('score1').textContent = score()[1]; $('score2').textContent = score()[2]; $('score-draws').textContent = score().draws;
    $('board').setAttribute('aria-busy', thinking ? 'true' : 'false');
    $('difficulty-field').hidden = mode === 'local';
    $('starter-note').textContent = mode === 'computer' ? 'You go first. Scores are separate for each difficulty.' : 'Blue starts the first round. After each finished round, the other player goes first.';
    $('match-label').textContent = `${mode === 'local' ? 'Local match' : difficulty[0].toUpperCase() + difficulty.slice(1)} · Scores for this visit`;
    $('restart').textContent = ended ? 'Play again' : 'Restart round';
  }
  function stopComputer() {if (worker) worker.terminate(); worker = null; if (computerTimer !== null) clearTimeout(computerTimer); computerTimer = null; thinking = false;}
  function reset(rematch = false) {
    stopComputer(); version++; board = G.emptyBoard();
    if (mode === 'computer') starter = 1; else if (rematch) starter = 3 - starter;
    turn = starter; ended = false; last = -1;
    $('status').textContent = mode === 'computer' ? 'Your turn. Drop a blue disc.' : `${playerName(starter)} goes first. Drop a disc in any column.`;
    render();
  }
  function completeComputer(id, column) {
    if (id !== version || ended || mode !== 'computer' || turn !== 2 || !thinking) return;
    thinking = false;
    const legal = G.legalMoves(board);
    play(legal.includes(column) ? column : legal[0]);
  }
  function fallbackComputer(id) {
    if (id !== version || !thinking) return;
    if (worker) worker.terminate(); worker = null;
    computerTimer = setTimeout(() => {computerTimer = null; if (id !== version || !thinking) return; completeComputer(id, G.chooseDifficultyMove(board, 2, difficulty, true));}, 0);
  }
  function askComputer() {
    thinking = true; render();
    const id = version;
    computerTimer = setTimeout(() => {
      computerTimer = null;
      if (id !== version || ended || !thinking) return;
      try {
        if (typeof Worker === 'undefined') {fallbackComputer(id); return;}
        if (!worker) {
          worker = new Worker('worker.js');
          worker.addEventListener('message', event => completeComputer(event.data.id, event.data.column));
          worker.addEventListener('error', event => {event.preventDefault(); fallbackComputer(id);});
        }
        worker.postMessage({id, board: board.slice(), difficulty});
      } catch (_) {fallbackComputer(id);}
    }, 100);
  }
  function focusPlayable(preferred) {const column = buttons[preferred] && !buttons[preferred].disabled ? preferred : G.legalMoves(board)[0]; if (column !== undefined && !buttons[column].disabled) buttons[column].focus({preventScroll: true});}
  function play(column) {
    if (ended) return;
    const who = turn, index = G.drop(board, column, who);
    if (index === -1) return;
    last = index;
    const won = G.winner(board);
    if (won) {ended = true; score()[won]++; $('status').textContent = mode === 'computer' ? won === 1 ? 'You win. Four in a row!' : 'The computer wins. Another round?' : `${playerName(won)} wins. Four in a row!`; render(); $('restart').focus({preventScroll: true}); return;}
    if (!G.legalMoves(board).length) {ended = true; score().draws++; $('status').textContent = 'A draw. The board is full, with no line of four.'; render(); $('restart').focus({preventScroll: true}); return;}
    turn = 3 - turn;
    if (mode === 'computer' && turn === 2) {$('status').textContent = `You played column ${column + 1}. Computer is thinking…`; askComputer();}
    else {$('status').textContent = `${playerName(who)} played column ${column + 1}. ${mode === 'computer' ? 'Your turn.' : `${playerName(turn)}'s turn.`}`; render(); focusPlayable(column);}
  }
  $('restart').addEventListener('click', () => {if (!ended && board.some(Boolean) && !window.confirm('Restart this round and clear the board?')) return; reset(ended); buttons[3].focus();});
  $('mode').addEventListener('change', () => {if (!ended && board.some(Boolean) && !window.confirm('Change opponents and start a new round?')) {$('mode').value = mode; return;} mode = $('mode').value; starter = 1; reset();});
  $('difficulty').addEventListener('change', () => {if (!ended && board.some(Boolean) && !window.confirm('Change difficulty and start a new round?')) {$('difficulty').value = difficulty; return;} difficulty = $('difficulty').value; reset();});
  $('reset-match').addEventListener('click', () => {if ((board.some(Boolean) || score()[1] || score()[2] || score().draws) && !window.confirm('Clear this match score and start a new round?')) return; const current = score(); current[1] = 0; current[2] = 0; current.draws = 0; starter = 1; reset();});
  window.addEventListener('pagehide', stopComputer);
  window.addEventListener('pageshow', () => {if (!ended && mode === 'computer' && turn === 2 && !thinking) askComputer();});
  reset();
}());
