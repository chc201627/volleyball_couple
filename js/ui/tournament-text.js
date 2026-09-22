/** How a tournament is named on screen: the team, the match, the score and what the
 * score means. Four screens had their own copy of these four answers. */
/* exported TournamentText */
var TournamentText;

(function () {
  'use strict';

  var VERSUS = '  vs  ';

  function teamsOf(tournament) {
    return (tournament && tournament.teams) || [];
  }

  /** Falls back to the id rather than to nothing: an unresolved bracket slot is
   * still information, and a blank row is not. */
  function teamName(tournament, teamId) {
    var team = teamsOf(tournament).filter(function (item) { return item.id === teamId; })[0];
    return team ? team.name : teamId;
  }

  function findMatch(tournament, matchId) {
    return ((tournament && tournament.matches) || []).filter(function (item) {
      return item.id === matchId;
    })[0] || null;
  }

  /** Takes anything carrying `team1Id`/`team2Id` — a raw match or a day view. */
  function matchTitle(tournament, match) {
    if (!match) return '';
    return teamName(tournament, match.team1Id) + VERSUS + teamName(tournament, match.team2Id);
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
    teamName: teamName,
    findMatch: findMatch,
    matchTitle: matchTitle,
    matchTitleById: matchTitleById,
    score: score,
    scoreTone: scoreTone,
  };
})();
