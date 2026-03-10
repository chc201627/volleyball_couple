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
    startTournamentBtn.addEventListener('click', handleStartTournament);
    resetTournamentBtn.addEventListener('click', handleResetTournament);
    shareTournamentBtn.addEventListener('click', handleShareTournament);
    groupCountOptions.addEventListener('click', handleGroupOptClick);
    updateUI();

    // Check URL for a shared tournament (#t=...)
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
      // Restore tournament from localStorage if saved
      tournamentState = loadTournamentState();
      if (tournamentState) {
        tournamentSection.hidden = false;
        renderTournament();
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
    generateBtn.disabled = players.length < 2;
    generateHint.hidden = players.length >= 2;
    regenerateBtn.hidden = !couplesGenerated;
    clearBtn.hidden = players.length === 0;
    tournamentSetup.hidden = !couplesGenerated || tournamentState !== null;
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
    pushShareURL();
    tournamentSection.hidden = false;
    renderTournament();
    updateActionButtons();
    tournamentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleResetTournament() {
    if (!confirm(t('tournament.confirmReset'))) return;
    tournamentState = null;
    activeMatchId = null;
    localStorage.removeItem('bv-tournament');
    tournamentSection.hidden = true;
    tournamentGroupsEl.innerHTML = '';
    // Reset group selector to default (1 group / A)
    groupCountOptions.querySelectorAll('.tournament-setup__opt').forEach(function (b) {
      b.classList.remove('tournament-setup__opt--active');
    });
    groupCountOptions.querySelector('[data-groups="1"]').classList.add('tournament-setup__opt--active');
    updateActionButtons();
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
      pushShareURL();
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
    var url = getShareURL();
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

  // --- Utilities ---

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', init);
})();
