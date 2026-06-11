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
      'form.genderUnspecified': 'Unspecified / No Gender',
      'form.submit': 'Add Player',
      // Validation
      'error.nameEmpty': 'Please enter a player name',
      'error.nameMin': 'Name must be at least 2 characters',
      'error.nameMax': 'Name must be 50 characters or less',
      'error.gender': 'Please select a gender',
      'error.dismiss': 'Dismiss error',
      // Player list
      'players.heading': 'Registered Players ({count})',
      'players.genderCounts': 'Males: {males} | Females: {females} | Unspecified: {unspecified}',
      'players.empty': 'No players added yet',
      'players.remove': 'Remove {name}',
      'players.badgeMale': 'M',
      'players.badgeFemale': 'F',
      'players.badgeUnspecified': 'U',
      // Actions
      'actions.generate': 'Generate Couples',
      'actions.generateTeams': 'Generate Teams',
      'actions.regenerate': 'Regenerate Couples',
      'actions.regenerateTeams': 'Regenerate Teams',
      'actions.clearAll': 'Clear All Players',
      'actions.hint': 'Add at least 2 players to generate couples',
      'actions.hintTeams': 'Add at least {n} players to generate teams',
      'actions.confirmClear': 'Are you sure you want to remove all players?',
      // Results
      'results.heading': 'Generated Couples',
      'results.headingTeams': 'Generated Teams',
      'results.couple': 'Couple {n}',
      'results.team': 'Team {n}',
      'results.typeMixed': 'Mixed',
      'results.typeSame': 'Same Gender',
      'results.unmatched': 'Unmatched Player: {name}',
      'results.unmatchedExplain': 'This player could not be paired due to an odd number of players.',
      'results.unmatchedMultiple': 'Unmatched Players',
      'results.unmatchedExplainMultiple': 'These players could not be grouped because they did not form a complete team.',
      // Tournament
      'tournament.groupsLabel': 'Groups:',
      'tournament.groupOption': '{n} Group(s)',
      'tournament.share': '🔗 Share',
      'tournament.shareCopied': '✓ Copied!',
      'tournament.readonlyBanner': '👁 View only — updates in real time',
      'tournament.start': 'Start Tournament',
      'tournament.heading': 'Tournament',
      'tournament.reset': 'Reset Tournament',
      'tournament.confirmReset': 'Are you sure you want to reset the tournament? All scores will be lost.',
      'tournament.group': 'Group {id}',
      'tournament.complete': 'Tournament Complete!',
      'tournament.col.team': 'Team',
      'tournament.col.played': 'P',
      'tournament.col.won': 'W',
      'tournament.col.lost': 'L',
      'tournament.col.points': 'PTS',
      'tournament.col.setsFor': 'SF',
      'tournament.col.setsAgainst': 'SA',
      'tournament.match.vs': 'vs',
      'tournament.match.enterScore': 'Enter Score',
      'tournament.match.edit': 'Edit',
      'tournament.match.save': 'Save',
      'tournament.match.cancel': 'Cancel',
      'tournament.error.scoreEmpty': 'Please enter both scores',
      'tournament.error.scoreNegative': 'Scores must be 0 or higher',
      'tournament.error.scoreDraw': 'Scores cannot be equal (no draws in volleyball)',
      'tournament.error.scoreNotInt': 'Scores must be whole numbers',
      // Match Type
      'matchType.label': 'Match Type',
      'matchType.2v2': '2vs2 (Couples)',
      'matchType.3v3': '3vs3',
      'matchType.4v4': '4vs4',
      // Pairing mode
      'pairing.modeLabel': 'Pairing Mode',
      'pairing.modeRandom': 'Random',
      'pairing.modeManual': 'Manual',
      'pairing.selectMan': 'Player 1',
      'pairing.selectWoman': 'Player 2',
      'pairing.selectPlayerX': 'Player {n}',
      'pairing.pairBtn': 'Pair',
      'pairing.confirmBtn': 'Confirm Couples',
      'pairing.confirmBtnTeams': 'Confirm Teams',
      'pairing.noPaired': 'No couples paired yet',
      'pairing.noPairedTeams': 'No teams paired yet',
      'pairing.removePair': 'Remove pair',
      'pairing.removePairTeams': 'Remove team',
      'pairing.manualHint': 'Unpaired players will be paired randomly',
      'pairing.manualHintTeams': 'Ungrouped players will be grouped randomly',
      // King of the Court
      'king.heading':              'King of the Court',
      'king.start':                'Start King of the Court',
      'king.reset':                'Reset King',
      'king.confirmReset':         'Reset the King of the Court game? All progress will be lost.',
      'king.winConditionLabel':    'Win Condition:',
      'king.condConsecutive':      'Consecutive',
      'king.condTotal':            'Total',
      'king.targetLabel':          'Target Wins:',
      'king.roleKing':             'KING',
      'king.roleChallenger':       'CHALLENGER',
      'king.winsOf':               'of {target}',
      'king.kingWins':             'King Wins Rally',
      'king.challengerWins':       'Challenger Wins Rally',
      'king.queueHeading':         'Challengers Queue',
      'king.logHeading':           'Rally Log',
      'king.logEntry':             '{team} wins (king at {wins})',
      'king.winnerTitle':          'Champion!',
      'king.error.notEnoughTeams': 'Need at least 2 teams to start King of the Court',
      // Footer
      'footer.copyright': '\u00a9 2026 Beach Volleyball Couple Matching \u2014 v1.2.0'
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
      'form.genderUnspecified': 'Sin especificar',
      'form.submit': 'Agregar Jugador',
      // Validaci\u00f3n
      'error.nameEmpty': 'Por favor ingresa un nombre',
      'error.nameMin': 'El nombre debe tener al menos 2 caracteres',
      'error.nameMax': 'El nombre debe tener 50 caracteres o menos',
      'error.gender': 'Por favor selecciona un g\u00e9nero',
      'error.dismiss': 'Cerrar error',
      // Lista de jugadores
      'players.heading': 'Jugadores Registrados ({count})',
      'players.genderCounts': 'Hombres: {males} | Mujeres: {females} | Sin especificar: {unspecified}',
      'players.empty': 'A\u00fan no se han agregado jugadores',
      'players.remove': 'Eliminar {name}',
      'players.badgeMale': 'M',
      'players.badgeFemale': 'F',
      'players.badgeUnspecified': 'U',
      // Acciones
      'actions.generate': 'Generar Parejas',
      'actions.generateTeams': 'Generar Equipos',
      'actions.regenerate': 'Regenerar Parejas',
      'actions.regenerateTeams': 'Regenerar Equipos',
      'actions.clearAll': 'Eliminar Todos',
      'actions.hint': 'Agrega al menos 2 jugadores para generar parejas',
      'actions.hintTeams': 'Agrega al menos {n} jugadores para generar equipos',
      'actions.confirmClear': '\u00bfEst\u00e1s seguro de que quieres eliminar todos los jugadores?',
      // Resultados
      'results.heading': 'Parejas Generadas',
      'results.headingTeams': 'Equipos Generados',
      'results.couple': 'Pareja {n}',
      'results.team': 'Equipo {n}',
      'results.typeMixed': 'Mixta',
      'results.typeSame': 'Mismo G\u00e9nero',
      'results.unmatched': 'Jugador sin pareja: {name}',
      'results.unmatchedExplain': 'Este jugador no pudo ser emparejado debido a un n\u00famero impar de jugadores.',
      'results.unmatchedMultiple': 'Jugadores sin equipo',
      'results.unmatchedExplainMultiple': 'Estos jugadores no pudieron ser agrupados debido a que no completaban un equipo.',
      // Torneo
      'tournament.groupsLabel': 'Grupos:',
      'tournament.groupOption': '{n} Grupo(s)',
      'tournament.share': '🔗 Compartir',
      'tournament.shareCopied': '✓ ¡Copiado!',
      'tournament.readonlyBanner': '👁 Solo lectura — se actualiza en tiempo real',
      'tournament.start': 'Iniciar Torneo',
      'tournament.heading': 'Torneo',
      'tournament.reset': 'Reiniciar Torneo',
      'tournament.confirmReset': '\u00bfEst\u00e1s seguro de que quieres reiniciar el torneo? Se perder\u00e1n todos los resultados.',
      'tournament.group': 'Grupo {id}',
      'tournament.complete': '\u00a1Torneo Completado!',
      'tournament.col.team': 'Equipo',
      'tournament.col.played': 'J',
      'tournament.col.won': 'G',
      'tournament.col.lost': 'P',
      'tournament.col.points': 'PTS',
      'tournament.col.setsFor': 'SF',
      'tournament.col.setsAgainst': 'SC',
      'tournament.match.vs': 'vs',
      'tournament.match.enterScore': 'Ingresar Resultado',
      'tournament.match.edit': 'Editar',
      'tournament.match.save': 'Guardar',
      'tournament.match.cancel': 'Cancelar',
      'tournament.error.scoreEmpty': 'Por favor ingresa ambos resultados',
      'tournament.error.scoreNegative': 'Los resultados deben ser 0 o mayores',
      'tournament.error.scoreDraw': 'Los resultados no pueden ser iguales (no hay empates en v\u00f3ley)',
      'tournament.error.scoreNotInt': 'Los resultados deben ser n\u00fameros enteros',
      // Tipo de Partido
      'matchType.label': 'Tipo de Partido',
      'matchType.2v2': '2vs2 (Parejas)',
      'matchType.3v3': '3vs3',
      'matchType.4v4': '4vs4',
      // Modo de emparejamiento
      'pairing.modeLabel': 'Modo de Emparejamiento',
      'pairing.modeRandom': 'Aleatorio',
      'pairing.modeManual': 'Manual',
      'pairing.selectMan': 'Jugador 1',
      'pairing.selectWoman': 'Jugador 2',
      'pairing.selectPlayerX': 'Jugador {n}',
      'pairing.pairBtn': 'Emparejar',
      'pairing.confirmBtn': 'Confirmar Parejas',
      'pairing.confirmBtnTeams': 'Confirmar Equipos',
      'pairing.noPaired': 'Ninguna pareja formada a\u00fan',
      'pairing.noPairedTeams': 'Ningún equipo formado aún',
      'pairing.removePair': 'Eliminar pareja',
      'pairing.removePairTeams': 'Eliminar equipo',
      'pairing.manualHint': 'Los jugadores sin pareja se emparejar\u00e1n aleatoriamente',
      'pairing.manualHintTeams': 'Los jugadores sin equipo se agruparán aleatoriamente',
      // Rey de la Cancha
      'king.heading':              'Rey de la Cancha',
      'king.start':                'Iniciar Rey de la Cancha',
      'king.reset':                'Reiniciar Juego',
      'king.confirmReset':         '\u00bfReiniciar el juego de Rey de la Cancha? Se perder\u00e1 todo el progreso.',
      'king.winConditionLabel':    'Condici\u00f3n de Victoria:',
      'king.condConsecutive':      'Consecutivos',
      'king.condTotal':            'Total',
      'king.targetLabel':          'Meta de Victorias:',
      'king.roleKing':             'REY',
      'king.roleChallenger':       'RETADOR',
      'king.winsOf':               'de {target}',
      'king.kingWins':             'Rey Gana Rally',
      'king.challengerWins':       'Retador Gana Rally',
      'king.queueHeading':         'Cola de Retadores',
      'king.logHeading':           'Registro de Rallies',
      'king.logEntry':             '{team} gana (rey en {wins})',
      'king.winnerTitle':          '\u00a1Campe\u00f3n!',
      'king.error.notEnoughTeams': 'Se necesitan al menos 2 equipos para iniciar',
      // Pie de p\u00e1gina
      'footer.copyright': '\u00a9 2026 Emparejamiento de V\u00f3ley Playa \u2014 v1.2.0'
    }
  };

  var currentLang = 'es';

  function detectLanguage() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored]) return stored;
    var nav = (navigator.language || '').slice(0, 2).toLowerCase();
    return translations[nav] ? nav : 'es';
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
