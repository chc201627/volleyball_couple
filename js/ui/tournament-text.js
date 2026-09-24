/** How a tournament is named on screen: the team, the match, the score and what the
 * score means. Four screens had their own copy of these four answers. */
/* exported TournamentText */
var TournamentText;

(function () {
  'use strict';

  var VERSUS = '  vs  ';
  var SLOT_TOKEN = /^slot:([A-Z])(\d+)$/;
  var WINNER_TOKEN = /^winner:k-([a-z][a-z0-9]{0,11})-(\d+)$/;

  function tr(key, fallback, params) {
    if (typeof translate === 'function') {
      return translate(key, fallback, params);
    }
    var str = fallback || key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return str;
  }

  function slotLabel(token) {
    var slot = SLOT_TOKEN.exec(token || '');
    if (slot) {
      return tr('bracket.slot.group', slot[2] + 'º del grupo ' + slot[1],
        { rank: slot[2], group: slot[1] });
    }
    var winner = WINNER_TOKEN.exec(token || '');
    if (winner) {
      var stage = tr('bracket.stage.' + winner[1], winner[1].toUpperCase());
      return tr('bracket.slot.winner', 'Ganador de ' + stage + winner[2],
        { stage: stage, n: winner[2] });
    }
    return token;
  }

  function isSlotDescriptor(token) {
    return typeof token === 'string' && (SLOT_TOKEN.test(token) || WINNER_TOKEN.test(token));
  }

  function teamsOf(tournament) {
    return (tournament && tournament.teams) || [];
  }

  /** Resolves registered teams or localized slot descriptors. Falls back to String(id)
   * or '' when missing. */
  function teamName(tournament, teamId) {
    if (!teamId) return '';
    var team = teamsOf(tournament).filter(function (item) { return item.id === teamId; })[0];
    if (team) return team.name;
    if (isSlotDescriptor(teamId)) return slotLabel(teamId);
    return String(teamId);
  }

  function findMatch(tournament, matchId) {
    return ((tournament && tournament.matches) || []).filter(function (item) {
      return item.id === matchId;
    })[0] || null;
  }

  /** Takes anything carrying `team1Id`/`team2Id` or slots — a raw match or a day view. */
  function matchTitle(tournament, match) {
    if (!match) return '';
    var t1 = match.team1Id || match.team1Slot;
    var t2 = match.team2Id || match.team2Slot;
    if (!t1 && !t2) return '';
    return teamName(tournament, t1) + VERSUS + teamName(tournament, t2);
  }

  function matchTitleById(tournament, matchId, fallback) {
    var match = findMatch(tournament, matchId);
    return match ? matchTitle(tournament, match) : (fallback || '');
  }

  function score(view) {
    if (!view || view.status === 'pending') return '—';
    return view.score1 + ' – ' + view.score2;
  }

  /** The tone every match row and score chip agrees on: in play, decided, or
   * neither. */
  function scoreTone(view) {
    if (!view) return null;
    if (view.status === 'live') return 'warn';
    if (view.status === 'finished') return 'ok';
    return null;
  }

  TournamentText = {
    slotLabel: slotLabel,
    teamName: teamName,
    findMatch: findMatch,
    matchTitle: matchTitle,
    matchTitleById: matchTitleById,
    score: score,
    scoreTone: scoreTone,
  };
})();
