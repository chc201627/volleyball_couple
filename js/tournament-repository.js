/** In-memory adapter for the framework-agnostic TournamentRepository seam. */
/* exported createInMemoryTournamentRepository */
var createInMemoryTournamentRepository;
(function () {
  'use strict';
  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
  function toIndexedMap(items, prefix, encode) {
    var result = {};
    (items || []).forEach(function (item, index) {
      result[prefix + index] = encode ? encode(item) : clone(item);
    });
    return result;
  }
  function values(map) {
    return Object.keys(map || {}).map(function (key) { return clone(map[key]); });
  }
  function collectPlayers(tournament) {
    if (Array.isArray(tournament.players)) return tournament.players;
    var byId = {};
    (tournament.teams || []).forEach(function (team) {
      (team.players || [team.player1, team.player2]).filter(Boolean).forEach(function (player) {
        byId[player.id] = player;
      });
    });
    return Object.keys(byId).map(function (id) { return byId[id]; });
  }
  function encodeStructure(tournament) {
    var players = collectPlayers(tournament);
    return {
      playersById: toIndexedMap(players, 'p'),
      teamsById: toIndexedMap(tournament.teams, 't', function (team) {
        var encoded = clone(team);
        encoded.playerIds = (team.players || [team.player1, team.player2])
          .filter(Boolean).map(function (player) { return player.id; });
        delete encoded.players;
        delete encoded.player1;
        delete encoded.player2;
        return encoded;
      }),
      groupsById: toIndexedMap(tournament.groups, 'g', function (group) {
        return { id: group.id, teamIds: (group.teams || []).map(function (team) { return team.id; }) };
      }),
      matchesById: toIndexedMap(tournament.matches, 'm', function (match) {
        var structureMatch = clone(match);
        delete structureMatch.score1;
        delete structureMatch.score2;
        delete structureMatch.played;
        delete structureMatch.status;
        delete structureMatch.revision;
        delete structureMatch.updatedBy;
        delete structureMatch.updatedAt;
        return structureMatch;
      }),
    };
  }
  function decodeStructure(structure, results) {
    var players = values(structure.playersById);
    var playersById = {};
    players.forEach(function (player) { playersById[player.id] = player; });
    var teams = values(structure.teamsById).map(function (stored) {
      var team = clone(stored);
      var teamPlayers = (team.playerIds || []).map(function (id) { return playersById[id]; }).filter(Boolean);
      delete team.playerIds;
      team.players = teamPlayers;
      team.player1 = teamPlayers[0] || null;
      team.player2 = teamPlayers[1] || null;
      return team;
    });
    var teamsById = {};
    teams.forEach(function (team) { teamsById[team.id] = team; });
    var groups = values(structure.groupsById).map(function (stored) {
      return {
        id: stored.id,
        teams: (stored.teamIds || []).map(function (id) { return teamsById[id]; }).filter(Boolean),
      };
    });
    var matches = values(structure.matchesById);
    return {
      players: players,
      teams: teams,
      groups: groups,
      matches: projectMatchResults(matches, results || {}),
    };
  }
  function decodeSession(session) {
    if (!session) return null;
    if (!session.schemaVersion || session.schemaVersion === 1) {
      return { schemaVersion: 1, legacy: true, tournament: clone(session.state) };
    }
    if (session.schemaVersion !== 2) return null;
    return {
      schemaVersion: 2,
      legacy: false,
      tournament: decodeStructure(session.structure || {}, session.results || {}),
    };
  }
  function validResult(command) {
    var liveOrFinished = command.status === 'live' || command.status === 'finished';
    var validScores = Number.isInteger(command.score1) && Number.isInteger(command.score2) && command.score1 >= 0 && command.score2 >= 0;
    return liveOrFinished && validScores &&
      (command.status !== 'finished' || command.score1 !== command.score2);
  }
  createInMemoryTournamentRepository = function (options) {
    options = options || {};
    var uid = options.uid || 'memory-device';
    var now = typeof options.now === 'function' ? options.now : Date.now;
    var sessions = clone(options.sessions || {});
    var watchers = {};
    var sequence = 0;
    function accessFor(session) {
      return session.access && session.access[uid] ? session.access[uid].status : null;
    }
    function snapshot(session) {
      var decoded = decodeSession(session);
      if (!decoded) return null;
      var owner = session.ownerUid === uid;
      var ownAccess = owner ? 'approved' : accessFor(session);
      return Object.assign(decoded, {
        authState: 'ready',
        connection: 'online',
        role: owner ? 'owner' : (ownAccess === 'approved' ? 'scorer' : 'spectator'),
        accessStatus: ownAccess,
        requests: owner ? clone(session.access || {}) : null,
      });
    }
    function notify(sessionId) {
      var current = snapshot(sessions[sessionId]);
      (watchers[sessionId] || []).slice().forEach(function (listener) { listener(current); });
    }
    return {
      createSession: function (tournament) {
        var sessionId = 'memory-' + (++sequence);
        sessions[sessionId] = {
          schemaVersion: 2,
          ownerUid: uid,
          createdAt: now(),
          structure: encodeStructure(tournament || {}),
          results: {},
          access: {},
        };
        notify(sessionId);
        return Promise.resolve({ sessionId: sessionId });
      },
      watchSession: function (sessionId, onSnapshot) {
        if (!watchers[sessionId]) watchers[sessionId] = [];
        watchers[sessionId].push(onSnapshot);
        onSnapshot(snapshot(sessions[sessionId]));
        return function () {
          watchers[sessionId] = (watchers[sessionId] || []).filter(function (item) {
            return item !== onSnapshot;
          });
        };
      },
      requestAccess: function (sessionId, label) {
        var session = sessions[sessionId];
        if (!session || session.schemaVersion !== 2) return Promise.resolve({ status: 'denied' });
        session.access = session.access || {};
        session.access[uid] = { label: String(label || ''), status: 'pending', requestedAt: now() };
        notify(sessionId);
        return Promise.resolve({ status: 'requested' });
      },
      setAccess: function (sessionId, memberId, status) {
        var session = sessions[sessionId];
        if (!session || session.ownerUid !== uid || (status !== 'approved' && status !== 'revoked')) return Promise.resolve({ status: 'denied' });
        session.access = session.access || {};
        var previous = session.access[memberId] || {};
        session.access[memberId] = Object.assign({}, previous, { status: status, decidedAt: now() });
        notify(sessionId);
        return Promise.resolve({ status: 'synced' });
      },
      saveResult: function (sessionId, command) {
        var session = sessions[sessionId];
        if (!session) return Promise.resolve({ status: 'invalid', reason: 'session-not-found' });
        if (!session.schemaVersion || session.schemaVersion === 1) {
          return Promise.resolve({ status: 'denied', reason: 'legacy-read-only' });
        }
        var roleAllowed = session.ownerUid === uid || accessFor(session) === 'approved';
        if (!roleAllowed) return Promise.resolve({ status: 'denied' });
        var matchExists = values(session.structure.matchesById).some(function (match) { return match.id === command.matchId; });
        if (!matchExists || !validResult(command)) return Promise.resolve({ status: 'invalid' });
        var current = session.results[command.matchId] || null;
        var currentRevision = current ? current.revision : 0;
        if (command.expectedRevision !== currentRevision) {
          return Promise.resolve({ status: 'conflict', current: clone(current) });
        }
        var result = {
          score1: command.score1,
          score2: command.score2,
          status: command.status,
          revision: currentRevision + 1,
          updatedBy: uid,
          updatedAt: now(),
        };
        session.results[command.matchId] = result;
        notify(sessionId);
        return Promise.resolve({ status: 'synced', result: clone(result) });
      },
      removeSession: function (sessionId) {
        var session = sessions[sessionId];
        if (!session || session.ownerUid !== uid) return Promise.resolve({ status: 'denied' });
        delete sessions[sessionId];
        notify(sessionId);
        return Promise.resolve({ status: 'synced' });
      },
    };
  };
})();
