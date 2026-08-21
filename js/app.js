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
  let currentResolution = null; // last resolveFormat() projection, null for classic sessions
  let selectedFormatPreset = 'classic'; // 'classic' | 'groupsTo' | 'groupsFinal' | 'crossover'
  let formatDraft = null;       // Format object being edited in setup, null for classic (PR3a)
  let activeMatchId = null;     // which match card has the score form open
  let scoreboardMatchId = null; // which match is open in live scoreboard mode
  let liveScore = { score1: 0, score2: 0 }; // live scores being tracked
  let isReadOnly = false;       // true when viewing a shared URL (no editing)
  var tournamentRepository = null;
  var repositoryUnsubscribe = null;
  var sessionId = null;         // Active session ID written to / read from Firebase
  var sessionSnapshot = null;
  var lastScoreCommand = null;
  var pendingFinish = null;        // { score1, score2 } awaiting in-view Finish confirmation (REQ-UX-41)
  var conflictServerResult = null; // { score1, score2, revision } from the last saveResult() conflict (REQ-UX-42)
  var scoreboardErrorMessage = null; // survives a refreshScoreboardPanel() rebuild while state stays 'invalid'
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
  var currentView = null;            // last nav pick this session; null = follow computeWorkspace() default
  var workspaceSessionState = 'ok';  // 'ok' | 'loading' | 'notFound' — REQ-UX-62
  var workspaceToastTimer = null;

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
  const editPairsBtn = document.getElementById('edit-pairs-btn');
  const clearBtn = document.getElementById('clear-btn');
  const teamsOptionsDisclosure = document.getElementById('teams-options-disclosure');
  const teamsModeFork = document.getElementById('teams-mode-fork');
  const teamsForkTournamentBtn = document.getElementById('teams-fork-tournament-btn');
  const teamsForkKingBtn = document.getElementById('teams-fork-king-btn');

  const pairingToggle      = document.getElementById('pairing-toggle');
  const modeRandomBtn      = document.getElementById('mode-random-btn');
  const modeManualBtn      = document.getElementById('mode-manual-btn');
  const manualPairingPanel = document.getElementById('manual-pairing-panel');
  const manualPairBtn      = document.getElementById('manual-pair-btn');
  const manualPairsList    = document.getElementById('manual-pairs-list');
  const manualPairsEmpty   = document.getElementById('manual-pairs-empty');
  const confirmManualBtn   = document.getElementById('confirm-manual-btn');

  const resultsSection = document.getElementById('results-section');
  const teamsSummaryLine = document.getElementById('teams-summary-line');
  const couplesGrid = document.getElementById('couples-grid');
  const unmatchedNotice = document.getElementById('unmatched-notice');

  const matchTypeSelection = document.getElementById('match-type-selection');

  const tournamentSetup = document.getElementById('tournament-setup');
  const startTournamentBtn = document.getElementById('start-tournament-btn');
  const groupCountOptions = document.getElementById('group-count-options');
  const formatPresetOptions = document.getElementById('format-preset-options');
  const formatPresetCrossoverBtn = document.getElementById('format-preset-crossover');
  const formatEditor = document.getElementById('format-editor');
  const formatStagesEl = document.getElementById('format-stages');
  const formatCustomRules = document.getElementById('format-custom-rules');
  const formatCustomRulesCount = document.getElementById('format-custom-rules-count');
  const formatError = document.getElementById('format-error');
  const formatLockedNote = document.getElementById('format-locked-note');
  const formatLockedResetBtn = document.getElementById('format-locked-reset-btn');
  const eventSummaryLine = document.getElementById('event-summary-line');
  const readinessListEl = document.getElementById('readiness-list');
  const shareTournamentBtn = document.getElementById('share-tournament-btn');
  const resetTournamentBtn = document.getElementById('reset-tournament-btn');
  const readonlyBanner = document.getElementById('readonly-banner');
  const tournamentOps = document.getElementById('tournament-ops');
  const accessStatus = document.getElementById('access-status');
  const accessRequest = document.getElementById('access-request');
  const accessLabel = document.getElementById('access-label');
  const requestAccessBtn = document.getElementById('request-access-btn');
  const accessMembers = document.getElementById('access-members');
  const syncStatus = document.getElementById('sync-status');
  const retryScoreBtn = document.getElementById('retry-score-btn');
  const workspaceEl = document.getElementById('workspace');
  const workspaceNavItemsEl = document.getElementById('workspace-nav-items');
  const workspaceNavCta = document.getElementById('workspace-nav-cta');
  const workspaceToastEl = document.getElementById('workspace-toast');
  const tournamentSection = document.getElementById('tournament-section');
  const tournamentGroupsEl = document.getElementById('tournament-groups');
  const tournamentStagesEl = document.getElementById('tournament-stages');
  const scoreboardPanelEl = document.getElementById('scoreboard-panel');
  const tournamentCustomRules = document.getElementById('tournament-custom-rules');
  const tournamentCustomRulesSummary = document.getElementById('tournament-custom-rules-summary');
  const tournamentCustomRulesText = document.getElementById('tournament-custom-rules-text');

  // --- Command center (REQ-UX-30..35) DOM references ---
  const nextMatchCardEl = document.getElementById('next-match-card');
  const tournamentStageProgressEl = document.getElementById('tournament-stage-progress');
  const tournamentLiveSectionEl = document.getElementById('tournament-live-section');
  const tournamentPendingSectionEl = document.getElementById('tournament-pending-section');
  const tournamentRecentlyFinishedSectionEl = document.getElementById('tournament-recently-finished-section');
  const sessionNotFoundEl = document.getElementById('session-not-found');
  const sessionNotFoundResetBtn = document.getElementById('session-not-found-reset-btn');

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
    editPairsBtn.addEventListener('click', function () { handleNavClick('setup'); });
    clearBtn.addEventListener('click', handleClearAll);
    teamsForkTournamentBtn.addEventListener('click', handleTeamsForkTournament);
    teamsForkKingBtn.addEventListener('click', handleTeamsForkKing);
    pairingToggle.addEventListener('click', handlePairingModeClick);
    matchTypeSelection.addEventListener('click', handleMatchTypeClick);
    manualPairBtn.addEventListener('click', handleManualPair);
    confirmManualBtn.addEventListener('click', handleConfirmManualCouples);
    startTournamentBtn.addEventListener('click', handleStartTournament);
    resetTournamentBtn.addEventListener('click', handleResetTournament);
    formatLockedResetBtn.addEventListener('click', handleResetTournament);
    shareTournamentBtn.addEventListener('click', handleShareTournament);
    requestAccessBtn.addEventListener('click', handleRequestAccess);
    accessMembers.addEventListener('click', handleAccessDecision);
    sessionNotFoundResetBtn.addEventListener('click', handleStartLocalSetup);
    retryScoreBtn.addEventListener('click', function () {
      if (lastScoreCommand) commitScore(lastScoreCommand.matchId, lastScoreCommand.score1, lastScoreCommand.score2, null, lastScoreCommand.status);
    });
    groupCountOptions.addEventListener('click', handleGroupOptClick);
    formatPresetOptions.addEventListener('click', handleFormatPresetClick);
    formatStagesEl.addEventListener('input', handleFormatStageInput);
    formatStagesEl.addEventListener('change', handleFormatStageInput);
    formatCustomRules.addEventListener('input', handleFormatCustomRulesInput);
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

    renderChrome();
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
    renderChrome();
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
    selectFormatPreset('classic'); // couple/team shape changed — start fresh (format is immutable per session)
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
    renderChrome();
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

  /** Shared source data for both the Players heading's gender breakdown and
   * the event summary's compact gender-count segment (REQ-UX-10). */
  function computeGenderCounts() {
    var male = 0, female = 0, unspecified = 0;
    players.forEach(function (p) {
      if (p.gender === 'male') male++;
      else if (p.gender === 'female') female++;
      else unspecified++;
    });
    return { male: male, female: female, unspecified: unspecified };
  }

  function renderCounts() {
    var counts = computeGenderCounts();

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

    genderCounts.textContent = t('players.genderCounts', { males: counts.male, females: counts.female, unspecified: counts.unspecified });
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
    // REQ-UX-13: once a tournament starts, format stays visible but read-only
    // (renderChrome() -> renderTournamentSetupState() applies the lock) rather
    // than disappearing — the organizer needs the "Locked" note and Reset path.
    tournamentSetup.hidden = !couplesGenerated || kingState !== null;
    kingSetup.hidden = !couplesGenerated || tournamentState !== null || kingState !== null;

    // REQ-UX-21/23: Regenerate/Edit pairs live behind a Teams disclosure and
    // become read-only (not rendered) once a tournament or King game starts —
    // team cards themselves stay read-only from that point on.
    var teamsLocked = tournamentState !== null || kingState !== null;
    regenerateBtn.hidden = isReadOnly || !couplesGenerated || pairingMode !== 'random' || teamsLocked;
    editPairsBtn.hidden = isReadOnly || !couplesGenerated || pairingMode !== 'manual' || teamsLocked;
    clearBtn.hidden = clearBtn.hidden || teamsLocked;
    teamsOptionsDisclosure.hidden = isReadOnly || teamsLocked;
    // REQ-UX-22: the Tournament | King of the Court fork is Teams' single
    // "ready to start" state — same reachability window as tournamentSetup/kingSetup.
    teamsModeFork.hidden = !couplesGenerated || teamsLocked;
    // Keep max selectable groups in sync with available teams
    if (couplesGenerated && lastResult) {
      const teamCount = lastResult.teams ? lastResult.teams.length : (lastResult.couples ? lastResult.couples.length : 0);
      updateGroupOptions(teamCount);
      updateFormatPresetVisibility();
    }
  }

  // --- Workspace Chrome (Setup/Teams/Tournament/Results nav) — REQ-UX-01..07 ---

  /** Assembles computeWorkspace()'s pure input from the module's live state
   * (design "Module Design > js/workspace.js > Input"). */
  function buildWorkspaceInput() {
    var groups = formatDraft ? getSetupGroupsShape() : [];
    var teams = lastResult ? (lastResult.teams || lastResult.couples || []) : [];
    var unmatched = lastResult ? lastResult.unmatched : null;
    var unmatchedCount = unmatched ? (Array.isArray(unmatched) ? unmatched.length : 1) : 0;
    var complete = tournamentState
      ? (currentResolution ? currentResolution.complete : isTournamentComplete(tournamentState.matches))
      : (kingState ? isKingGameOver(kingState) : false);
    var hasNextMatch = false;
    if (tournamentState) {
      var resolution = tournamentState.format ? currentResolution : null;
      hasNextMatch = tournamentDay({ matches: tournamentState.matches, format: tournamentState.format || null, resolution: resolution }).nextMatch !== null;
    } else if (kingState) {
      hasNextMatch = !isKingGameOver(kingState);
    }
    var pendingRequestCount = 0;
    if (sessionSnapshot && sessionSnapshot.requests) {
      Object.keys(sessionSnapshot.requests).forEach(function (id) {
        if (sessionSnapshot.requests[id].status === 'pending') pendingRequestCount++;
      });
    }
    return {
      role: (sessionSnapshot && sessionSnapshot.role) || 'owner',
      isReadOnly: isReadOnly,
      sessionState: workspaceSessionState,
      playerCount: players.length,
      teamSize: teamSize,
      couplesGenerated: couplesGenerated,
      teamCount: teams.length,
      unmatchedCount: unmatchedCount,
      groupCount: getSelectedGroupCount(),
      formatValidation: formatDraft ? validateFormat(formatDraft, groups) : null,
      hasTournament: tournamentState !== null,
      hasKingGame: kingState !== null,
      complete: complete,
      hasNextMatch: hasNextMatch,
      pendingRequestCount: pendingRequestCount,
      firebaseAvailable: tournamentRepository !== null,
      // Real per-session connectivity (REQ-UX-11/80) — no signal exists
      // before a session is subscribed, so this stays undefined (defaults
      // to ok in workspace.js) until subscribeToSession() populates it.
      firebaseConnected: sessionSnapshot ? sessionSnapshot.connection !== 'offline' : undefined,
      currentView: currentView,
    };
  }

  /** Resolves the active WorkspaceView and applies it to the DOM (D1) —
   * the CSS slot filter does the actual show/hide. */
  function applyWorkspace() {
    var view = computeWorkspace(buildWorkspaceInput());
    workspaceEl.dataset.view = view.view;
    return view;
  }

  /** Owns #workspace-nav — never called from inside renderTournament()/
   * renderKing() (D3/R3); patches existing nodes in place (never rebuilds
   * an unchanged button set), so focus/identity survive a snapshot re-render. */
  function renderChrome() {
    var view = applyWorkspace();
    patchWorkspaceNavItems(view);
    patchWorkspaceCta(view);
    renderEventSummary();
    renderReadiness(view);
    renderTournamentSetupState(view);
    renderTeamsForkState(view);
    renderCommandCenter();
  }

  /** REQ-UX-10: compact "{players} · {genderCounts} · {teamSize}vs{teamSize}
   * · {mode} · {teams} · {format|King}" line atop Setup. Gender counts reuse
   * computeGenderCounts()/the badge letters shown in the player list; mode
   * is shown unconditionally (it is already selected before teams exist),
   * not gated on couplesGenerated. Wraps via .event-summary__line's
   * overflow-wrap:anywhere rather than truncating at 320px. */
  function renderEventSummary() {
    var counts = computeGenderCounts();
    var parts = [
      t('workspace.summary.players', { count: players.length }),
      counts.male + t('players.badgeMale') + ' ' + counts.female + t('players.badgeFemale') + ' ' + counts.unspecified + t('players.badgeUnspecified'),
      teamSize + 'vs' + teamSize,
      t(pairingMode === 'manual' ? 'pairing.modeManual' : 'pairing.modeRandom'),
    ];
    if (couplesGenerated) {
      var teams = lastResult ? (lastResult.teams || lastResult.couples || []) : [];
      parts.push(t('workspace.summary.teams', { count: teams.length }));
    }
    if (kingState) parts.push(t('king.heading'));
    else if (formatDraft) parts.push(t('tournament.format.preset.' + selectedFormatPreset));
    eventSummaryLine.textContent = parts.join(' · ');
  }

  /** REQ-UX-11: renders computeWorkspace().readiness as an icon+text list —
   * never color-only (REQ-UX-72). */
  function renderReadiness(view) {
    readinessListEl.innerHTML = '';
    view.readiness.forEach(function (item) {
      var suffix = item.ok ? 'ok' : (item.blocking ? 'blocked' : 'warn');
      var li = document.createElement('li');
      li.className = 'readiness__item readiness__item--' + (item.ok ? 'ok' : (item.blocking ? 'not-ok' : 'warn'));
      li.dataset.readinessKey = item.key;
      var icon = document.createElement('span');
      icon.className = 'readiness__icon'; icon.setAttribute('aria-hidden', 'true');
      icon.textContent = item.ok ? '✓' : (item.blocking ? '✗' : '⚠');
      var text = document.createElement('span');
      text.className = 'readiness__text';
      text.textContent = t('workspace.checklist.' + item.key + '.' + suffix, item.params);
      li.appendChild(icon); li.appendChild(text);
      readinessListEl.appendChild(li);
    });
  }

  /** REQ-UX-13 format lock (read-only note + disabled controls, reset
   * reachable from Setup) and REQ-UX-12 single-CTA gating for the literal
   * Start Tournament button (the nav center CTA already gates itself). */
  function renderTournamentSetupState(view) {
    var locked = view.formatLocked;
    formatLockedNote.hidden = !locked;
    if (couplesGenerated && lastResult) {
      updateGroupOptions((lastResult.teams || lastResult.couples || []).length);
    }
    if (locked) groupCountOptions.querySelectorAll('.tournament-setup__opt').forEach(function (b) { b.disabled = true; });
    formatPresetOptions.querySelectorAll('.format-setup__opt').forEach(function (b) { b.disabled = locked; });
    formatCustomRules.disabled = locked;
    formatStagesEl.querySelectorAll('input').forEach(function (el) { el.disabled = locked; });

    startTournamentBtn.hidden = locked;
    var blockedReasonKey = (!locked && view.primaryAction && view.primaryAction.id === 'startTournament')
      ? view.primaryAction.blockedReasonKey : null;
    startTournamentBtn.disabled = !!blockedReasonKey;
    if (blockedReasonKey) startTournamentBtn.title = t(blockedReasonKey);
    else startTournamentBtn.removeAttribute('title');
  }

  /** REQ-UX-21/22: gates the Teams mode fork exactly like startTournamentBtn
   * — disabled while any blocking readiness item is unmet (same
   * view.primaryAction.blockedReasonKey the center CTA and Setup's Start
   * Tournament button already use), naming the blocker via title/aria-label
   * so a blocked tap is explained rather than silently starting an invalid
   * tournament (fixed: previously gated on couplesGenerated only). */
  function renderTeamsForkState(view) {
    var blockedReasonKey = (view.primaryAction && view.primaryAction.id === 'startTournament')
      ? view.primaryAction.blockedReasonKey : null;
    [teamsForkTournamentBtn, teamsForkKingBtn].forEach(function (btn) {
      btn.disabled = !!blockedReasonKey;
      if (blockedReasonKey) {
        var reason = t(blockedReasonKey);
        btn.title = reason;
        btn.setAttribute('aria-label', t(btn.getAttribute('data-i18n')) + ' — ' + reason);
      } else {
        btn.removeAttribute('title');
        btn.removeAttribute('aria-label');
      }
    });
  }

  // --- Tournament command center (REQ-UX-30..35) ---

  /** Snapshot survival (design "restore focus by element id"): captures enough
   * to re-find the focused control (Next Match action, a match-day row, a
   * "Show all" summary, or an access Approve/Deny button) after an async
   * snapshot rebuilds it. Null when focus is elsewhere. */
  function captureCommandCenterFocus() {
    var active = document.activeElement;
    if (!active || active === document.body) return null;
    if (active === nextMatchCardEl.querySelector('.next-match-card__action')) {
      return { type: 'next-match-action' };
    }
    if (accessMembers.contains(active) && active.dataset.member) {
      return { type: 'access-member', member: active.dataset.member, access: active.dataset.access };
    }
    var summary = active.closest && active.closest('.match-day-section__more > summary');
    if (summary) {
      var section = summary.closest('.match-day-section');
      if (section) return { type: 'show-all-summary', sectionId: section.id };
    }
    var rowBtn = active.closest && active.closest('.match-card[data-match-id] .match-card__btn');
    if (rowBtn) {
      var row = rowBtn.closest('.match-card[data-match-id]');
      if (row) return { type: 'match-row-action', matchId: row.dataset.matchId };
    }
    return null;
  }

  /** Restores focus captured by captureCommandCenterFocus() after the
   * relevant subtree has been rebuilt. A missing target (e.g. the match
   * finished and its row/button no longer exists) is a silent no-op. */
  function restoreCommandCenterFocus(ref) {
    if (!ref) return;
    var target = null;
    if (ref.type === 'next-match-action') {
      target = nextMatchCardEl.querySelector('.next-match-card__action');
    } else if (ref.type === 'access-member') {
      target = accessMembers.querySelector('[data-member="' + ref.member + '"][data-access="' + ref.access + '"]') ||
        accessMembers.querySelector('[data-member="' + ref.member + '"]');
    } else if (ref.type === 'show-all-summary') {
      var section = document.getElementById(ref.sectionId);
      target = section && section.querySelector('.match-day-section__more > summary');
    } else if (ref.type === 'match-row-action') {
      var row = document.querySelector('.match-card[data-match-id="' + ref.matchId + '"]');
      target = row && row.querySelector('.match-card__btn');
    }
    if (target) target.focus();
  }

  /** Owns everything below the status strip inside the Tournament destination:
   * Next Match card, stage progress and the stacked Live/Pending/Recently
   * finished sections — called from renderChrome() only (D3/R3), never from
   * renderTournament()/renderKing(), so it always sees a fresh
   * currentResolution/tournamentState and tolerates a full re-render on every
   * snapshot without resetting focus or scroll elsewhere in the page. The
   * inline access-request card's content is still owned by
   * renderTournamentOps() (called from renderTournament()) — only its DOM
   * position moved; this function does not touch it.
   * King of the Court mode (REQ-UX-35) replaces this whole block with its own
   * throne/queue UI, so everything here stays hidden while a King game is
   * active. */
  function renderCommandCenter() {
    sessionNotFoundEl.hidden = workspaceSessionState !== 'notFound';
    if (workspaceSessionState === 'notFound') {
      tournamentSection.hidden = true;
      kingSection.hidden = true;
      return;
    }
    if (!tournamentState) {
      nextMatchCardEl.hidden = true;
      tournamentStageProgressEl.hidden = true;
      tournamentLiveSectionEl.hidden = true;
      tournamentPendingSectionEl.hidden = true;
      tournamentRecentlyFinishedSectionEl.hidden = true;
      return;
    }
    var resolution = tournamentState.format ? currentResolution : null;
    var day = tournamentDay({
      matches: tournamentState.matches,
      groups: tournamentState.groups,
      format: tournamentState.format || null,
      resolution: resolution,
    });
    renderNextMatchCard(day);
    renderStageProgress(day);
    renderMatchDaySection(tournamentLiveSectionEl, 'live', day.live, day.counts.live);
    renderMatchDaySection(tournamentPendingSectionEl, 'pending', day.pending, day.counts.pending);
    renderMatchDaySection(tournamentRecentlyFinishedSectionEl, 'recentlyFinished', day.recentlyFinished, day.counts.recentlyFinished);
  }

  /** REQ-UX-31: the Next Match card and its 4 reason states. The action
   * button reuses the existing handleScoreboard() flow (same live-scoreboard
   * panel, expectedRevision/conflict semantics as every other entry point). */
  function renderNextMatchCard(day) {
    nextMatchCardEl.hidden = false;
    nextMatchCardEl.innerHTML = '';
    var complete = currentResolution ? currentResolution.complete : isTournamentComplete(tournamentState.matches);

    var card = document.createElement('div');
    card.className = 'next-match-card__inner';

    var heading = document.createElement('h3');
    heading.className = 'next-match-card__label';
    heading.textContent = t('workspace.tournament.nextMatch.heading');
    card.appendChild(heading);

    if (day.nextMatch) {
      var match = day.nextMatch;
      var name1 = match.team1Id ? resolveMatchTeamName(match.team1Id) : formatSlotLabel(match.team1Slot);
      var name2 = match.team2Id ? resolveMatchTeamName(match.team2Id) : formatSlotLabel(match.team2Slot);

      var teamsEl = document.createElement('p');
      teamsEl.className = 'next-match-card__teams';
      teamsEl.innerHTML = escapeHTML(name1) +
        ' <span class="next-match-card__vs">' + escapeHTML(t('tournament.match.vs')) + '</span> ' +
        escapeHTML(name2);
      card.appendChild(teamsEl);

      var metaParts = [];
      if (match.groupId) {
        metaParts.push(t('tournament.group', { id: match.groupId }));
      } else if (match.stageId) {
        // Knockout matches carry no groupId — name the knockout stage instead
        // (e.g. "Quarterfinals"), looked up from the same stageProgress list
        // rendered just above.
        var matchStage = (day.stageProgress || []).filter(function (s) { return s.id === match.stageId; })[0];
        if (matchStage) metaParts.push(t(matchStage.label));
      }
      // Set Rules are unset (pointsTo: null) for classic sessions — same guard
      // already used by renderStagePanel()/renderScoreboardPanel().
      if (match.rules && match.rules.pointsTo != null) metaParts.push(formatStageRuleLabel(match.rules));
      if (metaParts.length) {
        var meta = document.createElement('p');
        meta.className = 'next-match-card__meta';
        meta.textContent = metaParts.join(' · ');
        card.appendChild(meta);
      }

      if (!isReadOnly) {
        var actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'btn btn--success btn--large next-match-card__action';
        actionBtn.textContent = match.status === 'live'
          ? t('workspace.tournament.nextMatch.resumeBtn') : t('workspace.tournament.nextMatch.scoreBtn');
        actionBtn.addEventListener('click', (function (mid) { return function () { handleScoreboard(mid); }; })(match.matchId));
        card.appendChild(actionBtn);
      }
    } else {
      var reasonEl = document.createElement('p');
      reasonEl.className = 'next-match-card__reason';
      reasonEl.textContent = t(complete
        ? 'workspace.tournament.nextMatch.reason.complete'
        : 'workspace.tournament.nextMatch.reason.' + day.nextMatchReason);
      card.appendChild(reasonEl);

      if (complete) {
        var resultsLink = document.createElement('button');
        resultsLink.type = 'button';
        resultsLink.className = 'btn btn--large next-match-card__results-link';
        resultsLink.textContent = t('workspace.tournament.nextMatch.seeResults');
        resultsLink.addEventListener('click', function () { handleNavClick('results'); });
        card.appendChild(resultsLink);
      }
    }

    nextMatchCardEl.appendChild(card);
  }

  /** REQ-UX-33: played/total per group (classic) or per stage (formatted
   * sessions), rendered as text — never color-only (REQ-UX-72). Classic
   * group labels use the forward-registered 'tournament.day.stageProgress.group'
   * key (js/tournament-day.js); formatted stage labels reuse the same
   * t(stage.label) pattern already used by renderStagePanel(). */
  function renderStageProgress(day) {
    var stages = day.stageProgress || [];
    tournamentStageProgressEl.hidden = stages.length === 0;
    tournamentStageProgressEl.innerHTML = '';
    if (stages.length === 0) return;

    var heading = document.createElement('h3');
    heading.className = 'stage-progress__heading';
    heading.textContent = t('workspace.tournament.stageProgress.heading');
    tournamentStageProgressEl.appendChild(heading);

    var ul = document.createElement('ul');
    ul.className = 'stage-progress__list';
    stages.forEach(function (stage) {
      var li = document.createElement('li');
      li.className = 'stage-progress__item';
      var label = stage.kind === 'group' ? t(stage.label, { group: stage.id }) : t(stage.label);
      // A classic group has no real stage dependency, so its 'pending' status
      // (0 played) reads as neutral "Not started" rather than the formatted
      // engine's "Locked" — 'pending' legitimately means locked-by-a-prior-
      // stage only for a real (formatted) stage.
      var statusLabel = (stage.kind === 'group' && stage.status === 'pending')
        ? t('workspace.tournament.stageProgress.notStarted')
        : formatStageStatusLabel(stage.status);
      li.textContent = label + ' — ' +
        t('workspace.tournament.stageProgress.count', { played: stage.played, total: stage.total }) +
        ' · ' + statusLabel;
      ul.appendChild(li);
    });
    tournamentStageProgressEl.appendChild(ul);
  }

  /** REQ-UX-32: Live / Pending / Recently finished, each showing its count and
   * collapsing anything past TOURNAMENT_DAY_COLLAPSE_AFTER (5) behind a
   * "Show all (N)" disclosure — tournamentDay() always returns the full
   * array; the collapse itself is this rendering concern. */
  function renderMatchDaySection(container, kind, matches, count) {
    // Snapshot survival: a "Show all" disclosure the organizer already opened
    // must stay open across a re-render triggered by an unrelated snapshot —
    // captured before innerHTML clears it, restored on the rebuilt <details>.
    var wasOpen = !!container.querySelector('.match-day-section__more[open]');
    container.hidden = count === 0;
    container.innerHTML = '';
    if (count === 0) return;

    var heading = document.createElement('h3');
    heading.className = 'match-day-section__heading';
    heading.textContent = t('workspace.tournament.section.' + kind, { count: count });
    container.appendChild(heading);

    var ul = document.createElement('ul');
    ul.className = 'match-list';
    matches.slice(0, TOURNAMENT_DAY_COLLAPSE_AFTER).forEach(function (m) { ul.appendChild(renderMatchDayRow(m)); });
    container.appendChild(ul);

    if (count > TOURNAMENT_DAY_COLLAPSE_AFTER) {
      var details = document.createElement('details');
      details.className = 'disclosure match-day-section__more';
      details.open = wasOpen;
      var summary = document.createElement('summary');
      summary.className = 'disclosure__summary';
      summary.textContent = t('workspace.tournament.showAll', { count: count });
      details.appendChild(summary);
      var moreUl = document.createElement('ul');
      moreUl.className = 'match-list disclosure__content';
      matches.slice(TOURNAMENT_DAY_COLLAPSE_AFTER).forEach(function (m) { moreUl.appendChild(renderMatchDayRow(m)); });
      details.appendChild(moreUl);
      container.appendChild(details);
    }
  }

  /** One row for a command-center list — reuses the existing .match-card
   * markup/CSS (same as renderMatchList()/renderStagePanel()) so no new
   * match-row styling is needed. data-match-id backs snapshot-survival focus
   * restoration (captureCommandCenterFocus()/restoreCommandCenterFocus()). */
  function renderMatchDayRow(match) {
    var name1 = match.team1Id ? resolveMatchTeamName(match.team1Id) : formatSlotLabel(match.team1Slot);
    var name2 = match.team2Id ? resolveMatchTeamName(match.team2Id) : formatSlotLabel(match.team2Slot);
    var hasScore = match.score1 != null && match.score2 != null;

    var li = document.createElement('li');
    li.dataset.status = match.status;
    li.dataset.matchId = match.matchId;
    li.className = 'match-card' + (match.played ? ' match-card--played' : '');

    var row = document.createElement('div');
    row.className = 'match-card__row';

    var teamsEl = document.createElement('span');
    teamsEl.className = 'match-card__teams';
    teamsEl.innerHTML = escapeHTML(name1) +
      ' <span class="match-card__vs">' + escapeHTML(t('tournament.match.vs')) + '</span> ' +
      escapeHTML(name2);
    row.appendChild(teamsEl);

    var scoreEl = document.createElement('span');
    scoreEl.className = 'match-card__score' + (hasScore ? ' match-card__score--played' : '');
    scoreEl.textContent = hasScore ? (match.score1 + ' – ' + match.score2) : '–';
    row.appendChild(scoreEl);

    if (!isReadOnly && match.scorable) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'match-card__btn';
      btn.textContent = match.status === 'live'
        ? t('workspace.tournament.matchRow.resume') : t('workspace.tournament.matchRow.score');
      btn.addEventListener('click', (function (mid) { return function () { handleScoreboard(mid); }; })(match.matchId));
      row.appendChild(btn);
    }

    li.appendChild(row);
    return li;
  }

  /** REQ-UX-62: leaves the not-found state and returns to a fresh local
   * organizer flow — clears the session/hash rather than reloading. */
  function handleStartLocalSetup() {
    if (repositoryUnsubscribe) { repositoryUnsubscribe(); repositoryUnsubscribe = null; }
    sessionId = null;
    sessionSnapshot = null;
    workspaceSessionState = 'ok';
    isReadOnly = false;
    tournamentState = null;
    kingState = null;
    currentView = null;
    tournamentSection.hidden = true;
    kingSection.hidden = true;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    updateUI();
  }

  /** Rebuilds buttons only when the nav-id list itself changes (role/session
   * flip); otherwise every button node is reused and patched in place. */
  function patchWorkspaceNavItems(view) {
    var existing = Array.prototype.slice.call(workspaceNavItemsEl.children);
    var nextIds = view.navItems.map(function (item) { return item.id; });
    var idsChanged = existing.length !== nextIds.length ||
      existing.some(function (el, i) { return el.dataset.viewId !== nextIds[i]; });
    if (idsChanged) {
      workspaceNavItemsEl.innerHTML = '';
      view.navItems.forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button'; btn.dataset.viewId = item.id;
        var label = document.createElement('span');
        label.className = 'workspace-nav__item__label';
        btn.appendChild(label);
        btn.addEventListener('click', function () { handleNavClick(item.id); });
        workspaceNavItemsEl.appendChild(btn);
      });
      existing = Array.prototype.slice.call(workspaceNavItemsEl.children);
    }
    existing.forEach(function (btn, i) { patchWorkspaceNavButton(btn, view.navItems[i], view.view); });
  }

  /** Patches one existing button's classes/attrs/text — never recreates it,
   * so a locked tap (`aria-disabled`, never native `disabled`) still reaches
   * handleNavClick()'s toast, and locked/attention status is announced via
   * aria-label rather than class-only (REQ-UX-03). */
  function patchWorkspaceNavButton(btn, item, activeViewId) {
    btn.className = 'workspace-nav__item' + (item.status === 'attention' ? ' workspace-nav__item--attention' : '');
    if (item.id === activeViewId) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    var label = t(item.labelKey);
    var statusToken = item.status === 'attention' ? t('workspace.nav.status.attention') : item.status === 'done' ? t('workspace.nav.status.done') : '';
    var reason = !item.enabled ? t(item.lockReasonKey)
      : statusToken + (item.badge != null ? ' (' + item.badge + ')' : '');
    if (!item.enabled) { btn.setAttribute('aria-disabled', 'true'); btn.title = reason; }
    else { btn.removeAttribute('aria-disabled'); btn.removeAttribute('title'); }
    btn.setAttribute('aria-label', reason ? label + ' — ' + reason : label);
    btn.querySelector('.workspace-nav__item__label').textContent = label;
    var badgeEl = btn.querySelector('.workspace-nav__badge');
    if (item.badge != null) {
      if (!badgeEl) { badgeEl = document.createElement('span'); badgeEl.className = 'workspace-nav__badge'; btn.appendChild(badgeEl); }
      badgeEl.textContent = String(item.badge);
    } else if (badgeEl) { badgeEl.remove(); }
  }

  /** `#workspace-nav-cta` is a single static node from index.html — only
   * its properties are patched, never recreated. */
  function patchWorkspaceCta(view) {
    var primaryAction = view.primaryAction;
    if (!primaryAction) {
      workspaceNavCta.hidden = true; workspaceNavCta.onclick = null;
      workspaceNavCta.removeAttribute('title'); workspaceNavCta.removeAttribute('aria-label');
      return;
    }
    workspaceNavCta.hidden = false;
    workspaceNavCta.disabled = !primaryAction.enabled;
    workspaceNavCta.textContent = t(primaryAction.labelKey);
    workspaceNavCta.onclick = function () { handleCenterActionClick(primaryAction); };
    // REQ-UX-04: a disabled CTA still carries its blocked reason (title + aria-label).
    if (!primaryAction.enabled && primaryAction.blockedReasonKey) {
      var reason = t(primaryAction.blockedReasonKey);
      workspaceNavCta.title = reason;
      workspaceNavCta.setAttribute('aria-label', t(primaryAction.labelKey) + ' — ' + reason);
    } else {
      workspaceNavCta.removeAttribute('title'); workspaceNavCta.removeAttribute('aria-label');
    }
  }

  /** A locked destination never changes `view` — it announces its reason as
   * a toast instead (REQ-UX-03). */
  function handleNavClick(viewId) {
    var view = computeWorkspace(buildWorkspaceInput());
    var item = view.navItems.filter(function (i) { return i.id === viewId; })[0];
    if (!item) return;
    if (!item.enabled) {
      showWorkspaceToast(t(item.lockReasonKey));
      return;
    }
    currentView = viewId;
    renderChrome();
  }

  function handleCenterActionClick(primaryAction) {
    if (!primaryAction.enabled) {
      if (primaryAction.blockedReasonKey) showWorkspaceToast(t(primaryAction.blockedReasonKey));
      return;
    }
    currentView = primaryAction.targetView;
    renderChrome();
  }

  function showWorkspaceToast(message) {
    workspaceToastEl.textContent = message;
    workspaceToastEl.hidden = false;
    if (workspaceToastTimer) clearTimeout(workspaceToastTimer);
    workspaceToastTimer = setTimeout(function () { workspaceToastEl.hidden = true; }, 4000);
  }

  /** REQ-UX-20 summary bar above the team cards:
   * "{teamSize}v{teamSize} · {random|manual} · {N} players · {M} teams". */
  function renderTeamsSummary(teams) {
    var parts = [
      teamSize + 'v' + teamSize,
      t(pairingMode === 'manual' ? 'pairing.modeManual' : 'pairing.modeRandom'),
      t('workspace.summary.players', { count: players.length }),
      t('workspace.summary.teams', { count: teams.length }),
    ];
    teamsSummaryLine.textContent = parts.join(' · ');
  }

  function renderResults(result) {
    resultsSection.hidden = false;
    couplesGrid.innerHTML = '';

    const teams = result.teams || result.couples || [];
    renderTeamsSummary(teams);
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
    // Group shape changed — any in-progress format draft (slot descriptors) no longer applies.
    selectFormatPreset('classic');
    updateFormatPresetVisibility();
  }

  // --- Tournament Format Setup (PR3a — presets + light editing; no scoreboard/bracket wiring yet) ---

  /** Shape of the groups the format editor previews, using the actual createGroups() split
   * so preset feasibility and validateFormat() match what handleStartTournament() will build. */
  function getSetupGroupsShape() {
    if (!lastResult) return [];
    var n = (lastResult.couples || lastResult.teams || []).length;
    if (n < 2) return [];
    var placeholderTeams = [];
    for (var i = 0; i < n; i++) placeholderTeams.push({ id: 't' + i });
    return createGroups(placeholderTeams, getSelectedGroupCount());
  }

  function isCrossoverFeasible(groups) {
    return groups.length === 2 && groups.every(function (g) { return g.teams.length >= 4; });
  }

  function selectFormatPreset(presetId) {
    selectedFormatPreset = presetId;
    clearFormatError();
    if (presetId === 'classic') {
      formatDraft = null;
    } else {
      try {
        formatDraft = presetFormat(presetId, getSetupGroupsShape());
      } catch (err) {
        formatDraft = null;
        selectedFormatPreset = 'classic';
        showFormatError(t('tournament.format.error.presetUnavailable'));
      }
    }
    renderFormatPresetButtons();
    renderFormatEditor();
    renderChrome(); // group/format changes affect groupFeasible/formatValid readiness (REQ-UX-11/12)
  }

  function handleFormatPresetClick(e) {
    var btn = e.target.closest('.format-setup__opt');
    if (!btn || btn.disabled || btn.hidden) return;
    selectFormatPreset(btn.getAttribute('data-preset'));
  }

  function renderFormatPresetButtons() {
    formatPresetOptions.querySelectorAll('.format-setup__opt').forEach(function (b) {
      b.classList.toggle('format-setup__opt--active', b.getAttribute('data-preset') === selectedFormatPreset);
    });
  }

  /** The crossover (reference) preset is only offered for exactly 2 groups, each with at
   * least 4 teams (REQ-FMT-02); uneven groups (e.g. 5+4) are allowed — only the top 4 of
   * each group advance to the knockout stage. */
  function updateFormatPresetVisibility() {
    var feasible = isCrossoverFeasible(getSetupGroupsShape());
    formatPresetCrossoverBtn.hidden = !feasible;
    if (!feasible && selectedFormatPreset === 'crossover') {
      selectFormatPreset('classic');
    }
  }

  function renderFormatEditor() {
    formatEditor.hidden = !formatDraft;
    formatStagesEl.innerHTML = '';

    if (!formatDraft) {
      formatCustomRules.value = '';
      updateFormatCustomRulesCount();
      return;
    }

    var stagesById = formatDraft.stagesById || {};
    var stages = Object.keys(stagesById).map(function (id) { return stagesById[id]; })
      .sort(function (a, b) { return a.order - b.order; });

    stages.forEach(function (stage) {
      var pointsId = 'format-points-' + stage.id;
      var overtimeId = 'format-overtime-' + stage.id;
      var row = document.createElement('div');
      row.className = 'format-editor__stage';
      row.innerHTML =
        '<span class="format-editor__stage-label">' + escapeHTML(t('tournament.format.stage.' + stage.id)) + '</span>' +
        '<div class="format-editor__field">' +
          '<label class="form__label" for="' + pointsId + '">' + escapeHTML(t('tournament.format.pointsTo')) + '</label>' +
          '<input class="form__input format-editor__points" type="number" min="1" max="99" step="1" ' +
                 'id="' + pointsId + '" data-stage-id="' + stage.id + '" data-field="pointsTo" value="' + stage.pointsTo + '">' +
        '</div>' +
        '<label class="format-editor__checkbox" for="' + overtimeId + '">' +
          '<input type="checkbox" id="' + overtimeId + '" data-stage-id="' + stage.id + '" data-field="overtime"' +
                 (stage.overtime ? ' checked' : '') + '>' +
          '<span>' + escapeHTML(t('tournament.format.overtime')) + '</span>' +
        '</label>';
      formatStagesEl.appendChild(row);
    });

    formatCustomRules.value = formatDraft.customRules || '';
    updateFormatCustomRulesCount();
  }

  function handleFormatStageInput(e) {
    var input = e.target.closest('[data-stage-id]');
    if (!input || !formatDraft) return;
    var stage = formatDraft.stagesById[input.getAttribute('data-stage-id')];
    if (!stage) return;

    if (input.getAttribute('data-field') === 'pointsTo') {
      var n = parseInt(input.value, 10);
      if (!Number.isNaN(n)) stage.pointsTo = n;
    } else if (input.getAttribute('data-field') === 'overtime') {
      stage.overtime = input.checked;
    }
    formatDraft.preset = 'custom'; // any light edit detaches the draft from its starting preset
    clearFormatError();
    renderChrome(); // stage edits affect formatValid readiness (REQ-UX-11)
  }

  function handleFormatCustomRulesInput() {
    if (!formatDraft) return;
    formatDraft.customRules = formatCustomRules.value.slice(0, 500);
    formatDraft.preset = 'custom';
    updateFormatCustomRulesCount();
    clearFormatError();
  }

  function updateFormatCustomRulesCount() {
    formatCustomRulesCount.textContent = t('tournament.format.customRulesCount', { n: (formatCustomRules.value || '').length });
  }

  function showFormatError(message) {
    formatError.textContent = message;
  }

  function clearFormatError() {
    formatError.textContent = '';
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

    // formatDraft is null for the classic preset (D1) — validate only when a format is chosen.
    if (formatDraft) {
      var formatValidation = validateFormat(formatDraft, groups);
      if (!formatValidation.valid) {
        showFormatError(t(formatValidation.errors[0]));
        return;
      }
    }

    const matches = generateStageMatches(formatDraft, groups); // delegates to generateMatches() when formatDraft is null — classic path unchanged
    tournamentState = { teams: teams, groups: groups, matches: matches, players: players };
    if (formatDraft) tournamentState.format = formatDraft; // omit the key entirely for classic — keeps classic state byte-identical
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
    renderChrome(); // D3: chrome is driven by the caller, never by renderTournament() itself
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
    // Match ids are deterministic (groupId-team1Id-team2Id from index-based team ids,
    // e.g. "A-t1-t2") — a brand-new, same-shaped tournament can legitimately reuse an
    // OLD tournament's match id. Any lingering conflict/offline/denied scratch state
    // MUST be dropped on reset, or a stale command from the discarded tournament could
    // wrongly "restore" onto an unrelated match in the new one (REQ-UX-42 integrity).
    pendingFinish = null;
    conflictServerResult = null;
    scoreboardErrorMessage = null;
    lastScoreCommand = null;
    setSyncState(null);
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
    selectFormatPreset('classic');
    updateActionButtons();
    renderChrome();
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
    renderChrome(); // D3: chrome is driven by the caller, never by renderKing() itself
    kingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** REQ-UX-21/22: gates the fork exactly like startTournamentBtn — a
   * blocked action never even calls the start handler (belt-and-suspenders
   * with the native `disabled` attribute renderTeamsForkState() sets, which
   * already stops a real click from firing at all). The view only switches
   * to Tournament AFTER the handler actually creates state, never before —
   * fixed: previously currentView was set to 'tournament' unconditionally
   * BEFORE calling the handler, so an invalid format (which makes
   * handleStartTournament() return early after writing its error into
   * Setup's #format-error) still jumped the organizer into an empty,
   * state-less Tournament view. */
  function handleTeamsForkBlocked() {
    var view = computeWorkspace(buildWorkspaceInput());
    return (view.primaryAction && view.primaryAction.id === 'startTournament')
      ? view.primaryAction.blockedReasonKey : null;
  }

  function handleTeamsForkTournament() {
    var blocked = handleTeamsForkBlocked();
    if (blocked) { showWorkspaceToast(t(blocked)); return; }
    handleStartTournament();
    if (tournamentState) {
      currentView = 'tournament';
      renderChrome();
    }
  }

  function handleTeamsForkKing() {
    var blocked = handleTeamsForkBlocked();
    if (blocked) { showWorkspaceToast(t(blocked)); return; }
    handleStartKing();
    if (kingState) {
      currentView = 'tournament';
      renderChrome();
    }
  }

  function handleResetKing() {
    if (!confirm(t('king.confirmReset'))) return;
    kingState = null;
    localStorage.removeItem('bv-king');
    kingSection.hidden = true;
    kingQueueList.innerHTML = '';
    kingLogList.innerHTML = '';
    updateActionButtons();
    renderChrome();
  }

  function handleRally(winnerSide) {
    if (!kingState || kingState.winner) return;
    kingState = recordRally(kingState, winnerSide);
    saveKingState();
    renderKing();
    renderChrome(); // hasNextMatch/complete may flip when the game ends on this rally
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
      // Stage Set Rules enforcement (REQ-FMT-20/21) — rulesForMatch falls back to
      // pointsTo:null for classic sessions (tournamentState.format undefined), so this
      // block is a no-op and classic scoring behavior stays byte-identical.
      var stageRules = rulesForMatch(tournamentState.format, matchId);
      if (stageRules.pointsTo != null) {
        if (!stageRules.overtime && Math.max(score1, score2) > stageRules.pointsTo) {
          throw new Error('tournament.format.error.pointsTarget');
        }
        if (status === 'finished' && !matchOutcome(stageRules, score1, score2).finished) {
          throw new Error('tournament.format.error.pointsTarget');
        }
      }
      var confirmedMatch = tournamentState.matches.find(function (match) { return match.id === matchId; });
      var command = { matchId: matchId, score1: score1, score2: score2, status: status, expectedRevision: confirmedMatch.revision || 0 };
      if (tournamentRepository && sessionId) {
        lastScoreCommand = command; setSyncState('saving'); refreshScoreboardPanel();
        tournamentRepository.saveResult(sessionId, command).then(function (result) {
          if (result.status !== 'synced') {
            conflictServerResult = result.status === 'conflict' ? (result.current || null) : null;
            setSyncState(result.status); if (errorEl) errorEl.textContent = t('tournament.sync.' + result.status);
            refreshScoreboardPanel();
            if (result.status === 'conflict') {
              var conflictAlert = scoreboardPanelEl.querySelector('.scoring-conflict');
              if (conflictAlert) conflictAlert.focus();
            }
            return;
          }
          lastScoreCommand = null;
          conflictServerResult = null;
          activeMatchId = null;
          scoreboardMatchId = null;
          liveScore = { score1: 0, score2: 0 };
          setSyncState('synced');
          refreshScoreboardPanel();
          focusAfterScoreSynced();
        });
        return;
      }
      var resultMap = {};
      tournamentState.matches.forEach(function (match) { if (match.status !== 'pending') resultMap[match.id] = match; });
      resultMap[matchId] = Object.assign({}, command, { revision: command.expectedRevision + 1 });
      var newMatches = projectMatchResults(tournamentState.matches, resultMap);
      // Preserve every existing field (notably `format`/`customRules`, per D1) instead of
      // re-enumerating them — only `matches` changes on a local score save.
      tournamentState = Object.assign({}, tournamentState, { matches: newMatches, players: tournamentState.players || players });
      activeMatchId = null;
      scoreboardMatchId = null;
      liveScore = { score1: 0, score2: 0 };
      conflictServerResult = null;
      saveTournamentState();
      pushShareURL();
      renderTournament();
      renderChrome(); // local (non-Firebase) score commit — hasNextMatch may change
      focusAfterScoreSynced(); // REQ-UX-44: local mode reuses the synced-state focus target too
    } catch (e) {
      setSyncState('invalid');
      scoreboardErrorMessage = t(e.message) || e.message;
      if (errorEl) errorEl.textContent = scoreboardErrorMessage;
      // A manual Finish confirmed against a since-invalid score (e.g. Set Rules reject
      // it) must drop back out of the confirm row instead of leaving it stuck on screen.
      if (pendingFinish) { pendingFinish = null; refreshScoreboardPanel(); }
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
    pendingFinish = null;
    scoreboardErrorMessage = null;
    var match = tournamentState.matches.find(function (m) { return m.id === matchId; });
    // Reopening a match with an unresolved write (conflict/offline/denied) restores the
    // exact local not-saved attempt instead of wiping it — REQ-UX-42's "labelled as not
    // saved" only means something if the attempt is still visible when the view reopens.
    // conflictServerResult is intentionally NOT cleared here: its lifecycle is owned by
    // commitScore() (set fresh on every conflict) and Discard, so it survives a Back ->
    // reopen of the SAME match and stays simply unread — via the commandForThisMatch
    // gate in renderScoreboardPanel() — whenever a DIFFERENT match is open.
    if (lastScoreCommand && lastScoreCommand.matchId === matchId) {
      liveScore = { score1: lastScoreCommand.score1, score2: lastScoreCommand.score2 };
    } else {
      liveScore = {
        score1: (match && match.played) ? match.score1 : 0,
        score2: (match && match.played) ? match.score2 : 0,
      };
    }
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
      var useEmulator = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') &&
        new URLSearchParams(location.search).get('firebaseEmulator') === '1';
      if (!firebase.apps.length) {
        firebase.initializeApp(useEmulator ? {
          apiKey: 'demo-key',
          authDomain: 'demo-volleyball-couple.firebaseapp.com',
          databaseURL: 'http://127.0.0.1:9000/?ns=demo-volleyball-couple-default-rtdb',
          projectId: 'demo-volleyball-couple',
        } : FIREBASE_CONFIG);
      }
      if (useEmulator) {
        firebase.app().auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
        firebase.app().database().useEmulator('127.0.0.1', 9000);
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
      // Snapshot survival: this listener fires async/independently of user action —
      // capture focus before the rebuild so an in-progress tap is never dropped.
      var focusRef = captureCommandCenterFocus();
      if (!snapshot || !snapshot.tournament) {
        if (snapshot && snapshot.error) console.warn(snapshot.error);
        workspaceSessionState = 'notFound';
        renderChrome();
        restoreCommandCenterFocus(focusRef);
        return;
      }
      workspaceSessionState = 'ok';
      sessionSnapshot = snapshot;
      tournamentState = snapshot.tournament;
      isReadOnly = snapshot.legacy || (snapshot.role !== 'owner' && snapshot.role !== 'scorer');
      readonlyBanner.hidden = !isReadOnly;
      resetTournamentBtn.hidden = snapshot.role !== 'owner';
      // Revoked mid-scoring (REQ-UX-43): mirror the 7th sync state in the persistent
      // strip only for a genuine revocation, never for an ordinary first-time spectator.
      if (snapshot.accessStatus === 'revoked') setSyncState('revoked');
      if (tournamentState.players) {
        players.length = 0;
        players.push.apply(players, tournamentState.players);
        savePlayersState();
      }
      saveTournamentState();
      tournamentSection.hidden = false;
      renderTournament();
      updateUI();
      restoreCommandCenterFocus(focusRef);
    });
  }

  function setSyncState(state) {
    syncStatus.dataset.state = state || '';
    syncStatus.textContent = state ? t('tournament.sync.' + state) : '';
    retryScoreBtn.hidden = !lastScoreCommand || ['offline', 'denied', 'conflict', 'invalid'].indexOf(state) === -1;
    // In-view mirror (REQ-UX-43) — a lightweight in-place patch, never a rebuild, so a
    // structural scoreboard change (conflict block, disabled controls) stays owned by
    // refreshScoreboardPanel() at its own well-defined call sites (see commitScore()).
    var scoringSyncEl = document.getElementById('scoring-sync');
    if (scoringSyncEl) {
      scoringSyncEl.dataset.state = state || '';
      scoringSyncEl.textContent = state ? t('tournament.sync.' + state) : '';
    }
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

    // Extended tiebreak (D9) is opt-in and only enabled for format sessions — classic
    // sessions keep today's exact 2-arg ordering, satisfying "classic unchanged".
    var standings = calculateStandings(tournamentState.groups, tournamentState.matches,
      tournamentState.format ? { extendedTiebreak: true } : undefined);

    // Deterministic bracket projection (D5/D6) — null for classic sessions, in which case
    // every consumer below falls back to the pre-existing classic-only code path unchanged.
    currentResolution = tournamentState.format
      ? resolveFormat(tournamentState.format, { groups: tournamentState.groups, matches: tournamentState.matches, standings: standings })
      : null;

    renderCustomRulesNote();

    tournamentState.groups.forEach(function (group, idx) {
      var panel = renderGroupPanel(group, idx, standings);
      tournamentGroupsEl.appendChild(panel);
    });

    // Knockout stage panels (D2/D5/D6, REQ-FMT-05/23) — one per knockout stage, rendered
    // below the group panels; the round-robin stage stays represented by the group panels.
    // Hidden entirely (not just empty) for classic sessions so no extra spacing is added —
    // "classic sessions: zero behavior/rendering change".
    tournamentStagesEl.innerHTML = '';
    var knockoutStages = currentResolution
      ? currentResolution.stages.filter(function (stage) { return stage.kind === 'knockout'; })
      : [];
    knockoutStages.forEach(function (stage) { tournamentStagesEl.appendChild(renderStagePanel(stage)); });
    tournamentStagesEl.hidden = knockoutStages.length === 0;

    // Tournament complete banner — formatted sessions use the bracket projection's
    // `complete` flag (REQ-FMT-05); classic sessions keep isTournamentComplete unchanged.
    var complete = currentResolution ? currentResolution.complete : isTournamentComplete(tournamentState.matches);
    if (complete) {
      var banner = document.createElement('div');
      banner.className = 'tournament-complete animate__animated animate__fadeIn';
      banner.textContent = t('tournament.complete');
      tournamentGroupsEl.appendChild(banner);
    }

    // Live scoreboard panel — stays open (in a revoked, controls-disabled state) even
    // when isReadOnly flips true mid-scoring (REQ-UX-43); renderScoreboardPanel() owns
    // that branch internally so a revoked view is never just silently hidden.
    refreshScoreboardPanel();
  }

  /** Owner-authored custom-rules note (REQ-FMT-07), visible read-only to every role
   * (owner, scorer, spectator). Uses .textContent — never innerHTML — so no escapeHTML()
   * call is required for this user-provided text. Hidden entirely for classic sessions
   * or when no note was set. */
  function renderCustomRulesNote() {
    var note = tournamentState.format && tournamentState.format.customRules;
    if (!note || !String(note).trim()) {
      tournamentCustomRules.hidden = true;
      tournamentCustomRulesText.textContent = '';
      return;
    }
    tournamentCustomRulesSummary.textContent = t('tournament.format.customRulesNote.heading');
    tournamentCustomRulesText.textContent = note;
    tournamentCustomRules.hidden = false;
  }

  /** Localized inline caption for a match's Set Rules, e.g. "Set to 15 · no overtime"
   * (REQ-FMT-01/08) — shown to every role, not just the live scoreboard. */
  function formatStageRuleLabel(rules) {
    var overtimeKey = rules.overtime ? 'tournament.format.rule.overtimeOn' : 'tournament.format.rule.overtimeOff';
    return t('tournament.format.rule.pointsTo', { points: rules.pointsTo }) + ' · ' + t(overtimeKey);
  }

  /** Localized lock/progress/finish caption for a knockout stage panel (REQ-FMT-05/08). */
  function formatStageStatusLabel(status) {
    return t('tournament.format.stageStatus.' + status);
  }

  /** Localized placeholder for a not-yet-resolved bracket slot (REQ-FMT-05/08), e.g.
   * "Rank 1 · Group A" or "Winner of Quarterfinals #1". Any other/unparseable token
   * (including a stray slot the engine already marked `invalid`) falls back to a
   * generic TBD label — this never throws on unexpected input. */
  function formatSlotLabel(token) {
    if (typeof token === 'string') {
      var slotMatch = /^slot:([A-Z])(\d+)$/.exec(token);
      if (slotMatch) return t('tournament.format.slot.groupRank', { rank: slotMatch[2], group: slotMatch[1] });
      var winnerMatch = /^winner:k-([a-z][a-z0-9]{0,11})-(\d+)$/.exec(token);
      if (winnerMatch) {
        return t('tournament.format.slot.winner', { match: t('tournament.format.stage.' + winnerMatch[1]) + ' #' + winnerMatch[2] });
      }
    }
    return t('tournament.format.slot.tbd');
  }

  /** Team display name for a resolved slot's real team id, matching the fallback used
   * throughout renderTournament when a team lookup somehow fails. */
  function resolveMatchTeamName(teamId) {
    var team = tournamentState.teams.find(function (tm) { return tm.id === teamId; });
    return team ? team.name : teamId;
  }

  /** Finds a match's projected entry in the current bracket resolution (any stage,
   * round-robin or knockout) — null when no format is active or the match id is unknown. */
  function findProjectedMatch(matchId) {
    if (!currentResolution) return null;
    for (var i = 0; i < currentResolution.stages.length; i++) {
      var found = currentResolution.stages[i].matches.find(function (pm) { return pm.matchId === matchId; });
      if (found) return found;
    }
    return null;
  }

  /** One vertical card per knockout stage (D2/D5/D6), rendered below the group panels.
   * Unresolved sides show a localized slot placeholder instead of a team name; a match's
   * action button is offered only when the projection marks it `scorable` — resolveFormat
   * already forces that to false for every match in an `invalid` stage, so this render
   * guard never needs its own separate invalid-stage check. */
  function renderStagePanel(stage) {
    var panel = document.createElement('div');
    panel.className = 'tournament-stage';
    panel.dataset.stageStatus = stage.status;

    var heading = document.createElement('h3');
    heading.className = 'tournament-stage__heading';
    heading.textContent = t(stage.label);
    panel.appendChild(heading);

    var meta = document.createElement('p');
    meta.className = 'tournament-stage__meta';
    meta.textContent = formatStageRuleLabel({ pointsTo: stage.pointsTo, overtime: stage.overtime }) +
      ' · ' + formatStageStatusLabel(stage.status);
    panel.appendChild(meta);

    var ul = document.createElement('ul');
    ul.className = 'match-list';

    stage.matches.forEach(function (projected) {
      var rawMatch = tournamentState.matches.find(function (m) { return m.id === projected.matchId; });
      if (!rawMatch) return;

      var name1 = projected.team1Id ? resolveMatchTeamName(projected.team1Id) : formatSlotLabel(projected.team1Slot);
      var name2 = projected.team2Id ? resolveMatchTeamName(projected.team2Id) : formatSlotLabel(projected.team2Slot);
      var hasScore = rawMatch.status !== 'pending' && rawMatch.score1 != null;
      var isActive = scoreboardMatchId === rawMatch.id;

      var li = document.createElement('li');
      li.className = 'match-card' + (rawMatch.played ? ' match-card--played' : '') + (isActive ? ' match-card--active' : '');

      var row = document.createElement('div');
      row.className = 'match-card__row';

      var teamsEl = document.createElement('span');
      teamsEl.className = 'match-card__teams';
      teamsEl.innerHTML = escapeHTML(name1) +
        ' <span class="match-card__vs">' + escapeHTML(t('tournament.match.vs')) + '</span> ' +
        escapeHTML(name2);

      var scoreEl = document.createElement('span');
      scoreEl.className = 'match-card__score' + (hasScore ? ' match-card__score--played' : '');
      scoreEl.textContent = hasScore ? (rawMatch.score1 + ' – ' + rawMatch.score2) : '–';

      row.appendChild(teamsEl);
      row.appendChild(scoreEl);

      // A single action button covers enter + edit + live tracking, all via the existing
      // scoreboard panel (handleScoreboard pre-fills liveScore from the finished result).
      if (!isReadOnly && projected.scorable) {
        var btnGroup = document.createElement('div');
        btnGroup.className = 'match-card__btn-group';

        var trackBtn = document.createElement('button');
        trackBtn.className = 'match-card__btn match-card__btn--track' + (isActive ? ' match-card__btn--track-active' : '');
        trackBtn.type = 'button';
        trackBtn.textContent = hasScore ? t('tournament.match.edit') : t('tournament.match.trackScore');
        trackBtn.addEventListener('click', (function (mid) { return function () { handleScoreboard(mid); }; })(rawMatch.id));

        btnGroup.appendChild(trackBtn);
        row.appendChild(btnGroup);
      }

      li.appendChild(row);

      var ruleCaption = document.createElement('p');
      ruleCaption.className = 'match-card__rule';
      ruleCaption.textContent = formatStageRuleLabel({ pointsTo: stage.pointsTo, overtime: stage.overtime });
      li.appendChild(ruleCaption);

      ul.appendChild(li);
    });

    panel.appendChild(ul);
    return panel;
  }

  /** Snapshot survival for the scoring view (mirrors captureCommandCenterFocus() /
   * restoreCommandCenterFocus()): captures enough to re-find the focused control after
   * refreshScoreboardPanel() rebuilds the panel — including from an unrelated snapshot
   * re-render (subscribeToSession -> renderTournament() -> refreshScoreboardPanel()).
   * Null when focus is outside the panel. */
  function captureScoreboardFocus() {
    var active = document.activeElement;
    if (!active || !scoreboardPanelEl.contains(active)) return null;
    var cls = active.classList;
    if (cls.contains('finish-confirm__confirm')) return { type: 'finish-confirm__confirm' };
    if (cls.contains('finish-confirm__keep-scoring')) return { type: 'finish-confirm__keep-scoring' };
    if (cls.contains('scoreboard__save--finish')) return { type: 'scoreboard__save--finish' };
    if (cls.contains('scoreboard__save')) return { type: 'scoreboard__save' };
    if (cls.contains('scoreboard__inc') || cls.contains('scoreboard__dec')) {
      var type = cls.contains('scoreboard__inc') ? 'scoreboard__inc' : 'scoreboard__dec';
      var teamPanels = Array.prototype.slice.call(scoreboardPanelEl.querySelectorAll('.scoreboard__team'));
      var teamIndex = teamPanels.findIndex(function (tp) { return tp.contains(active); });
      return { type: type, teamIndex: teamIndex };
    }
    if (cls.contains('scoring-conflict__retry')) return { type: 'scoring-conflict__retry' };
    if (cls.contains('scoring-conflict__discard')) return { type: 'scoring-conflict__discard' };
    if (cls.contains('scoring-offline__retry')) return { type: 'scoring-offline__retry' };
    if (cls.contains('scoreboard__back')) return { type: 'scoreboard__back' };
    return null;
  }

  /** Restores focus captured by captureScoreboardFocus() after the panel has been
   * rebuilt. A missing target (e.g. the control no longer exists in the new state) is a
   * silent no-op. */
  function restoreScoreboardFocus(ref) {
    if (!ref) return;
    var target = null;
    if (ref.type === 'scoreboard__inc' || ref.type === 'scoreboard__dec') {
      var teamPanel = scoreboardPanelEl.querySelectorAll('.scoreboard__team')[ref.teamIndex];
      target = teamPanel && teamPanel.querySelector('.' + ref.type);
    } else {
      target = scoreboardPanelEl.querySelector('.' + ref.type);
    }
    if (target) target.focus();
  }

  /** Owns scoreboard-panel visibility, the single call site every state-change flow
   * (commitScore, subscribeToSession's isReadOnly flip, Cancel/Discard/Confirm) uses at
   * its own well-defined moment — never automatically from setSyncState(), so an
   * in-flight validation message (see scoreboardErrorMessage) is never torn down
   * mid-write. Unhides before rendering so a caller's own post-call .focus() (and any
   * focus set from inside renderScoreboardPanel() itself) lands on a visible node.
   * Captures/restores focus internally so an UNRELATED re-render (a snapshot arriving
   * while the user has focus in this panel) never silently drops focus to <body> — a
   * caller with a more specific target (e.g. requestFinishConfirmation() focusing
   * Confirm) simply re-focuses after this returns, taking precedence. */
  function refreshScoreboardPanel() {
    if (scoreboardMatchId) {
      var focusRef = captureScoreboardFocus();
      scoreboardPanelEl.hidden = false;
      renderScoreboardPanel();
      restoreScoreboardFocus(focusRef);
    } else {
      scoreboardPanelEl.hidden = true;
      scoreboardPanelEl.innerHTML = '';
    }
  }

  /** REQ-UX-41/F.6 focus management once a score commit resolves to 'synced': the
   * next-match-card action, or the "See results" link once nothing remains — shared by
   * both the Firebase and the local (non-Firebase, REQ-UX-44) commit paths. */
  function focusAfterScoreSynced() {
    var target = nextMatchCardEl && (nextMatchCardEl.querySelector('.next-match-card__action') ||
      nextMatchCardEl.querySelector('.next-match-card__results-link'));
    if (target) target.focus();
  }

  /** Shared entry point for both the manual Finish tap and the auto-finish increment
   * path (REQ-UX-41/D11) — never commits straight away; sets pendingFinish, re-renders
   * the in-view confirm row, and focuses Confirm (F.6). */
  function requestFinishConfirmation(score1, score2) {
    pendingFinish = { score1: score1, score2: score2 };
    refreshScoreboardPanel();
    var confirmBtn = scoreboardPanelEl.querySelector('.finish-confirm__confirm');
    if (confirmBtn) confirmBtn.focus();
  }

  function renderScoreboardPanel() {
    scoreboardPanelEl.innerHTML = '';

    var match = tournamentState.matches.find(function (m) { return m.id === scoreboardMatchId; });
    if (!match) return;

    // Knockout matches persist slot-descriptor team ids forever (D3) — the real team id
    // only ever exists in the client-side bracket projection, so a format match must be
    // named through findProjectedMatch()/resolveMatchTeamName(), never the raw match node.
    // findProjectedMatch() is null for classic sessions, keeping this branch byte-identical
    // to the pre-existing lookup for every non-format tournament.
    var projected = findProjectedMatch(match.id);
    var name1, name2;
    if (projected) {
      name1 = projected.team1Id ? resolveMatchTeamName(projected.team1Id) : formatSlotLabel(projected.team1Slot);
      name2 = projected.team2Id ? resolveMatchTeamName(projected.team2Id) : formatSlotLabel(projected.team2Slot);
    } else {
      var team1 = tournamentState.teams.find(function (tm) { return tm.id === match.team1Id; });
      var team2 = tournamentState.teams.find(function (tm) { return tm.id === match.team2Id; });
      name1 = team1 ? team1.name : match.team1Id;
      name2 = team2 ? team2.name : match.team2Id;
    }
    // Stage Set Rules (REQ-FMT-20) — pointsTo:null (classic/unrecognized match) means
    // unrestricted free-entry scoring, so the caption and the +/- cap below are skipped.
    var rules = rulesForMatch(tournamentState.format, match.id);
    // Sync state is match-scoped (REQ-UX-42 integrity): syncStatus.dataset.state and
    // lastScoreCommand are single global vars shared across every match, so a conflict/
    // denied/saving/offline state left over from a DIFFERENT match (e.g. Back -> open a
    // different match while match A's write is still unresolved) must never leak into
    // this match's controls, chip, or conflict/denied/offline display. Only trust the
    // live global state when the in-flight command actually targets THIS match; a bare
    // local validation failure (scoreboardErrorMessage, already reset per match by
    // handleScoreboard()) is the one case that legitimately has no lastScoreCommand yet.
    var commandForThisMatch = lastScoreCommand && lastScoreCommand.matchId === scoreboardMatchId ? lastScoreCommand : null;
    var syncState = commandForThisMatch ? syncStatus.dataset.state : (scoreboardErrorMessage ? 'invalid' : null);

    var panel = document.createElement('div');
    panel.className = 'scoreboard animate__animated animate__fadeInUp';

    // Header: back affordance + in-view sync chip (REQ-UX-40/43) — a distinct exit from
    // the bottom Cancel button, matching the design wireframe's top-of-view back link.
    var header = document.createElement('div');
    header.className = 'scoreboard__header';
    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'scoreboard__back';
    backBtn.textContent = t('tournament.scoreboard.back');
    backBtn.addEventListener('click', function () {
      scoreboardMatchId = null;
      liveScore = { score1: 0, score2: 0 };
      renderTournament();
    });
    header.appendChild(backBtn);

    var syncChip = document.createElement('span');
    syncChip.id = 'scoring-sync';
    syncChip.className = 'sync-status';
    syncChip.setAttribute('role', 'status');
    syncChip.setAttribute('aria-live', 'polite');
    syncChip.dataset.state = syncState || '';
    syncChip.textContent = syncState ? t('tournament.sync.' + syncState) : '';
    header.appendChild(syncChip);
    panel.appendChild(header);

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

    // Stage/group + Set Rules context (REQ-UX-40) — the same convention already used by
    // renderNextMatchCard()'s metaParts line, so the two views read identically.
    var metaParts = [];
    if (match.groupId) metaParts.push(t('tournament.group', { id: match.groupId }));
    if (rules.pointsTo != null) metaParts.push(formatStageRuleLabel(rules));
    if (metaParts.length) {
      var ruleCaption = document.createElement('p');
      ruleCaption.className = 'scoreboard__rule';
      ruleCaption.textContent = metaParts.join(' · ');
      panel.appendChild(ruleCaption);
    }

    // Revoked mid-scoring (REQ-UX-43): the view stays open but read-only — no controls,
    // no Save/Finish; the confirmed result already on the match is never lost/replaced.
    if (isReadOnly) {
      var revokedMsg = document.createElement('p');
      revokedMsg.className = 'scoreboard__revoked';
      revokedMsg.setAttribute('role', 'alert');
      revokedMsg.textContent = t('tournament.sync.revoked');
      panel.appendChild(revokedMsg);
      var confirmedScore = document.createElement('p');
      confirmedScore.className = 'scoreboard__match-label';
      // The last confirmed score, whether the match is finished or still live in progress
      // (score1/score2 are non-null the moment scoring starts) — never gated on `played`
      // alone, so a mid-match revoke never mislabels an in-progress score as "no result".
      confirmedScore.textContent = (match.score1 != null && match.score2 != null)
        ? (match.score1 + ' – ' + match.score2) : '—';
      panel.appendChild(confirmedScore);
      scoreboardPanelEl.appendChild(panel);
      return;
    }

    var errorEl = document.createElement('p');
    errorEl.className = 'scoreboard__error';
    errorEl.setAttribute('role', 'alert');
    errorEl.setAttribute('aria-live', 'polite');
    errorEl.textContent = (syncState === 'invalid' && scoreboardErrorMessage) ? scoreboardErrorMessage : '';

    // A conflict/denied write or an in-flight save freezes the local attempt so Retry
    // always resubmits exactly what the server rejected/queued (REQ-UX-42/43); a pending
    // Finish confirmation freezes it too so the score can't drift under the prompt.
    var controlsDisabled = !!pendingFinish || syncState === 'saving' || syncState === 'conflict' || syncState === 'denied';

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
      teamName.title = side.name; // REQ-UX-40/73: full name always available once clamped to 2 lines
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
      decBtn.disabled = controlsDisabled;
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
      incBtn.disabled = controlsDisabled;
      incBtn.addEventListener('click', (function (key, display) {
        return function () {
          // No-op once the set is already decided with no overtime (REQ-FMT-20) —
          // rules.pointsTo is null for classic/unrecognized matches, so `capped` is
          // always false there and this guard never affects classic scoring.
          var before = matchOutcome(rules, liveScore.score1, liveScore.score2);
          if (before.capped && !rules.overtime) return;

          liveScore[key]++;
          display.textContent = liveScore[key];

          // Auto-finish routes through the same in-view confirmation as a manual
          // Finish tap — never commits straight from the increment (REQ-UX-41/D11).
          var after = matchOutcome(rules, liveScore.score1, liveScore.score2);
          if (after.finished) {
            requestFinishConfirmation(liveScore.score1, liveScore.score2);
          }
        };
      })(side.scoreKey, scoreDisplay));

      controls.appendChild(decBtn);
      controls.appendChild(incBtn);
      teamPanel.appendChild(scoreDisplay);
      teamPanel.appendChild(controls);
      teamsGrid.appendChild(teamPanel);
    });

    panel.appendChild(teamsGrid);

    // Conflict block (REQ-UX-42): the server's confirmed result, the local attempt
    // labelled as not saved, and Retry/Discard reachable without leaving the view.
    if (syncState === 'conflict') {
      var localAttempt = lastScoreCommand || { score1: liveScore.score1, score2: liveScore.score2 };
      var serverResult = conflictServerResult || { score1: 0, score2: 0 };
      var conflictBlock = document.createElement('div');
      conflictBlock.className = 'scoring-conflict';
      conflictBlock.setAttribute('role', 'alert');
      conflictBlock.setAttribute('tabindex', '-1');
      var conflictLocal = document.createElement('p');
      conflictLocal.className = 'scoring-conflict__local';
      conflictLocal.textContent = t('tournament.scoreboard.conflictLocal', { score1: localAttempt.score1, score2: localAttempt.score2 });
      var conflictServer = document.createElement('p');
      conflictServer.className = 'scoring-conflict__server';
      conflictServer.textContent = t('tournament.scoreboard.conflictServer', { score1: serverResult.score1, score2: serverResult.score2 });
      var conflictActions = document.createElement('div');
      conflictActions.className = 'scoring-conflict__actions';
      var retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'scoring-conflict__retry';
      retryBtn.textContent = t('tournament.sync.retry');
      retryBtn.addEventListener('click', function () {
        if (lastScoreCommand) commitScore(lastScoreCommand.matchId, lastScoreCommand.score1, lastScoreCommand.score2, errorEl, lastScoreCommand.status);
      });
      var discardBtn = document.createElement('button');
      discardBtn.type = 'button';
      discardBtn.className = 'scoring-conflict__discard';
      discardBtn.textContent = t('tournament.scoreboard.discard');
      discardBtn.addEventListener('click', function () {
        lastScoreCommand = null;
        conflictServerResult = null;
        liveScore = { score1: serverResult.score1 || 0, score2: serverResult.score2 || 0 };
        setSyncState(null);
        refreshScoreboardPanel();
      });
      conflictActions.appendChild(retryBtn);
      conflictActions.appendChild(discardBtn);
      conflictBlock.appendChild(conflictLocal);
      conflictBlock.appendChild(conflictServer);
      conflictBlock.appendChild(conflictActions);
      panel.appendChild(conflictBlock);
    }

    // Offline (REQ-UX-43): the state matrix requires a visible in-view Retry for THIS
    // match — the persistent strip's #retry-score-btn sits far off-screen once the
    // scoring view is open at a true narrow viewport. Values stay editable (REQ-UX-44's
    // "kept" invariant); this is icon+text via the existing tournament.sync.offline key.
    if (syncState === 'offline') {
      var offlineBlock = document.createElement('div');
      offlineBlock.className = 'scoring-offline';
      offlineBlock.setAttribute('role', 'alert');
      var offlineMsg = document.createElement('p');
      offlineMsg.className = 'scoring-offline__message';
      offlineMsg.textContent = t('tournament.sync.offline');
      offlineBlock.appendChild(offlineMsg);
      var offlineRetryBtn = document.createElement('button');
      offlineRetryBtn.type = 'button';
      offlineRetryBtn.className = 'scoring-offline__retry';
      offlineRetryBtn.textContent = t('tournament.sync.retry');
      offlineRetryBtn.addEventListener('click', function () {
        if (lastScoreCommand) commitScore(lastScoreCommand.matchId, lastScoreCommand.score1, lastScoreCommand.score2, errorEl, lastScoreCommand.status);
      });
      offlineBlock.appendChild(offlineRetryBtn);
      panel.appendChild(offlineBlock);
    }

    if (syncState === 'denied') {
      var deniedMsg = document.createElement('p');
      deniedMsg.className = 'scoreboard__denied';
      deniedMsg.setAttribute('role', 'alert');
      deniedMsg.textContent = t('tournament.scoreboard.denied');
      panel.appendChild(deniedMsg);
    }

    // Actions: Cancel + Save progress + Finish, OR the in-view Finish confirmation row
    // (REQ-UX-41) — never both at once.
    if (pendingFinish) {
      var finishConfirm = document.createElement('div');
      finishConfirm.className = 'finish-confirm';
      var question = document.createElement('p');
      question.className = 'finish-confirm__question';
      question.textContent = t('tournament.scoreboard.finishConfirm', { score1: pendingFinish.score1, score2: pendingFinish.score2 });
      finishConfirm.appendChild(question);
      var finishActions = document.createElement('div');
      finishActions.className = 'finish-confirm__actions';
      var confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'finish-confirm__confirm';
      confirmBtn.textContent = t('tournament.scoreboard.confirm');
      confirmBtn.addEventListener('click', function () {
        var toCommit = pendingFinish;
        pendingFinish = null;
        if (toCommit) commitScore(scoreboardMatchId, toCommit.score1, toCommit.score2, errorEl, 'finished');
      });
      var keepScoringBtn = document.createElement('button');
      keepScoringBtn.type = 'button';
      keepScoringBtn.className = 'finish-confirm__keep-scoring';
      keepScoringBtn.textContent = t('tournament.scoreboard.keepScoring');
      keepScoringBtn.addEventListener('click', function () {
        pendingFinish = null;
        refreshScoreboardPanel();
        var finishBtn = scoreboardPanelEl.querySelector('.scoreboard__save--finish');
        if (finishBtn) finishBtn.focus();
      });
      finishActions.appendChild(confirmBtn);
      finishActions.appendChild(keepScoringBtn);
      finishConfirm.appendChild(finishActions);
      panel.appendChild(finishConfirm);
      scoreboardPanelEl.appendChild(panel);
      return;
    }

    // Save progress + Finish share the primary row (REQ-UX-40 wireframe); Cancel gets its
    // own row below — three buttons on one flex row cannot stay >=44px tall and fit
    // 320px without shrinking below their own text's min-content width (REQ-UX-73).
    var actions = document.createElement('div');
    actions.className = 'scoreboard__actions';
    ['live', 'finished'].forEach(function (status) {
      var action = document.createElement('button'); action.type = 'button';
      action.className = 'scoreboard__save' + (status === 'finished' ? ' scoreboard__save--finish' : '');
      action.textContent = t(status === 'live' ? 'tournament.match.saveProgress' : 'tournament.match.finish');
      action.disabled = controlsDisabled;
      action.addEventListener('click', function () {
        if (status === 'finished') requestFinishConfirmation(liveScore.score1, liveScore.score2);
        else commitScore(scoreboardMatchId, liveScore.score1, liveScore.score2, errorEl, status);
      });
      actions.appendChild(action);
    });
    panel.appendChild(actions);

    var secondaryActions = document.createElement('div');
    secondaryActions.className = 'scoreboard__actions scoreboard__actions--secondary';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'scoreboard__cancel';
    cancelBtn.textContent = t('tournament.match.cancel');
    cancelBtn.addEventListener('click', function () {
      scoreboardMatchId = null;
      liveScore = { score1: 0, score2: 0 };
      renderTournament();
    });
    secondaryActions.appendChild(cancelBtn);
    panel.appendChild(secondaryActions);
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

    // REQ-UX-32: the #match-filters toggle is retired — the command center's
    // stacked Live/Pending/Recently finished sections own status filtering
    // now, so every per-group match shows here unfiltered.
    matches.forEach(function (match) {
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

      // Stage Set Rules caption — visible to every role (owner, scorer, spectator),
      // not just inside the isReadOnly-gated live scoreboard (REQ-FMT-01/08).
      if (tournamentState.format) {
        var matchRules = rulesForMatch(tournamentState.format, match.id);
        if (matchRules.pointsTo != null) {
          var ruleEl = document.createElement('p');
          ruleEl.className = 'match-card__rule';
          ruleEl.textContent = formatStageRuleLabel(matchRules);
          li.appendChild(ruleEl);
        }
      }

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
        errorEl.setAttribute('role', 'alert');
        errorEl.setAttribute('aria-live', 'polite');

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
