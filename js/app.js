/**
 * Beach Volleyball Couple Matching — Main Application
 *
 * Handles UI interactions: player registration, validation,
 * couple generation display, and all DOM updates.
 */

(function () {
  'use strict';

  // --- State ---
  const players = [];
  let couplesGenerated = false;
  let lastResult = null;
  let tournamentState = null;   // { teams, groups, matches }
  let activeMatchId = null;     // which match card has the score form open
  let isReadOnly = false;       // true when viewing a shared URL (no editing)
  var db = null;                // Firebase Database instance (null = not configured)
  var sessionId = null;         // Active session ID written to / read from Firebase
  let pairingMode = 'random';  // 'random' | 'manual'
  let manualPairs = [];        // [{player1, player2}] — confirmed manual pairs
  let kingState = null;        // KingState object or null when no game active
  let kingWinCondition = 'consecutive'; // 'consecutive' | 'total'
  let kingTargetWins = 5;      // 5 | 7 | 10

  // --- DOM References ---
  const form = document.getElementById('player-form');
  const nameInput = document.getElementById('player-name');
  const genderSelect = document.getElementById('player-gender');
  const addBtn = document.getElementById('add-player-btn');
  const nameError = document.getElementById('name-error');
  const genderError = document.getElementById('gender-error');

  const playerList = document.getElementById('player-list');
  const playerCount = document.getElementById('player-count');
  const genderCounts = document.getElementById('gender-counts');
  const emptyMessage = document.getElementById('empty-message');
  const playersHeading = document.getElementById('players-heading');

  const generateBtn = document.getElementById('generate-btn');
  const generateHint = document.getElementById('generate-hint');
  const regenerateBtn = document.getElementById('regenerate-btn');
  const clearBtn = document.getElementById('clear-btn');

  const pairingToggle      = document.getElementById('pairing-toggle');
  const modeRandomBtn      = document.getElementById('mode-random-btn');
  const modeManualBtn      = document.getElementById('mode-manual-btn');
  const manualPairingPanel = document.getElementById('manual-pairing-panel');
  const selectMan          = document.getElementById('select-man');
  const selectWoman        = document.getElementById('select-woman');
  const manualPairBtn      = document.getElementById('manual-pair-btn');
  const manualPairsList    = document.getElementById('manual-pairs-list');
  const manualPairsEmpty   = document.getElementById('manual-pairs-empty');
  const confirmManualBtn   = document.getElementById('confirm-manual-btn');

  const resultsSection = document.getElementById('results-section');
  const couplesGrid = document.getElementById('couples-grid');
  const unmatchedNotice = document.getElementById('unmatched-notice');

  const tournamentSetup = document.getElementById('tournament-setup');
  const startTournamentBtn = document.getElementById('start-tournament-btn');
  const groupCountOptions = document.getElementById('group-count-options');
  const shareTournamentBtn = document.getElementById('share-tournament-btn');
  const resetTournamentBtn = document.getElementById('reset-tournament-btn');
  const readonlyBanner = document.getElementById('readonly-banner');
  const tournamentSection = document.getElementById('tournament-section');
  const tournamentGroupsEl = document.getElementById('tournament-groups');

  const kingSetup              = document.getElementById('king-setup');
  const startKingBtn           = document.getElementById('start-king-btn');
  const resetKingBtn           = document.getElementById('reset-king-btn');
  const kingSection            = document.getElementById('king-section');
  const kingWinConditionToggle = document.getElementById('king-win-condition-toggle');
  const kingTargetToggle       = document.getElementById('king-target-toggle');
  const kingTeamName           = document.getElementById('king-team-name');
  const kingWinsCount          = document.getElementById('king-wins-count');
  const kingWinsLabel          = document.getElementById('king-wins-label');
  const challengerTeamName     = document.getElementById('challenger-team-name');
  const kingWinsBtn            = document.getElementById('king-wins-btn');
  const challengerWinsBtn      = document.getElementById('challenger-wins-btn');
  const kingQueueList          = document.getElementById('king-queue-list');
  const kingLogList            = document.getElementById('king-log-list');
  const kingWinnerBanner       = document.getElementById('king-winner-banner');
  const kingWinnerName         = document.getElementById('king-winner-name');

  // --- Error auto-dismiss timers ---
  const errorTimers = {};

  // --- Initialization ---
  function init() {
    form.addEventListener('submit', handleAddPlayer);
    nameInput.addEventListener('input', updateAddButtonState);
    genderSelect.addEventListener('change', updateAddButtonState);
    generateBtn.addEventListener('click', handleGenerate);
    regenerateBtn.addEventListener('click', handleGenerate);
    clearBtn.addEventListener('click', handleClearAll);
    pairingToggle.addEventListener('click', handlePairingModeClick);
    manualPairBtn.addEventListener('click', handleManualPair);
    confirmManualBtn.addEventListener('click', handleConfirmManualCouples);
    selectMan.addEventListener('change', renderManualDropdowns);
    selectWoman.addEventListener('change', renderManualDropdowns);
    startTournamentBtn.addEventListener('click', handleStartTournament);
    resetTournamentBtn.addEventListener('click', handleResetTournament);
    shareTournamentBtn.addEventListener('click', handleShareTournament);
    groupCountOptions.addEventListener('click', handleGroupOptClick);
    startKingBtn.addEventListener('click', handleStartKing);
    resetKingBtn.addEventListener('click', handleResetKing);
    kingWinsBtn.addEventListener('click', function () { handleRally('king'); });
    challengerWinsBtn.addEventListener('click', function () { handleRally('challenger'); });
    kingWinConditionToggle.addEventListener('click', handleKingConditionClick);
    kingTargetToggle.addEventListener('click', handleKingTargetClick);
    updateUI();

    // Boot Firebase and decide how to restore tournament state
    var firebaseReady = initFirebase();
    var urlSid = getSessionIdFromURL();

    if (firebaseReady && urlSid) {
      sessionId = urlSid;
      if (!isSessionOwner(urlSid)) {
        // Viewer: subscribe for real-time updates
        isReadOnly = true;
        tournamentSection.hidden = false;
        readonlyBanner.hidden = false;
        resetTournamentBtn.hidden = true;
        tournamentSetup.hidden = true;
        subscribeToSession(urlSid);
      } else {
        // Organizer re-opening their own session
        loadSessionOnce(urlSid, function (state) {
          if (state) {
            tournamentState = state;
            saveTournamentState();
            tournamentSection.hidden = false;
            renderTournament();
          }
        });
      }
    } else if (firebaseReady) {
      // Firebase ready but no session ID in URL — check localStorage
      tournamentState = loadTournamentState();
      if (tournamentState) {
        tournamentSection.hidden = false;
        renderTournament();
      }
    } else {
      // Firebase not configured — fall back to legacy #t= URL hash + localStorage
      var urlState = loadFromURL();
      if (urlState) {
        isReadOnly = true;
        tournamentState = urlState;
        tournamentSection.hidden = false;
        readonlyBanner.hidden = false;
        resetTournamentBtn.hidden = true;
        tournamentSetup.hidden = true;
        renderTournament();
      } else {
        tournamentState = loadTournamentState();
        if (tournamentState) {
          tournamentSection.hidden = false;
          renderTournament();
        }
      }
    }

    // Restore king game from localStorage (only when no tournament is active)
    if (!tournamentState) {
      kingState = loadKingState();
      if (kingState) {
        kingSection.hidden = false;
        renderKing();
        updateActionButtons();
      }
    }
  }

  // Expose re-render hook for i18n language changes
  window._onLanguageChange = function () {
    updateUI();
    if (couplesGenerated && lastResult) {
      renderResults(lastResult);
    }
    if (tournamentState) {
      renderTournament();
    }
    if (kingState) {
      renderKing();
    }
  };

  // --- Validation ---

  /**
   * Validate player name and gender inputs.
   * @returns {{ valid: boolean, errors: { name?: string, gender?: string } }}
   */
  function validateInputs() {
    const errors = {};
    const name = nameInput.value.trim();
    const gender = genderSelect.value;

    if (!name) {
      errors.name = t('error.nameEmpty');
    } else if (name.length < 2) {
      errors.name = t('error.nameMin');
    } else if (name.length > 50) {
      errors.name = t('error.nameMax');
    }

    if (!gender) {
      errors.gender = t('error.gender');
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  function showError(field, message) {
    const el = field === 'name' ? nameError : genderError;
    const input = field === 'name' ? nameInput : genderSelect;
    el.innerHTML = '';
    const text = document.createElement('span');
    text.textContent = message;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'form__error-close';
    closeBtn.setAttribute('aria-label', t('error.dismiss'));
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => clearError(field));
    el.appendChild(text);
    el.appendChild(closeBtn);
    input.classList.add(field === 'name' ? 'form__input--error' : 'form__select--error');

    // Clear any existing timer for this field
    if (errorTimers[field]) clearTimeout(errorTimers[field]);
    errorTimers[field] = setTimeout(() => clearError(field), 5000);
  }

  function clearError(field) {
    const el = field === 'name' ? nameError : genderError;
    const input = field === 'name' ? nameInput : genderSelect;
    el.innerHTML = '';
    input.classList.remove('form__input--error', 'form__select--error');
    if (errorTimers[field]) {
      clearTimeout(errorTimers[field]);
      delete errorTimers[field];
    }
  }

  function clearAllErrors() {
    clearError('name');
    clearError('gender');
  }

  // --- Add Player ---

  function handleAddPlayer(e) {
    e.preventDefault();
    clearAllErrors();

    const { valid, errors } = validateInputs();
    if (!valid) {
      if (errors.name) showError('name', errors.name);
      if (errors.gender) showError('gender', errors.gender);
      return;
    }

    const player = {
      id: Date.now() + Math.random(),
      name: nameInput.value.trim(),
      gender: genderSelect.value,
    };

    players.push(player);
    resetForm();
    updateUI();
  }

  function resetForm() {
    nameInput.value = '';
    genderSelect.selectedIndex = 0;
    updateAddButtonState();
    nameInput.focus();
  }

  function updateAddButtonState() {
    const name = nameInput.value.trim();
    const gender = genderSelect.value;
    addBtn.disabled = !(name.length >= 2 && gender);
  }

  // --- Remove Player ---

  function removePlayer(id) {
    if (pairingMode === 'manual') {
      manualPairs = manualPairs.filter(p => p.player1.id !== id && p.player2.id !== id);
    }
    const idx = players.findIndex(p => p.id === id);
    if (idx === -1) return;

    const item = playerList.children[idx];
    if (item) {
      item.classList.remove('animate__fadeIn');
      item.classList.add('animate__fadeOut');
      item.addEventListener('animationend', () => {
        players.splice(players.findIndex(p => p.id === id), 1);
        updateUI();
      }, { once: true });
    } else {
      players.splice(idx, 1);
      updateUI();
    }
  }

  // --- Clear All ---

  function handleClearAll() {
    if (!confirm(t('actions.confirmClear'))) return;
    players.length = 0;
    couplesGenerated = false;
    lastResult = null;
    manualPairs = [];
    pairingMode = 'random';
    modeRandomBtn.classList.add('pairing-toggle__opt--active');
    modeManualBtn.classList.remove('pairing-toggle__opt--active');
    updateUI();
  }

  // --- Generate Couples ---

  function handleGenerate() {
    const result = generateCouples(players);
    couplesGenerated = true;
    lastResult = result;
    renderResults(result);
    updateUI();
  }

  // --- Rendering ---

  function updateUI() {
    renderPlayerList();
    renderCounts();
    updateActionButtons();
    if (!couplesGenerated) {
      resultsSection.hidden = true;
    }
  }

  function renderPlayerList() {
    playerList.innerHTML = '';
    emptyMessage.hidden = players.length > 0;

    players.forEach((player, i) => {
      const li = document.createElement('li');
      li.className = 'player-list__item animate__animated animate__fadeIn';
      li.style.animationDelay = `${i * 30}ms`;
      const badge = player.gender === 'male' ? t('players.badgeMale') : t('players.badgeFemale');
      li.innerHTML = `
        <span class="player-list__info">
          <span class="player-list__name">${escapeHTML(player.name)}</span>
          <span class="player-list__badge player-list__badge--${player.gender}">
            ${badge}
          </span>
        </span>
        <button class="player-list__remove" aria-label="${escapeHTML(t('players.remove', { name: player.name }))}" data-id="${player.id}">&times;</button>
      `;
      li.querySelector('.player-list__remove').addEventListener('click', () => removePlayer(player.id));
      playerList.appendChild(li);
    });
  }

  function renderCounts() {
    const maleCount = players.filter(p => p.gender === 'male').length;
    const femaleCount = players.filter(p => p.gender === 'female').length;

    // Reconstruct heading with translatable text and a live count span
    playersHeading.textContent = '';
    const headingText = t('players.heading', { count: '__COUNT__' });
    const parts = headingText.split('__COUNT__');
    playersHeading.appendChild(document.createTextNode(parts[0]));
    const countSpan = document.createElement('span');
    countSpan.id = 'player-count';
    countSpan.textContent = players.length;
    playersHeading.appendChild(countSpan);
    if (parts[1]) {
      playersHeading.appendChild(document.createTextNode(parts[1]));
    }

    genderCounts.textContent = t('players.genderCounts', { males: maleCount, females: femaleCount });
  }

  function updateActionButtons() {
    const hasEnough = players.length >= 2;

    // Mode toggle: only for the session creator with enough players
    pairingToggle.hidden = isReadOnly || !hasEnough;

    // Random mode controls
    generateBtn.hidden   = pairingMode !== 'random';
    generateBtn.disabled = !hasEnough;
    generateHint.hidden  = hasEnough || pairingMode !== 'random';
    regenerateBtn.hidden = !couplesGenerated || pairingMode !== 'random';

    // Manual mode panel
    manualPairingPanel.hidden = pairingMode !== 'manual' || !hasEnough;
    if (pairingMode === 'manual' && hasEnough) {
      renderManualDropdowns();
      renderManualPairsList();
    }

    clearBtn.hidden = players.length === 0;
    tournamentSetup.hidden = !couplesGenerated || tournamentState !== null || kingState !== null;
    kingSetup.hidden = !couplesGenerated || tournamentState !== null || kingState !== null;
    // Keep max selectable groups in sync with available teams
    if (couplesGenerated && lastResult) {
      updateGroupOptions(lastResult.couples ? lastResult.couples.length : 0);
    }
  }

  function renderResults({ couples, unmatched }) {
    resultsSection.hidden = false;
    couplesGrid.innerHTML = '';

    couples.forEach((couple, i) => {
      const card = document.createElement('div');
      card.className = `couple-card couple-card--${couple.type} animate__animated animate__fadeInUp`;
      card.style.animationDelay = `${i * 80}ms`;
      const typeLabel = couple.type === 'mixed' ? t('results.typeMixed') : t('results.typeSame');
      const badge1 = couple.player1.gender === 'male' ? t('players.badgeMale') : t('players.badgeFemale');
      const badge2 = couple.player2.gender === 'male' ? t('players.badgeMale') : t('players.badgeFemale');
      card.innerHTML = `
        <p class="couple-card__title">${escapeHTML(t('results.couple', { n: i + 1 }))} <span class="couple-card__type couple-card__type--${couple.type}">${escapeHTML(typeLabel)}</span></p>
        <p class="couple-card__player">
          ${escapeHTML(couple.player1.name)}
          <span class="player-list__badge player-list__badge--${couple.player1.gender}">
            ${badge1}
          </span>
        </p>
        <p class="couple-card__player">
          ${escapeHTML(couple.player2.name)}
          <span class="player-list__badge player-list__badge--${couple.player2.gender}">
            ${badge2}
          </span>
        </p>
      `;
      couplesGrid.appendChild(card);
    });

    if (unmatched) {
      unmatchedNotice.hidden = false;
      const unmatchedBadge = unmatched.gender === 'male' ? t('players.badgeMale') : t('players.badgeFemale');
      unmatchedNotice.innerHTML = `
        <p class="unmatched__title">${escapeHTML(t('results.unmatched', { name: unmatched.name }))}
          <span class="player-list__badge player-list__badge--${unmatched.gender}">
            ${unmatchedBadge}
          </span>
        </p>
        <p class="unmatched__text">${escapeHTML(t('results.unmatchedExplain'))}</p>
      `;
    } else {
      unmatchedNotice.hidden = true;
    }
  }

  // --- Tournament Handlers ---

  function getSelectedGroupCount() {
    var active = groupCountOptions.querySelector('.tournament-setup__opt--active');
    return active ? parseInt(active.getAttribute('data-groups'), 10) : 1;
  }

  function handleGroupOptClick(e) {
    var btn = e.target.closest('.tournament-setup__opt');
    if (!btn) return;
    groupCountOptions.querySelectorAll('.tournament-setup__opt').forEach(function (b) {
      b.classList.remove('tournament-setup__opt--active');
    });
    btn.classList.add('tournament-setup__opt--active');
  }

  function updateGroupOptions(teamCount) {
    groupCountOptions.querySelectorAll('.tournament-setup__opt').forEach(function (btn) {
      var n = parseInt(btn.getAttribute('data-groups'), 10);
      // Disable options that would leave any group with fewer than 2 teams
      var feasible = Math.floor(teamCount / n) >= 2;
      btn.disabled = !feasible;
      btn.title = feasible ? '' : t('tournament.groupsNotEnoughTeams') || '';
      // If currently active option becomes infeasible, fall back to 1
      if (!feasible && btn.classList.contains('tournament-setup__opt--active')) {
        btn.classList.remove('tournament-setup__opt--active');
        groupCountOptions.querySelector('[data-groups="1"]').classList.add('tournament-setup__opt--active');
      }
    });
  }

  function handleStartTournament() {
    if (!lastResult) return;
    const teams = createTeams(lastResult);
    if (teams.length < 2) return;
    const numGroups = getSelectedGroupCount();
    const groups = createGroups(teams, numGroups);
    const matches = generateMatches(groups);
    tournamentState = { teams: teams, groups: groups, matches: matches };
    activeMatchId = null;
    saveTournamentState();
    if (db) {
      sessionId = generateSessionId();
      markSessionOwner(sessionId);
      history.replaceState(null, '', '#s=' + sessionId);
      writeToFirebase(tournamentState);
    } else {
      pushShareURL();
    }
    tournamentSection.hidden = false;
    renderTournament();
    updateActionButtons();
    tournamentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleResetTournament() {
    if (!confirm(t('tournament.confirmReset'))) return;
    if (db && sessionId) {
      db.ref('tournaments/' + sessionId).remove();
      sessionId = null;
    }
    tournamentState = null;
    activeMatchId = null;
    localStorage.removeItem('bv-tournament');
    history.replaceState(null, '', window.location.pathname + window.location.search);
    tournamentSection.hidden = true;
    tournamentGroupsEl.innerHTML = '';
    // Reset group selector to default (1 group / A)
    groupCountOptions.querySelectorAll('.tournament-setup__opt').forEach(function (b) {
      b.classList.remove('tournament-setup__opt--active');
    });
    groupCountOptions.querySelector('[data-groups="1"]').classList.add('tournament-setup__opt--active');
    updateActionButtons();
  }

  // ─── King of the Court Handlers ──────────────────────────────────────────────

  function handleKingConditionClick(e) {
    const btn = e.target.closest('.king-setup__opt');
    if (!btn || !btn.dataset.condition) return;
    kingWinCondition = btn.dataset.condition;
    kingWinConditionToggle.querySelectorAll('.king-setup__opt').forEach(function (b) {
      b.classList.toggle('king-setup__opt--active', b.dataset.condition === kingWinCondition);
    });
  }

  function handleKingTargetClick(e) {
    const btn = e.target.closest('.king-setup__opt');
    if (!btn || !btn.dataset.target) return;
    kingTargetWins = parseInt(btn.dataset.target, 10);
    kingTargetToggle.querySelectorAll('.king-setup__opt').forEach(function (b) {
      b.classList.toggle('king-setup__opt--active', b.dataset.target === String(kingTargetWins));
    });
  }

  function handleStartKing() {
    if (!lastResult) return;
    const teams = createTeams(lastResult);
    if (teams.length < 2) return;
    kingState = createKingGame(teams, kingWinCondition, kingTargetWins);
    saveKingState();
    kingSection.hidden = false;
    renderKing();
    updateActionButtons();
    kingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleResetKing() {
    if (!confirm(t('king.confirmReset'))) return;
    kingState = null;
    localStorage.removeItem('bv-king');
    kingSection.hidden = true;
    kingQueueList.innerHTML = '';
    kingLogList.innerHTML = '';
    updateActionButtons();
  }

  function handleRally(winnerSide) {
    if (!kingState || kingState.winner) return;
    kingState = recordRally(kingState, winnerSide);
    saveKingState();
    renderKing();
  }

  // ─── King of the Court Render ─────────────────────────────────────────────────

  function renderKing() {
    const king = getCurrentKing(kingState);
    const challenger = getCurrentChallenger(kingState);
    kingTeamName.textContent = king.name;
    const wins = kingWinCondition === 'consecutive' ? kingState.kingWins : kingState.kingTotalWins;
    kingWinsCount.textContent = wins;
    kingWinsLabel.textContent = t('king.winsOf', { target: kingState.targetWins });
    challengerTeamName.textContent = challenger.name;
    renderKingQueue();
    renderKingLog();
    const isOver = isKingGameOver(kingState);
    kingWinsBtn.disabled = isOver;
    challengerWinsBtn.disabled = isOver;
    kingWinnerBanner.hidden = !isOver;
    if (isOver && kingState.winner) {
      kingWinnerName.textContent = kingState.winner.name;
    }
  }

  function renderKingQueue() {
    kingQueueList.innerHTML = '';
    kingState.queue.forEach(function (team, idx) {
      const li = document.createElement('li');
      li.className = 'king-queue__item animate__animated animate__fadeIn';
      li.style.animationDelay = (idx * 30) + 'ms';
      if (idx === 0) li.classList.add('king-queue__item--next');
      li.textContent = escapeHTML(team.name);
      kingQueueList.appendChild(li);
    });
  }

  function renderKingLog() {
    kingLogList.innerHTML = '';
    const log = kingState.rallyLog.slice().reverse();
    log.forEach(function (entry) {
      const li = document.createElement('li');
      li.className = 'king-log__entry king-log__entry--' + entry.winnerSide;
      const winnerId = entry.winnerSide === 'king' ? entry.kingTeamId : entry.challengerTeamId;
      const team = kingState.teams.find(function (tm) { return tm.id === winnerId; });
      li.textContent = team
        ? t('king.logEntry', { team: team.name, wins: entry.kingWinsAfter })
        : '';
      kingLogList.appendChild(li);
    });
  }

  function saveKingState() {
    try { localStorage.setItem('bv-king', JSON.stringify(kingState)); } catch (e) {}
  }

  function loadKingState() {
    try {
      const raw = localStorage.getItem('bv-king');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function handleScoreEntry(matchId) {
    // If clicking the same match again, close the form
    if (activeMatchId === matchId) {
      activeMatchId = null;
      renderTournament();
      return;
    }
    activeMatchId = matchId;
    renderTournament();
  }

  function handleSaveScore(matchId, input1El, input2El, errorEl) {
    var s1 = input1El.value.trim();
    var s2 = input2El.value.trim();
    try {
      var newMatches = recordMatchScore(tournamentState.matches, matchId, s1, s2);
      tournamentState = {
        teams: tournamentState.teams,
        groups: tournamentState.groups,
        matches: newMatches,
      };
      activeMatchId = null;
      saveTournamentState();
      if (db && sessionId) {
        writeToFirebase(tournamentState);
      } else {
        pushShareURL();
      }
      renderTournament();
    } catch (e) {
      errorEl.textContent = t(e.message) || e.message;
    }
  }

  // --- Tournament Persistence ---

  function saveTournamentState() {
    try {
      localStorage.setItem('bv-tournament', JSON.stringify(tournamentState));
    } catch (e) {
      // localStorage may be unavailable; fail silently
    }
  }

  function loadTournamentState() {
    try {
      var raw = localStorage.getItem('bv-tournament');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // --- Firebase ---

  function initFirebase() {
    if (typeof firebase === 'undefined' ||
        typeof FIREBASE_CONFIG === 'undefined' ||
        FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
      return false;
    }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      db = firebase.database();
      return true;
    } catch (e) {
      return false;
    }
  }

  function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getSessionIdFromURL() {
    var hash = window.location.hash;
    if (!hash || !hash.startsWith('#s=')) return null;
    return hash.slice(3);
  }

  function isSessionOwner(sid) {
    try {
      var owned = JSON.parse(localStorage.getItem('bv-owned-sessions') || '[]');
      return owned.indexOf(sid) !== -1;
    } catch (e) { return false; }
  }

  function markSessionOwner(sid) {
    try {
      var owned = JSON.parse(localStorage.getItem('bv-owned-sessions') || '[]');
      if (owned.indexOf(sid) === -1) {
        owned.push(sid);
        localStorage.setItem('bv-owned-sessions', JSON.stringify(owned));
      }
    } catch (e) {}
  }

  function writeToFirebase(state) {
    if (!db || !sessionId) return;
    db.ref('tournaments/' + sessionId).set({
      state: state,
      updatedAt: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  function subscribeToSession(sid) {
    if (!db || !sid) return;
    db.ref('tournaments/' + sid).on('value', function (snapshot) {
      var data = snapshot.val();
      if (!data || !data.state) return;
      tournamentState = data.state;
      saveTournamentState();
      tournamentSection.hidden = false;
      renderTournament();
    });
  }

  function loadSessionOnce(sid, callback) {
    if (!db || !sid) { callback(null); return; }
    db.ref('tournaments/' + sid).once('value', function (snapshot) {
      var data = snapshot.val();
      callback(data && data.state ? data.state : null);
    });
  }

  // --- URL Sharing ---

  function encodeTournamentState(state) {
    try {
      return btoa(encodeURIComponent(JSON.stringify(state)));
    } catch (e) {
      return null;
    }
  }

  function decodeTournamentState(encoded) {
    try {
      return JSON.parse(decodeURIComponent(atob(encoded)));
    } catch (e) {
      return null;
    }
  }

  function getShareURL() {
    if (!tournamentState) return null;
    var encoded = encodeTournamentState(tournamentState);
    if (!encoded) return null;
    return window.location.origin + window.location.pathname + '#t=' + encoded;
  }

  function loadFromURL() {
    var hash = window.location.hash;
    if (!hash || !hash.startsWith('#t=')) return null;
    return decodeTournamentState(hash.slice(3));
  }

  function pushShareURL() {
    if (isReadOnly || !tournamentState) return;
    var encoded = encodeTournamentState(tournamentState);
    if (!encoded) return;
    // Silently update URL so the browser bar always reflects current state
    history.replaceState(null, '', '#t=' + encoded);
  }

  function handleShareTournament() {
    var url = db ? window.location.href : getShareURL();
    if (!url) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showShareCopied();
      }).catch(function () {
        fallbackCopyText(url);
      });
    } else {
      fallbackCopyText(url);
    }
  }

  function fallbackCopyText(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showShareCopied(); } catch (e) { /* silent */ }
    document.body.removeChild(ta);
  }

  function showShareCopied() {
    var originalText = t('tournament.share');
    shareTournamentBtn.textContent = t('tournament.shareCopied');
    shareTournamentBtn.classList.add('btn--share--copied');
    setTimeout(function () {
      shareTournamentBtn.textContent = originalText;
      shareTournamentBtn.classList.remove('btn--share--copied');
    }, 2500);
  }

  // --- Tournament Rendering ---

  function renderTournament() {
    tournamentGroupsEl.innerHTML = '';

    // Add multi-group grid class when there are 2+ groups
    if (tournamentState.groups.length >= 2) {
      tournamentGroupsEl.classList.add('tournament-groups--multi');
    } else {
      tournamentGroupsEl.classList.remove('tournament-groups--multi');
    }

    var standings = calculateStandings(tournamentState.groups, tournamentState.matches);

    tournamentState.groups.forEach(function (group, idx) {
      var panel = renderGroupPanel(group, idx, standings);
      tournamentGroupsEl.appendChild(panel);
    });

    // Tournament complete banner
    if (isTournamentComplete(tournamentState.matches)) {
      var banner = document.createElement('div');
      banner.className = 'tournament-complete animate__animated animate__fadeIn';
      banner.textContent = t('tournament.complete');
      tournamentGroupsEl.appendChild(banner);
    }
  }

  function renderGroupPanel(group, idx, standings) {
    var panel = document.createElement('div');
    panel.className = 'tournament-group';
    panel.setAttribute('data-group-index', idx % 8);

    var heading = document.createElement('h3');
    heading.className = 'tournament-group__heading';
    heading.textContent = t('tournament.group', { id: group.id });
    panel.appendChild(heading);

    // Standings table
    var groupStandings = standings.get(group.id) || [];
    panel.appendChild(renderStandingsTable(group, groupStandings));

    // Match list
    var groupMatches = tournamentState.matches.filter(function (m) {
      return m.groupId === group.id;
    });
    if (groupMatches.length > 0) {
      panel.appendChild(renderMatchList(group, groupMatches));
    }

    return panel;
  }

  function renderStandingsTable(group, standings) {
    var wrapper = document.createElement('div');
    wrapper.className = 'standings';

    var table = document.createElement('table');
    table.className = 'standings__table';
    table.setAttribute('aria-label', t('tournament.group', { id: group.id }));

    table.innerHTML = '<thead><tr>' +
      '<th>' + escapeHTML(t('tournament.col.team')) + '</th>' +
      '<th>' + escapeHTML(t('tournament.col.played')) + '</th>' +
      '<th>' + escapeHTML(t('tournament.col.won')) + '</th>' +
      '<th>' + escapeHTML(t('tournament.col.lost')) + '</th>' +
      '<th class="standings__pts">' + escapeHTML(t('tournament.col.points')) + '</th>' +
      '<th>' + escapeHTML(t('tournament.col.setsFor')) + '</th>' +
      '<th>' + escapeHTML(t('tournament.col.setsAgainst')) + '</th>' +
      '</tr></thead>';

    var tbody = document.createElement('tbody');
    standings.forEach(function (row, rowIdx) {
      var team = tournamentState.teams.find(function (te) { return te.id === row.teamId; });
      var teamName = team ? team.name : row.teamId;
      var tr = document.createElement('tr');
      if (rowIdx === 0) tr.className = 'standings__row--leader';
      tr.innerHTML =
        '<td>' + escapeHTML(teamName) + '</td>' +
        '<td>' + row.played + '</td>' +
        '<td>' + row.won + '</td>' +
        '<td>' + row.lost + '</td>' +
        '<td class="standings__pts">' + row.points + '</td>' +
        '<td>' + row.setsFor + '</td>' +
        '<td>' + row.setsAgainst + '</td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  function renderMatchList(group, matches) {
    var container = document.createElement('div');

    var heading = document.createElement('p');
    heading.className = 'match-list__heading';
    heading.textContent = 'Matches';
    container.appendChild(heading);

    var ul = document.createElement('ul');
    ul.className = 'match-list';

    matches.forEach(function (match) {
      var team1 = tournamentState.teams.find(function (tm) { return tm.id === match.team1Id; });
      var team2 = tournamentState.teams.find(function (tm) { return tm.id === match.team2Id; });
      var name1 = team1 ? team1.name : match.team1Id;
      var name2 = team2 ? team2.name : match.team2Id;
      var isActive = activeMatchId === match.id;

      var li = document.createElement('li');
      li.className = 'match-card' +
        (match.played ? ' match-card--played' : '') +
        (isActive ? ' match-card--active' : '');

      // ── Row: team names | score | button (only when NOT active) ──
      var row = document.createElement('div');
      row.className = 'match-card__row';

      var teamsEl = document.createElement('span');
      teamsEl.className = 'match-card__teams';
      teamsEl.innerHTML =
        escapeHTML(name1) +
        ' <span class="match-card__vs">' + escapeHTML(t('tournament.match.vs')) + '</span> ' +
        escapeHTML(name2);

      var scoreEl = document.createElement('span');
      scoreEl.className = 'match-card__score' + (match.played ? ' match-card__score--played' : '');
      scoreEl.textContent = match.played ? (match.score1 + ' \u2013 ' + match.score2) : '\u2013';

      row.appendChild(teamsEl);
      row.appendChild(scoreEl);

      // Show Enter/Edit button only when the form is NOT open
      if (!isReadOnly && !isActive) {
        var btn = document.createElement('button');
        btn.className = 'match-card__btn';
        btn.type = 'button';
        btn.textContent = match.played ? t('tournament.match.edit') : t('tournament.match.enterScore');
        btn.addEventListener('click', (function (mid) {
          return function () { handleScoreEntry(mid); };
        })(match.id));
        row.appendChild(btn);
      }

      li.appendChild(row);

      // ── Score form (only when this card is active) ──
      if (!isReadOnly && isActive) {
        var scoreForm = document.createElement('div');
        scoreForm.className = 'match-card__score-form';

        var in1 = document.createElement('input');
        in1.type = 'number';
        in1.min = '0';
        in1.max = '999';
        in1.className = 'score-form__input';
        in1.value = match.played ? match.score1 : '';
        in1.placeholder = '0';
        in1.setAttribute('aria-label', name1);

        var sep = document.createElement('span');
        sep.className = 'score-form__sep';
        sep.textContent = '\u2013';

        var in2 = document.createElement('input');
        in2.type = 'number';
        in2.min = '0';
        in2.max = '999';
        in2.className = 'score-form__input';
        in2.value = match.played ? match.score2 : '';
        in2.placeholder = '0';
        in2.setAttribute('aria-label', name2);

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'score-form__save';
        saveBtn.textContent = t('tournament.match.save');

        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'score-form__cancel';
        cancelBtn.textContent = '\u00d7'; // ×
        cancelBtn.setAttribute('aria-label', t('tournament.match.cancel'));
        cancelBtn.addEventListener('click', function () {
          activeMatchId = null;
          renderTournament();
        });

        var errorEl = document.createElement('p');
        errorEl.className = 'score-form__error';

        saveBtn.addEventListener('click', function () {
          handleSaveScore(match.id, in1, in2, errorEl);
        });

        [in1, in2].forEach(function (inp) {
          inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') handleSaveScore(match.id, in1, in2, errorEl);
          });
        });

        scoreForm.appendChild(in1);
        scoreForm.appendChild(sep);
        scoreForm.appendChild(in2);
        scoreForm.appendChild(saveBtn);
        scoreForm.appendChild(cancelBtn);
        scoreForm.appendChild(errorEl);
        li.appendChild(scoreForm);

        // Auto-focus first input
        setTimeout(function () { in1.focus(); }, 0);
      }

      ul.appendChild(li);
    });

    container.appendChild(ul);
    return container;
  }

  // --- Manual Pairing ---

  function handlePairingModeClick(e) {
    var btn = e.target.closest('.pairing-toggle__opt');
    if (!btn) return;
    var newMode = btn.getAttribute('data-mode');
    if (newMode === pairingMode) return;

    pairingMode = newMode;
    manualPairs = [];
    couplesGenerated = false;
    lastResult = null;

    modeRandomBtn.classList.toggle('pairing-toggle__opt--active', pairingMode === 'random');
    modeManualBtn.classList.toggle('pairing-toggle__opt--active', pairingMode === 'manual');

    updateUI();
  }

  function renderManualDropdowns() {
    var pairedIds = new Set();
    manualPairs.forEach(function (pair) {
      pairedIds.add(pair.player1.id);
      pairedIds.add(pair.player2.id);
    });

    var available = players.filter(function (p) { return !pairedIds.has(p.id); });

    var prevP1 = selectMan.value;
    var prevP2 = selectWoman.value;

    // Player 1: all available except what's currently selected in Player 2
    selectMan.innerHTML = '<option value="" disabled selected>' + escapeHTML(t('pairing.selectMan')) + '</option>';
    available.forEach(function (p) {
      if (String(p.id) === prevP2) return;
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      selectMan.appendChild(opt);
    });
    if (prevP1 && prevP1 !== prevP2 && available.some(function (p) { return String(p.id) === prevP1; })) {
      selectMan.value = prevP1;
    }

    // Player 2: all available except what's currently selected in Player 1
    var p1Now = selectMan.value;
    selectWoman.innerHTML = '<option value="" disabled selected>' + escapeHTML(t('pairing.selectWoman')) + '</option>';
    available.forEach(function (p) {
      if (String(p.id) === p1Now) return;
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      selectWoman.appendChild(opt);
    });
    if (prevP2 && prevP2 !== p1Now && available.some(function (p) { return String(p.id) === prevP2; })) {
      selectWoman.value = prevP2;
    }

    updateManualPairBtnState();
  }

  function updateManualPairBtnState() {
    manualPairBtn.disabled = !(selectMan.value && selectWoman.value);
  }

  function renderManualPairsList() {
    manualPairsList.innerHTML = '';
    manualPairsEmpty.hidden = manualPairs.length > 0;

    manualPairs.forEach(function (pair, idx) {
      var li = document.createElement('li');
      li.className = 'manual-pairing__pair-item animate__animated animate__fadeIn';

      var badge1 = pair.player1.gender === 'male' ? t('players.badgeMale') : t('players.badgeFemale');
      var badge2 = pair.player2.gender === 'male' ? t('players.badgeMale') : t('players.badgeFemale');

      var namesEl = document.createElement('span');
      namesEl.className = 'manual-pairing__pair-names';
      namesEl.innerHTML =
        escapeHTML(pair.player1.name) +
        ' <span class="player-list__badge player-list__badge--' + pair.player1.gender + '">' + badge1 + '</span>' +
        ' <span class="manual-pairing__pair-sep">&amp;</span> ' +
        escapeHTML(pair.player2.name) +
        ' <span class="player-list__badge player-list__badge--' + pair.player2.gender + '">' + badge2 + '</span>';

      var removeBtn = document.createElement('button');
      removeBtn.className = 'manual-pairing__remove';
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', t('pairing.removePair'));
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', (function (i) {
        return function () { removeManualPair(i); };
      })(idx));

      li.appendChild(namesEl);
      li.appendChild(removeBtn);
      manualPairsList.appendChild(li);
    });
  }

  function handleManualPair() {
    var manId   = selectMan.value;
    var womanId = selectWoman.value;
    if (!manId || !womanId) return;

    var man   = players.find(function (p) { return String(p.id) === manId; });
    var woman = players.find(function (p) { return String(p.id) === womanId; });
    if (!man || !woman) return;

    manualPairs.push({ player1: man, player2: woman });
    selectMan.value   = '';
    selectWoman.value = '';

    renderManualDropdowns();
    renderManualPairsList();
  }

  function removeManualPair(index) {
    manualPairs.splice(index, 1);
    renderManualDropdowns();
    renderManualPairsList();
  }

  function handleConfirmManualCouples() {
    var confirmedCouples = manualPairs.map(function (pair) {
      var type = (pair.player1.gender !== pair.player2.gender) ? 'mixed' : 'same';
      return { player1: pair.player1, player2: pair.player2, type: type };
    });

    var pairedIds = new Set();
    manualPairs.forEach(function (pair) {
      pairedIds.add(pair.player1.id);
      pairedIds.add(pair.player2.id);
    });

    var remainingPlayers = players.filter(function (p) { return !pairedIds.has(p.id); });
    var autoResult = generateCouples(remainingPlayers);

    lastResult = {
      couples:   confirmedCouples.concat(autoResult.couples),
      unmatched: autoResult.unmatched,
    };

    couplesGenerated = true;
    renderResults(lastResult);
    updateUI();
  }

  // --- Utilities ---

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', init);
})();
