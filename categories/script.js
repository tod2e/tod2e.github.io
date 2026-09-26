(function () {
  'use strict';
  const BASE = ['An animal', 'A food', 'A city', 'A country', 'A job', 'A movie', 'A book', 'A song title', 'A musician or band', 'A sport or game', 'Something in a kitchen', 'Something you pack for a trip', 'Something that makes noise', 'Something in the ocean', 'Something you can wear', 'A fictional character', 'Something expensive', 'Something you find outdoors', 'A plant or flower', 'An excuse for being late', 'Something at a party', 'Something in a laboratory', 'A famous athlete', 'A brand', 'Something you can break', 'Something that flies', 'A word with at least seven letters', 'Something you are afraid of', 'Something smaller than your hand', 'Something you would take camping', 'Something in a bathroom', 'Something you should not touch', 'Something you can collect', 'A reason to celebrate', 'Something with wheels', 'Something that smells good'];
  const POOLS = {
    general: BASE,
    science: ['A piece of lab equipment', 'A chemical or molecule', 'A scientist, past or present', 'A scientific process', 'Something you can measure', 'A scientific field', 'Something found in a cell', 'A living organism', 'Something you observe in nature', 'A property of matter', 'Something that carries energy', 'A word in a research paper', 'A technique used in science', 'Something in a laboratory', 'Something that can go wrong in an experiment', 'Something you can see under a microscope', 'A science-related verb', 'Something found in space', 'A scientific discovery or invention', 'A scientific term with at least seven letters'],
    baseball: ['A player, past or present', 'Something at a ballpark', 'A baseball-related verb', 'Something a pitcher does', 'Something a hitter does', 'Something a fielder does', 'A word in a game broadcast', 'Something a fan brings', 'Something you hear at a game', 'A baseball job or role', 'A city with a baseball team', 'Something on a scorecard', 'Something a coach says', 'Something that can go wrong in a game', 'Something a player wears or uses', 'Something you buy at a ballpark', 'Something you practice', 'A baseball nickname or team name', 'Something a fan celebrates', 'A word for describing a player']
  };
  const LETTERS = {general: 'ABCDEFGHIJKLMNOPRSTW', science: 'ABCDEFMNPST', baseball: 'BCDMPRS'};
  const themeName = theme => ({general: 'General', science: 'Science', baseball: 'Baseball'}[theme] || 'General');
  function poolFromCustom(raw, theme = 'general') {
    const additions = raw.split(/\r?\n/).map(x => x.trim().slice(0, 100)).filter(Boolean).slice(0, 20);
    const seen = new Set();
    return [...(POOLS[theme] || BASE), ...additions].filter(x => {const key = x.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true;});
  }
  function sample(pool, count, random = Math.random) {
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i--) {const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]];}
    return copy.slice(0, count);
  }
  function secondsLeft(deadline, now = Date.now()) {return Math.max(0, Math.ceil((deadline - now) / 1000));}
  if (typeof module !== 'undefined' && module.exports) module.exports = {poolFromCustom, sample, secondsLeft, POOLS};
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  let round = 0, phase = 'ready', remaining = 90000, deadline = 0, interval = null, lastLetter = '';
  const panel = document.querySelector('.round-panel');
  function clearTimer() {if (interval !== null) clearInterval(interval); interval = null;}
  function drawClock(seconds) {$('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; panel.classList.toggle('is-ending', phase === 'running' && seconds <= 10); panel.classList.toggle('is-ended', phase === 'ended');}
  function updateControls() {$('start').disabled = phase === 'running' || phase === 'ended'; $('start').textContent = phase === 'paused' ? 'Resume' : 'Start'; $('pause').disabled = phase !== 'running'; $('duration').disabled = phase === 'running' || phase === 'paused';}
  function tick() {
    const seconds = secondsLeft(deadline);
    if (seconds === 0) {remaining = 0; phase = 'ended'; clearTimer(); $('status').textContent = 'Time is up. Pens down! Read your answers and tally your scores.'; updateControls();}
    drawClock(seconds);
  }
  function resetTimer() {clearTimer(); phase = 'ready'; remaining = Number($('duration').value) * 1000; drawClock(remaining / 1000); $('status').textContent = 'Get your paper ready, then start the timer.'; updateControls();}
  function newRound() {
    if ((phase === 'running' || phase === 'paused') && !window.confirm('End this round and draw a new letter and prompts?')) return;
    round++;
    const theme = $('theme').value;
    const available = [...(LETTERS[theme] || LETTERS.general)].filter(letter => letter !== lastLetter);
    lastLetter = available[Math.floor(Math.random() * available.length)];
    $('letter').textContent = lastLetter;
    $('letter').setAttribute('aria-label', `Round letter ${lastLetter}`);
    $('round-number').textContent = `Round ${round} · ${themeName(theme)}`;
    $('theme-note').textContent = 'Theme changes apply to the next round.';
    $('prompts').replaceChildren(...sample(poolFromCustom($('custom').value, theme), 5).map(prompt => {const li = document.createElement('li'); li.textContent = prompt; return li;}));
    resetTimer();
  }
  $('start').addEventListener('click', () => {if (phase !== 'ready' && phase !== 'paused') return; phase = 'running'; deadline = Date.now() + remaining; $('status').textContent = `Go! Every answer starts with ${lastLetter}.`; updateControls(); tick(); if (phase === 'running') interval = setInterval(tick, 250);});
  $('pause').addEventListener('click', () => {if (phase !== 'running') return; tick(); if (phase !== 'running') return; remaining = Math.max(0, deadline - Date.now()); phase = 'paused'; clearTimer(); drawClock(Math.ceil(remaining / 1000)); $('status').textContent = 'Paused. Resume when everyone is ready.'; updateControls();});
  $('reset').addEventListener('click', () => {if ((phase === 'running' || phase === 'paused') && !window.confirm('Reset the timer for this round?')) return; resetTimer();});
  $('duration').addEventListener('change', resetTimer);
  $('next').addEventListener('click', newRound);
  function customCount() {const theme = $('theme').value; const count = poolFromCustom($('custom').value, theme).length - (POOLS[theme] || BASE).length; $('custom-status').textContent = count ? `${count} custom ${count === 1 ? 'category' : 'categories'} ready for the next round.` : '';}
  $('custom').addEventListener('input', customCount);
  $('theme').addEventListener('change', () => {$('theme-note').textContent = `${themeName($('theme').value)} is ready for the next round.`; customCount();});
  document.addEventListener('visibilitychange', () => {if (!document.hidden && phase === 'running') tick();});
  window.addEventListener('pagehide', clearTimer);
  window.addEventListener('pageshow', () => {if (phase === 'running' && interval === null) {tick(); if (phase === 'running') interval = setInterval(tick, 250);}});
  newRound();
}());
