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
      'form.levelLabel': 'Skill Level (optional)',
      'form.levelDefault': 'Select Level',
      'form.level1': 'Beginner',
      'form.level2': 'Intermediate',
      'form.level3': 'Proficient',
      'form.submit': 'Add Player',
      'import.modeLabel': 'Player entry mode',
      'import.singleMode': 'One player',
      'import.pasteMode': 'Paste list',
      'import.label': 'Player list',
      'import.placeholder': 'Ana Perez, F, 2\nCarlos Ruiz, M, 3',
      'import.hint': 'Name, Gender, Level — one player per line',
      'import.review': 'Review list',
      'import.summary': '{valid} valid · {errors} need attention · {existing} existing',
      'import.confirm': 'Import {count} players',
      'import.player': 'Player {n}',
      'import.delete': 'Remove player {n}',
      'import.genderBlank': 'Unspecified',
      'import.levelBlank': 'No level',
      'import.mixedDelimiter': 'This row uses a different separator',
      'import.tooManyColumns': 'Use at most Name, Gender, Level',
      'import.unclosedQuote': 'Close the quoted value',
      'import.invalidGender': 'Choose a recognized gender',
      'import.invalidLevel': 'Choose level 1, 2, or 3',
      'import.emptyBatch': 'Paste at least one player',
      'import.playerLimitExceeded': 'The roster cannot exceed {maxPlayers} players',
      'import.ambiguousM': 'M was interpreted using {locale}',
      'import.success': '{count} players imported',
      'import.undo': 'Undo import',
      'import.undone': '{count} imported players removed',
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
      'players.badgeLevel1': 'L1',
      'players.badgeLevel2': 'L2',
      'players.badgeLevel3': 'L3',
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
      'tournament.access.owner': 'Organizer · manage scorer access',
      'tournament.access.scorer': '✓ Approved scorer',
      'tournament.access.viewer': 'View only · request access to enter scores',
      'tournament.access.authPending': '⏳ Checking device identity…',
      'tournament.access.pending': '⏳ Scoring access request pending',
      'tournament.access.revoked': '⚠ Scoring access revoked · request again',
      'tournament.access.label': 'Device label (for example, Court 1)',
      'tournament.access.request': 'Request scoring access',
      'tournament.access.approve': 'Approve',
      'tournament.access.revoke': 'Revoke',
      'tournament.access.state.pending': 'pending',
      'tournament.access.state.approved': 'approved',
      'tournament.access.state.revoked': 'revoked',
      'tournament.filter.label': 'Filter matches by status',
      'tournament.filter.pending': 'Pending',
      'tournament.filter.live': 'Live',
      'tournament.filter.finished': 'Finished',
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
      'tournament.match.trackScore': 'Track Score',
      'tournament.match.edit': 'Edit',
      'tournament.match.save': 'Save',
      'tournament.match.saveProgress': 'Save progress',
      'tournament.match.finish': 'Finish',
      'tournament.match.cancel': 'Cancel',
      'tournament.scoreboard.heading': 'Match Score',
      'tournament.scoreboard.team': 'Team',
      'tournament.error.scoreEmpty': 'Please enter both scores',
      'tournament.error.scoreNegative': 'Scores must be 0 or higher',
      'tournament.error.scoreDraw': 'Scores cannot be equal (no draws in volleyball)',
      'tournament.error.scoreNotInt': 'Scores must be whole numbers',
      'tournament.sync.saving': '⏳ Saving…',
      'tournament.sync.synced': '✓ Synced with server',
      'tournament.sync.offline': '⚠ Offline · result not synced',
      'tournament.sync.denied': '⛔ Access denied · confirmed result kept',
      'tournament.sync.conflict': '⚠ Newer result found · review and retry',
      'tournament.sync.invalid': '⚠ Check the score and retry',
      'tournament.sync.retry': 'Retry',
      // Tournament format (PR3a — setup presets + light editing)
      'tournament.format.presetLabel': 'Format:',
      'tournament.format.preset.classic': 'Classic',
      'tournament.format.preset.groupsTo': 'Groups Only',
      'tournament.format.preset.groupsFinal': 'Groups + Final',
      'tournament.format.preset.crossover': 'Reference (Top 4)',
      'tournament.format.pointsTo': 'Points to win',
      'tournament.format.overtime': 'Overtime (win by 2)',
      'tournament.format.customRules': 'Custom rules note (optional)',
      'tournament.format.customRulesHint': 'e.g. No open-hand finger reception or set-over',
      'tournament.format.customRulesCount': '{n} / 500',
      'tournament.format.stage.group': 'Group Stage',
      'tournament.format.stage.qf': 'Quarterfinals',
      'tournament.format.stage.sf': 'Semifinals',
      'tournament.format.stage.final': 'Final',
      'tournament.format.error.presetUnavailable': 'This format is not available for the current group setup',
      'tournament.format.error.missing': 'Select a tournament format before starting',
      'tournament.format.error.version': 'Unsupported format version',
      'tournament.format.error.stageCount': 'A format must have between 1 and 8 stages',
      'tournament.format.error.stageId': 'Invalid stage identifier',
      'tournament.format.error.stageIdCollidesWithGroup': 'A stage identifier collides with a group name',
      'tournament.format.error.pointsTo': 'Points to win must be a whole number between 1 and 99',
      'tournament.format.error.overtime': 'Overtime must be on or off',
      'tournament.format.error.roundRobinStage': 'A format needs exactly one group stage',
      'tournament.format.error.roundRobinOrder': 'The group stage must be the first stage',
      'tournament.format.error.knockoutPairs': 'The knockout stage pairings are invalid',
      'tournament.format.error.knockoutTokenDuplicate': 'A knockout slot is used more than once',
      'tournament.format.error.knockoutToken': 'A knockout slot references an invalid group rank or match',
      'tournament.format.error.customRules': 'The custom rules note must be 500 characters or fewer',
      // Tournament format (PR3b — scoreboard enforcement)
      'tournament.format.rule.pointsTo': 'Set to {points}',
      'tournament.format.rule.overtimeOn': 'overtime win by 2',
      'tournament.format.rule.overtimeOff': 'no overtime',
      'tournament.format.error.pointsTarget': 'Score does not meet the target for this stage',
      'tournament.format.customRulesNote.heading': 'Custom rules',
      'tournament.format.stageStatus.pending': 'Locked',
      'tournament.format.stageStatus.active': 'In progress',
      'tournament.format.stageStatus.complete': 'Finished',
      'tournament.format.stageStatus.invalid': 'Invalid configuration',
      'tournament.format.slot.groupRank': 'Rank {rank} · Group {group}',
      'tournament.format.slot.winner': 'Winner of {match}',
      'tournament.format.slot.tbd': 'TBD',
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
      // Workspace navigation (REQ-UX-01..07, 60-62)
      'workspace.nav.setup': 'Setup',
      'workspace.nav.teams': 'Teams',
      'workspace.nav.tournament': 'Tournament',
      'workspace.nav.results': 'Results',
      'workspace.nav.locked.generateTeamsFirst': 'Generate teams first',
      'workspace.nav.locked.startFirst': 'Start a tournament first',
      'workspace.action.addPlayers': 'Add players',
      'workspace.action.generateTeams': 'Generate teams',
      'workspace.action.startTournament': 'Start tournament',
      'workspace.action.scoreNext': 'Score next match',
      'workspace.action.shareResults': 'Share results',
      'workspace.action.requestAccess': 'Request scoring access',
      'workspace.action.blocked.noNextMatch': 'No match ready to score yet',
      'workspace.readiness.enoughPlayers': 'Add more players',
      'workspace.readiness.teamsGenerated': 'Generate teams first',
      'workspace.readiness.groupFeasible': 'Adjust the group count',
      'workspace.readiness.formatValid': 'Fix the tournament format',
      'workspace.nav.status.done': 'Completed',
      'workspace.nav.status.attention': 'Needs attention',
      // Guided setup (REQ-UX-10..13)
      'workspace.summary.players': '{count} players',
      'workspace.summary.teams': '{count} teams',
      'workspace.checklist.heading': 'Ready to start',
      'workspace.checklist.enoughPlayers.ok': 'Enough players',
      'workspace.checklist.enoughPlayers.blocked': '{needed} more players needed',
      'workspace.checklist.teamsGenerated.ok': 'Teams generated',
      'workspace.checklist.teamsGenerated.blocked': 'Teams not generated yet',
      'workspace.checklist.noUnmatched.ok': 'No unmatched players',
      'workspace.checklist.noUnmatched.warn': '{count} players unmatched',
      'workspace.checklist.groupFeasible.ok': 'Group configuration is feasible',
      'workspace.checklist.groupFeasible.blocked': 'Adjust the group count',
      'workspace.checklist.formatValid.ok': 'Tournament format is valid',
      'workspace.checklist.formatValid.blocked': 'Fix the tournament format',
      'workspace.checklist.firebaseConnected.ok': 'Connection available',
      'workspace.setup.formatLocked.note': 'Locked — reset tournament to change',
      // Footer

      'footer.copyright': '\u00a9 2026 Beach Volleyball Couple Matching \u2014 v1.8.1'

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
      'form.levelLabel': 'Nivel de Habilidad (opcional)',
      'form.levelDefault': 'Seleccionar Nivel',
      'form.level1': 'Principiante',
      'form.level2': 'Intermedio',
      'form.level3': 'Avanzado',
      'form.submit': 'Agregar Jugador',
      'import.modeLabel': 'Modo de registro de jugadores',
      'import.singleMode': 'Un jugador',
      'import.pasteMode': 'Pegar lista',
      'import.label': 'Lista de jugadores',
      'import.placeholder': 'Ana Pérez, M, 2\nCarlos Ruiz, H, 3',
      'import.hint': 'Nombre, Género, Nivel — un jugador por línea',
      'import.review': 'Revisar lista',
      'import.summary': '{valid} válidos · {errors} requieren atención · {existing} existentes',
      'import.confirm': 'Importar {count} jugadores',
      'import.player': 'Jugador {n}',
      'import.delete': 'Eliminar jugador {n}',
      'import.genderBlank': 'Sin especificar',
      'import.levelBlank': 'Sin nivel',
      'import.mixedDelimiter': 'Esta fila usa un separador diferente',
      'import.tooManyColumns': 'Use como máximo Nombre, Género, Nivel',
      'import.unclosedQuote': 'Cierre el valor entre comillas',
      'import.invalidGender': 'Seleccione un género reconocido',
      'import.invalidLevel': 'Seleccione un nivel entre 1 y 3',
      'import.emptyBatch': 'Pegue al menos un jugador',
      'import.playerLimitExceeded': 'La lista no puede superar {maxPlayers} jugadores',
      'import.ambiguousM': 'M se interpretó según {locale}',
      'import.success': 'Se importaron {count} jugadores',
      'import.undo': 'Deshacer importación',
      'import.undone': 'Se eliminaron {count} jugadores importados',
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
      'players.badgeLevel1': 'L1',
      'players.badgeLevel2': 'L2',
      'players.badgeLevel3': 'L3',
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
      'tournament.access.owner': 'Organizador · gestiona acceso de anotadores',
      'tournament.access.scorer': '✓ Anotador aprobado',
      'tournament.access.viewer': 'Solo lectura · solicita acceso para anotar',
      'tournament.access.authPending': '⏳ Verificando la identidad del dispositivo…',
      'tournament.access.pending': '⏳ Solicitud de acceso pendiente',
      'tournament.access.revoked': '⚠ Acceso revocado · solicita de nuevo',
      'tournament.access.label': 'Nombre del dispositivo (por ejemplo, Cancha 1)',
      'tournament.access.request': 'Solicitar acceso para anotar',
      'tournament.access.approve': 'Aprobar',
      'tournament.access.revoke': 'Revocar',
      'tournament.access.state.pending': 'pendiente',
      'tournament.access.state.approved': 'aprobado',
      'tournament.access.state.revoked': 'revocado',
      'tournament.filter.label': 'Filtrar partidos por estado',
      'tournament.filter.pending': 'Pendientes',
      'tournament.filter.live': 'En vivo',
      'tournament.filter.finished': 'Finalizados',
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
      'tournament.match.trackScore': 'Llevar Marcador',
      'tournament.match.edit': 'Editar',
      'tournament.match.save': 'Guardar',
      'tournament.match.saveProgress': 'Guardar avance',
      'tournament.match.finish': 'Finalizar',
      'tournament.match.cancel': 'Cancelar',
      'tournament.scoreboard.heading': 'Resultado Partido',
      'tournament.scoreboard.team': 'Equipo',
      'tournament.error.scoreEmpty': 'Por favor ingresa ambos resultados',
      'tournament.error.scoreNegative': 'Los resultados deben ser 0 o mayores',
      'tournament.error.scoreDraw': 'Los resultados no pueden ser iguales (no hay empates en v\u00f3ley)',
      'tournament.error.scoreNotInt': 'Los resultados deben ser n\u00fameros enteros',
      'tournament.sync.saving': '⏳ Guardando…',
      'tournament.sync.synced': '✓ Sincronizado con el servidor',
      'tournament.sync.offline': '⚠ Sin conexión · resultado no sincronizado',
      'tournament.sync.denied': '⛔ Acceso denegado · se conserva el resultado confirmado',
      'tournament.sync.conflict': '⚠ Hay un resultado más reciente · revisa y reintenta',
      'tournament.sync.invalid': '⚠ Revisa el marcador e intenta de nuevo',
      'tournament.sync.retry': 'Reintentar',
      // Formato del torneo (PR3a — preajustes y edición ligera)
      'tournament.format.presetLabel': 'Formato:',
      'tournament.format.preset.classic': 'Clásico',
      'tournament.format.preset.groupsTo': 'Solo Grupos',
      'tournament.format.preset.groupsFinal': 'Grupos + Final',
      'tournament.format.preset.crossover': 'Referencia (Top 4)',
      'tournament.format.pointsTo': 'Puntos para ganar',
      'tournament.format.overtime': 'Tiempo extra (ganar por 2)',
      'tournament.format.customRules': 'Nota de reglas personalizadas (opcional)',
      'tournament.format.customRulesHint': 'Ej. Sin recepción con dedos ni remate de colocación',
      'tournament.format.customRulesCount': '{n} / 500',
      'tournament.format.stage.group': 'Fase de Grupos',
      'tournament.format.stage.qf': 'Cuartos de Final',
      'tournament.format.stage.sf': 'Semifinales',
      'tournament.format.stage.final': 'Final',
      'tournament.format.error.presetUnavailable': 'Este formato no está disponible para la configuración actual de grupos',
      'tournament.format.error.missing': 'Selecciona un formato de torneo antes de iniciar',
      'tournament.format.error.version': 'Versión de formato no compatible',
      'tournament.format.error.stageCount': 'Un formato debe tener entre 1 y 8 etapas',
      'tournament.format.error.stageId': 'Identificador de etapa inválido',
      'tournament.format.error.stageIdCollidesWithGroup': 'Un identificador de etapa coincide con el nombre de un grupo',
      'tournament.format.error.pointsTo': 'Los puntos para ganar deben ser un número entero entre 1 y 99',
      'tournament.format.error.overtime': 'El tiempo extra debe estar activado o desactivado',
      'tournament.format.error.roundRobinStage': 'Un formato necesita exactamente una fase de grupos',
      'tournament.format.error.roundRobinOrder': 'La fase de grupos debe ser la primera etapa',
      'tournament.format.error.knockoutPairs': 'Los cruces de la etapa eliminatoria no son válidos',
      'tournament.format.error.knockoutTokenDuplicate': 'Un cupo de la eliminatoria se usa más de una vez',
      'tournament.format.error.knockoutToken': 'Un cupo de la eliminatoria hace referencia a una posición de grupo o partido inválida',
      'tournament.format.error.customRules': 'La nota de reglas personalizadas debe tener 500 caracteres o menos',
      // Formato del torneo (PR3b — cumplimiento del marcador)
      'tournament.format.rule.pointsTo': 'A {points} puntos',
      'tournament.format.rule.overtimeOn': 'tiempo extra, gana por 2',
      'tournament.format.rule.overtimeOff': 'sin tiempo extra',
      'tournament.format.error.pointsTarget': 'El resultado no cumple con la meta de esta etapa',
      'tournament.format.customRulesNote.heading': 'Reglas personalizadas',
      'tournament.format.stageStatus.pending': 'Bloqueada',
      'tournament.format.stageStatus.active': 'En curso',
      'tournament.format.stageStatus.complete': 'Finalizada',
      'tournament.format.stageStatus.invalid': 'Configuración inválida',
      'tournament.format.slot.groupRank': 'Puesto {rank} · Grupo {group}',
      'tournament.format.slot.winner': 'Ganador de {match}',
      'tournament.format.slot.tbd': 'Por definir',
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
      // Navegaci\u00f3n del espacio de trabajo (REQ-UX-01..07, 60-62)
      'workspace.nav.setup': 'Inicio',
      'workspace.nav.teams': 'Equipos',
      'workspace.nav.tournament': 'Torneo',
      'workspace.nav.results': 'Resultados',
      'workspace.nav.locked.generateTeamsFirst': 'Genera los equipos primero',
      'workspace.nav.locked.startFirst': 'Inicia un torneo primero',
      'workspace.action.addPlayers': 'Agregar jugadores',
      'workspace.action.generateTeams': 'Generar equipos',
      'workspace.action.startTournament': 'Iniciar torneo',
      'workspace.action.scoreNext': 'Anotar siguiente partido',
      'workspace.action.shareResults': 'Compartir resultados',
      'workspace.action.requestAccess': 'Solicitar acceso para anotar',
      'workspace.action.blocked.noNextMatch': 'A\u00fan no hay partido listo para anotar',
      'workspace.readiness.enoughPlayers': 'Agrega m\u00e1s jugadores',
      'workspace.readiness.teamsGenerated': 'Genera los equipos primero',
      'workspace.readiness.groupFeasible': 'Ajusta el n\u00famero de grupos',
      'workspace.readiness.formatValid': 'Corrige el formato del torneo',
      'workspace.nav.status.done': 'Completado',
      'workspace.nav.status.attention': 'Requiere atenci\u00f3n',
      // Configuraci\u00f3n guiada (REQ-UX-10..13)
      'workspace.summary.players': '{count} jugadores',
      'workspace.summary.teams': '{count} equipos',
      'workspace.checklist.heading': 'Listo para empezar',
      'workspace.checklist.enoughPlayers.ok': 'Suficientes jugadores',
      'workspace.checklist.enoughPlayers.blocked': 'Faltan {needed} jugadores',
      'workspace.checklist.teamsGenerated.ok': 'Equipos generados',
      'workspace.checklist.teamsGenerated.blocked': 'A\u00fan no se generan los equipos',
      'workspace.checklist.noUnmatched.ok': 'Sin jugadores sin equipo',
      'workspace.checklist.noUnmatched.warn': '{count} jugadores sin equipo',
      'workspace.checklist.groupFeasible.ok': 'La configuraci\u00f3n de grupos es viable',
      'workspace.checklist.groupFeasible.blocked': 'Ajusta el n\u00famero de grupos',
      'workspace.checklist.formatValid.ok': 'El formato del torneo es v\u00e1lido',
      'workspace.checklist.formatValid.blocked': 'Corrige el formato del torneo',
      'workspace.checklist.firebaseConnected.ok': 'Conexi\u00f3n disponible',
      'workspace.setup.formatLocked.note': 'Bloqueado \u2014 reinicia el torneo para cambiarlo',
      // Pie de p\u00e1gina

      'footer.copyright': '\u00a9 2026 Emparejamiento de V\u00f3ley Playa \u2014 v1.8.1'

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
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
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
