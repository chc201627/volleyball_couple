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
  let scoreboardMatchId = null; // which match is open in live scoreboard mode
  let liveScore = { score1: 0, score2: 0 }; // live scores being tracked
  let isReadOnly = false;       // true when viewing a shared URL (no editing)
  var tournamentRepository = null;
  var repositoryUnsubscribe = null;
  var sessionId = null;         // Active session ID written to / read from Firebase
  var sessionSnapshot = null;
  var matchFilter = 'pending';
  var lastScoreCommand = null;
  let pairingMode = 'random';  // 'random' | 'manual'
  let manualPairs = [];        // [{player1, player2}] — confirmed manual pairs
  let kingState = null;        // KingState object or null when no game active
  let kingWinCondition = 'consecutive'; // 'consecutive' | 'total'
  let kingTargetWins = 5;      // 5 | 7 | 10
  let teamSize = 2;            // 2 | 3 | 4 - target size of teams
  let importRows = [];
  let importAnalysis = null;
  let importLocale = 'es';
  let lastImportIds = [];

  // --- DOM References ---
  const form = document.getElementById('player-form');
  const nameInput = document.getElementById('player-name');
  const genderSelect = document.getElementById('player-gender');
  const levelSelect = document.getElementById('player-level');
  const addBtn = document.getElementById('add-player-btn');
  const nameError = document.getElementById('name-error');
  const genderError = document.getElementById('gender-error');
  const singleModeTab = document.getElementById('single-mode-tab');
  const importModeTab = document.getElementById('import-mode-tab');
  const importPanel = document.getElementById('import-panel');
  const importText = document.getElementById('import-text');
  const reviewImportBtn = document.getElementById('review-import-btn');
  const importReview = document.getElementById('import-review');
  const importSummary = document.getElementById('import-summary');
  const importPreview = document.getElementById('import-preview');
  const confirmImportBtn = document.getElementById('confirm-import-btn');
  const importFeedback = document.getElementById('import-feedback');
  const importFeedbackText = document.getElementById('import-feedback-text');
  const undoImportBtn = document.getElementById('undo-import-btn');

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
  const manualPairBtn      = document.getElementById('manual-pair-btn');
  const manualPairsList    = document.getElementById('manual-pairs-list');
  const manualPairsEmpty   = document.getElementById('manual-pairs-empty');
  const confirmManualBtn   = document.getElementById('confirm-manual-btn');

  const resultsSection = document.getElementById('results-section');
  const couplesGrid = document.getElementById('couples-grid');
  const unmatchedNotice = document.getElementById('unmatched-notice');

  const matchTypeSelection = document.getElementById('match-type-selection');

  const tournamentSetup = document.getElementById('tournament-setup');
  const startTournamentBtn = document.getElementById('start-tournament-btn');
  const groupCountOptions = document.getElementById('group-count-options');
  const shareTournamentBtn = document.getElementById('share-tournament-btn');
  const resetTournamentBtn = document.getElementById('reset-tournament-btn');
  const readonlyBanner = document.getElementById('readonly-banner');
  const tournamentOps = document.getElementById('tournament-ops');
  const accessStatus = document.getElementById('access-status');
  const accessRequest = document.getElementById('access-request');
  const accessLabel = document.getElementById('access-label');
  const requestAccessBtn = document.getElementById('request-access-btn');
  const accessMembers = document.getElementById('access-members');
  const matchFilters = document.getElementById('match-filters');
  const syncStatus = document.getElementById('sync-status');
  const retryScoreBtn = document.getElementById('retry-score-btn');
  const tournamentSection = document.getElementById('tournament-section');
  const tournamentGroupsEl = document.getElementById('tournament-groups');
  const scoreboardPanelEl = document.getElementById('scoreboard-panel');

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
    singleModeTab.addEventListener('click', function () { setEntryMode('single'); });
    importModeTab.addEventListener('click', function () { setEntryMode('import'); });
    reviewImportBtn.addEventListener('click', handleReviewImport);
    confirmImportBtn.addEventListener('click', handleConfirmImport);
    undoImportBtn.addEventListener('click', handleUndoImport);
    importPreview.addEventListener('input', handleImportEdit);
    importPreview.addEventListener('change', handleImportEdit);
    importPreview.addEventListener('click', handleImportDelete);
    generateBtn.addEventListener('click', handleGenerate);
    regenerateBtn.addEventListener('click', handleGenerate);
    clearBtn.addEventListener('click', handleClearAll);
    pairingToggle.addEventListener('click', handlePairingModeClick);
    matchTypeSelection.addEventListener('click', handleMatchTypeClick);
    manualPairBtn.addEventListener('click', handleManualPair);
    confirmManualBtn.addEventListener('click', handleConfirmManualCouples);
    startTournamentBtn.addEventListener('click', handleStartTournament);
    resetTournamentBtn.addEventListener('click', handleResetTournament);
    shareTournamentBtn.addEventListener('click', handleShareTournament);
    requestAccessBtn.addEventListener('click', handleRequestAccess);
    accessMembers.addEventListener('click', handleAccessDecision);
    matchFilters.addEventListener('click', handleMatchFilter);
    retryScoreBtn.addEventListener('click', function () {
      if (lastScoreCommand) commitScore(lastScoreCommand.matchId, lastScoreCommand.score1, lastScoreCommand.score2, null, lastScoreCommand.status);
    });
    groupCountOptions.addEventListener('click', handleGroupOptClick);
    startKingBtn.addEventListener('click', handleStartKing);
    resetKingBtn.addEventListener('click', handleResetKing);
    kingWinsBtn.addEventListener('click', function () { handleRally('king'); });
    challengerWinsBtn.addEventListener('click', function () { handleRally('challenger'); });
    kingWinConditionToggle.addEventListener('click', handleKingConditionClick);
    kingTargetToggle.addEventListener('click', handleKingTargetClick);

    // Load players from localStorage
    try {
      var storedPlayers = localStorage.getItem('bv-players');
      if (storedPlayers) {
        var parsed = JSON.parse(storedPlayers);
        if (Array.isArray(parsed)) {
          players.length = 0;
          players.push.apply(players, parsed);
        }
      }
    } catch (e) {}

    updateUI();

    // Boot Firebase and decide how to restore tournament state
    var firebaseReady = initFirebase();
    var urlSid = getSessionIdFromURL();

    if (firebaseReady && urlSid) {
      sessionId = urlSid;
      isReadOnly = true;
      tournamentSection.hidden = false;
      readonlyBanner.hidden = false;
      resetTournamentBtn.hidden = true;
      tournamentSetup.hidden = true;
      subscribeToSession(urlSid);
    } else if (firebaseReady) {
      // Firebase ready but no session ID in URL — check localStorage
      tournamentState = loadTournamentState();
      if (tournamentState) {
        if (tournamentState.players) {
          players.length = 0;
          players.push.apply(players, tournamentState.players);
        }
        tournamentSection.hidden = false;
        renderTournament();
        updateUI();
      }
    } else {
      // Firebase not configured — fall back to legacy #t= URL hash + localStorage
      var urlState = loadFromURL();
      if (urlState) {
        isReadOnly = true;
        updateUI();
        tournamentState = urlState;
        if (urlState.players) {
          players.length = 0;
          players.push.apply(players, urlState.players);
        }
        updateUI();
        tournamentSection.hidden = false;
        readonlyBanner.hidden = false;
        resetTournamentBtn.hidden = true;
        tournamentSetup.hidden = true;
        renderTournament();
      } else {
        tournamentState = loadTournamentState();
        if (tournamentState) {
          if (tournamentState.players) {
            players.length = 0;
            players.push.apply(players, tournamentState.players);
          }
          tournamentSection.hidden = false;
          renderTournament();
          updateUI();
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
    if (importAnalysis) renderImportPreview();
  };

  // --- Bulk import preview (commit is wired in Phase 3) ---

  function setEntryMode(mode) {
    var importing = mode === 'import';
    form.hidden = importing;
    importPanel.hidden = !importing;
    singleModeTab.classList.toggle('entry-tab--active', !importing);
    importModeTab.classList.toggle('entry-tab--active', importing);
    singleModeTab.setAttribute('aria-selected', String(!importing));
    importModeTab.setAttribute('aria-selected', String(importing));
    singleModeTab.tabIndex = importing ? -1 : 0;
    importModeTab.tabIndex = importing ? 0 : -1;
    (importing ? importText : nameInput).focus();
  }

  function handleReviewImport() {
    importRows = parsePlayerImport(importText.value).rows;
    importLocale = getLanguage();
    revalidateImport();
    importReview.hidden = false;
    var firstError = importPreview.querySelector('[aria-invalid="true"]');
    (firstError || (confirmImportBtn.disabled ? importSummary : confirmImportBtn)).focus();
  }

  function revalidateImport() {
    importAnalysis = validatePlayerImport(importRows, {
      locale: importLocale,
      existingCount: players.length,
      maxPlayers: 200,
    });
    renderImportPreview();
  }

  function showImportFeedback(message, canUndo) {
    importFeedbackText.textContent = message;
    undoImportBtn.hidden = !canUndo;
    importFeedback.hidden = false;
  }

  function commitRosterMutation(mutator, importedIds) {
    mutator(players);
    lastImportIds = importedIds ? importedIds.slice() : [];
    importFeedback.hidden = true;
    savePlayersState();
    updateUI();
  }

  function handleConfirmImport() {
    revalidateImport();
    if (!importAnalysis.summary.canCommit) return;
    var batch = importAnalysis.rows.map(function (row, index) {
      return Object.assign({ id: Date.now() + index + Math.random() }, row.player);
    });
    var ids = batch.map(function (player) { return player.id; });
    commitRosterMutation(function (roster) { roster.push.apply(roster, batch); }, ids);
    importRows = [];
    importAnalysis = null;
    importText.value = '';
    importReview.hidden = true;
    showImportFeedback(t('import.success', { count: batch.length }), true);
    setEntryMode('single');
  }

  function handleUndoImport() {
    if (!lastImportIds.length) return;
    var ids = new Set(lastImportIds);
    var count = ids.size;
    commitRosterMutation(function (roster) {
      for (var i = roster.length - 1; i >= 0; i--) {
        if (ids.has(roster[i].id)) roster.splice(i, 1);
      }
    });
    showImportFeedback(t('import.undone', { count: count }), false);
  }

  function handleImportEdit(e) {
    var field = e.target.getAttribute('data-field');
    var key = e.target.getAttribute('data-key');
    if (!field || !key) return;
    var row = importRows.find(function (item) { return item.key === key; });
    if (!row) return;
    row.draft[field] = e.target.value;
    revalidateImport();
    var replacement = importPreview.querySelector('[data-key="' + key + '"][data-field="' + field + '"]');
    if (replacement) replacement.focus();
  }

  function handleImportDelete(e) {
    var button = e.target.closest('.import-row__delete');
    if (!button) return;
    var key = button.getAttribute('data-key');
    importRows = importRows.filter(function (row) { return row.key !== key; });
    revalidateImport();
    importSummary.focus();
  }

  function importIssueText(issue) {
    var keys = {
      nameEmpty: 'error.nameEmpty', nameTooShort: 'error.nameMin', nameTooLong: 'error.nameMax',
      mixedDelimiter: 'import.mixedDelimiter', tooManyColumns: 'import.tooManyColumns', unclosedQuote: 'import.unclosedQuote',
      invalidGender: 'import.invalidGender', invalidLevel: 'import.invalidLevel', playerLimitExceeded: 'import.playerLimitExceeded',
      ambiguousM: 'import.ambiguousM', emptyBatch: 'import.emptyBatch',
    };
    var params = Object.assign({}, issue.params || {});
    if (issue.code === 'ambiguousM') params.locale = params.locale === 'es' ? 'ES' : 'EN';
    return t(keys[issue.code] || issue.code, params);
  }

  function makeImportOption(select, value, label) {
    var option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function canonicalGender(row) {
    if (row.player) return row.player.gender;
    var notice = row.notices.find(function (item) { return item.code === 'ambiguousM'; });
    if (notice) return notice.params.resolvedGender;
    var token = String(row.draft.genderToken || '').trim().toLowerCase();
    if (!token) return 'unspecified';
    if (['h', 'hombre', 'masculino', 'male', 'man'].indexOf(token) !== -1) return 'male';
    if (['f', 'female', 'woman', 'mujer', 'femenino'].indexOf(token) !== -1) return 'female';
    if (['u', 'unspecified', 'sin especificar', 'no especificado', '-'].indexOf(token) !== -1) return 'unspecified';
    return token;
  }

  function appendImportField(container, row, index, field, className) {
    var label = document.createElement('label');
    var labels = { name: 'form.nameLabel', genderToken: 'form.genderLabel', levelToken: 'form.levelLabel' };
    var control = document.createElement(field === 'name' ? 'input' : 'select');
    label.className = 'import-row__field';
    label.appendChild(document.createTextNode(t(labels[field])));
    control.className = className;
    control.setAttribute('data-key', row.key);
    control.setAttribute('data-field', field);
    if (field === 'name') {
      control.value = row.draft.name;
    } else if (field === 'genderToken') {
      var gender = canonicalGender(row);
      if (['male', 'female', 'unspecified'].indexOf(gender) === -1) makeImportOption(control, gender, gender);
      makeImportOption(control, 'unspecified', t('import.genderBlank'));
      makeImportOption(control, 'male', t('form.genderMale'));
      makeImportOption(control, 'female', t('form.genderFemale'));
      control.value = gender;
    } else {
      var level = String(row.draft.levelToken || '');
      if (level && !/^[123]$/.test(level)) makeImportOption(control, level, level);
      makeImportOption(control, '', t('import.levelBlank'));
      ['1', '2', '3'].forEach(function (value) { makeImportOption(control, value, value); });
      control.value = level;
    }
    var issueField = row.issues.some(function (issue) { return issue.field === field.replace('Token', '') || (field === 'name' && issue.field === 'row'); });
    if (issueField) control.setAttribute('aria-invalid', 'true');
    if (row.issues.length || row.notices.length) control.setAttribute('aria-describedby', 'import-message-' + index);
    label.appendChild(control);
    container.appendChild(label);
  }

  function renderImportPreview() {
    if (!importAnalysis) return;
    importPreview.textContent = '';
    importSummary.setAttribute('tabindex', '-1');
    importSummary.textContent = t('import.summary', {
      valid: importAnalysis.summary.validCount,
      errors: importAnalysis.summary.errorCount,
      existing: players.length,
    }) + (importAnalysis.batchIssues.length ? ' · ' + importAnalysis.batchIssues.map(importIssueText).join(' · ') : '');
    confirmImportBtn.textContent = t('import.confirm', { count: importAnalysis.summary.validCount });
    confirmImportBtn.disabled = !importAnalysis.summary.canCommit;
    importAnalysis.rows.forEach(function (row, index) {
      var item = document.createElement('li');
      var header = document.createElement('div');
      var title = document.createElement('strong');
      var remove = document.createElement('button');
      var fields = document.createElement('div');
      item.className = 'import-row';
      header.className = 'import-row__header';
      title.textContent = t('import.player', { n: index + 1 });
      remove.className = 'import-row__delete';
      remove.type = 'button';
      remove.textContent = '\u00d7';
      remove.setAttribute('data-key', row.key);
      remove.setAttribute('aria-label', t('import.delete', { n: index + 1 }));
      header.appendChild(title); header.appendChild(remove); item.appendChild(header);
      fields.className = 'import-row__fields';
      appendImportField(fields, row, index, 'name', 'import-row__name');
      appendImportField(fields, row, index, 'genderToken', 'import-row__gender');
      appendImportField(fields, row, index, 'levelToken', 'import-row__level');
      item.appendChild(fields);
      var messages = document.createElement('p');
      messages.id = 'import-message-' + index;
      messages.className = row.issues.length ? 'import-row__issues' : 'import-row__notices';
      messages.textContent = row.issues.concat(row.notices).map(importIssueText).join(' · ');
      item.appendChild(messages);
      importPreview.appendChild(item);
    });
  }

  // --- Validation ---

  /**
   * Validate player name and gender inputs.
   * @returns {{ valid: boolean, errors: { name?: string, gender?: string } }}
   */
  function validateInputs() {
    const errors = {};
    const name = nameInput.value.trim();

    if (!name) {
      errors.name = t('error.nameEmpty');
    } else if (name.length < 2) {
      errors.name = t('error.nameMin');
    } else if (name.length > 50) {
      errors.name = t('error.nameMax');
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
      gender: genderSelect.value || 'unspecified',
    };

    // Level is optional — omit the key entirely when unset (Firebase set()
    // rejects undefined, and omission keeps balancing's typeof check simple).
    var lvl = levelSelect.value;
    if (lvl) {
      player.level = Number(lvl);
    }

    resetForm();
    commitRosterMutation(function (roster) { roster.push(player); });
  }

  function resetForm() {
    nameInput.value = '';
    genderSelect.selectedIndex = 0;
    levelSelect.selectedIndex = 0;
    updateAddButtonState();
    nameInput.focus();
  }

  function updateAddButtonState() {
    const name = nameInput.value.trim();
    addBtn.disabled = !(name.length >= 2);
  }

  // --- Remove Player ---

  function removePlayer(id) {
    if (pairingMode === 'manual') {
      manualPairs = manualPairs.filter(function (pair) {
        var playersInTeam = pair.players || [pair.player1, pair.player2];
        return !playersInTeam.some(function (p) { return p.id === id; });
      });
    }
    const idx = players.findIndex(p => p.id === id);
    if (idx === -1) return;

    const item = playerList.children[idx];
    if (item) {
      item.classList.remove('animate__fadeIn');
      item.classList.add('animate__fadeOut');
      item.addEventListener('animationend', () => {
        commitRosterMutation(function (roster) {
          var removeIndex = roster.findIndex(function (player) { return player.id === id; });
          if (removeIndex !== -1) roster.splice(removeIndex, 1);
        });
      }, { once: true });
    } else {
      commitRosterMutation(function (roster) { roster.splice(idx, 1); });
    }
  }

  // --- Clear All ---

  function handleClearAll() {
    if (!confirm(t('actions.confirmClear'))) return;
    couplesGenerated = false;
    lastResult = null;
    manualPairs = [];
    pairingMode = 'random';
    teamSize = 2;
    modeRandomBtn.classList.add('pairing-toggle__opt--active');
    modeManualBtn.classList.remove('pairing-toggle__opt--active');
    document.querySelectorAll('.match-type__opt').forEach(function (b) {
      b.classList.toggle('match-type__opt--active', parseInt(b.getAttribute('data-size'), 10) === 2);
    });
    commitRosterMutation(function (roster) { roster.length = 0; });
  }

  // --- Generate Couples/Teams ---

  function handleGenerate() {
    const result = teamSize === 2 ? generateCouples(players) : generateTeams(players, teamSize);
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
      const badge = player.gender === 'male' ? t('players.badgeMale') : (player.gender === 'female' ? t('players.badgeFemale') : t('players.badgeUnspecified'));
      const levelBadgeHTML = getLevelBadgeHTML(player.level);
      const removeBtnHTML = isReadOnly ? '' : `<button class="player-list__remove" aria-label="${escapeHTML(t('players.remove', { name: player.name }))}" data-id="${player.id}">&times;</button>`;
      li.innerHTML = `
        <span class="player-list__info">
          <span class="player-list__name">${escapeHTML(player.name)}</span>
          <span class="player-list__badge player-list__badge--${player.gender}">
            ${badge}
          </span>
          ${levelBadgeHTML}
        </span>
        ${removeBtnHTML}
      `;
      const removeBtn = li.querySelector('.player-list__remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => removePlayer(player.id));
      }
      playerList.appendChild(li);
    });
  }

  function renderCounts() {
    const maleCount = players.filter(p => p.gender === 'male').length;
    const femaleCount = players.filter(p => p.gender === 'female').length;
    const unspecifiedCount = players.filter(p => p.gender !== 'male' && p.gender !== 'female').length;

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

    genderCounts.textContent = t('players.genderCounts', { males: maleCount, females: femaleCount, unspecified: unspecifiedCount });
  }

  function updateActionButtons() {
    const hasEnough = players.length >= teamSize;

    // Match type selection is only for the creator
    matchTypeSelection.hidden = isReadOnly;

    // Mode toggle: only for the session creator with enough players
    pairingToggle.hidden = isReadOnly || !hasEnough;

    // Random/manual controls — never shown to a read-only viewer
    generateBtn.hidden   = isReadOnly || pairingMode !== 'random';
    generateBtn.disabled = !hasEnough;

    if (teamSize === 2) {
      generateBtn.textContent = t('actions.generate');
      regenerateBtn.textContent = t('actions.regenerate');
      generateHint.textContent = t('actions.hint');
    } else {
      generateBtn.textContent = t('actions.generateTeams');
      regenerateBtn.textContent = t('actions.regenerateTeams');
      generateHint.textContent = t('actions.hintTeams', { n: teamSize });
    }

    generateHint.hidden  = isReadOnly || hasEnough || pairingMode !== 'random';
    regenerateBtn.hidden = isReadOnly || !couplesGenerated || pairingMode !== 'random';

    // Manual mode panel
    manualPairingPanel.hidden = pairingMode !== 'manual' || !hasEnough;
    if (pairingMode === 'manual' && hasEnough) {
      renderManualDropdowns();
      renderManualPairsList();
    }

    clearBtn.hidden = isReadOnly || players.length === 0;
    tournamentSetup.hidden = !couplesGenerated || tournamentState !== null || kingState !== null;
    kingSetup.hidden = !couplesGenerated || tournamentState !== null || kingState !== null;
    // Keep max selectable groups in sync with available teams
    if (couplesGenerated && lastResult) {
      const teamCount = lastResult.teams ? lastResult.teams.length : (lastResult.couples ? lastResult.couples.length : 0);
      updateGroupOptions(teamCount);
    }
  }

  function renderResults(result) {
    resultsSection.hidden = false;
    couplesGrid.innerHTML = '';

    const teams = result.teams || result.couples || [];
    const isCouple = teamSize === 2;

    const resultsHeading = document.getElementById('results-heading');
    if (resultsHeading) {
      resultsHeading.setAttribute('data-i18n', isCouple ? 'results.heading' : 'results.headingTeams');
      resultsHeading.textContent = t(isCouple ? 'results.heading' : 'results.headingTeams');
    }

    teams.forEach((team, i) => {
      const card = document.createElement('div');
      card.className = `couple-card couple-card--${team.type} animate__animated animate__fadeInUp`;
      card.style.animationDelay = `${i * 80}ms`;
      const typeLabel = team.type === 'mixed' ? t('results.typeMixed') : t('results.typeSame');
      const cardTitle = isCouple ? t('results.couple', { n: i + 1 }) : t('results.team', { n: i + 1 });
      
      let playersHTML = '';
      const teamPlayers = team.players || [team.player1, team.player2];
      teamPlayers.forEach(player => {
        const badge = player.gender === 'male' ? t('players.badgeMale') : (player.gender === 'female' ? t('players.badgeFemale') : t('players.badgeUnspecified'));
        const levelBadgeHTML = getLevelBadgeHTML(player.level);
        playersHTML += `
          <p class="couple-card__player">
            ${escapeHTML(player.name)}
            <span class="player-list__badge player-list__badge--${player.gender}">
              ${badge}
            </span>
            ${levelBadgeHTML}
          </p>
        `;
      });

      card.innerHTML = `
        <p class="couple-card__title">${escapeHTML(cardTitle)} <span class="couple-card__type couple-card__type--${team.type}">${escapeHTML(typeLabel)}</span></p>
        ${playersHTML}
      `;
      couplesGrid.appendChild(card);
    });

    const unmatched = result.unmatched;
    if (unmatched && (Array.isArray(unmatched) ? unmatched.length > 0 : unmatched)) {
      unmatchedNotice.hidden = false;
      const unmatchedList = Array.isArray(unmatched) ? unmatched : [unmatched];
      
      let unmatchedHTML = '';
      if (unmatchedList.length === 1) {
        const u = unmatchedList[0];
        const badge = u.gender === 'male' ? t('players.badgeMale') : (u.gender === 'female' ? t('players.badgeFemale') : t('players.badgeUnspecified'));
        const levelBadgeHTML = getLevelBadgeHTML(u.level);
        unmatchedHTML = `
          <p class="unmatched__title">${escapeHTML(t('results.unmatched', { name: u.name }))}
            <span class="player-list__badge player-list__badge--${u.gender}">
              ${badge}
            </span>
            ${levelBadgeHTML}
          </p>
          <p class="unmatched__text">${escapeHTML(t('results.unmatchedExplain'))}</p>
        `;
      } else {
        // Multiple unmatched players (for 3vs3 and 4vs4)
        unmatchedHTML = `<p class="unmatched__title">${escapeHTML(t('results.unmatchedMultiple'))}</p>`;
        unmatchedList.forEach(u => {
          const badge = u.gender === 'male' ? t('players.badgeMale') : (u.gender === 'female' ? t('players.badgeFemale') : t('players.badgeUnspecified'));
          const levelBadgeHTML = getLevelBadgeHTML(u.level);
          unmatchedHTML += `
            <p class="unmatched__player" style="margin-top: 6px;">
              ${escapeHTML(u.name)}
              <span class="player-list__badge player-list__badge--${u.gender}">
                ${badge}
              </span>
              ${levelBadgeHTML}
            </p>
          `;
        });
        unmatchedHTML += `<p class="unmatched__text">${escapeHTML(t('results.unmatchedExplainMultiple'))}</p>`;
      }
      unmatchedNotice.innerHTML = unmatchedHTML;
    } else {
      unmatchedNotice.hidden = true;
    }
  }

  function handleMatchTypeClick(e) {
    var btn = e.target.closest('.match-type__opt');
    if (!btn) return;
    var newSize = parseInt(btn.getAttribute('data-size'), 10);
    if (newSize === teamSize) return;

    teamSize = newSize;
    couplesGenerated = false;
    lastResult = null;
    manualPairs = [];
    // pairingMode is preserved

    document.querySelectorAll('.match-type__opt').forEach(function (b) {
      b.classList.toggle('match-type__opt--active', parseInt(b.getAttribute('data-size'), 10) === teamSize);
    });

    updateUI();
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
    tournamentState = { teams: teams, groups: groups, matches: matches, players: players };
    activeMatchId = null;
    scoreboardMatchId = null;
    liveScore = { score1: 0, score2: 0 };
    saveTournamentState();
    if (tournamentRepository) {
      tournamentRepository.createSession(tournamentState).then(function (result) {
        if (result.status !== 'synced') { pushShareURL(); return; }
        sessionId = result.sessionId;
        history.replaceState(null, '', '#s=' + sessionId);
        subscribeToSession(sessionId);
      });
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
    if (tournamentRepository && sessionId) {
      tournamentRepository.removeSession(sessionId);
      if (repositoryUnsubscribe) repositoryUnsubscribe();
      repositoryUnsubscribe = null;
      sessionId = null;
      sessionSnapshot = null;
    }
    tournamentState = null;
    activeMatchId = null;
    scoreboardMatchId = null;
    liveScore = { score1: 0, score2: 0 };
    localStorage.removeItem('bv-tournament');
    history.replaceState(null, '', window.location.pathname + window.location.search);
    tournamentSection.hidden = true;
    tournamentGroupsEl.innerHTML = '';
    scoreboardPanelEl.hidden = true;
    scoreboardPanelEl.innerHTML = '';
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
      li.textContent = team.name;
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
    scoreboardMatchId = null;
    liveScore = { score1: 0, score2: 0 };
    renderTournament();
  }

  function commitScore(matchId, s1val, s2val, errorEl, status) {
    try {
      status = status || 'finished';
      if (String(s1val).trim() === '' || String(s2val).trim() === '') throw new Error('tournament.error.scoreEmpty');
      var score1 = Number(s1val), score2 = Number(s2val);
      if (!Number.isInteger(score1) || !Number.isInteger(score2)) throw new Error('tournament.error.scoreNotInt');
      if (score1 < 0 || score2 < 0) throw new Error('tournament.error.scoreNegative');
      if (status === 'finished' && score1 === score2) throw new Error('tournament.error.scoreDraw');
      var confirmedMatch = tournamentState.matches.find(function (match) { return match.id === matchId; });
      var command = { matchId: matchId, score1: score1, score2: score2, status: status, expectedRevision: confirmedMatch.revision || 0 };
      if (tournamentRepository && sessionId) {
        lastScoreCommand = command; setSyncState('saving');
        tournamentRepository.saveResult(sessionId, command).then(function (result) {
          if (result.status !== 'synced') {
            setSyncState(result.status); if (errorEl) errorEl.textContent = t('tournament.sync.' + result.status);
            return;
          }
          lastScoreCommand = null; setSyncState('synced');
          activeMatchId = null;
          scoreboardMatchId = null;
          liveScore = { score1: 0, score2: 0 };
        });
        return;
      }
      var resultMap = {};
      tournamentState.matches.forEach(function (match) { if (match.status !== 'pending') resultMap[match.id] = match; });
      resultMap[matchId] = Object.assign({}, command, { revision: command.expectedRevision + 1 });
      var newMatches = projectMatchResults(tournamentState.matches, resultMap);
      tournamentState = {
        teams: tournamentState.teams,
        groups: tournamentState.groups,
        matches: newMatches,
        players: tournamentState.players || players,
      };
      activeMatchId = null;
      scoreboardMatchId = null;
      liveScore = { score1: 0, score2: 0 };
      saveTournamentState();
      pushShareURL();
      renderTournament();
    } catch (e) {
      setSyncState('invalid');
      if (errorEl) errorEl.textContent = t(e.message) || e.message;
    }
  }

  function handleSaveScore(matchId, input1El, input2El, errorEl, status) {
    commitScore(matchId, input1El.value.trim(), input2El.value.trim(), errorEl, status);
  }

  function handleScoreboard(matchId) {
    if (scoreboardMatchId === matchId) {
      scoreboardMatchId = null;
      liveScore = { score1: 0, score2: 0 };
      renderTournament();
      return;
    }
    activeMatchId = null;
    scoreboardMatchId = matchId;
    var match = tournamentState.matches.find(function (m) { return m.id === matchId; });
    liveScore = {
      score1: (match && match.played) ? match.score1 : 0,
      score2: (match && match.played) ? match.score2 : 0,
    };
    renderTournament();
    scoreboardPanelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- Tournament Persistence ---

  function saveTournamentState() {
    try {
      localStorage.setItem('bv-tournament', JSON.stringify(tournamentState));
    } catch (e) {
      // localStorage may be unavailable; fail silently
    }
  }

  function savePlayersState() {
    try {
      localStorage.setItem('bv-players', JSON.stringify(players));
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
      tournamentRepository = createFirebaseTournamentRepository(firebase.app());
      return true;
    } catch (e) {
      return false;
    }
  }

  function getSessionIdFromURL() {
    var hash = window.location.hash;
    if (!hash || !hash.startsWith('#s=')) return null;
    return hash.slice(3);
  }

  function subscribeToSession(sid) {
    if (!tournamentRepository || !sid) return;
    if (repositoryUnsubscribe) repositoryUnsubscribe();
    repositoryUnsubscribe = tournamentRepository.watchSession(sid, function (snapshot) {
      if (!snapshot || !snapshot.tournament) {
        if (snapshot && snapshot.error) console.warn(snapshot.error);
        return;
      }
      sessionSnapshot = snapshot;
      tournamentState = snapshot.tournament;
      isReadOnly = snapshot.legacy || (snapshot.role !== 'owner' && snapshot.role !== 'scorer');
      readonlyBanner.hidden = !isReadOnly;
      resetTournamentBtn.hidden = snapshot.role !== 'owner';
      if (tournamentState.players) {
        players.length = 0;
        players.push.apply(players, tournamentState.players);
        savePlayersState();
      }
      saveTournamentState();
      tournamentSection.hidden = false;
      renderTournament();
      updateUI();
    });
  }

  function setSyncState(state) {
    syncStatus.dataset.state = state || '';
    syncStatus.textContent = state ? t('tournament.sync.' + state) : '';
    retryScoreBtn.hidden = !lastScoreCommand || ['offline', 'denied', 'conflict', 'invalid'].indexOf(state) === -1;
  }

  function renderTournamentOps() {
    tournamentOps.hidden = false;
    if (!sessionSnapshot || !sessionId) {
      accessStatus.hidden = true; accessRequest.hidden = true; accessMembers.hidden = true; return;
    }
    accessStatus.hidden = false;
    var owner = sessionSnapshot.role === 'owner';
    var requestable = !sessionSnapshot.legacy && sessionSnapshot.role === 'spectator' && sessionSnapshot.accessStatus !== 'pending';
    accessRequest.hidden = !requestable;
    requestAccessBtn.disabled = sessionSnapshot.authState !== 'ready';
    var key = owner ? 'owner' : sessionSnapshot.role === 'scorer' ? 'scorer' :
      sessionSnapshot.authState !== 'ready' ? 'authPending' : sessionSnapshot.accessStatus === 'pending' ? 'pending' : sessionSnapshot.accessStatus === 'revoked' ? 'revoked' : 'viewer';
    accessStatus.textContent = t('tournament.access.' + key);
    accessMembers.hidden = !owner;
    accessMembers.innerHTML = '';
    if (owner) Object.keys(sessionSnapshot.requests || {}).forEach(function (memberId) {
      var member = sessionSnapshot.requests[memberId];
      var li = document.createElement('li'); li.className = 'access-members__item';
      var label = document.createElement('span'); label.className = 'access-members__label';
      label.textContent = member.label + ' — ' + t('tournament.access.state.' + member.status); li.appendChild(label);
      ['approved', 'revoked'].forEach(function (status) {
        if ((status === 'approved' && member.status !== 'pending') || (status === 'revoked' && member.status === 'revoked')) return;
        var button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn--small';
        button.dataset.member = memberId; button.dataset.access = status;
        button.textContent = t('tournament.access.' + (status === 'approved' ? 'approve' : 'revoke')); li.appendChild(button);
      });
      accessMembers.appendChild(li);
    });
  }

  function handleRequestAccess() {
    var label = accessLabel.value.trim();
    if (!label || !tournamentRepository || !sessionId) { setSyncState('invalid'); return; }
    tournamentRepository.requestAccess(sessionId, label).then(function (result) { setSyncState(result.status === 'requested' ? 'synced' : result.status); });
  }

  function handleAccessDecision(event) {
    var button = event.target.closest('[data-access]');
    if (!button || !tournamentRepository) return;
    tournamentRepository.setAccess(sessionId, button.dataset.member, button.dataset.access).then(function (result) { setSyncState(result.status); });
  }

  function handleMatchFilter(event) {
    var button = event.target.closest('[data-filter]'); if (!button) return;
    matchFilter = button.dataset.filter;
    matchFilters.querySelectorAll('[data-filter]').forEach(function (item) {
      item.classList.toggle('match-filters__btn--active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    activeMatchId = null; scoreboardMatchId = null; renderTournament();
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
    var url = tournamentRepository && sessionId ? window.location.href : getShareURL();
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

    // Share is an owner-only action; read-only viewers already hold the link
    shareTournamentBtn.hidden = isReadOnly;
    renderTournamentOps();

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

    // Live scoreboard panel
    if (!isReadOnly && scoreboardMatchId) {
      renderScoreboardPanel();
      scoreboardPanelEl.hidden = false;
    } else {
      scoreboardPanelEl.hidden = true;
      scoreboardPanelEl.innerHTML = '';
    }
  }

  function renderScoreboardPanel() {
    scoreboardPanelEl.innerHTML = '';

    var match = tournamentState.matches.find(function (m) { return m.id === scoreboardMatchId; });
    if (!match) return;

    var team1 = tournamentState.teams.find(function (tm) { return tm.id === match.team1Id; });
    var team2 = tournamentState.teams.find(function (tm) { return tm.id === match.team2Id; });
    var name1 = team1 ? team1.name : match.team1Id;
    var name2 = team2 ? team2.name : match.team2Id;

    var panel = document.createElement('div');
    panel.className = 'scoreboard animate__animated animate__fadeInUp';

    // Heading
    var heading = document.createElement('h3');
    heading.className = 'scoreboard__heading';
    heading.textContent = t('tournament.scoreboard.heading');
    panel.appendChild(heading);

    // Match label
    var matchLabel = document.createElement('p');
    matchLabel.className = 'scoreboard__match-label';
    matchLabel.innerHTML =
      '<span class="scoreboard__team-tag">' + escapeHTML(name1) + '</span>' +
      ' <span class="scoreboard__vs">' + escapeHTML(t('tournament.match.vs')) + '</span> ' +
      '<span class="scoreboard__team-tag">' + escapeHTML(name2) + '</span>';
    panel.appendChild(matchLabel);

    var errorEl = document.createElement('p');
    errorEl.className = 'scoreboard__error';

    // Teams grid
    var teamsGrid = document.createElement('div');
    teamsGrid.className = 'scoreboard__teams';

    [
      { name: name1, scoreKey: 'score1' },
      { name: name2, scoreKey: 'score2' },
    ].forEach(function (side) {
      var teamPanel = document.createElement('div');
      teamPanel.className = 'scoreboard__team';

      var teamName = document.createElement('p');
      teamName.className = 'scoreboard__team-name';
      teamName.textContent = side.name;
      teamPanel.appendChild(teamName);

      var scoreDisplay = document.createElement('p');
      scoreDisplay.className = 'scoreboard__score';
      scoreDisplay.textContent = liveScore[side.scoreKey];

      var controls = document.createElement('div');
      controls.className = 'scoreboard__controls';

      var decBtn = document.createElement('button');
      decBtn.type = 'button';
      decBtn.className = 'scoreboard__dec';
      decBtn.textContent = '−'; // −
      decBtn.setAttribute('aria-label', '− ' + side.name);
      decBtn.addEventListener('click', (function (key, display) {
        return function () {
          if (liveScore[key] > 0) {
            liveScore[key]--;
            display.textContent = liveScore[key];
          }
        };
      })(side.scoreKey, scoreDisplay));

      var incBtn = document.createElement('button');
      incBtn.type = 'button';
      incBtn.className = 'scoreboard__inc';
      incBtn.textContent = '+';
      incBtn.setAttribute('aria-label', '+ ' + side.name);
      incBtn.addEventListener('click', (function (key, display) {
        return function () {
          liveScore[key]++;
          display.textContent = liveScore[key];
        };
      })(side.scoreKey, scoreDisplay));

      controls.appendChild(decBtn);
      controls.appendChild(incBtn);
      teamPanel.appendChild(scoreDisplay);
      teamPanel.appendChild(controls);
      teamsGrid.appendChild(teamPanel);
    });

    panel.appendChild(teamsGrid);

    // Actions: Cancel + Save
    var actions = document.createElement('div');
    actions.className = 'scoreboard__actions';

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'scoreboard__cancel';
    cancelBtn.textContent = t('tournament.match.cancel');
    cancelBtn.addEventListener('click', function () {
      scoreboardMatchId = null;
      liveScore = { score1: 0, score2: 0 };
      renderTournament();
    });

    actions.appendChild(cancelBtn);
    ['live', 'finished'].forEach(function (status) {
      var action = document.createElement('button'); action.type = 'button'; action.className = 'scoreboard__save';
      action.textContent = t(status === 'live' ? 'tournament.match.saveProgress' : 'tournament.match.finish');
      action.addEventListener('click', function () { commitScore(scoreboardMatchId, liveScore.score1, liveScore.score2, errorEl, status); });
      actions.appendChild(action);
    });
    panel.appendChild(actions);
    panel.appendChild(errorEl);

    scoreboardPanelEl.appendChild(panel);
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

    matches.filter(function (match) { return (match.status || (match.played ? 'finished' : 'pending')) === matchFilter; }).forEach(function (match) {
      var team1 = tournamentState.teams.find(function (tm) { return tm.id === match.team1Id; });
      var team2 = tournamentState.teams.find(function (tm) { return tm.id === match.team2Id; });
      var name1 = team1 ? team1.name : match.team1Id;
      var name2 = team2 ? team2.name : match.team2Id;
      var isActive = activeMatchId === match.id;

      var li = document.createElement('li');
      li.dataset.status = match.status || (match.played ? 'finished' : 'pending');
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
      var hasScore = match.status !== 'pending' && match.score1 != null;
      scoreEl.className = 'match-card__score' + (hasScore ? ' match-card__score--played' : '');
      scoreEl.textContent = hasScore ? (match.score1 + ' \u2013 ' + match.score2) : '\u2013';

      row.appendChild(teamsEl);
      row.appendChild(scoreEl);

      // Show Enter/Edit + Track Score buttons only when the form is NOT open
      if (!isReadOnly && !isActive) {
        var btnGroup = document.createElement('div');
        btnGroup.className = 'match-card__btn-group';

        var btn = document.createElement('button');
        btn.className = 'match-card__btn';
        btn.type = 'button';
        btn.textContent = hasScore ? t('tournament.match.edit') : t('tournament.match.enterScore');
        btn.addEventListener('click', (function (mid) {
          return function () { handleScoreEntry(mid); };
        })(match.id));

        var trackBtn = document.createElement('button');
        trackBtn.className = 'match-card__btn match-card__btn--track' +
          (scoreboardMatchId === match.id ? ' match-card__btn--track-active' : '');
        trackBtn.type = 'button';
        trackBtn.textContent = t('tournament.match.trackScore');
        trackBtn.addEventListener('click', (function (mid) {
          return function () { handleScoreboard(mid); };
        })(match.id));

        btnGroup.appendChild(btn);
        btnGroup.appendChild(trackBtn);
        row.appendChild(btnGroup);
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
        in1.value = hasScore ? match.score1 : '';
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
        in2.value = hasScore ? match.score2 : '';
        in2.placeholder = '0';
        in2.setAttribute('aria-label', name2);

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

        [in1, in2].forEach(function (inp) {
          inp.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') handleSaveScore(match.id, in1, in2, errorEl, 'finished');
          });
        });

        scoreForm.appendChild(in1);
        scoreForm.appendChild(sep);
        scoreForm.appendChild(in2);
        ['live', 'finished'].forEach(function (status) {
          var action = document.createElement('button'); action.type = 'button'; action.className = 'score-form__save';
          action.dataset.scoreAction = status;
          action.textContent = t(status === 'live' ? 'tournament.match.saveProgress' : 'tournament.match.finish');
          action.addEventListener('click', function () { handleSaveScore(match.id, in1, in2, errorEl, status); });
          scoreForm.appendChild(action);
        });
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

  function getManualSelectors() {
    var selectorsContainer = document.querySelector('.manual-pairing__selectors');
    if (!selectorsContainer) return [];
    var selects = selectorsContainer.querySelectorAll('.form__select');
    return Array.prototype.slice.call(selects);
  }

  function getTeamType(teamPlayers) {
    var hasMale = teamPlayers.some(function (p) { return p.gender === 'male'; });
    var hasFemale = teamPlayers.some(function (p) { return p.gender === 'female'; });
    return (hasMale && hasFemale) ? 'mixed' : 'same';
  }

  function renderManualDropdowns() {
    var selectorsContainer = document.querySelector('.manual-pairing__selectors');
    if (!selectorsContainer) return;

    var pairedIds = new Set();
    manualPairs.forEach(function (pair) {
      var playersInTeam = pair.players || [pair.player1, pair.player2];
      playersInTeam.forEach(function (p) {
        pairedIds.add(p.id);
      });
    });

    var available = players.filter(function (p) { return !pairedIds.has(p.id); });

    var selects = selectorsContainer.querySelectorAll('.form__select');
    var currentValues = [];
    selects.forEach(function (sel) {
      currentValues.push(sel.value);
    });

    var currentGroups = selectorsContainer.querySelectorAll('.manual-pairing__selector-group');
    currentGroups.forEach(function (el) {
      el.remove();
    });

    for (var i = 0; i < teamSize; i++) {
      var group = document.createElement('div');
      group.className = 'manual-pairing__selector-group';

      var label = document.createElement('label');
      label.className = 'form__label';
      label.htmlFor = 'select-player-' + i;
      label.textContent = t('pairing.selectPlayerX', { n: i + 1 });

      var select = document.createElement('select');
      select.className = 'form__select';
      select.id = 'select-player-' + i;
      select.addEventListener('change', renderManualDropdowns);

      var defOpt = document.createElement('option');
      defOpt.value = '';
      defOpt.disabled = true;
      defOpt.selected = !currentValues[i];
      defOpt.textContent = t('pairing.selectPlayerX', { n: i + 1 });
      select.appendChild(defOpt);

      group.appendChild(label);
      group.appendChild(select);
      selectorsContainer.insertBefore(group, manualPairBtn);
    }

    var newSelects = selectorsContainer.querySelectorAll('.form__select');
    newSelects.forEach(function (sel, k) {
      var prevVal = currentValues[k];
      var otherSelected = currentValues.filter(function (val, idx) {
        return idx !== k && val !== '';
      });

      sel.innerHTML = '';
      var defOpt = document.createElement('option');
      defOpt.value = '';
      defOpt.disabled = true;
      defOpt.selected = !prevVal;
      defOpt.textContent = t('pairing.selectPlayerX', { n: k + 1 });
      sel.appendChild(defOpt);

      available.forEach(function (p) {
        if (otherSelected.indexOf(String(p.id)) !== -1) return;
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        opt.selected = prevVal && String(p.id) === prevVal;
        sel.appendChild(opt);
      });

      if (prevVal && otherSelected.indexOf(prevVal) === -1 && available.some(function (p) { return String(p.id) === prevVal; })) {
        sel.value = prevVal;
      } else {
        sel.value = '';
      }
    });

    var manualHint = document.querySelector('.manual-pairing__hint');
    if (manualHint) {
      var hintKey = teamSize === 2 ? 'pairing.manualHint' : 'pairing.manualHintTeams';
      manualHint.setAttribute('data-i18n', hintKey);
      manualHint.textContent = t(hintKey);
    }
    if (manualPairsEmpty) {
      var emptyKey = teamSize === 2 ? 'pairing.noPaired' : 'pairing.noPairedTeams';
      manualPairsEmpty.setAttribute('data-i18n', emptyKey);
      manualPairsEmpty.textContent = t(emptyKey);
    }
    if (confirmManualBtn) {
      var confirmKey = teamSize === 2 ? 'pairing.confirmBtn' : 'pairing.confirmBtnTeams';
      confirmManualBtn.setAttribute('data-i18n', confirmKey);
      confirmManualBtn.textContent = t(confirmKey);
    }

    updateManualPairBtnState();
  }

  function updateManualPairBtnState() {
    var selects = getManualSelectors();
    var allSelected = selects.length > 0 && selects.every(function (sel) {
      return sel.value !== '';
    });
    manualPairBtn.disabled = !allSelected;
  }

  function renderManualPairsList() {
    manualPairsList.innerHTML = '';
    manualPairsEmpty.hidden = manualPairs.length > 0;

    manualPairs.forEach(function (pair, idx) {
      var li = document.createElement('li');
      li.className = 'manual-pairing__pair-item animate__animated animate__fadeIn';

      var playersInTeam = pair.players || [pair.player1, pair.player2];
      var namesEl = document.createElement('span');
      namesEl.className = 'manual-pairing__pair-names';

      var html = '';
      playersInTeam.forEach(function (player, pIdx) {
        var badge = player.gender === 'male' ? t('players.badgeMale') : t('players.badgeFemale');
        var levelBadge = getLevelBadgeHTML(player.level);
        var levelBadgeHTML = levelBadge ? ' ' + levelBadge : '';
        if (pIdx > 0) {
          html += ' <span class="manual-pairing__pair-sep">&amp;</span> ';
        }
        html += escapeHTML(player.name) +
          ' <span class="player-list__badge player-list__badge--' + player.gender + '">' + badge + '</span>' +
          levelBadgeHTML;
      });
      namesEl.innerHTML = html;

      var removeBtn = document.createElement('button');
      removeBtn.className = 'manual-pairing__remove';
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', t(teamSize === 2 ? 'pairing.removePair' : 'pairing.removePairTeams'));
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
    var selects = getManualSelectors();
    var selectedIds = [];
    for (var i = 0; i < selects.length; i++) {
      var val = selects[i].value;
      if (!val) return;
      selectedIds.push(val);
    }

    var selectedPlayers = selectedIds.map(function (id) {
      return players.find(function (p) { return String(p.id) === id; });
    });
    if (selectedPlayers.some(function (p) { return !p; })) return;

    if (teamSize === 2) {
      manualPairs.push({ player1: selectedPlayers[0], player2: selectedPlayers[1] });
    } else {
      manualPairs.push({ players: selectedPlayers });
    }

    selects.forEach(function (sel) {
      sel.value = '';
    });

    renderManualDropdowns();
    renderManualPairsList();
  }

  function removeManualPair(index) {
    manualPairs.splice(index, 1);
    renderManualDropdowns();
    renderManualPairsList();
  }

  function handleConfirmManualCouples() {
    var confirmedTeams = manualPairs.map(function (pair) {
      var playersInTeam = pair.players || [pair.player1, pair.player2];
      var type = getTeamType(playersInTeam);
      if (teamSize === 2) {
        return { player1: playersInTeam[0], player2: playersInTeam[1], type: type };
      }
      return { players: playersInTeam, type: type };
    });

    var pairedIds = new Set();
    manualPairs.forEach(function (pair) {
      var playersInTeam = pair.players || [pair.player1, pair.player2];
      playersInTeam.forEach(function (p) {
        pairedIds.add(p.id);
      });
    });

    var remainingPlayers = players.filter(function (p) { return !pairedIds.has(p.id); });
    
    if (teamSize === 2) {
      var autoResult = generateCouples(remainingPlayers);
      lastResult = {
        couples: confirmedTeams.concat(autoResult.couples),
        unmatched: autoResult.unmatched,
      };
    } else {
      var autoResult = generateTeams(remainingPlayers, teamSize);
      lastResult = {
        teams: confirmedTeams.concat(autoResult.teams),
        unmatched: autoResult.unmatched,
      };
    }

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

  // Renders a level badge only for whitelisted values; restored state
  // (localStorage/Firebase) may carry numbers outside 1|2|3.
  function getLevelBadgeHTML(level) {
    return isValidLevel(level)
      ? `<span class="player-list__badge player-list__badge--level-${level}">${t('players.badgeLevel' + level)}</span>`
      : '';
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', init);
})();
