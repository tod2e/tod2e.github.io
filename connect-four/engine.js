(function (root) {
  'use strict';
  const ROWS = 6, COLS = 7, ORDER = [3, 2, 4, 1, 5, 0, 6];
  const WINDOWS = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const endR = r + dr * 3, endC = c + dc * 3;
        if (endR >= 0 && endR < ROWS && endC >= 0 && endC < COLS) WINDOWS.push([0, 1, 2, 3].map(i => (r + dr * i) * COLS + c + dc * i));
      }
    }
  }
  function emptyBoard() {return Array(ROWS * COLS).fill(0);}
  function legalMoves(board) {return ORDER.filter(c => board[c] === 0);}
  function drop(board, column, player) {
    if (!Number.isInteger(column) || column < 0 || column >= COLS || (player !== 1 && player !== 2)) return -1;
    for (let r = ROWS - 1; r >= 0; r--) {const index = r * COLS + column; if (board[index] === 0) {board[index] = player; return index;}}
    return -1;
  }
  function winningCells(board) {return WINDOWS.find(indices => board[indices[0]] !== 0 && indices.every(i => board[i] === board[indices[0]])) || [];}
  function winner(board) {const cells = winningCells(board); return cells.length ? board[cells[0]] : 0;}
  function evaluate(board, player) {
    let score = 0;
    const other = 3 - player, weights = [0, 1, 10, 90, 100000];
    for (const line of WINDOWS) {
      let ours = 0, theirs = 0;
      for (const i of line) {if (board[i] === player) ours++; else if (board[i] === other) theirs++;}
      if (!theirs) score += weights[ours];
      if (!ours) score -= weights[theirs];
    }
    for (let r = 0; r < ROWS; r++) {if (board[r * COLS + 3] === player) score += 3; else if (board[r * COLS + 3] === other) score -= 3;}
    return score;
  }
  function immediateWins(board, player) {
    const result = [];
    for (const c of legalMoves(board)) {const index = drop(board, c, player); if (winner(board) === player) result.push(c); board[index] = 0;}
    return result;
  }
  function chooseMove(position, player = 2, options = {}) {
    const board = position.slice(), moves = legalMoves(board);
    if (winner(board) || !moves.length) return null;
    const wins = immediateWins(board, player);
    if (wins.length) return wins[0];
    const threats = immediateWins(board, 3 - player);
    if (threats.length === 1) return threats[0];
    const maxDepth = Math.max(1, Math.min(7, options.maxDepth || 5));
    const maxNodes = Math.max(1, options.maxNodes || 35000);
    const expires = Date.now() + Math.max(5, options.maxMs || 180);
    const BUDGET = {};
    let nodes = 0, best = moves[0];
    function search(depth, turn, alpha, beta) {
      nodes++;
      if (nodes > maxNodes || ((nodes & 63) === 0 && Date.now() > expires)) throw BUDGET;
      const won = winner(board);
      if (won) return won === player ? 1000000 + depth : -1000000 - depth;
      const legal = legalMoves(board);
      if (!legal.length) return 0;
      if (depth === 0) return evaluate(board, player);
      const maximize = turn === player;
      let value = maximize ? -Infinity : Infinity;
      for (const column of legal) {
        const index = drop(board, column, turn);
        let score;
        try {score = search(depth - 1, 3 - turn, alpha, beta);} finally {board[index] = 0;}
        value = maximize ? Math.max(value, score) : Math.min(value, score);
        if (maximize) alpha = Math.max(alpha, value); else beta = Math.min(beta, value);
        if (beta <= alpha) break;
      }
      return value;
    }
    for (let depth = 1; depth <= maxDepth; depth++) {
      let candidate = best, value = -Infinity, alpha = -Infinity;
      const ordered = [best, ...moves.filter(c => c !== best)];
      try {
        for (const column of ordered) {
          const index = drop(board, column, player);
          let score;
          try {score = search(depth - 1, 3 - player, alpha, Infinity);} finally {board[index] = 0;}
          if (score > value) {value = score; candidate = column;}
          alpha = Math.max(alpha, value);
        }
        best = candidate;
      } catch (error) {if (error !== BUDGET) throw error; break;}
      if (value > 900000) break;
    }
    return best;
  }
  function difficultyOptions(level, fallback = false) {
    const configs = {
      easy: {maxDepth: 1, maxNodes: 1000, maxMs: 20},
      normal: {maxDepth: 5, maxNodes: 35000, maxMs: 180},
      hard: {maxDepth: 7, maxNodes: 120000, maxMs: 350}
    };
    const options = {...(configs[level] || configs.normal)};
    if (fallback) {options.maxDepth = Math.min(options.maxDepth, 5); options.maxNodes = Math.min(options.maxNodes, 8000); options.maxMs = Math.min(options.maxMs, 45);}
    return options;
  }
  function chooseDifficultyMove(position, player = 2, level = 'normal', fallback = false, random = Math.random) {
    if (level !== 'easy') return chooseMove(position, player, difficultyOptions(level, fallback));
    const board = position.slice(), legal = legalMoves(board);
    if (winner(board) || !legal.length) return null;
    const wins = immediateWins(board, player);
    return wins.length ? wins[0] : legal[Math.floor(random() * legal.length)];
  }
  const engine = {ROWS, COLS, emptyBoard, legalMoves, drop, winner, winningCells, chooseMove, difficultyOptions, chooseDifficultyMove};
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  else root.ConnectFour = engine;
}(typeof self !== 'undefined' ? self : this));
