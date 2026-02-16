/**
 * Beach Volleyball Couple Matching — Internationalization (i18n)
 *
 * Lightweight translation module supporting English and Spanish.
 * Uses data-i18n attributes for static text and t() for dynamic strings.
 */

/* global */
/* exported t, setLanguage, getLanguage */

var t, setLanguage, getLanguage;

(function () {
  'use strict';

  var STORAGE_KEY = 'bv-lang';

  var translations = {
    en: {
      // Page
      'page.title': 'Beach Volleyball Couple Matching',
      'page.subtitle': 'Register players and generate random couples for your game',
      // Form
      'form.heading': 'Add Player',
      'form.nameLabel': 'Player Name',
      'form.namePlaceholder': 'Enter player name',
      'form.genderLabel': 'Gender',
      'form.genderDefault': 'Select Gender',
      'form.genderMale': 'Male',
      'form.genderFemale': 'Female',
      'form.submit': 'Add Player',
      // Validation
      'error.nameEmpty': 'Please enter a player name',
      'error.nameMin': 'Name must be at least 2 characters',
      'error.nameMax': 'Name must be 50 characters or less',
      'error.gender': 'Please select a gender',
      'error.dismiss': 'Dismiss error',
      // Player list
      'players.heading': 'Registered Players ({count})',
      'players.genderCounts': 'Males: {males} | Females: {females}',
      'players.empty': 'No players added yet',
      'players.remove': 'Remove {name}',
      'players.badgeMale': 'M',
      'players.badgeFemale': 'F',
      // Actions
      'actions.generate': 'Generate Couples',
      'actions.regenerate': 'Regenerate Couples',
      'actions.clearAll': 'Clear All Players',
      'actions.hint': 'Add at least 2 players to generate couples',
      'actions.confirmClear': 'Are you sure you want to remove all players?',
      // Results
      'results.heading': 'Generated Couples',
      'results.couple': 'Couple {n}',
      'results.typeMixed': 'Mixed',
      'results.typeSame': 'Same Gender',
      'results.unmatched': 'Unmatched Player: {name}',
      'results.unmatchedExplain': 'This player could not be paired due to an odd number of players.',
      // Footer
      'footer.copyright': '\u00a9 2026 Beach Volleyball Couple Matching'
    },
    es: {
      // P\u00e1gina
      'page.title': 'Emparejamiento de V\u00f3ley Playa',
      'page.subtitle': 'Registra jugadores y genera parejas aleatorias para tu partido',
      // Formulario
      'form.heading': 'Agregar Jugador',
      'form.nameLabel': 'Nombre del Jugador',
      'form.namePlaceholder': 'Ingresa el nombre del jugador',
      'form.genderLabel': 'G\u00e9nero',
      'form.genderDefault': 'Seleccionar G\u00e9nero',
      'form.genderMale': 'Masculino',
      'form.genderFemale': 'Femenino',
      'form.submit': 'Agregar Jugador',
      // Validaci\u00f3n
      'error.nameEmpty': 'Por favor ingresa un nombre',
      'error.nameMin': 'El nombre debe tener al menos 2 caracteres',
      'error.nameMax': 'El nombre debe tener 50 caracteres o menos',
      'error.gender': 'Por favor selecciona un g\u00e9nero',
      'error.dismiss': 'Cerrar error',
      // Lista de jugadores
      'players.heading': 'Jugadores Registrados ({count})',
      'players.genderCounts': 'Hombres: {males} | Mujeres: {females}',
      'players.empty': 'A\u00fan no se han agregado jugadores',
      'players.remove': 'Eliminar {name}',
      'players.badgeMale': 'M',
      'players.badgeFemale': 'F',
      // Acciones
      'actions.generate': 'Generar Parejas',
      'actions.regenerate': 'Regenerar Parejas',
      'actions.clearAll': 'Eliminar Todos',
      'actions.hint': 'Agrega al menos 2 jugadores para generar parejas',
      'actions.confirmClear': '\u00bfEst\u00e1s seguro de que quieres eliminar todos los jugadores?',
      // Resultados
      'results.heading': 'Parejas Generadas',
      'results.couple': 'Pareja {n}',
      'results.typeMixed': 'Mixta',
      'results.typeSame': 'Mismo G\u00e9nero',
      'results.unmatched': 'Jugador sin pareja: {name}',
      'results.unmatchedExplain': 'Este jugador no pudo ser emparejado debido a un n\u00famero impar de jugadores.',
      // Pie de p\u00e1gina
      'footer.copyright': '\u00a9 2026 Emparejamiento de V\u00f3ley Playa'
    }
  };

  var currentLang = 'en';

  function detectLanguage() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored]) return stored;
    var nav = (navigator.language || '').slice(0, 2).toLowerCase();
    return translations[nav] ? nav : 'en';
  }

  /**
   * Translate a key with optional parameter interpolation.
   * @param {string} key - Translation key (e.g. 'form.heading')
   * @param {Object} [params] - Replacement values for {placeholders}
   * @returns {string}
   */
  t = function (key, params) {
    var str = (translations[currentLang] && translations[currentLang][key]) ||
              translations.en[key] || key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return str;
  };

  /**
   * Apply translations to all elements with data-i18n attributes.
   */
  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
  }

  /**
   * Set the active language, persist it, and update the UI.
   * @param {string} lang - Language code ('en' or 'es')
   */
  setLanguage = function (lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    applyTranslations();
    updateSwitcherButtons();
    // Notify app.js to re-render dynamic content
    if (typeof window._onLanguageChange === 'function') {
      window._onLanguageChange();
    }
  };

  /**
   * Get the current language code.
   * @returns {string}
   */
  getLanguage = function () {
    return currentLang;
  };

  function updateSwitcherButtons() {
    document.querySelectorAll('.lang-switcher__btn').forEach(function (btn) {
      btn.classList.toggle('lang-switcher__btn--active', btn.getAttribute('data-lang') === currentLang);
    });
  }

  function initSwitcher() {
    document.querySelectorAll('.lang-switcher__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLanguage(btn.getAttribute('data-lang'));
      });
    });
  }

  // Boot i18n on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    currentLang = detectLanguage();
    document.documentElement.lang = currentLang;
    initSwitcher();
    applyTranslations();
    updateSwitcherButtons();
  });
})();
