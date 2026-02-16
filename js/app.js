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
    updateUI();
  }

  // Expose re-render hook for i18n language changes
  window._onLanguageChange = function () {
    updateUI();
    if (couplesGenerated && lastResult) {
      renderResults(lastResult);
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

  // --- Utilities ---

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', init);
})();
