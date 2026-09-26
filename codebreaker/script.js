(function () {
  'use strict';
  function scoreGuess(secret, guess) {
    let exact = 0, present = 0;
    for (let i = 0; i < guess.length; i++) {if (guess[i] === secret[i]) exact++; if (secret.includes(guess[i])) present++;}
    return {exact, misplaced: present - exact};
  }
  function validGuess(guess) {return typeof guess === 'string' && /^[0-9]{4}$/.test(guess) && new Set(guess).size === 4;}
  function generateCode(random = Math.random) {
    const digits = [...'0123456789'];
    for (let i = digits.length - 1; i > 0; i--) {const j = Math.floor(random() * (i + 1)); [digits[i], digits[j]] = [digits[j], digits[i]];}
    return digits.slice(0, 4).join('');
  }
  function localDate(date = new Date()) {return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;}
  function dailyCode(date) {
    let seed = 2166136261;
    for (const letter of `codebreaker-v1:${date}`) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619) >>> 0;
    return generateCode(() => {seed = (seed + 0x6D2B79F5) >>> 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296;});
  }
  function restoreState(raw, secret) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.guesses)) return {guesses: [], result: 'playing'};
    const guesses = [...new Set(raw.guesses.filter(validGuess))].slice(0, 5040);
    const solved = guesses.indexOf(secret);
    if (solved !== -1) return {guesses: guesses.slice(0, solved + 1), result: 'won'};
    return {guesses, result: raw.result === 'revealed' ? 'revealed' : 'playing'};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {scoreGuess, validGuess, generateCode, localDate, dailyCode, restoreState};
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  let secret = '', guesses = [], result = 'playing', mode = 'daily', day = localDate();
  const key = () => `codebreaker:daily:v1:${day}`;
  function storageWarning() {$('save-note').hidden = false; $('save-note').textContent = 'Saving is unavailable in this browser. Keep this tab open to keep your progress.';}
  function save() {if (mode !== 'daily') return; try {localStorage.setItem(key(), JSON.stringify({guesses, result}));} catch (_) {storageWarning();}}
  function historyRow(guess, number) {const score = scoreGuess(secret, guess); const row = document.createElement('tr'); [number, guess, score.exact, score.misplaced].forEach(value => {const cell = document.createElement('td'); cell.textContent = value; row.append(cell);}); return row;}
  function render() {
    const finished = result !== 'playing';
    $('mode').value = mode;
    $('challenge-label').textContent = mode === 'daily' ? `Daily · ${day}` : 'Practice · A random code';
    $('new').textContent = mode === 'daily' ? 'Practice' : 'New code';
    $('secret').textContent = finished ? [...secret].join(' ') : '? ? ? ?';
    $('secret').setAttribute('aria-label', finished ? `Secret code: ${[...secret].join(', ')}` : 'Secret code is hidden');
    $('guess').disabled = finished; $('submit').disabled = finished; $('give-up').disabled = finished;
    $('history').replaceChildren(...guesses.map((guess, i) => historyRow(guess, i + 1)));
    $('empty').classList.toggle('hidden', guesses.length > 0); $('history-wrap').classList.toggle('hidden', guesses.length === 0);
    if (result === 'won') $('status').textContent = `Cracked it in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.${mode === 'daily' ? ' Back tomorrow—or keep practicing.' : ''}`;
    else if (result === 'revealed') $('status').textContent = `The code was ${secret}.${mode === 'daily' ? ' Try a practice code while you wait for tomorrow.' : ' Ready for another?'} `;
    else if (guesses.length) {const last = guesses[guesses.length - 1], score = scoreGuess(secret, last); $('status').textContent = `Guess ${guesses.length}: ${[...last].join(' ')} — ${score.exact} exact, ${score.misplaced} misplaced.`;}
    else $('status').textContent = 'Make your first guess.';
  }
  function loadGame(nextMode, focus = true) {
    mode = nextMode; day = localDate(); secret = mode === 'daily' ? dailyCode(day) : generateCode(); guesses = []; result = 'playing';
    $('save-note').hidden = true;
    if (mode === 'daily') {
      try {const restored = restoreState(JSON.parse(localStorage.getItem(key())), secret); guesses = restored.guesses; result = restored.result;} catch (_) {storageWarning();}
    }
    $('error').textContent = ''; $('guess').removeAttribute('aria-invalid'); $('guess').value = '';
    render();
    if (focus) (result === 'playing' ? $('guess') : $('new')).focus();
  }
  function changeMode(nextMode) {
    if (mode === 'practice' && result === 'playing' && guesses.length && !window.confirm('Leave this practice code and start another puzzle?')) {$('mode').value = mode; return;}
    loadGame(nextMode);
  }
  function error(message) {$('error').textContent = message; $('guess').setAttribute('aria-invalid', 'true'); $('guess').focus();}
  function checkDate() {if (mode === 'daily' && day !== localDate()) {loadGame('daily', false); if (result === 'playing' && !guesses.length) $('status').textContent = 'A new day, a new code. Make your first guess.'; return true;} return false;}
  $('guess-form').addEventListener('submit', event => {
    event.preventDefault();
    if (checkDate() || result !== 'playing') return;
    const guess = $('guess').value.trim();
    if (!validGuess(guess)) return error('Enter exactly four different digits, such as 0123.');
    if (guesses.includes(guess)) return error('You have tried that code already. Choose a different guess.');
    $('error').textContent = ''; $('guess').removeAttribute('aria-invalid');
    guesses.push(guess);
    if (guess === secret) result = 'won';
    save(); render(); $('guess').value = '';
    (result === 'playing' ? $('guess') : $('new')).focus();
  });
  $('give-up').addEventListener('click', () => {if (checkDate() || result !== 'playing') return; if (window.confirm('Reveal the code and end this puzzle?')) {result = 'revealed'; save(); render(); $('new').focus();}});
  $('new').addEventListener('click', () => changeMode('practice'));
  $('mode').addEventListener('change', () => changeMode($('mode').value));
  document.addEventListener('visibilitychange', () => {if (!document.hidden) checkDate();});
  window.addEventListener('storage', event => {if (mode === 'daily' && event.key === key() && event.newValue !== null) loadGame('daily', false);});
  loadGame('daily', false);
}());
