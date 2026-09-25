/**
 * Beach Volleyball Couple Matching — Internationalization (i18n)
 *
 * Lightweight translation module supporting English and Spanish.
 * Uses data-i18n attributes for static text and t() for dynamic strings.
 */

/* global */
/* exported t, translate, setLanguage, getLanguage */

var t, translate, setLanguage, getLanguage;

(function () {
  'use strict';

  var STORAGE_KEY = 'bv-lang';

  var translations = {
    en: {
      // Form
      'form.heading': 'Add player',
      'form.nameLabel': 'Name',
      'form.namePlaceholder': 'Player name',
      'form.genderLabel': 'Gender',
      'form.genderMale': 'Male',
      'form.genderFemale': 'Female',
      'form.genderUnspecified': 'No gender',
      'form.levelLabel': 'Level',
      'form.level1': 'Level 1',
      'form.level2': 'Level 2',
      'form.level3': 'Level 3',
      'form.level4': 'Level 4',
      'form.level5': 'Level 5',
      'form.submit': 'Add player',
      'import.pasteMode': 'Paste the whole list',
      'import.label': 'Player list',
      'import.hint': 'Name, gender, level — level is optional',
      'import.review': 'Review',
      // Player list
      'players.heading': 'Registered Players ({count})',
      'players.remove': 'Remove {name}',
      // Actions
      'actions.generate': 'Generate',
      'actions.regenerate': 'Draw again',
      'actions.clearAll': 'Clear players',
      'actions.confirmClear': 'Delete every player?',
      'actions.confirmClearTitle': 'Clear players?',
      'actions.confirmClearDesc': 'What would you like to do to start fresh?',
      'actions.clearAllAndReset': 'Clear all and start from scratch',
      'actions.resetKeepPlayers': 'New tournament (keep players)',
      'actions.cancel': 'Cancel',
      'tournament.newTournamentTitle': 'Start a new tournament?',
      'tournament.newTournamentDesc': 'What would you like to do with the current roster?',
      // Results
      'results.heading': 'Teams',
      'results.typeMixed': 'Mixed',
      'results.typeSame': 'Same gender',
      // Tournament
      'tournament.groupsLabel': 'Groups',
      'tournament.access.request': 'Ask for access to score',
      'tournament.access.approve': 'Approve',
      'tournament.access.deny': 'No',
      'tournament.start': 'Start tournament',
      'tournament.group': 'Group {id}',
      'tournament.col.team': 'TEAM',
      'tournament.error.scoreEmpty': 'Please enter both scores',
      'tournament.error.scoreNegative': 'Scores must be 0 or higher',
      'tournament.error.scoreDraw': 'A draw: the rules reject a finished result with no winner. You can leave it live.',
      'tournament.error.scoreNotInt': 'Invalid score',
      'tournament.sync.saving': 'Saving…',
      'tournament.sync.synced': 'Saved',
      'tournament.sync.offline': 'Offline — it will save when the signal is back',
      'tournament.sync.denied': 'You no longer have permission to score',
      'tournament.sync.invalid': 'The server rejected the result',
      // Tournament format (PR3a — setup presets + light editing)
      'tournament.format.presetLabel': 'Format',
      'tournament.format.preset.classic': 'Classic',
      'tournament.format.preset.groupsTo': 'Groups Only',
      'tournament.format.preset.groupsFinal': 'Groups + Final',
      'tournament.format.preset.crossover': 'Reference (Top 4)',
      'tournament.format.preset.custom': 'Custom format',
      'tournament.format.customRules': 'House rules',
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
      'tournament.format.error.pointsTarget': 'The set is to {points} points',
      // Pairing mode
      'pairing.modeRandom': 'Random',
      'pairing.modeManual': 'Manual',
      'pairing.manualHint': 'The remaining {count} teams are drawn at random',
      // King of the Court
      'king.start':                'Start King of the Court',
      'king.reset':                'Reset King',
      'king.confirmReset':         'Reset the game?',
      'king.winConditionLabel':    'Wins by',
      'king.condConsecutive':      'In a row',
      'king.condTotal':            'Total',
      'king.targetLabel':          'Wins needed',
      'king.roleKing':             'King',
      'king.roleChallenger':       'Challenger',
      'king.kingWins':             'Point to the king',
      'king.challengerWins':       'Point to the challenger',
      'king.queueHeading':         'Queue',
      'king.logHeading':           'Rally history',
      'king.winnerTitle':          'Kings of the court',
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
      'workspace.checklist.heading': 'Ready to start',
      'workspace.setup.formatLocked.note': 'Locked — reset the tournament to change the format',
      // Teams workspace (REQ-UX-20..23)
      'workspace.teams.moreOptions': 'More options',
      'workspace.teams.editPairs': 'Edit teams by hand',
      'workspace.teams.forkHeading': 'How do you want to play?',
      'workspace.teams.forkTournament': 'Tournament',
      'workspace.teams.forkKing': 'King of the Court',
      // Tournament command center (REQ-UX-30..35)
      'workspace.tournament.nextMatch.heading': 'Next',
      'workspace.tournament.nextMatch.reason.ok': 'Next match',
      'workspace.tournament.nextMatch.reason.allFinished': 'All matches finished for now',
      'workspace.tournament.nextMatch.reason.awaitingStage': 'Waiting for stage results',
      'workspace.tournament.nextMatch.reason.none': 'No tournament yet',
      'workspace.tournament.nextMatch.reason.complete': 'Tournament complete \u00b7 See results',
      'workspace.tournament.nextMatch.scoreBtn': 'Score this match',
      'workspace.tournament.nextMatch.seeResults': 'See results',
      'workspace.tournament.stageProgress.heading': 'Progress',
      'workspace.tournament.stageProgress.count': '{played}/{total} played',
      'tournament.day.stageProgress.group': 'Group {group}',
      // Results / completion (REQ-UX-50..53)
      'workspace.results.empty': 'No results yet',
      'workspace.results.emptyLink': 'Go to Home',
      'workspace.results.startAnother': 'New tournament',
      // Footer

      'footer.copyright': '\u00a9 2026 Beach Volleyball Couple Matching \u2014 v2.0.12',

      // Alta y plantel (A1, A2)
      'setup.empty.title': 'Who is playing today?',
      'setup.empty.text': 'Add players one by one, or paste the whole group list.',
      'setup.empty.add': 'Add player',
      'setup.search': 'Search player',
      'setup.noMatches': 'No player matches the search',
      'setup.seeAll': 'See all {count}',

      // Pegar lista (A3)
      'import.step1': 'Step 1 of 2 · paste',
      'import.step2': 'Step 2 of 2 · review',
      'import.oneLine': 'One player per line',
      'import.back': 'Back to pasting',
      'import.ready': 'ready',
      'import.skipped': 'skipped',
      'import.skippedExplainer': 'Lines with errors are not imported. Fix them above, or import them later.',
      'import.confirmN': 'Import {count} players',
      'import.nothing': 'Nothing to import',
      'import.blank': '(blank)',
      'import.noLevel': 'no level',

      // Emparejar a mano (A4)
      'pairing.manualTitle': 'Build teams by hand',
      'pairing.fixed': 'Fixed teams',
      'pairing.ofFixed': 'teams fixed',
      'pairing.unfix': 'Undo team',
      'pairing.unpaired': 'Not on a team',
      'pairing.tapTwo': 'Tap {n}',
      'pairing.allPaired': 'Everyone is on a team',
      'pairing.fixSelected': 'Fix {names}',
      'pairing.pickMore': 'Pick {n} players',
      'pairing.done': 'Done',

      // Equipos (B1, B2, B3)
      'teams.regenerateDesc': 'Draw the pairs again at random',
      'teams.editDesc': 'Fix who plays with whom',
      'teams.clearDesc': 'Clear the roster and start over',
      'teams.addPlayer': 'Add',
      'teams.orKing': 'or play King of the Court',
      'teams.forkTournamentDesc': 'Groups, a table and a final. Everyone plays the same.',
      'teams.forkKingDesc': 'The winner stays on court. Challengers queue up.',
      'unmatched.text': 'has no team',

      // Configurar torneo (A5, A6)
      'tournament.configTitle': 'Configure tournament',
      'tournament.configShort': 'Tournament',
      'tournament.configureFirst': 'Adjust groups and format',
      'tournament.summaryLabel': 'What comes out',
      'workspace.summary.teamsWord': 'teams',
      'tournament.format.customize': 'Customise format',
      'tournament.format.hideEditor': 'Hide details',
      'tournament.format.valid': 'Valid format',
      'tournament.format.classicNote': 'The Classic format has no configurable stages: round robin, then a final.',
      'tournament.ownerLabel': 'Who is organising?',
      'tournament.ownerPlaceholder': 'Your name (optional)',
      'tournament.ownerHint': 'It will show in the change history. Left empty, it will say "Organiser".',

      // Día de torneo (C1, C3, C4)
      'tournament.none': 'No tournament yet',
      'tournament.noneText': 'Generate the teams and pick how you want to play.',
      'tournament.upNext': 'Up next',
      'tournament.live': 'Live',
      'tournament.recentlyFinished': 'Just finished',
      'tournament.seeAll': 'See all',
      'tournament.standings': 'Standings',
      'tournament.standingsFinal': 'Final standings',
      'tournament.standingsLive': 'Live standings',
      'tournament.glossary': 'MP played · W won · L lost · +/- difference · PF points for · PA against',
      'tournament.tieOrder': 'Order: PTS → +/- → PF → head to head',
      'tournament.tieLegend': 'Each block highlights the column that decides it: read it downwards',
      'tournament.tieBlock': 'Tied on {points} points · {column} decides',
      'tournament.subTieBlock': 'Same +/- ({diff}) · {column} decides',
      'tournament.tieUnresolved': 'Level on everything shown · head to head decides',
      'tournament.noBracket': 'This format has no knockout stage',
      'tournament.noBracketText': 'The tournament is decided in the group stage.',
      'standings.col.played': 'MP',
      'standings.col.won': 'W',
      'standings.col.lost': 'L',
      'standings.col.diff': '+/-',
      'standings.col.setsFor': 'PF',
      'standings.col.setsAgainst': 'PA',
      'standings.col.points': 'PTS',

      // Anotar (C2, C2b, C5)
      'tournament.scoreTitle': 'Score',
      'tournament.scoreFor': 'Points for',
      'tournament.increment': 'Add a point',
      'tournament.decrement': 'Subtract a point',
      'tournament.editHint': 'Tap the number to type it with the keyboard',
      'tournament.setTo': 'Set to {points} points',
      'tournament.noTarget': 'No point limit',
      'tournament.saveResult': 'Save result',
      'tournament.undoStep': 'Undo',
      'tournament.won': 'Won',
      'tournament.noMatch': 'Match not found',
      'tournament.error.notFinished': 'Not at {points} points yet',
      'tournament.error.tooHigh': 'Maximum {max}',
      'tournament.sync.saved': 'Saved',
      'tournament.conflict.title': 'Someone scored before you',
      'tournament.conflict.body': 'Another device saved this match while you were scoring. Pick the result that stands.',
      'tournament.conflict.mine': 'Your version',
      'tournament.conflict.theirs': 'Saved by another device',

      // Colaboración (D1, D2, D3, D4)
      'day.readOnly': 'View only',
      'day.viewingTournament': 'You are watching a shared tournament',
      'day.accessBody': 'Results update live. To score, the organiser has to give you access, and it is granted for the whole tournament — not match by match.',
      'day.readOnlyMatch': 'View only — you cannot score this tournament',
      'day.oneRequest': 'Someone is asking for access to score',
      'day.manyRequests': '{count} people are asking for access to score',
      'day.reviewRequests': 'Review',
      'day.share': 'Share',
      'access.screenTitle': 'Score this tournament',
      'access.screenSub': 'Ask the organiser for access',
      'access.title': 'Ask for permission to score',
      'access.body': 'The organiser gets your request and, if they approve it, you will be able to save results for any match in this tournament from this phone. The permission covers the whole tournament. You will not be able to change the format or the teams.',
      'access.identify': 'How should we identify you?',
      'access.placeholder': 'Your name or device',
      'access.hint': 'It will show in the organiser\'s scorer list and in the change history.',
      'access.pending': 'Pending — the organiser has not answered yet',
      'access.pendingShort': 'Request sent',
      'access.resend': 'Ask again',
      'access.revoked': 'Declined — you keep view-only access',
      'access.anonymous': 'Scorer',
      'access.organiser': 'Organiser',
      'access.toast.approved': 'You can score now',
      'access.toast.approvedSub': 'The organiser gave you access to this tournament',
      'access.toast.revoked': 'Your access was removed',
      'access.toast.revokedSub': 'You are still watching the tournament, view only',
      'scorers.title': 'Scorers',
      'scorers.requests': 'Requests',
      'scorers.pendingShort': 'request(s)',
      'scorers.asked': 'Asked for access',
      'scorers.approved': 'With access',
      'scorers.withAccess': 'with access',
      'scorers.canScore': 'Can score',
      'scorers.owner': 'Organiser',
      'scorers.you': 'you',
      'scorers.remove': 'Remove',
      'scorers.deviceNote': 'A scorer is a device, not a person: if they clear their browser data or switch phones, they will have to ask for access again.',
      'share.title': 'Share tournament',
      'share.sub': 'Anyone who opens the link sees the table and the results live. They cannot score unless you give them access.',
      'share.copy': 'Copy',
      'share.copied': 'Link copied',
      'share.system': 'Share',
      'share.linkBtn': 'Share the tournament link',
      'share.none': 'No link yet',
      'share.localOnly': 'This tournament is local: no shared session was created, so there is no link to send.',
      'session.goneTitle': 'This tournament is no longer available',
      'session.goneText': 'The organiser reset it, or the link is incomplete. Ask them for a new one.',
      'session.leaveLink': 'Leave the shared link',
      'session.unsupportedTitle': 'We cannot open this tournament',
      'session.unsupportedText': 'The link comes from a newer version of the app. Reload to update it.',
      'session.reload': 'Reload',

      // King of the Court (E1, E2)
      'king.none': 'No King game yet',
      'king.noneText': 'Generate the teams and pick King of the Court.',
      'king.of': 'of',
      'king.winsConsecutive': 'wins in a row',
      'king.winsTotal': 'wins in total',
      'king.more': 'more',
      'king.hideLog': 'Hide',
      'king.roundLabel': 'The round',
      'king.rallies': 'Rallies played',
      'king.challengers': 'Challengers who came through',
      'king.bestStreak': 'Longest streak',
      'king.tookThrone': 'took the throne',
      'king.keptThrone': 'kept the throne',
      'king.another': 'Another round',

      // Cierre y resultados (F1, F2, F3)
      'results.champion': 'Champion',
      'results.position': 'Position {rank}',
      'results.pairs': 'teams',
      'results.matches': 'matches',
      'results.provisional': 'Provisional standings: {count} matches left to play',
      'results.emptyText': 'Once you start a tournament, the live table shows up here — and the champion when it ends.',
      'workspace.results.seeResults': 'The tournament is over.',
      'history.title': 'History',
      'history.forMatch': 'History for this match',

      // Reparametrizadas: el número vuelve al texto
      'pairing.manualHint': 'The remaining {count} teams are drawn at random',
      'tournament.format.error.pointsTarget': 'The set is to {points} points',

      // Formato de torneo: presets y editor (A5, A6)
      'format.preset.classic.title': 'Classic',
      'format.preset.classic.desc': 'Round robin, then a final between the top two.',
      'format.preset.groupsTo.title': 'Groups only',
      'format.preset.groupsTo.desc': 'It ends with the group stage; the leader wins.',
      'format.preset.groupsFinal.title': 'Groups + Final',
      'format.preset.groupsFinal.desc': 'Like Classic, but without crossover tiebreakers.',
      'format.preset.crossover.title': 'Crossover (Top 4)',
      'format.preset.crossover.desc': 'Crossover semi-finals: 1st–4th and 2nd–3rd.',
      'format.preset.crossover.requires': '2 groups of 4+',
      'format.summary.groupMatches': '{count} matches in the group stage',
      'format.summary.singleFinal': 'A single-match final',
      'format.summary.knockoutMatches': '{count} knockout matches',
      'format.summary.duration': 'About {duration} on 2 courts (approx.)',
      'format.stage.groups': 'Stage {order} · Groups',
      'format.stage.knockout': 'Stage {order} · Knockout',
      'format.field.pointsTo': 'Points per set',
      'format.field.overtime': 'Overtime',
      'format.field.overtimeYes': 'Yes (+2)',
      'format.field.overtimeNo': 'No',
      'format.field.pairs': 'Pairings',

      // Errores de la lista pegada (A3)
      'import.issue.nameEmpty': 'No name — skipped',
      'import.issue.nameTooShort': 'The name is too short',
      'import.issue.nameTooLong': 'The name is over 50 characters',
      'import.issue.invalidGender': '"{token}" is not a gender we recognise',
      'import.issue.invalidLevel': '"{token}" is not a level (1-5)',
      'import.issue.tooManyColumns': 'The line has {count} columns; 3 are expected',
      'import.issue.unclosedQuote': 'Unclosed quote',
      'import.issue.mixedDelimiter': 'A different separator from the rest',
      'import.issue.playerLimitExceeded': 'That would go over the maximum of {maxPlayers} players',
      'import.issue.emptyBatch': 'There is nothing to import',

      // Shell y palabras comunes
      'app.toggleLanguage': 'Change language',
      'app.screenPending': 'This screen is still pending at this stage of the rebuild.',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.minutesShort': 'min',
      'common.hoursShort': 'h',

      // Bracket: huecos sin resolver (C4)
      'bracket.slot.group': 'Group {group} #{rank}',
      'bracket.slot.winner': 'Winner of {stage}{n}',
      'bracket.stage.qf': 'QF',
      'bracket.stage.sf': 'SF',
      'bracket.stage.final': 'Final',

      // Estados que bloquean una pantalla o una acción
      'workspace.readiness.firebaseConnected': 'No connection: the tournament is saved on this phone only',
      'workspace.readiness.noUnmatched': 'Some players have no pair',
      'workspace.overlay.blocked.readOnly': 'View only: you cannot score this tournament',
      'workspace.overlay.blocked.noTournament': 'There is no tournament yet',
      'workspace.overlay.blocked.noRevisions': 'This match has no changes to show',
      'workspace.overlay.blocked.alreadyScoring': 'You can already score this tournament',
      'workspace.overlay.blocked.ownerOnly': 'Only the organiser manages the scorers',
      'workspace.overlay.blocked.noSession': 'This tournament has not been shared yet',
      'workspace.overlay.blocked.modeChosen': 'You already picked how to play',
      'workspace.overlay.blocked.tournamentRunning': 'The tournament has already started',
      'workspace.overlay.blocked.noPlayers': 'There are no players yet',
      'workspace.overlay.blocked.noTeams': 'There are no pairs yet',

      // Keys that used to share their text with another screen
      'access.requestShort': 'Ask for access',
      'nav.goToTeams': 'Go to Teams',
      'nav.goToResults': 'See results',
      'players.levelShort': 'L{level}',
      'workspace.tournament.tab.today': 'Today',
      'workspace.tournament.tab.groups': 'Groups',
      'workspace.tournament.tab.bracket': 'Bracket',
      'tournament.groupCount.one': '1 group',
      'tournament.groupCount.many': '{count} groups',
      'import.issue.ambiguousM': '"M" was read as male, following the language',

      // Historial de cambios (H1, H2, H3, H5)
      'history.menuLabel': 'Tournament options',
      'tournament.reset': 'Reset tournament',
      'tournament.confirmReset': 'Reset the tournament? The results are deleted and the link stops working.',
      'history.records': 'records',
      'history.today': 'Today',
      'history.yesterday': 'Yesterday',
      'history.dayUnknown': 'No date',
      'history.justNow': 'just now',
      'history.minutesAgo': '{count} min ago',
      'history.unknownTime': 'no time',
      'history.unknownMatch': 'Match',
      'history.unknownAuthor': 'unknown scorer',
      'history.you': 'You',
      'history.youOrganiser': 'You (organiser)',
      'history.ownerSuffix': '{name} — Organiser',
      'history.action.created': 'Result recorded',
      'history.action.edited': 'Correction',
      'history.action.conflictResolved': 'Conflict resolved',
      'history.action.unknown': 'Last change',
      'history.filter.all': 'All',
      'history.filter.created': 'New',
      'history.filter.edited': 'Corrections',
      'history.filter.conflictResolved': 'Conflicts',
      'history.noneOfThisKind': 'No records of this kind',
      'history.emptyTitle': 'No changes yet',
      'history.emptyText': 'When someone records or corrects a result, it shows up here with their name and the time.',
      'history.localTitle': 'This tournament is yours alone',
      'history.localText': 'The history records who changed each result, and that only exists once you share the tournament.',
      'history.legacy': 'This tournament started before the history existed. Only the last change to each match is kept.',
      'history.offline': 'Offline — the most recent changes may be missing',
      'history.matchTitle': 'Match history',
      'history.matchEmptyTitle': 'No changes recorded',
      'history.matchEmptyText': 'This result was saved before the history existed, or the tournament is not shared.',
      'history.current': 'Current result',
      'history.revision': 'rev {n}',
      'history.savedBy': 'Saved by',
      'history.timeline': 'Timeline',
      'history.conflictKept': 'this version stood',
      'history.fullTitle': 'Change history',

      // Todos los partidos y su buscador (C6)
      'matches.title': 'Every match',
      'matches.progress': '{played} of {total} played',
      'matches.search': 'Search by player, team or group',
      'matches.clear': 'Clear the search',
      'matches.results': '{count} of {total} matches',
      'matches.noneTitle': 'No match found',
      'matches.noneText': 'Try a player name, a pair name or a group.',
      'matches.finished': 'Finished',
      'matches.resultsLabel': 'Results',
},
    es: {
      // Formulario
      'form.heading': 'Añadir jugador',
      'form.nameLabel': 'Nombre',
      'form.namePlaceholder': 'Nombre del jugador',
      'form.genderLabel': 'G\u00e9nero',
      'form.genderMale': 'Hombre',
      'form.genderFemale': 'Mujer',
      'form.genderUnspecified': 'Sin género',
      'form.levelLabel': 'Nivel',
      'form.level1': 'Nivel 1',
      'form.level2': 'Nivel 2',
      'form.level3': 'Nivel 3',
      'form.level4': 'Nivel 4',
      'form.level5': 'Nivel 5',
      'form.submit': 'Añadir jugador',
      'import.pasteMode': 'Pegar lista completa',
      'import.label': 'Lista de jugadores',
      'import.hint': 'Nombre, Género, Nivel — el nivel es opcional',
      'import.review': 'Revisión',
      // Lista de jugadores
      'players.heading': 'Jugadores Registrados ({count})',
      'players.remove': 'Eliminar {name}',
      // Acciones
      'actions.generate': 'Generar',
      'actions.regenerate': 'Regenerar',
      'actions.clearAll': 'Vaciar jugadores',
      'actions.confirmClear': '¿Seguro que quieres borrar todos los jugadores?',
      'actions.confirmClearTitle': '¿Vaciar jugadores?',
      'actions.confirmClearDesc': '¿Qué deseas hacer para empezar de cero?',
      'actions.clearAllAndReset': 'Vaciar todo y empezar de cero',
      'actions.resetKeepPlayers': 'Nuevo torneo (conservar jugadores)',
      'actions.cancel': 'Cancelar',
      'tournament.newTournamentTitle': '¿Empezar un nuevo torneo?',
      'tournament.newTournamentDesc': '¿Qué deseas hacer con el plantel actual?',
      // Resultados
      'results.heading': 'Equipos',
      'results.typeMixed': 'Mixta',
      'results.typeSame': 'Mismo género',
      // Torneo
      'tournament.groupsLabel': 'Grupos',
      'tournament.access.request': 'Pedir acceso para anotar',
      'tournament.access.approve': 'Aprobar',
      'tournament.access.deny': 'No',
      'tournament.start': 'Empezar torneo',
      'tournament.group': 'Grupo {id}',
      'tournament.col.team': 'EQUIPO',
      'tournament.error.scoreEmpty': 'Por favor ingresa ambos resultados',
      'tournament.error.scoreNegative': 'Los resultados deben ser 0 o mayores',
      'tournament.error.scoreDraw': 'Empate: las reglas rechazan un resultado terminado sin ganador. Puedes dejarlo en vivo.',
      'tournament.error.scoreNotInt': 'Marcador no válido',
      'tournament.sync.saving': 'Guardando…',
      'tournament.sync.synced': 'Guardado',
      'tournament.sync.offline': 'Sin conexión — se guardará al volver',
      'tournament.sync.denied': 'Ya no tienes permiso para anotar',
      'tournament.sync.invalid': 'El servidor rechazó el resultado',
      // Formato del torneo (PR3a — preajustes y edición ligera)
      'tournament.format.presetLabel': 'Formato',
      'tournament.format.preset.classic': 'Clásico',
      'tournament.format.preset.groupsTo': 'Solo Grupos',
      'tournament.format.preset.groupsFinal': 'Grupos + Final',
      'tournament.format.preset.crossover': 'Referencia (Top 4)',
      'tournament.format.preset.custom': 'Formato personalizado',
      'tournament.format.customRules': 'Reglas de la casa',
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
      'tournament.format.error.pointsTarget': 'El set es a {points} puntos',
      // Modo de emparejamiento
      'pairing.modeRandom': 'Aleatorio',
      'pairing.modeManual': 'Manual',
      'pairing.manualHint': 'Los {count} equipos restantes se generan al azar',
      // Rey de la Cancha
      'king.start':                'Empezar King of the Court',
      'king.reset':                'Reiniciar King',
      'king.confirmReset':         '¿Seguro que quieres reiniciar la partida?',
      'king.winConditionLabel':    'Gana por',
      'king.condConsecutive':      'Seguidas',
      'king.condTotal':            'Totales',
      'king.targetLabel':          'Victorias para ganar',
      'king.roleKing':             'Rey',
      'king.roleChallenger':       'Reta',
      'king.kingWins':             'Punto para el rey',
      'king.challengerWins':       'Punto para el retador',
      'king.queueHeading':         'Cola',
      'king.logHeading':           'Historial de rallies',
      'king.winnerTitle':          'Campeones de la cancha',
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
      'workspace.checklist.heading': 'Listo para empezar',
      'workspace.setup.formatLocked.note': 'Bloqueado — reinicia el torneo para cambiar el formato',
      // Espacio de equipos (REQ-UX-20..23)
      'workspace.teams.moreOptions': 'M\u00e1s opciones',
      'workspace.teams.editPairs': 'Editar equipos a mano',
      'workspace.teams.forkHeading': '¿Cómo quieren jugar?',
      'workspace.teams.forkTournament': 'Torneo',
      'workspace.teams.forkKing': 'King of the Court',
      // Centro de control del torneo (REQ-UX-30..35)
      'workspace.tournament.nextMatch.heading': 'Siguiente',
      'workspace.tournament.nextMatch.reason.ok': 'Pr\u00f3ximo partido',
      'workspace.tournament.nextMatch.reason.allFinished': 'Todos los partidos terminaron por ahora',
      'workspace.tournament.nextMatch.reason.awaitingStage': 'Esperando los resultados de la etapa',
      'workspace.tournament.nextMatch.reason.none': 'A\u00fan no hay torneo',
      'workspace.tournament.nextMatch.reason.complete': 'Torneo completado \u00b7 Ver resultados',
      'workspace.tournament.nextMatch.scoreBtn': 'Anotar este partido',
      'workspace.tournament.nextMatch.seeResults': 'Ver resultados',
      'workspace.tournament.stageProgress.heading': 'Progreso',
      'workspace.tournament.stageProgress.count': '{played}/{total} jugados',
      'tournament.day.stageProgress.group': 'Grupo {group}',
      // Resultados / finalizaci\u00f3n (REQ-UX-50..53)
      'workspace.results.empty': 'Todavía no hay resultados',
      'workspace.results.emptyLink': 'Ir a Inicio',
      'workspace.results.startAnother': 'Nuevo torneo',
      // Pie de p\u00e1gina

      'footer.copyright': '\u00a9 2026 Emparejamiento de V\u00f3ley Playa \u2014 v2.0.12',

      // Alta y plantel (A1, A2)
      'setup.empty.title': '¿Quién juega hoy?',
      'setup.empty.text': 'Añade jugadores uno a uno o pega la lista completa del grupo.',
      'setup.empty.add': 'Añadir jugador',
      'setup.search': 'Buscar jugador',
      'setup.noMatches': 'Ningún jugador coincide con la búsqueda',
      'setup.seeAll': 'Ver los {count}',

      // Pegar lista (A3)
      'import.step1': 'Paso 1 de 2 · pegar',
      'import.step2': 'Paso 2 de 2 · revisar',
      'import.oneLine': 'Una línea por jugador',
      'import.back': 'Volver a pegar',
      'import.ready': 'listos',
      'import.skipped': 'se omiten',
      'import.skippedExplainer': 'Las líneas con error no se importan. Corrígelas aquí arriba o impórtalas después.',
      'import.confirmN': 'Importar {count} jugadores',
      'import.nothing': 'Nada que importar',
      'import.blank': '(vacío)',
      'import.noLevel': 'sin nivel',

      // Emparejar a mano (A4)
      'pairing.manualTitle': 'Armar equipos a mano',
      'pairing.fixed': 'Equipos fijados',
      'pairing.ofFixed': 'equipos fijados',
      'pairing.unfix': 'Deshacer equipo',
      'pairing.unpaired': 'Sin equipo',
      'pairing.tapTwo': 'Toca {n}',
      'pairing.allPaired': 'Ya están todos en un equipo',
      'pairing.fixSelected': 'Fijar {names}',
      'pairing.pickMore': 'Elige {n} jugadores',
      'pairing.done': 'Listo',

      // Equipos (B1, B2, B3)
      'teams.regenerateDesc': 'Vuelve a repartir al azar',
      'teams.editDesc': 'Fija quién juega con quién',
      'teams.clearDesc': 'Borra el plantel y empieza de cero',
      'teams.addPlayer': 'Añadir',
      'teams.orKing': 'o jugar King of the Court',
      'teams.forkTournamentDesc': 'Grupos, tabla y final. Todos juegan lo mismo.',
      'teams.forkKingDesc': 'El que gana se queda en la cancha. Cola de retadores.',
      'unmatched.text': 'se queda sin equipo',

      // Configurar torneo (A5, A6)
      'tournament.configTitle': 'Configurar torneo',
      'tournament.configShort': 'Torneo',
      'tournament.configureFirst': 'Ajustar grupos y formato',
      'tournament.summaryLabel': 'Lo que sale',
      'workspace.summary.teamsWord': 'equipos',
      'tournament.format.customize': 'Personalizar formato',
      'tournament.format.hideEditor': 'Ocultar detalle',
      'tournament.format.valid': 'Formato válido',
      'tournament.format.classicNote': 'El formato Clásico no tiene etapas configurables: todos contra todos y final.',
      'tournament.ownerLabel': '¿Quién organiza?',
      'tournament.ownerPlaceholder': 'Tu nombre (opcional)',
      'tournament.ownerHint': 'Aparecerá en el historial de cambios. Si lo dejas vacío, dirá "Organizador".',

      // Día de torneo (C1, C3, C4)
      'tournament.none': 'Todavía no hay torneo',
      'tournament.noneText': 'Genera los equipos y elige cómo quieren jugar.',
      'tournament.upNext': 'Próximos',
      'tournament.live': 'En vivo',
      'tournament.recentlyFinished': 'Recién terminados',
      'tournament.seeAll': 'Ver todos',
      'tournament.standings': 'Clasificación',
      'tournament.standingsFinal': 'Clasificación final',
      'tournament.standingsLive': 'Clasificación en vivo',
      'tournament.glossary': 'PJ jugados · G ganados · P perdidos · DIF diferencia · PF puntos a favor · PC en contra',
      'tournament.tieOrder': 'Orden: PTS → DIF → PF → enfrentamiento directo',
      'tournament.tieLegend': 'En cada bloque se resalta la columna que decide: léela en vertical',
      'tournament.tieBlock': 'Empatadas a {points} puntos · decide {column}',
      'tournament.subTieBlock': 'Mismo DIF ({diff}) · decide {column}',
      'tournament.tieUnresolved': 'Iguales en todo lo visible · decide el enfrentamiento directo',
      'tournament.noBracket': 'Este formato no tiene eliminatorias',
      'tournament.noBracketText': 'El torneo se decide en la fase de grupos.',
      'standings.col.played': 'PJ',
      'standings.col.won': 'G',
      'standings.col.lost': 'P',
      'standings.col.diff': 'DIF',
      'standings.col.setsFor': 'PF',
      'standings.col.setsAgainst': 'PC',
      'standings.col.points': 'PTS',

      // Anotar (C2, C2b, C5)
      'tournament.scoreTitle': 'Anotar',
      'tournament.scoreFor': 'Puntos de',
      'tournament.increment': 'Sumar punto',
      'tournament.decrement': 'Restar punto',
      'tournament.editHint': 'Toca el número para escribirlo con el teclado',
      'tournament.setTo': 'Set a {points} puntos',
      'tournament.noTarget': 'Sin límite de puntos',
      'tournament.saveResult': 'Guardar resultado',
      'tournament.undoStep': 'Deshacer',
      'tournament.won': 'Ganó',
      'tournament.noMatch': 'Partido no encontrado',
      'tournament.error.notFinished': 'Todavía no llega a {points} puntos',
      'tournament.error.tooHigh': 'Máximo {max}',
      'tournament.sync.saved': 'Guardado',
      'tournament.conflict.title': 'Alguien anotó antes que tú',
      'tournament.conflict.body': 'Otro dispositivo guardó este partido mientras anotabas. Elige qué resultado queda.',
      'tournament.conflict.mine': 'Tu versión',
      'tournament.conflict.theirs': 'Guardado por otro dispositivo',

      // Colaboración (D1, D2, D3, D4)
      'day.readOnly': 'Solo lectura',
      'day.viewingTournament': 'Estás viendo un torneo compartido',
      'day.accessBody': 'Los resultados se actualizan en vivo. Para anotar necesitas que el organizador te dé acceso, y se concede para todo el torneo — no partido a partido.',
      'day.readOnlyMatch': 'Solo lectura — no puedes anotar este torneo',
      'day.oneRequest': 'Alguien pide acceso para anotar',
      'day.manyRequests': '{count} personas piden acceso para anotar',
      'day.reviewRequests': 'Revisar',
      'day.share': 'Compartir',
      'access.screenTitle': 'Anotar este torneo',
      'access.screenSub': 'Pide acceso al organizador',
      'access.title': 'Pide permiso para anotar',
      'access.body': 'El organizador recibe tu solicitud y, si la aprueba, podrás guardar resultados de cualquier partido de este torneo desde este teléfono. El permiso es del torneo completo. No podrás cambiar el formato ni los equipos.',
      'access.identify': '¿Cómo te identificamos?',
      'access.placeholder': 'Tu nombre o dispositivo',
      'access.hint': 'Aparecerá en la lista de anotadores del organizador y en el historial de cambios.',
      'access.pending': 'Pendiente — el organizador aún no responde',
      'access.pendingShort': 'Solicitud enviada',
      'access.resend': 'Volver a pedir',
      'access.revoked': 'Rechazado — sigues viendo en solo lectura',
      'access.anonymous': 'Anotador',
      'access.organiser': 'Organizador',
      'access.toast.approved': 'Ya puedes anotar',
      'access.toast.approvedSub': 'El organizador te dio acceso a este torneo',
      'access.toast.revoked': 'Se te quitó el acceso',
      'access.toast.revokedSub': 'Sigues viendo el torneo en solo lectura',
      'scorers.title': 'Anotadores',
      'scorers.requests': 'Solicitudes',
      'scorers.pendingShort': 'solicitud(es)',
      'scorers.asked': 'Pidió acceso',
      'scorers.approved': 'Con acceso',
      'scorers.withAccess': 'con acceso',
      'scorers.canScore': 'Puede anotar',
      'scorers.owner': 'Organizador',
      'scorers.you': 'tú',
      'scorers.remove': 'Quitar',
      'scorers.deviceNote': 'Un anotador es un dispositivo, no una persona: si borra los datos del navegador o cambia de teléfono, tendrá que pedir acceso otra vez.',
      'share.title': 'Compartir torneo',
      'share.sub': 'Quien abra el link ve la tabla y los resultados en vivo. No podrá anotar salvo que le des acceso.',
      'share.copy': 'Copiar',
      'share.copied': 'Link copiado',
      'share.system': 'Compartir',
      'share.linkBtn': 'Compartir link del torneo',
      'share.none': 'Todavía sin link',
      'share.localOnly': 'Este torneo es local: no se creó sesión compartida, así que no hay link que enviar.',
      'session.goneTitle': 'Este torneo ya no está disponible',
      'session.goneText': 'El organizador lo reinició, o el link está incompleto. Pídele uno nuevo.',
      'session.leaveLink': 'Salir del link compartido',
      'session.unsupportedTitle': 'No podemos abrir este torneo',
      'session.unsupportedText': 'El link viene de una versión más reciente de la app. Recarga para actualizarla.',
      'session.reload': 'Recargar',

      // King of the Court (E1, E2)
      'king.none': 'No hay partida de King',
      'king.noneText': 'Genera los equipos y elige King of the Court.',
      'king.of': 'de',
      'king.winsConsecutive': 'victorias seguidas',
      'king.winsTotal': 'victorias totales',
      'king.more': 'más',
      'king.hideLog': 'Ocultar',
      'king.roundLabel': 'La ronda',
      'king.rallies': 'Rallies jugados',
      'king.challengers': 'Retadores que pasaron',
      'king.bestStreak': 'Racha más larga',
      'king.tookThrone': 'tomó el trono',
      'king.keptThrone': 'mantuvo el trono',
      'king.another': 'Otra ronda',

      // Cierre y resultados (F1, F2, F3)
      'results.champion': 'Campeón',
      'results.position': 'Puesto {rank}',
      'results.pairs': 'equipos',
      'results.matches': 'partidos',
      'results.provisional': 'Posiciones provisionales: quedan {count} partidos por jugar',
      'results.emptyText': 'Cuando arranques un torneo verás aquí la tabla en vivo y, al terminar, el campeón.',
      'workspace.results.seeResults': 'El torneo ha terminado.',
      'history.title': 'Historial',
      'history.forMatch': 'Historial de este partido',

      // Reparametrizadas: el número vuelve al texto
      'pairing.manualHint': 'Los {count} equipos restantes se generan al azar',
      'tournament.format.error.pointsTarget': 'El set es a {points} puntos',

      // Formato de torneo: presets y editor (A5, A6)
      'format.preset.classic.title': 'Clásico',
      'format.preset.classic.desc': 'Todos contra todos y final entre los dos primeros.',
      'format.preset.groupsTo.title': 'Solo grupos',
      'format.preset.groupsTo.desc': 'Termina al acabar la fase de grupos, gana el líder.',
      'format.preset.groupsFinal.title': 'Grupos + Final',
      'format.preset.groupsFinal.desc': 'Igual que Clásico pero sin desempates cruzados.',
      'format.preset.crossover.title': 'Referencia (Top 4)',
      'format.preset.crossover.desc': 'Semifinales cruzadas 1º–4º y 2º–3º.',
      'format.preset.crossover.requires': '2 grupos de 4+',
      'format.summary.groupMatches': '{count} partidos en la fase de grupos',
      'format.summary.singleFinal': 'Final a un partido',
      'format.summary.knockoutMatches': '{count} partidos de eliminatoria',
      'format.summary.duration': 'Unas {duration} con 2 canchas (aprox.)',
      'format.stage.groups': 'Etapa {order} · Grupos',
      'format.stage.knockout': 'Etapa {order} · Eliminatoria',
      'format.field.pointsTo': 'Puntos por set',
      'format.field.overtime': 'Prórroga',
      'format.field.overtimeYes': 'Sí (+2)',
      'format.field.overtimeNo': 'No',
      'format.field.pairs': 'Cruces',

      // Errores de la lista pegada (A3)
      'import.issue.nameEmpty': 'Sin nombre — se omite',
      'import.issue.nameTooShort': 'El nombre es demasiado corto',
      'import.issue.nameTooLong': 'El nombre supera los 50 caracteres',
      'import.issue.invalidGender': '«{token}» no es un género reconocido',
      'import.issue.invalidLevel': '«{token}» no es un nivel (1-5)',
      'import.issue.tooManyColumns': 'La línea tiene {count} columnas, se esperan 3',
      'import.issue.unclosedQuote': 'Comilla sin cerrar',
      'import.issue.mixedDelimiter': 'Separador distinto al del resto',
      'import.issue.playerLimitExceeded': 'Superarías el máximo de {maxPlayers} jugadores',
      'import.issue.emptyBatch': 'No hay nada que importar',

      // Shell y palabras comunes
      'app.toggleLanguage': 'Cambiar idioma',
      'app.screenPending': 'Pantalla pendiente en esta fase de la reconstrucción.',
      'common.yes': 'Sí',
      'common.no': 'No',
      'common.minutesShort': 'min',
      'common.hoursShort': 'h',

      // Bracket: huecos sin resolver (C4)
      'bracket.slot.group': '{rank}º del grupo {group}',
      'bracket.slot.winner': 'Ganador de {stage}{n}',
      'bracket.stage.qf': 'CF',
      'bracket.stage.sf': 'SF',
      'bracket.stage.final': 'Final',

      // Estados que bloquean una pantalla o una acción
      'workspace.readiness.firebaseConnected': 'Sin conexión: el torneo se guarda solo en este teléfono',
      'workspace.readiness.noUnmatched': 'Hay jugadores sin pareja',
      'workspace.overlay.blocked.readOnly': 'Solo lectura: no puedes anotar este torneo',
      'workspace.overlay.blocked.noTournament': 'Todavía no hay torneo',
      'workspace.overlay.blocked.noRevisions': 'Este partido no tiene cambios que mostrar',
      'workspace.overlay.blocked.alreadyScoring': 'Ya puedes anotar este torneo',
      'workspace.overlay.blocked.ownerOnly': 'Solo el organizador gestiona los anotadores',
      'workspace.overlay.blocked.noSession': 'Este torneo no se ha compartido todavía',
      'workspace.overlay.blocked.modeChosen': 'Ya elegiste cómo jugar',
      'workspace.overlay.blocked.tournamentRunning': 'El torneo ya empezó',
      'workspace.overlay.blocked.noPlayers': 'Todavía no hay jugadores',
      'workspace.overlay.blocked.noTeams': 'Todavía no hay parejas',

      // Claves que antes compartían texto con otra pantalla
      'access.requestShort': 'Pedir acceso',
      'nav.goToTeams': 'Ir a Equipos',
      'nav.goToResults': 'Ver resultados',
      'players.levelShort': 'N{level}',
      'workspace.tournament.tab.today': 'Hoy',
      'workspace.tournament.tab.groups': 'Grupos',
      'workspace.tournament.tab.bracket': 'Bracket',
      'tournament.groupCount.one': '1 grupo',
      'tournament.groupCount.many': '{count} grupos',
      'import.issue.ambiguousM': '«M» se interpretó como mujer, según el idioma',

      // Historial de cambios (H1, H2, H3, H5)
      'history.menuLabel': 'Opciones del torneo',
      'tournament.reset': 'Reiniciar torneo',
      'tournament.confirmReset': '¿Seguro que quieres reiniciar el torneo? Se borran los resultados y el link deja de funcionar.',
      'history.records': 'registros',
      'history.today': 'Hoy',
      'history.yesterday': 'Ayer',
      'history.dayUnknown': 'Sin fecha',
      'history.justNow': 'hace un momento',
      'history.minutesAgo': 'hace {count} min',
      'history.unknownTime': 'sin hora',
      'history.unknownMatch': 'Partido',
      'history.unknownAuthor': 'anotador desconocido',
      'history.you': 'Tú',
      'history.youOrganiser': 'Tú (organizador)',
      'history.ownerSuffix': '{name} — Organizador',
      'history.action.created': 'Resultado registrado',
      'history.action.edited': 'Corrección',
      'history.action.conflictResolved': 'Conflicto resuelto',
      'history.action.unknown': 'Último cambio',
      'history.filter.all': 'Todo',
      'history.filter.created': 'Nuevos',
      'history.filter.edited': 'Ediciones',
      'history.filter.conflictResolved': 'Conflictos',
      'history.noneOfThisKind': 'No hay registros de este tipo',
      'history.emptyTitle': 'Aún no hay cambios',
      'history.emptyText': 'Cuando alguien registre o corrija un resultado, aparecerá aquí con su nombre y la hora.',
      'history.localTitle': 'Este torneo es solo tuyo',
      'history.localText': 'El historial guarda quién cambió cada resultado, y eso solo existe cuando compartes el torneo.',
      'history.legacy': 'Este torneo empezó antes del historial. Solo se conserva el último cambio de cada partido.',
      'history.offline': 'Sin conexión — puede faltar lo más reciente',
      'history.matchTitle': 'Historial del partido',
      'history.matchEmptyTitle': 'Sin cambios registrados',
      'history.matchEmptyText': 'Este resultado se guardó antes de que existiera el historial, o el torneo no está compartido.',
      'history.current': 'Resultado actual',
      'history.revision': 'rev {n}',
      'history.savedBy': 'Guardado por',
      'history.timeline': 'Línea de tiempo',
      'history.conflictKept': 'se quedó esta versión',
      'history.fullTitle': 'Historial de cambios',

      // Todos los partidos y su buscador (C6)
      'matches.title': 'Todos los partidos',
      'matches.progress': '{played} de {total} jugados',
      'matches.search': 'Buscar por jugador, equipo o grupo',
      'matches.clear': 'Borrar la búsqueda',
      'matches.results': '{count} de {total} partidos',
      'matches.noneTitle': 'Ningún partido coincide',
      'matches.noneText': 'Prueba con el nombre de un jugador, de una pareja o de un grupo.',
      'matches.finished': 'Terminados',
      'matches.resultsLabel': 'Resultados',
}
  };

  var currentLang = 'es';

  // Storage can throw when privacy settings block it or the quota is full.
  // Language remains a session-only preference in that case, just like the
  // application state helpers treat an unavailable storage backend.
  function readStoredLanguage() {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function persistLanguage(lang) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(STORAGE_KEY, lang);
      return true;
    } catch (error) {
      return false;
    }
  }

  function detectLanguage() {
    var stored = readStoredLanguage();
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

  /** t() with the caller's own wording as the fallback, which is what every
   * screen wants: the redesign's copy reads at the call site, translated. */
  translate = function (key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
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
    persistLanguage(lang);
    document.documentElement.lang = lang;
    applyTranslations();
    updateSwitcherButtons();
    // Notify the orchestrator to re-render dynamic content
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
