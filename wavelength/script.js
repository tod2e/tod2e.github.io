(() => {
  const packs = window.SPECTRUM_PACKS || [];
  const STORAGE_KEY = "sameWavelengthState:v2";
  const LEGACY_STORAGE_KEY = "sameWavelengthState:v1";

  const $ = (id) => document.getElementById(id);
  const els = {
    roundLabel: $("roundLabel"),
    phaseTitle: $("phaseTitle"),
    phaseHint: $("phaseHint"),
    teamANameMini: $("teamANameMini"),
    teamAScoreMini: $("teamAScoreMini"),
    teamBNameMini: $("teamBNameMini"),
    teamBScoreMini: $("teamBScoreMini"),
    leftPole: $("leftPole"),
    rightPole: $("rightPole"),
    clueDisplay: $("clueDisplay"),
    privacyCurtain: $("privacyCurtain"),
    privacyTitle: $("privacyTitle"),
    privacyText: $("privacyText"),
    dial: $("dial"),
    targetGroup: $("targetGroup"),
    target2Left: $("target2Left"),
    target3Left: $("target3Left"),
    target4: $("target4"),
    target3Right: $("target3Right"),
    target2Right: $("target2Right"),
    needle: $("needle"),
    needleGrip: $("needleGrip"),
    positionReadout: $("positionReadout"),
    positionPercent: $("positionPercent"),
    psychicControls: $("psychicControls"),
    revealPrivateBtn: $("revealPrivateBtn"),
    clueControls: $("clueControls"),
    clueInput: $("clueInput"),
    hideTargetBtn: $("hideTargetBtn"),
    newSpectrumBtn: $("newSpectrumBtn"),
    guessControls: $("guessControls"),
    lockGuessBtn: $("lockGuessBtn"),
    opponentControls: $("opponentControls"),
    opponentTeamLabel: $("opponentTeamLabel"),
    revealControls: $("revealControls"),
    revealScoreBtn: $("revealScoreBtn"),
    resultControls: $("resultControls"),
    resultBanner: $("resultBanner"),
    nextRoundBtn: $("nextRoundBtn"),
    activeTeamPill: $("activeTeamPill"),
    psychicName: $("psychicName"),
    psychicRotation: $("psychicRotation"),
    targetScorePill: $("targetScorePill"),
    teamAName: $("teamAName"),
    teamAScore: $("teamAScore"),
    teamBName: $("teamBName"),
    teamBScore: $("teamBScore"),
    undoBtn: $("undoBtn"),
    resetBtn: $("resetBtn"),

    setupModal: $("setupModal"),
    setupTitle: $("setupTitle"),
    setupIntro: $("setupIntro"),
    teamACard: $("teamACard"),
    teamBCard: $("teamBCard"),
    teamANameLabel: $("teamANameLabel"),
    teamAPlayersLabel: $("teamAPlayersLabel"),
    teamANameInput: $("teamANameInput"),
    teamBNameInput: $("teamBNameInput"),
    teamAPlayersInput: $("teamAPlayersInput"),
    teamBPlayersInput: $("teamBPlayersInput"),
    competitiveSettings: $("competitiveSettings"),
    cooperativeSettings: $("cooperativeSettings"),
    winningScoreInput: $("winningScoreInput"),
    catchupInput: $("catchupInput"),
    coopTargetInput: $("coopTargetInput"),
    coopRoundsInput: $("coopRoundsInput"),
    coopMathHint: $("coopMathHint"),
    saveSetupBtn: $("saveSetupBtn"),
    setupStatus: $("setupStatus"),

    spectraModal: $("spectraModal"),
    packControls: $("packControls"),
    customSpectrumForm: $("customSpectrumForm"),
    customLeftInput: $("customLeftInput"),
    customRightInput: $("customRightInput"),
    customSpectrumList: $("customSpectrumList"),

    rulesModal: $("rulesModal"),
    winnerModal: $("winnerModal"),
    winnerTitle: $("winnerTitle"),
    winnerText: $("winnerText"),
    keepPlayingBtn: $("keepPlayingBtn"),
    newMatchBtn: $("newMatchBtn")
  };

  const defaultState = {
    mode: "competitive",
    teams: [
      { name: "Team A", players: [], score: 0, psychicIndex: 0 },
      { name: "Team B", players: [], score: 0, psychicIndex: 0 }
    ],
    activeTeam: 0,
    round: 1,
    winningScore: 10,
    catchup: true,
    coopTargetScore: 20,
    coopRoundLimit: 8,
    coopChallengeEnded: false,
    selectedPacks: packs.map(p => p.id),
    customSpectra: [],
    phase: "setup",
    currentSpectrum: null,
    target: 0.5,
    needle: 0.5,
    clue: "",
    opponentGuess: null,
    lastRoundSnapshot: null,
    winnerDismissed: false
  };

  let state = loadState();
  let dragging = false;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function isCoop() { return state.mode === "cooperative"; }

  function loadState() {
    try {
      const v2 = localStorage.getItem(STORAGE_KEY);
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      const raw = v2 || legacy;
      if (!raw) return clone(defaultState);

      const saved = JSON.parse(raw);
      const merged = { ...clone(defaultState), ...saved };
      if (!Array.isArray(merged.teams) || merged.teams.length !== 2) {
        merged.teams = clone(defaultState.teams);
      }

      // A v1 save predates the expanded prompt packs, so enable every pack on migration.
      merged.selectedPacks = v2 && Array.isArray(saved.selectedPacks)
        ? saved.selectedPacks.filter(id => packs.some(p => p.id === id))
        : packs.map(p => p.id);

      if (!merged.selectedPacks.length) merged.selectedPacks = packs.map(p => p.id);
      merged.customSpectra = Array.isArray(merged.customSpectra) ? merged.customSpectra : [];
      merged.mode = merged.mode === "cooperative" ? "cooperative" : "competitive";
      merged.coopTargetScore = positiveInt(merged.coopTargetScore, 20, 200);
      merged.coopRoundLimit = positiveInt(merged.coopRoundLimit, 8, 50);
      if (!["setup","psychic","clue","guess","opponent","reveal","result"].includes(merged.phase)) {
        merged.phase = "setup";
      }
      if (merged.mode === "cooperative" && merged.phase === "opponent") merged.phase = "reveal";
      return merged;
    } catch {
      return clone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function positiveInt(value, fallback, max = 999) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? Math.min(max, n) : fallback;
  }

  function parsePlayers(text) {
    return text.split(/[,\n]/)
      .map(s => s.trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .slice(0, 30);
  }

  function cleanName(value, fallback) {
    const x = String(value || "").trim().replace(/\s+/g, " ");
    return x || fallback;
  }

  function activeTeam() {
    return state.teams[isCoop() ? 0 : state.activeTeam];
  }

  function otherTeam() {
    return state.teams[1 - state.activeTeam];
  }

  function psychicFor(teamIndex = null) {
    const idx = isCoop() ? 0 : (teamIndex ?? state.activeTeam);
    const team = state.teams[idx];
    if (!team.players.length) return "Psychic";
    return team.players[team.psychicIndex % team.players.length];
  }

  function allSpectra() {
    const selected = new Set(state.selectedPacks);
    const builtIn = packs.flatMap(pack =>
      selected.has(pack.id)
        ? pack.spectra.map(([left, right], i) => ({
            id: `${pack.id}-${i}`, left, right, pack: pack.id
          }))
        : []
    );
    const custom = state.customSpectra.map((s, i) => ({
      id: `custom-${i}-${s.left}-${s.right}`, ...s, pack: "custom"
    }));
    return [...builtIn, ...custom];
  }

  function randomSpectrum() {
    const deck = allSpectra();
    if (!deck.length) return { id: "fallback", left: "Bad", right: "Good", pack: "fallback" };
    const choices = state.currentSpectrum && deck.length > 1
      ? deck.filter(s => s.id !== state.currentSpectrum.id)
      : deck;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function randomTarget() {
    return 0.15 + Math.random() * 0.70;
  }

  function startRound(newSpectrum = true) {
    if (newSpectrum || !state.currentSpectrum) state.currentSpectrum = randomSpectrum();
    state.target = randomTarget();
    state.needle = 0.5;
    state.clue = "";
    state.opponentGuess = null;
    state.phase = "psychic";
    state.winnerDismissed = false;
    state.coopChallengeEnded = false;
    saveState();
    render();
  }

  function snapshotBeforeScore() {
    return clone({
      mode: state.mode,
      teams: state.teams,
      activeTeam: state.activeTeam,
      round: state.round,
      currentSpectrum: state.currentSpectrum,
      target: state.target,
      needle: state.needle,
      clue: state.clue,
      opponentGuess: state.opponentGuess,
      coopChallengeEnded: state.coopChallengeEnded
    });
  }

  function scoreForDistance(distance) {
    if (distance <= 0.03) return 4;
    if (distance <= 0.075) return 3;
    if (distance <= 0.125) return 2;
    return 0;
  }

  function revealAndScore() {
    state.lastRoundSnapshot = snapshotBeforeScore();

    const distance = Math.abs(state.needle - state.target);
    const activePoints = scoreForDistance(distance);
    const trueDirection = state.target < state.needle ? "left" : "right";

    if (isCoop()) {
      state.teams[0].score += activePoints;
      state._roundOutcome = {
        activePoints,
        opponentPoints: 0,
        trueDirection,
        challengeSuccess: state.teams[0].score >= state.coopTargetScore
      };
      state.phase = "result";

      if (state.teams[0].score >= state.coopTargetScore || state.round >= state.coopRoundLimit) {
        state.coopChallengeEnded = true;
      }

      saveState();
      render();

      if (state.coopChallengeEnded && !state.winnerDismissed) {
        showCoopEnd(state.teams[0].score >= state.coopTargetScore);
      }
      return;
    }

    const opponentPoints =
      activePoints === 4 ? 0 : (state.opponentGuess === trueDirection ? 1 : 0);

    const activeIndex = state.activeTeam;
    const otherIndex = 1 - activeIndex;
    state.teams[activeIndex].score += activePoints;
    state.teams[otherIndex].score += opponentPoints;
    state.phase = "result";

    const stillBehind = state.teams[activeIndex].score < state.teams[otherIndex].score;
    state._roundOutcome = { activePoints, opponentPoints, trueDirection, stillBehind };
    saveState();
    render();

    const winner = winningTeam();
    if (winner !== null && !state.winnerDismissed) showWinner(winner);
  }

  function winningTeam() {
    if (isCoop()) return null;
    const [a, b] = state.teams;
    if (a.score < state.winningScore && b.score < state.winningScore) return null;
    if (a.score === b.score) return null;
    return a.score > b.score ? 0 : 1;
  }

  function rotatePsychic(teamIndex) {
    const team = state.teams[teamIndex];
    if (team.players.length) {
      team.psychicIndex = (team.psychicIndex + 1) % team.players.length;
    }
  }

  function advanceRound() {
    if (isCoop()) {
      if (state.coopChallengeEnded) {
        resetMatch(true);
        return;
      }
      rotatePsychic(0);
      state.round += 1;
      delete state._roundOutcome;
      startRound(true);
      return;
    }

    const outcome = state._roundOutcome || {};
    const active = state.activeTeam;
    const getsCatchup =
      state.catchup && outcome.activePoints === 4 && outcome.stillBehind;

    rotatePsychic(active);
    if (!getsCatchup) state.activeTeam = 1 - active;
    state.round += 1;
    delete state._roundOutcome;
    startRound(true);
  }

  function undoRound() {
    const snap = state.lastRoundSnapshot;
    if (!snap) return;

    state.mode = snap.mode;
    state.teams = clone(snap.teams);
    state.activeTeam = snap.activeTeam;
    state.round = snap.round;
    state.currentSpectrum = clone(snap.currentSpectrum);
    state.target = snap.target;
    state.needle = snap.needle;
    state.clue = snap.clue;
    state.opponentGuess = snap.opponentGuess;
    state.coopChallengeEnded = false;
    state.phase = "reveal";
    state.lastRoundSnapshot = null;
    delete state._roundOutcome;

    if (els.winnerModal.open) els.winnerModal.close();
    saveState();
    render();
  }

  function resetMatch(keepPlayers = true) {
    const oldMode = state.mode;
    const oldTeams = keepPlayers
      ? state.teams.map(t => ({ ...t, score: 0, psychicIndex: 0 }))
      : clone(defaultState.teams);

    const preserve = {
      mode: oldMode,
      teams: oldTeams,
      selectedPacks: clone(state.selectedPacks),
      customSpectra: clone(state.customSpectra),
      winningScore: state.winningScore,
      catchup: state.catchup,
      coopTargetScore: state.coopTargetScore,
      coopRoundLimit: state.coopRoundLimit
    };

    state = { ...clone(defaultState), ...preserve };
    state.activeTeam = 0;
    state.round = 1;

    const enoughPlayers = isCoop()
      ? state.teams[0].players.length >= 2
      : state.teams.every(t => t.players.length >= 1);

    if (enoughPlayers) {
      startRound(true);
    } else {
      saveState();
      render();
      populateSetup();
      openModal(els.setupModal);
    }
  }

  function polar(norm, radius) {
    const theta = Math.PI * (1 - norm);
    return {
      x: 300 + radius * Math.cos(theta),
      y: 290 - radius * Math.sin(theta)
    };
  }

  function ringSegment(startNorm, endNorm, innerR = 196, outerR = 284) {
    const a = Math.max(0, Math.min(1, startNorm));
    const b = Math.max(0, Math.min(1, endNorm));
    const p1 = polar(a, outerR);
    const p2 = polar(b, outerR);
    const p3 = polar(b, innerR);
    const p4 = polar(a, innerR);

    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${outerR} ${outerR} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 0 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      "Z"
    ].join(" ");
  }

  function updateTargetPaths() {
    const c = state.target;
    els.target2Left.setAttribute("d", ringSegment(c - .125, c - .075));
    els.target3Left.setAttribute("d", ringSegment(c - .075, c - .03));
    els.target4.setAttribute("d", ringSegment(c - .03, c + .03));
    els.target3Right.setAttribute("d", ringSegment(c + .03, c + .075));
    els.target2Right.setAttribute("d", ringSegment(c + .075, c + .125));
  }

  function updateNeedle() {
    const p = polar(state.needle, 218);
    els.needle.setAttribute("x2", p.x.toFixed(2));
    els.needle.setAttribute("y2", p.y.toFixed(2));
    els.needleGrip.setAttribute("cx", p.x.toFixed(2));
    els.needleGrip.setAttribute("cy", p.y.toFixed(2));
    els.positionPercent.textContent = `${Math.round(state.needle * 100)}%`;
  }

  function setNeedleFromPointer(event) {
    const rect = els.dial.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 600 / rect.width;
    const y = (event.clientY - rect.top) * 330 / rect.height;
    const dx = x - 300;
    const dy = 290 - y;
    let theta = Math.atan2(dy, dx);
    theta = Math.max(0, Math.min(Math.PI, theta));
    state.needle = Math.max(0, Math.min(1, 1 - theta / Math.PI));
    updateNeedle();
  }

  function setPhaseText(title, hint) {
    els.phaseTitle.textContent = title;
    els.phaseHint.textContent = hint;
  }

  function hideAllControls() {
    [
      els.psychicControls,
      els.clueControls,
      els.guessControls,
      els.opponentControls,
      els.revealControls,
      els.resultControls
    ].forEach(el => el.classList.add("hidden"));
  }

  function roundsRemaining() {
    return Math.max(0, state.coopRoundLimit - state.round + 1);
  }

  function renderScoreboards() {
    if (isCoop()) {
      const team = state.teams[0];
      [els.teamAName, els.teamANameMini].forEach(el => el.textContent = team.name);
      [els.teamAScore, els.teamAScoreMini].forEach(el => el.textContent = team.score);
      [els.teamBName, els.teamBNameMini].forEach(el => el.textContent = "Goal");
      [els.teamBScore, els.teamBScoreMini].forEach(el => el.textContent = state.coopTargetScore);
      els.targetScorePill.textContent = `Round ${Math.min(state.round, state.coopRoundLimit)} of ${state.coopRoundLimit}`;
      els.activeTeamPill.textContent = "Co-op";
    } else {
      const [a, b] = state.teams;
      [els.teamAName, els.teamANameMini].forEach(el => el.textContent = a.name);
      [els.teamAScore, els.teamAScoreMini].forEach(el => el.textContent = a.score);
      [els.teamBName, els.teamBNameMini].forEach(el => el.textContent = b.name);
      [els.teamBScore, els.teamBScoreMini].forEach(el => el.textContent = b.score);
      els.targetScorePill.textContent = `First to ${state.winningScore}`;
      els.activeTeamPill.textContent = activeTeam().name;
    }
  }

  function render() {
    renderScoreboards();

    els.roundLabel.textContent = isCoop()
      ? `Round ${state.round} / ${state.coopRoundLimit}`
      : `Round ${state.round}`;

    els.psychicName.textContent = psychicFor();

    if (isCoop()) {
      const remaining = roundsRemaining();
      els.psychicRotation.textContent =
        `${state.teams[0].players.length} player${state.teams[0].players.length === 1 ? "" : "s"} · ${remaining} round${remaining === 1 ? "" : "s"} remaining`;
    } else {
      els.psychicRotation.textContent = activeTeam().players.length
        ? `${activeTeam().name} · ${activeTeam().players.length} player${activeTeam().players.length === 1 ? "" : "s"}`
        : "Set up players to rotate automatically.";
      els.opponentTeamLabel.textContent = otherTeam().name;
    }

    els.undoBtn.disabled = !state.lastRoundSnapshot;

    const spectrum = state.currentSpectrum || { left: "LEFT", right: "RIGHT" };
    els.leftPole.textContent = spectrum.left;
    els.rightPole.textContent = spectrum.right;
    els.clueDisplay.textContent = state.clue || "—";
    els.clueInput.value = state.clue || "";

    updateTargetPaths();
    updateNeedle();
    hideAllControls();

    els.positionReadout.classList.toggle(
      "hidden",
      !["guess","opponent","reveal","result"].includes(state.phase)
    );

    if (state.phase === "setup") {
      setPhaseText(
        "Set up the table",
        "Competitive teams or one cooperative score challenge."
      );
      els.privacyCurtain.classList.remove("hidden");
      els.privacyTitle.textContent = "Ready when you are";
      els.privacyText.textContent = "Add players and choose a mode to begin.";
      els.psychicControls.classList.remove("hidden");
      els.revealPrivateBtn.textContent = "Open setup";
      els.targetGroup.classList.add("hidden");
      return;
    }

    els.revealPrivateBtn.textContent = "Reveal target privately";

    if (state.phase === "psychic") {
      setPhaseText(
        `${psychicFor()}, you're the psychic`,
        isCoop()
          ? `${state.teams[0].name} is playing together this round.`
          : `${activeTeam().name} is giving the clue this round.`
      );
      els.privacyCurtain.classList.remove("hidden");
      els.privacyTitle.textContent = `Pass the screen to ${psychicFor()}`;
      els.privacyText.textContent = "Everyone else should look away.";
      els.targetGroup.classList.add("hidden");
      els.psychicControls.classList.remove("hidden");
    }

    if (state.phase === "clue") {
      setPhaseText(
        "Find the clue",
        isCoop()
          ? "Give everyone else one clue for the hidden position."
          : "Your team will only see the spectrum and your clue."
      );
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.remove("hidden");
      els.clueControls.classList.remove("hidden");
    }

    if (state.phase === "guess") {
      setPhaseText(
        isCoop() ? `${state.teams[0].name}, place the dial` : `${activeTeam().name}, place the dial`,
        `What did ${psychicFor()} mean by “${state.clue || "that clue"}”?`
      );
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.add("hidden");
      els.guessControls.classList.remove("hidden");
      els.lockGuessBtn.textContent = isCoop() ? "Lock guess" : "Lock team guess";
    }

    if (state.phase === "opponent" && !isCoop()) {
      setPhaseText(
        `${otherTeam().name}, left or right?`,
        "The active team's dial is locked. Read the psychic one step further."
      );
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.add("hidden");
      els.opponentControls.classList.remove("hidden");
    }

    if (state.phase === "reveal") {
      setPhaseText(
        "Final answer locked",
        isCoop()
          ? "Reveal the hidden target and add the points to your shared score."
          : "Reveal the hidden target and score the round."
      );
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.add("hidden");
      els.revealControls.classList.remove("hidden");
    }

    if (state.phase === "result") {
      setPhaseText(
        isCoop() ? "How close were you?" : "How close were you?",
        isCoop()
          ? `${state.teams[0].score} of ${state.coopTargetScore} points after round ${state.round}.`
          : "The target is revealed."
      );
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.remove("hidden");
      els.resultControls.classList.remove("hidden");

      const o = state._roundOutcome || {
        activePoints: 0,
        opponentPoints: 0,
        trueDirection: "—"
      };

      if (isCoop()) {
        const pct = Math.min(100, Math.round((state.teams[0].score / state.coopTargetScore) * 100));
        els.resultBanner.innerHTML = `
          <div class="result-piece">
            <span>Round ${state.round}</span>
            <strong>+${o.activePoints} point${o.activePoints === 1 ? "" : "s"}</strong>
          </div>
          <div class="result-piece">
            <span>Challenge progress</span>
            <strong>${state.teams[0].score}/${state.coopTargetScore} · ${pct}%</strong>
          </div>`;
        els.nextRoundBtn.textContent = state.coopChallengeEnded ? "New challenge" : "Next round";
      } else {
        els.resultBanner.innerHTML = `
          <div class="result-piece">
            <span>${escapeHtml(activeTeam().name)}</span>
            <strong>+${o.activePoints} point${o.activePoints === 1 ? "" : "s"}</strong>
          </div>
          <div class="result-piece">
            <span>${escapeHtml(otherTeam().name)} · ${escapeHtml((state.opponentGuess || "—").toUpperCase())}</span>
            <strong>+${o.opponentPoints} point${o.opponentPoints === 1 ? "" : "s"}</strong>
          </div>`;
        els.nextRoundBtn.textContent = "Next round";
      }
    }
  }

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c])
    );
  }

  function openModal(dialog) {
    if (dialog && !dialog.open) dialog.showModal();
  }

  function closeModal(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function showWinner(index) {
    const team = state.teams[index];
    els.winnerTitle.textContent = `${team.name} wins`;
    els.winnerText.textContent = `${state.teams[0].score}–${state.teams[1].score}.`;
    els.keepPlayingBtn.textContent = "Keep playing";
    els.newMatchBtn.textContent = "New match";
    openModal(els.winnerModal);
  }

  function showCoopEnd(success) {
    if (success) {
      els.winnerTitle.textContent = "Challenge complete";
      els.winnerText.textContent =
        `${state.teams[0].name} reached ${state.teams[0].score}/${state.coopTargetScore} points in ${state.round} round${state.round === 1 ? "" : "s"}.`;
    } else {
      els.winnerTitle.textContent = "Challenge over";
      els.winnerText.textContent =
        `${state.teams[0].name} finished on ${state.teams[0].score}/${state.coopTargetScore} points after ${state.coopRoundLimit} rounds.`;
    }
    els.keepPlayingBtn.textContent = "Close";
    els.newMatchBtn.textContent = "New challenge";
    openModal(els.winnerModal);
  }

  function renderPackControls() {
    els.packControls.innerHTML = "";
    for (const pack of packs) {
      const label = document.createElement("label");
      label.className = "pack-toggle";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = state.selectedPacks.includes(pack.id);
      input.addEventListener("change", () => {
        if (input.checked) {
          if (!state.selectedPacks.includes(pack.id)) state.selectedPacks.push(pack.id);
        } else {
          state.selectedPacks = state.selectedPacks.filter(id => id !== pack.id);
        }
        saveState();
      });

      const copy = document.createElement("span");
      copy.innerHTML =
        `<strong>${escapeHtml(pack.name)}</strong><small>${escapeHtml(pack.description)} · ${pack.spectra.length} spectra</small>`;

      label.append(input, copy);
      els.packControls.appendChild(label);
    }
  }

  function renderCustomList() {
    els.customSpectrumList.innerHTML = "";
    state.customSpectra.forEach((s, i) => {
      const item = document.createElement("div");
      item.className = "custom-item";
      item.innerHTML =
        `<span><strong>${escapeHtml(s.left)}</strong> ↔ <strong>${escapeHtml(s.right)}</strong></span>`;

      const btn = document.createElement("button");
      btn.className = "mini-button";
      btn.type = "button";
      btn.textContent = "remove";
      btn.addEventListener("click", () => {
        state.customSpectra.splice(i, 1);
        saveState();
        renderCustomList();
      });

      item.appendChild(btn);
      els.customSpectrumList.appendChild(item);
    });
  }

  function selectedModeFromSetup() {
    return document.querySelector('input[name="gameMode"]:checked')?.value === "cooperative"
      ? "cooperative"
      : "competitive";
  }

  function updateCoopMathHint() {
    const rounds = positiveInt(els.coopRoundsInput.value, 8, 50);
    const target = positiveInt(els.coopTargetInput.value, 20, 200);
    const max = 4 * rounds;
    const avg = target / rounds;

    els.coopMathHint.classList.remove("hidden", "warning", "impossible", "good");

    if (target > max) {
      els.coopMathHint.classList.add("impossible");
      els.coopMathHint.textContent =
        `Impossible as set: ${rounds} rounds can score at most ${max} points.`;
    } else if (avg > 3) {
      els.coopMathHint.classList.add("warning");
      els.coopMathHint.textContent =
        `Hard challenge: you need ${avg.toFixed(1)} points per round on average (maximum is 4).`;
    } else {
      els.coopMathHint.classList.add("good");
      els.coopMathHint.textContent =
        `You need ${avg.toFixed(1)} points per round on average; maximum possible is ${max}.`;
    }
  }

  function syncSetupMode() {
    const mode = selectedModeFromSetup();
    const coop = mode === "cooperative";

    els.teamBCard.classList.toggle("hidden", coop);
    els.competitiveSettings.classList.toggle("hidden", coop);
    els.cooperativeSettings.classList.toggle("hidden", !coop);
    els.coopMathHint.classList.toggle("hidden", !coop);

    els.teamANameLabel.textContent = coop ? "Group name" : "Team A name";
    els.teamAPlayersLabel.textContent = coop ? "Players" : "Team A players";
    els.setupTitle.textContent = coop ? "Cooperative challenge" : "Competitive match";
    els.setupIntro.textContent = coop
      ? "Everyone shares one score. Psychics rotate through the group while you chase a target within a fixed number of rounds."
      : "Two teams alternate psychics and race to the winning score.";

    els.saveSetupBtn.textContent = coop ? "Start challenge" : "Start match";
    if (coop) updateCoopMathHint();
  }

  function populateSetup() {
    const radio = document.querySelector(`input[name="gameMode"][value="${state.mode}"]`);
    if (radio) radio.checked = true;

    els.teamANameInput.value = state.teams[0].name;
    els.teamBNameInput.value = state.teams[1].name;
    els.teamAPlayersInput.value = state.teams[0].players.join(", ");
    els.teamBPlayersInput.value = state.teams[1].players.join(", ");
    els.winningScoreInput.value = state.winningScore;
    els.catchupInput.checked = state.catchup;
    els.coopTargetInput.value = state.coopTargetScore;
    els.coopRoundsInput.value = state.coopRoundLimit;
    els.setupStatus.textContent = "";
    syncSetupMode();
  }

  document.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      const dialog = document.getElementById(btn.dataset.open);
      if (dialog === els.spectraModal) {
        renderPackControls();
        renderCustomList();
      }
      if (dialog === els.setupModal) populateSetup();
      openModal(dialog);
    });
  });

  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.closest("dialog")));
  });

  document.querySelectorAll('input[name="gameMode"]').forEach(input => {
    input.addEventListener("change", syncSetupMode);
  });
  els.coopTargetInput.addEventListener("input", updateCoopMathHint);
  els.coopRoundsInput.addEventListener("input", updateCoopMathHint);

  els.saveSetupBtn.addEventListener("click", () => {
    const mode = selectedModeFromSetup();
    const pA = parsePlayers(els.teamAPlayersInput.value);
    const pB = parsePlayers(els.teamBPlayersInput.value);

    if (mode === "cooperative") {
      if (pA.length < 2) {
        els.setupStatus.textContent = "Add at least two players for cooperative mode.";
        return;
      }

      const rounds = positiveInt(els.coopRoundsInput.value, 8, 50);
      const target = positiveInt(els.coopTargetInput.value, 20, 200);
      if (target > rounds * 4) {
        els.setupStatus.textContent =
          `That target is impossible: ${rounds} rounds can score at most ${rounds * 4} points.`;
        return;
      }

      state.mode = "cooperative";
      state.teams[0] = {
        name: cleanName(els.teamANameInput.value, "Everyone"),
        players: pA,
        score: 0,
        psychicIndex: 0
      };
      state.teams[1] = {
        name: cleanName(els.teamBNameInput.value, "Team B"),
        players: pB,
        score: 0,
        psychicIndex: 0
      };
      state.coopTargetScore = target;
      state.coopRoundLimit = rounds;
    } else {
      if (!pA.length || !pB.length) {
        els.setupStatus.textContent = "Add at least one player to each team.";
        return;
      }

      state.mode = "competitive";
      state.teams[0] = {
        name: cleanName(els.teamANameInput.value, "Team A"),
        players: pA,
        score: 0,
        psychicIndex: 0
      };
      state.teams[1] = {
        name: cleanName(els.teamBNameInput.value, "Team B"),
        players: pB,
        score: 0,
        psychicIndex: 0
      };
      state.winningScore = positiveInt(els.winningScoreInput.value, 10, 50);
      state.catchup = els.catchupInput.checked;
    }

    state.activeTeam = 0;
    state.round = 1;
    state.lastRoundSnapshot = null;
    state.coopChallengeEnded = false;
    closeModal(els.setupModal);
    startRound(true);
  });

  els.revealPrivateBtn.addEventListener("click", () => {
    if (state.phase === "setup") {
      populateSetup();
      openModal(els.setupModal);
      return;
    }
    state.phase = "clue";
    saveState();
    render();
    setTimeout(() => els.clueInput.focus(), 50);
  });

  els.clueInput.addEventListener("input", () => {
    state.clue = els.clueInput.value.trim();
    els.clueDisplay.textContent = state.clue || "—";
    saveState();
  });

  els.hideTargetBtn.addEventListener("click", () => {
    if (!els.clueInput.value.trim()) {
      els.clueInput.focus();
      return;
    }
    state.clue = els.clueInput.value.trim();
    state.phase = "guess";
    saveState();
    render();
  });

  els.newSpectrumBtn.addEventListener("click", () => {
    state.currentSpectrum = randomSpectrum();
    state.target = randomTarget();
    state.clue = "";
    state.needle = 0.5;
    saveState();
    render();
    els.clueInput.focus();
  });

  els.dial.addEventListener("pointerdown", event => {
    if (state.phase !== "guess") return;
    dragging = true;
    els.dial.classList.add("dragging");
    els.dial.setPointerCapture?.(event.pointerId);
    setNeedleFromPointer(event);
  });

  els.dial.addEventListener("pointermove", event => {
    if (!dragging || state.phase !== "guess") return;
    setNeedleFromPointer(event);
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    els.dial.classList.remove("dragging");
    try { els.dial.releasePointerCapture?.(event.pointerId); } catch {}
    saveState();
  }

  els.dial.addEventListener("pointerup", endDrag);
  els.dial.addEventListener("pointercancel", endDrag);

  els.lockGuessBtn.addEventListener("click", () => {
    state.phase = isCoop() ? "reveal" : "opponent";
    saveState();
    render();
  });

  document.querySelectorAll("[data-direction]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (isCoop()) return;
      state.opponentGuess = btn.dataset.direction;
      state.phase = "reveal";
      saveState();
      render();
    });
  });

  els.revealScoreBtn.addEventListener("click", revealAndScore);
  els.nextRoundBtn.addEventListener("click", advanceRound);
  els.undoBtn.addEventListener("click", undoRound);

  els.resetBtn.addEventListener("click", () => {
    const noun = isCoop() ? "challenge" : "match";
    if (confirm(`Reset the ${noun} with the same players?`)) resetMatch(true);
  });

  els.customSpectrumForm.addEventListener("submit", event => {
    event.preventDefault();
    const left = cleanName(els.customLeftInput.value, "");
    const right = cleanName(els.customRightInput.value, "");
    if (!left || !right) return;

    state.customSpectra.push({ left, right });
    els.customLeftInput.value = "";
    els.customRightInput.value = "";
    saveState();
    renderCustomList();
  });

  els.keepPlayingBtn.addEventListener("click", () => {
    state.winnerDismissed = true;
    saveState();
    closeModal(els.winnerModal);
  });

  els.newMatchBtn.addEventListener("click", () => {
    closeModal(els.winnerModal);
    resetMatch(true);
  });

  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      const rect = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!inside) dialog.close();
    });
  });

  renderPackControls();
  renderCustomList();
  populateSetup();
  render();

  if (state.phase === "setup") {
    setTimeout(() => openModal(els.setupModal), 250);
  }
})();
