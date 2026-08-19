(() => {
  const packs = window.SPECTRUM_PACKS || [];
  const STORAGE_KEY = "sameWavelengthState:v1";

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
    teamANameInput: $("teamANameInput"),
    teamBNameInput: $("teamBNameInput"),
    teamAPlayersInput: $("teamAPlayersInput"),
    teamBPlayersInput: $("teamBPlayersInput"),
    winningScoreInput: $("winningScoreInput"),
    catchupInput: $("catchupInput"),
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
    teams: [
      { name: "Team A", players: [], score: 0, psychicIndex: 0 },
      { name: "Team B", players: [], score: 0, psychicIndex: 0 }
    ],
    activeTeam: 0,
    round: 1,
    winningScore: 10,
    catchup: true,
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

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return clone(defaultState);
      const merged = { ...clone(defaultState), ...saved };
      if (!Array.isArray(merged.teams) || merged.teams.length !== 2) merged.teams = clone(defaultState.teams);
      merged.selectedPacks = Array.isArray(merged.selectedPacks)
        ? merged.selectedPacks.filter(id => packs.some(p => p.id === id))
        : packs.map(p => p.id);
      merged.customSpectra = Array.isArray(merged.customSpectra) ? merged.customSpectra : [];
      if (!["setup","psychic","clue","guess","opponent","reveal","result"].includes(merged.phase)) merged.phase = "setup";
      return merged;
    } catch {
      return clone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function parsePlayers(text) {
    return text.split(/[,\n]/).map(s => s.trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, 20);
  }

  function cleanName(value, fallback) {
    const x = String(value || "").trim().replace(/\s+/g, " ");
    return x || fallback;
  }

  function activeTeam() { return state.teams[state.activeTeam]; }
  function otherTeam() { return state.teams[1 - state.activeTeam]; }

  function psychicFor(teamIndex = state.activeTeam) {
    const team = state.teams[teamIndex];
    if (!team.players.length) return "Psychic";
    return team.players[team.psychicIndex % team.players.length];
  }

  function allSpectra() {
    const selected = new Set(state.selectedPacks);
    const builtIn = packs.flatMap(pack =>
      selected.has(pack.id) ? pack.spectra.map(([left,right], i) => ({
        id: `${pack.id}-${i}`, left, right, pack: pack.id
      })) : []
    );
    const custom = state.customSpectra.map((s,i) => ({
      id: `custom-${i}-${s.left}-${s.right}`, ...s, pack: "custom"
    }));
    return [...builtIn, ...custom];
  }

  function randomSpectrum() {
    const deck = allSpectra();
    if (!deck.length) return { id: "fallback", left: "Bad", right: "Good", pack: "fallback" };
    let choices = deck;
    if (state.currentSpectrum && deck.length > 1) {
      choices = deck.filter(s => s.id !== state.currentSpectrum.id);
    }
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function randomTarget() {
    // Keep the full scoring band comfortably inside the visible semicircle.
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
    saveState();
    render();
  }

  function snapshotBeforeScore() {
    return clone({
      teams: state.teams,
      activeTeam: state.activeTeam,
      round: state.round,
      currentSpectrum: state.currentSpectrum,
      target: state.target,
      needle: state.needle,
      clue: state.clue,
      opponentGuess: state.opponentGuess
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
    const opponentPoints = (activePoints === 4) ? 0 : (state.opponentGuess === trueDirection ? 1 : 0);

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
    const [a,b] = state.teams;
    if (a.score < state.winningScore && b.score < state.winningScore) return null;
    if (a.score === b.score) return null;
    return a.score > b.score ? 0 : 1;
  }

  function advanceRound() {
    const outcome = state._roundOutcome || {};
    const active = state.activeTeam;
    const getsCatchup = state.catchup && outcome.activePoints === 4 && outcome.stillBehind;

    // Rotate psychic every time that team completes a turn.
    const team = state.teams[active];
    if (team.players.length) team.psychicIndex = (team.psychicIndex + 1) % team.players.length;

    if (!getsCatchup) state.activeTeam = 1 - active;
    state.round += 1;
    delete state._roundOutcome;
    startRound(true);
  }

  function undoRound() {
    const snap = state.lastRoundSnapshot;
    if (!snap) return;
    state.teams = clone(snap.teams);
    state.activeTeam = snap.activeTeam;
    state.round = snap.round;
    state.currentSpectrum = clone(snap.currentSpectrum);
    state.target = snap.target;
    state.needle = snap.needle;
    state.clue = snap.clue;
    state.opponentGuess = snap.opponentGuess;
    state.phase = "reveal";
    state.lastRoundSnapshot = null;
    delete state._roundOutcome;
    saveState();
    render();
  }

  function resetMatch(keepTeams = true) {
    const teams = keepTeams ? state.teams.map(t => ({ ...t, score: 0, psychicIndex: 0 })) : clone(defaultState.teams);
    const selectedPacks = clone(state.selectedPacks);
    const customSpectra = clone(state.customSpectra);
    const winningScore = state.winningScore;
    const catchup = state.catchup;
    state = clone(defaultState);
    state.teams = teams;
    state.selectedPacks = selectedPacks;
    state.customSpectra = customSpectra;
    state.winningScore = winningScore;
    state.catchup = catchup;
    if (teams.every(t => t.players.length)) startRound(true);
    else {
      saveState();
      render();
      openModal(els.setupModal);
    }
  }

  function polar(norm, radius) {
    const theta = Math.PI * (1 - norm);
    return { x: 300 + radius * Math.cos(theta), y: 290 - radius * Math.sin(theta) };
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
    // Non-overlapping bands: 2 | 3 | 4 | 3 | 2
    els.target2Left.setAttribute("d", ringSegment(c-.125,c-.075));
    els.target3Left.setAttribute("d", ringSegment(c-.075,c-.03));
    els.target4.setAttribute("d", ringSegment(c-.03,c+.03));
    els.target3Right.setAttribute("d", ringSegment(c+.03,c+.075));
    els.target2Right.setAttribute("d", ringSegment(c+.075,c+.125));
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
    [els.psychicControls,els.clueControls,els.guessControls,els.opponentControls,els.revealControls,els.resultControls]
      .forEach(el => el.classList.add("hidden"));
  }

  function render() {
    const a = state.teams[0], b = state.teams[1];
    [els.teamAName,els.teamANameMini].forEach(el => el.textContent = a.name);
    [els.teamBName,els.teamBNameMini].forEach(el => el.textContent = b.name);
    [els.teamAScore,els.teamAScoreMini].forEach(el => el.textContent = a.score);
    [els.teamBScore,els.teamBScoreMini].forEach(el => el.textContent = b.score);
    els.targetScorePill.textContent = `First to ${state.winningScore}`;
    els.roundLabel.textContent = `Round ${state.round}`;
    els.activeTeamPill.textContent = activeTeam().name;
    els.psychicName.textContent = psychicFor();
    els.psychicRotation.textContent = activeTeam().players.length
      ? `${activeTeam().name} · ${activeTeam().players.length} player${activeTeam().players.length === 1 ? "" : "s"}`
      : "Set up players to rotate automatically.";
    els.opponentTeamLabel.textContent = otherTeam().name;
    els.undoBtn.disabled = !state.lastRoundSnapshot;

    const spectrum = state.currentSpectrum || { left:"LEFT", right:"RIGHT" };
    els.leftPole.textContent = spectrum.left;
    els.rightPole.textContent = spectrum.right;
    els.clueDisplay.textContent = state.clue || "—";
    els.clueInput.value = state.clue || "";

    updateTargetPaths();
    updateNeedle();
    hideAllControls();

    els.positionReadout.classList.toggle("hidden", !["guess","opponent","reveal","result"].includes(state.phase));

    if (state.phase === "setup") {
      setPhaseText("Set up your teams", "Two teams, one shared screen, zero accounts.");
      els.privacyCurtain.classList.remove("hidden");
      els.privacyTitle.textContent = "Ready when you are";
      els.privacyText.textContent = "Add players to begin.";
      els.psychicControls.classList.remove("hidden");
      els.revealPrivateBtn.textContent = "Set up teams";
      els.targetGroup.classList.add("hidden");
      return;
    }

    els.revealPrivateBtn.textContent = "Reveal target privately";

    if (state.phase === "psychic") {
      setPhaseText(`${psychicFor()}, you're the psychic`, `${activeTeam().name} is giving the clue this round.`);
      els.privacyCurtain.classList.remove("hidden");
      els.privacyTitle.textContent = `Pass the screen to ${psychicFor()}`;
      els.privacyText.textContent = "Everyone else should look away.";
      els.targetGroup.classList.add("hidden");
      els.psychicControls.classList.remove("hidden");
    }

    if (state.phase === "clue") {
      setPhaseText("Find the clue", "Your team will only see the spectrum and your clue.");
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.remove("hidden");
      els.clueControls.classList.remove("hidden");
    }

    if (state.phase === "guess") {
      setPhaseText(`${activeTeam().name}, place the dial`, `What did ${psychicFor()} mean by “${state.clue || "that clue"}”?`);
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.add("hidden");
      els.guessControls.classList.remove("hidden");
    }

    if (state.phase === "opponent") {
      setPhaseText(`${otherTeam().name}, left or right?`, "The active team's dial is locked. Read the psychic one step further.");
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.add("hidden");
      els.opponentControls.classList.remove("hidden");
    }

    if (state.phase === "reveal") {
      setPhaseText("Final answer locked", "Reveal the hidden target and score the round.");
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.add("hidden");
      els.revealControls.classList.remove("hidden");
    }

    if (state.phase === "result") {
      setPhaseText("How close were you?", "The target is revealed.");
      els.privacyCurtain.classList.add("hidden");
      els.targetGroup.classList.remove("hidden");
      els.resultControls.classList.remove("hidden");
      const o = state._roundOutcome || { activePoints:0, opponentPoints:0, trueDirection:"—" };
      els.resultBanner.innerHTML = `
        <div class="result-piece">
          <span>${escapeHtml(activeTeam().name)}</span>
          <strong>+${o.activePoints} point${o.activePoints === 1 ? "" : "s"}</strong>
        </div>
        <div class="result-piece">
          <span>${escapeHtml(otherTeam().name)} · ${escapeHtml((state.opponentGuess || "—").toUpperCase())}</span>
          <strong>+${o.opponentPoints} point${o.opponentPoints === 1 ? "" : "s"}</strong>
        </div>`;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function openModal(dialog) {
    if (!dialog.open) dialog.showModal();
  }

  function closeModal(dialog) {
    if (dialog.open) dialog.close();
  }

  function showWinner(index) {
    const team = state.teams[index];
    els.winnerTitle.textContent = `${team.name} wins`;
    els.winnerText.textContent = `${state.teams[0].score}–${state.teams[1].score}.`;
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
      copy.innerHTML = `<strong>${escapeHtml(pack.name)}</strong><small>${escapeHtml(pack.description)} · ${pack.spectra.length} spectra</small>`;
      label.append(input, copy);
      els.packControls.appendChild(label);
    }
  }

  function renderCustomList() {
    els.customSpectrumList.innerHTML = "";
    state.customSpectra.forEach((s,i) => {
      const item = document.createElement("div");
      item.className = "custom-item";
      item.innerHTML = `<span><strong>${escapeHtml(s.left)}</strong> ↔ <strong>${escapeHtml(s.right)}</strong></span>`;
      const btn = document.createElement("button");
      btn.className = "mini-button";
      btn.type = "button";
      btn.textContent = "remove";
      btn.addEventListener("click", () => {
        state.customSpectra.splice(i,1);
        saveState();
        renderCustomList();
      });
      item.appendChild(btn);
      els.customSpectrumList.appendChild(item);
    });
  }

  // Modal wiring
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

  function populateSetup() {
    els.teamANameInput.value = state.teams[0].name;
    els.teamBNameInput.value = state.teams[1].name;
    els.teamAPlayersInput.value = state.teams[0].players.join(", ");
    els.teamBPlayersInput.value = state.teams[1].players.join(", ");
    els.winningScoreInput.value = state.winningScore;
    els.catchupInput.checked = state.catchup;
    els.setupStatus.textContent = "";
  }

  els.saveSetupBtn.addEventListener("click", () => {
    const pA = parsePlayers(els.teamAPlayersInput.value);
    const pB = parsePlayers(els.teamBPlayersInput.value);
    if (!pA.length || !pB.length) {
      els.setupStatus.textContent = "Add at least one player to each team.";
      return;
    }
    state.teams[0] = { name: cleanName(els.teamANameInput.value,"Team A"), players:pA, score:0, psychicIndex:0 };
    state.teams[1] = { name: cleanName(els.teamBNameInput.value,"Team B"), players:pB, score:0, psychicIndex:0 };
    state.winningScore = Math.max(1, Math.min(50, Number(els.winningScoreInput.value) || 10));
    state.catchup = els.catchupInput.checked;
    state.activeTeam = 0;
    state.round = 1;
    state.lastRoundSnapshot = null;
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

  // Dial pointer interaction
  els.dial.addEventListener("pointerdown", (e) => {
    if (state.phase !== "guess") return;
    dragging = true;
    els.dial.classList.add("dragging");
    els.dial.setPointerCapture?.(e.pointerId);
    setNeedleFromPointer(e);
  });
  els.dial.addEventListener("pointermove", (e) => {
    if (!dragging || state.phase !== "guess") return;
    setNeedleFromPointer(e);
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    els.dial.classList.remove("dragging");
    try { els.dial.releasePointerCapture?.(e.pointerId); } catch {}
    saveState();
  }
  els.dial.addEventListener("pointerup", endDrag);
  els.dial.addEventListener("pointercancel", endDrag);

  els.lockGuessBtn.addEventListener("click", () => {
    state.phase = "opponent";
    saveState();
    render();
  });

  document.querySelectorAll("[data-direction]").forEach(btn => {
    btn.addEventListener("click", () => {
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
    if (confirm("Reset scores and start a new match with the same teams?")) resetMatch(true);
  });

  els.customSpectrumForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const left = cleanName(els.customLeftInput.value,"");
    const right = cleanName(els.customRightInput.value,"");
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

  // Close dialogs by clicking the backdrop.
  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", (e) => {
      const rect = dialog.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
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
