/** In-memory adapter for the framework-agnostic TournamentRepository seam. */
/* exported createInMemoryTournamentRepository, createFirebaseTournamentRepository */
var createInMemoryTournamentRepository, createFirebaseTournamentRepository;
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
  function toIdMap(items, encode) {
    var result = {};
    (items || []).forEach(function (item) { result[item.id] = encode ? encode(item) : clone(item); });
    return result;
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
  /** Format node under `structure/format` never stores `pairs` (D3) — knockout pairings
   * live on the generated match nodes, not the persisted format. Empty `customRules` is
   * OMITTED, never written as an empty string, null, or undefined. */
  function encodeFormat(format) {
    if (!format) return null;
    var stagesById = {};
    Object.keys(format.stagesById || {}).forEach(function (id) {
      var stage = format.stagesById[id];
      stagesById[id] = {
        id: stage.id, kind: stage.kind, order: stage.order,
        pointsTo: stage.pointsTo, overtime: !!stage.overtime,
      };
    });
    var encoded = { version: format.version, preset: format.preset, stagesById: stagesById };
    if (format.customRules != null && String(format.customRules).length > 0) {
      encoded.customRules = String(format.customRules);
    }
    return encoded;
  }
  /** Mirrors encodeFormat's shape (stagesById kept as an id-keyed map, matching every
   * tournament-format.js consumer: resolveFormat/rulesForMatch/isValidToken all do keyed
   * `stagesById[id]` lookups, never array indexing).
   *
   * HOTFIX (v1.8.1): `pairs` is intentionally never persisted (D3), but
   * `isValidToken()`'s `winner:` branch reads `srcStage.pairs.length` to bound-check the
   * ordinal, and `validateFormat()` requires every knockout stage to carry `pairs`. Both
   * ran against the decoded (post-Firebase-sync) format with `pairs` permanently
   * `undefined`, so every `winner:k-<stage>-<n>` token failed validation and
   * `resolveFormat()` marked every stage after the first knockout stage `invalid` for any
   * tournament that had round-tripped through a shared session. Knockout match team1Id/
   * team2Id are never mutated after creation (generateStageMatches writes the slot-descriptor
   * tokens once; resolveFormat only ever computes a projection, it never writes back onto the
   * match), so the original `pairs` for a stage can always be rebuilt by reading those tokens
   * back off that stage's decoded match nodes, ordered by the ordinal encoded in the match id
   * (`k-<stageId>-<n>`). This restores the engine invariant "a runtime format always carries
   * pairs" without persisting pairs to Firebase or touching firebase-rules.json. */
  function rehydratePairs(stageId, matches) {
    var prefix = 'k-' + stageId + '-';
    return (matches || [])
      .filter(function (m) {
        return !!m && m.stageId === stageId && typeof m.id === 'string' && m.id.indexOf(prefix) === 0;
      })
      .map(function (m) {
        return { ordinal: Number(m.id.slice(prefix.length)), pair: [m.team1Id, m.team2Id] };
      })
      .filter(function (item) { return Number.isInteger(item.ordinal) && item.ordinal >= 1; })
      .sort(function (a, b) { return a.ordinal - b.ordinal; })
      .map(function (item) { return item.pair; });
  }
  function decodeFormat(stored, matches) {
    if (!stored) return null;
    var stagesById = {};
    Object.keys(stored.stagesById || {}).forEach(function (id) {
      var stage = stored.stagesById[id];
      var decoded = {
        id: stage.id, kind: stage.kind, order: stage.order,
        pointsTo: stage.pointsTo, overtime: !!stage.overtime,
      };
      if (stage.kind === 'knockout') decoded.pairs = rehydratePairs(id, matches);
      stagesById[id] = decoded;
    });
    var format = { version: stored.version, preset: stored.preset, stagesById: stagesById };
    if (stored.customRules != null) format.customRules = stored.customRules;
    return format;
  }
  /** A v3 session's format MUST decode into a well-formed stage map, or decodeSession fails
   * closed with 'unsupported-schema' (design: "v3 requires a decodable format"). */
  function isDecodableFormat(stored) {
    if (!stored || typeof stored !== 'object') return false;
    if (stored.version !== 1 || typeof stored.preset !== 'string') return false;
    var stagesById = stored.stagesById;
    if (!stagesById || typeof stagesById !== 'object') return false;
    var ids = Object.keys(stagesById);
    if (ids.length < 1) return false;
    return ids.every(function (id) {
      var stage = stagesById[id];
      return !!stage && stage.id === id && typeof stage.kind === 'string' &&
        Number.isInteger(stage.order) && Number.isInteger(stage.pointsTo) && typeof stage.overtime === 'boolean';
    });
  }
  function encodeStructure(tournament) {
    var players = collectPlayers(tournament);
    var structure = {
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
      matchesById: toIdMap(tournament.matches, function (match) {
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
    if (tournament.format) structure.format = encodeFormat(tournament.format);
    return structure;
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
    var matches = values(structure.matchesById).sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
    return {
      players: players,
      teams: teams,
      groups: groups,
      matches: projectMatchResults(matches, results || {}),
      format: decodeFormat(structure.format, matches),
    };
  }
  function decodeSession(session) {
    if (!session) return null;
    if (!session.schemaVersion || session.schemaVersion === 1) {
      return { schemaVersion: 1, legacy: true, tournament: clone(session.state) };
    }
    if (session.schemaVersion !== 2 && session.schemaVersion !== 3) {
      return { schemaVersion: session.schemaVersion, legacy: false, tournament: null, error: 'unsupported-schema' };
    }
    var structure = session.structure || {};
    if (session.schemaVersion === 3 && !isDecodableFormat(structure.format)) {
      return { schemaVersion: 3, legacy: false, tournament: null, error: 'unsupported-schema' };
    }
    return {
      schemaVersion: session.schemaVersion,
      legacy: false,
      tournament: decodeStructure(structure, session.results || {}),
    };
  }
  function validResult(command) {
    var liveOrFinished = command.status === 'live' || command.status === 'finished';
    var validScores = Number.isInteger(command.score1) && Number.isInteger(command.score2) && command.score1 >= 0 && command.score2 >= 0;
    return liveOrFinished && validScores &&
      (command.status !== 'finished' || command.score1 !== command.score2);
  }
  /** `created` on the first result for a match, `conflictResolved` when the command is
   * the user's answer to a losing race, `edited` otherwise. The distinction is what lets
   * the history separate "someone scored this" from "someone corrected it". */
  function historyAction(current, command) {
    if (!current) return 'created';
    if (command && command.afterConflict) return 'conflictResolved';
    return 'edited';
  }
  /** Author label is DENORMALIZED into every entry on purpose: the readable label lives
   * under `tournamentAccess/{sid}/members/{uid}/label`, whose .read is the owner or that
   * uid alone, so a spectator resolving authorship live would only ever see UIDs. Copying
   * it is also the truthful thing — the history is an immutable snapshot and the name at
   * the time of the edit is the correct one to show. */
  function historyEntry(command, revision, uid, authorLabel, action, timestamp) {
    return {
      score1: command.score1,
      score2: command.score2,
      status: command.status,
      revision: revision,
      updatedBy: uid,
      updatedAt: timestamp,
      authorLabel: String(authorLabel || 'Organizador').slice(0, 50),
      action: action,
    };
  }
  /** Flattens `{matchId: {revision: entry}}` into a newest-first list. Sorting on the
   * stored `revision` rather than the key keeps the order right even if a client ever
   * wrote an entry under a mismatched key. */
  function decodeHistory(raw) {
    var entries = [];
    Object.keys(raw || {}).forEach(function (matchId) {
      var byRevision = raw[matchId] || {};
      Object.keys(byRevision).forEach(function (key) {
        var entry = byRevision[key];
        if (!entry) return;
        entries.push({
          matchId: matchId,
          revision: entry.revision,
          score1: entry.score1,
          score2: entry.score2,
          status: entry.status,
          updatedBy: entry.updatedBy,
          updatedAt: entry.updatedAt,
          authorLabel: entry.authorLabel,
          action: entry.action,
        });
      });
    });
    entries.sort(function (a, b) {
      if (a.updatedAt !== b.updatedAt) return (b.updatedAt || 0) - (a.updatedAt || 0);
      return (b.revision || 0) - (a.revision || 0);
    });
    return entries;
  }
  createInMemoryTournamentRepository = function (options) {
    options = options || {};
    var runtime = options.runtime || { uid: options.uid || 'memory-device', authState: 'ready', connection: 'online' };
    if (!runtime.uid) runtime.uid = options.uid || 'memory-device';
    if (!runtime.authState) runtime.authState = 'ready';
    if (!runtime.connection) runtime.connection = 'online';
    var now = typeof options.now === 'function' ? options.now : Date.now;
    var sessions = clone(options.sessions || {});
    var watchers = {};
    var historyWatchers = {};
    var sequence = 0;
    function accessFor(session) {
      return session.access && session.access[runtime.uid] ? session.access[runtime.uid].status : null;
    }
    function snapshot(session) {
      var decoded = decodeSession(session);
      if (!decoded) return null;
      var owner = runtime.authState === 'ready' && session.ownerUid === runtime.uid;
      var ownAccess = runtime.authState === 'ready' ? (owner ? 'approved' : accessFor(session)) : null;
      return Object.assign(decoded, {
        authState: runtime.authState,
        connection: runtime.connection,
        role: owner ? 'owner' : (ownAccess === 'approved' ? 'scorer' : 'spectator'),
        accessStatus: ownAccess,
        requests: owner ? clone(session.access || {}) : null,
      });
    }
    function notify(sessionId) {
      var current = snapshot(sessions[sessionId]);
      (watchers[sessionId] || []).slice().forEach(function (listener) { listener(current); });
      var history = decodeHistory(sessions[sessionId] && sessions[sessionId].resultHistory);
      (historyWatchers[sessionId] || []).slice().forEach(function (listener) { listener(history); });
    }
    function authorLabelFor(session) {
      if (session.ownerUid === runtime.uid) return session.ownerLabel || 'Organizador';
      var member = session.access && session.access[runtime.uid];
      return (member && member.label) || 'Anotador';
    }
    return {
      createSession: function (tournament, options) {
        var sessionId = 'memory-' + (++sequence);
        var ownerLabel = options && options.ownerLabel;
        sessions[sessionId] = {
          schemaVersion: (tournament && tournament.format) ? 3 : 2,
          ownerUid: runtime.uid,
          createdAt: now(),
          structure: encodeStructure(tournament || {}),
          results: {},
          resultHistory: {},
          access: {},
        };
        if (ownerLabel) sessions[sessionId].ownerLabel = String(ownerLabel).slice(0, 50);
        notify(sessionId);
        return Promise.resolve({ sessionId: sessionId });
      },
      watchHistory: function (sessionId, onSnapshot) {
        if (!historyWatchers[sessionId]) historyWatchers[sessionId] = [];
        historyWatchers[sessionId].push(onSnapshot);
        onSnapshot(decodeHistory(sessions[sessionId] && sessions[sessionId].resultHistory));
        return function () {
          historyWatchers[sessionId] = (historyWatchers[sessionId] || []).filter(function (item) {
            return item !== onSnapshot;
          });
        };
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
        if (!session || (session.schemaVersion !== 2 && session.schemaVersion !== 3)) return Promise.resolve({ status: 'denied' });
        session.access = session.access || {};
        session.access[runtime.uid] = { label: String(label || ''), status: 'pending', requestedAt: now() };
        notify(sessionId);
        return Promise.resolve({ status: 'requested' });
      },
      setAccess: function (sessionId, memberId, status) {
        var session = sessions[sessionId];
        if (!session || session.ownerUid !== runtime.uid || (status !== 'approved' && status !== 'revoked')) return Promise.resolve({ status: 'denied' });
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
        if (runtime.authState !== 'ready') return Promise.resolve({ status: 'denied', reason: 'auth-pending' });
        if (runtime.connection !== 'online') return Promise.resolve({ status: 'offline' });
        var roleAllowed = session.ownerUid === runtime.uid || accessFor(session) === 'approved';
        if (!roleAllowed) return Promise.resolve({ status: 'denied' });
        var matchExists = values(session.structure.matchesById).some(function (match) { return match.id === command.matchId; });
        if (!matchExists || !validResult(command)) return Promise.resolve({ status: 'invalid' });
        var current = session.results[command.matchId] || null;
        var currentRevision = current ? current.revision : 0;
        if (command.expectedRevision !== currentRevision) {
          return Promise.resolve({ status: 'conflict', current: clone(current) });
        }
        var revision = currentRevision + 1;
        var timestamp = now();
        var result = {
          score1: command.score1,
          score2: command.score2,
          status: command.status,
          revision: revision,
          updatedBy: runtime.uid,
          updatedAt: timestamp,
        };
        // Result and history entry land together, mirroring the single multi-path
        // update the Firebase adapter performs — a history with holes would be worse
        // than no history at all.
        session.results[command.matchId] = result;
        session.resultHistory = session.resultHistory || {};
        session.resultHistory[command.matchId] = session.resultHistory[command.matchId] || {};
        session.resultHistory[command.matchId][revision] = historyEntry(
          command, revision, runtime.uid, authorLabelFor(session),
          historyAction(current, command), timestamp
        );
        notify(sessionId);
        // Same shape the Firebase adapter returns, `updatedAt` included: see the contract
        // note on its saveResult. Keeping the two adapters identical is what stops a
        // browser harness from passing on a field production never hands back.
        return Promise.resolve({ status: 'synced', result: { score1: result.score1, score2: result.score2, status: result.status, revision: revision, updatedBy: runtime.uid } });
      },
      removeSession: function (sessionId) {
        var session = sessions[sessionId];
        if (!session || session.ownerUid !== runtime.uid) return Promise.resolve({ status: 'denied' });
        delete sessions[sessionId];
        notify(sessionId);
        return Promise.resolve({ status: 'synced' });
      },
    };
  };

  function classify(error) {
    var code = String(error && (error.code || error.message) || '').toLowerCase();
    if (code.indexOf('permission') !== -1) return { status: 'denied', error: error };
    if (code.indexOf('network') !== -1 || code.indexOf('disconnect') !== -1 || code.indexOf('offline') !== -1) {
      return { status: 'offline', error: error };
    }
    return { status: 'invalid', error: error };
  }

  createFirebaseTournamentRepository = function (app) {
    var auth = app.auth();
    var db = app.database();
    var currentUser = auth.currentUser;
    var authState = currentUser ? 'ready' : 'pending';
    var connected = true;
    var signingIn = null;
    /** Per-session authorship cache filled by watchSession, so a save does not pay an
     * extra round trip to find out what name to stamp on the history entry. */
    var authorship = {};

    function requireUser() {
      if (auth.currentUser) { currentUser = auth.currentUser; authState = 'ready'; return Promise.resolve(currentUser); }
      if (!signingIn) {
        signingIn = auth.signInAnonymously().then(function (credential) {
          currentUser = credential.user; authState = 'ready'; signingIn = null; return currentUser;
        }).catch(function (error) { signingIn = null; throw error; });
      }
      return signingIn;
    }

    function joinedSnapshot(raw, access, requests) {
      var decoded = decodeSession(raw);
      if (!decoded) return null;
      var uid = currentUser && currentUser.uid;
      var owner = !!uid && raw.ownerUid === uid;
      var status = owner ? 'approved' : (access && access.status || null);
      return Object.assign(decoded, {
        authState: authState,
        connection: connected ? 'online' : 'offline',
        role: owner ? 'owner' : (status === 'approved' ? 'scorer' : 'spectator'),
        accessStatus: status,
        requests: owner ? (requests || {}) : null,
      });
    }

    function watchSession(sessionId, onSnapshot) {
      var raw = null, access = null, requests = null, ownRef = null, membersRef = null;
      var sessionRef = db.ref('tournaments/' + sessionId);
      var connectedRef = db.ref('.info/connected');
      function emit() { if (raw) onSnapshot(joinedSnapshot(raw, access, requests)); }
      function bindPrivate() {
        if (ownRef) ownRef.off();
        if (membersRef) membersRef.off();
        ownRef = membersRef = null; access = requests = null;
        if (!currentUser) { emit(); return; }
        ownRef = db.ref('tournamentAccess/' + sessionId + '/members/' + currentUser.uid);
        ownRef.on('value', function (snap) {
          access = snap.val();
          authorship[sessionId] = Object.assign({}, authorship[sessionId], { memberLabel: access && access.label });
          emit();
        }, function () { access = null; emit(); });
        if (raw && raw.ownerUid === currentUser.uid) {
          membersRef = db.ref('tournamentAccess/' + sessionId + '/members');
          membersRef.on('value', function (snap) { requests = snap.val() || {}; emit(); });
        }
      }
      var stopAuth = auth.onAuthStateChanged(function (user) {
        currentUser = user; authState = user ? 'ready' : 'pending'; bindPrivate();
        if (!user) requireUser().catch(function () { authState = 'error'; emit(); });
      });
      connectedRef.on('value', function (snap) { connected = snap.val() !== false; emit(); });
      sessionRef.on('value', function (snap) {
        raw = snap.val();
        authorship[sessionId] = Object.assign({}, authorship[sessionId], {
          ownerUid: raw && raw.ownerUid,
          ownerLabel: raw && raw.ownerLabel,
        });
        bindPrivate();
        emit();
      });
      return function () { sessionRef.off(); connectedRef.off(); if (ownRef) ownRef.off(); if (membersRef) membersRef.off(); stopAuth(); };
    }
    /** Cache first; the reads below only run when a save happens without an active
     * subscription. Both paths are readable by the writer: `ownerLabel` is public and a
     * member can always read its own entry. */
    function resolveAuthorLabel(sessionId, user) {
      var cached = authorship[sessionId] || {};
      if (cached.ownerUid === user.uid) return Promise.resolve(cached.ownerLabel || 'Organizador');
      if (cached.ownerUid && cached.memberLabel) return Promise.resolve(cached.memberLabel);
      return db.ref('tournaments/' + sessionId + '/ownerUid').once('value').then(function (snap) {
        if (snap.val() === user.uid) {
          return db.ref('tournaments/' + sessionId + '/ownerLabel').once('value')
            .then(function (label) { return label.val() || 'Organizador'; });
        }
        return db.ref('tournamentAccess/' + sessionId + '/members/' + user.uid + '/label').once('value')
          .then(function (label) { return label.val() || 'Anotador'; });
      }).catch(function () { return 'Anotador'; });
    }

    return {
      createSession: function (tournament, options) {
        return requireUser().then(function (user) {
          var sessionRef = db.ref('tournaments').push();
          var payload = {
            schemaVersion: (tournament && tournament.format) ? 3 : 2, ownerUid: user.uid, createdAt: { '.sv': 'timestamp' },
            structure: encodeStructure(tournament || {}),
          };
          // Written once, at creation: the session node's .write only allows create and
          // delete, so ownerLabel is immutable afterwards by construction.
          var ownerLabel = options && options.ownerLabel;
          if (ownerLabel) payload.ownerLabel = String(ownerLabel).slice(0, 50);
          return sessionRef.set(payload).then(function () { return { status: 'synced', sessionId: sessionRef.key }; });
        }).catch(classify);
      },
      watchSession: watchSession,
      watchHistory: function (sessionId, onSnapshot) {
        var ref = db.ref('tournaments/' + sessionId + '/resultHistory');
        ref.on('value', function (snap) { onSnapshot(decodeHistory(snap.val())); }, function () { onSnapshot([]); });
        return function () { ref.off(); };
      },
      requestAccess: function (sessionId, label) {
        return requireUser().then(function (user) {
          return db.ref('tournamentAccess/' + sessionId + '/members/' + user.uid).set({
            label: String(label || ''), status: 'pending', requestedAt: { '.sv': 'timestamp' },
          }).then(function () { return { status: 'requested' }; });
        }).catch(classify);
      },
      setAccess: function (sessionId, memberId, status) {
        if (status !== 'approved' && status !== 'revoked') return Promise.resolve({ status: 'invalid' });
        return requireUser().then(function () {
          return db.ref('tournamentAccess/' + sessionId + '/members/' + memberId).update({
            status: status, decidedAt: { '.sv': 'timestamp' },
          }).then(function () { return { status: 'synced' }; });
        }).catch(classify);
      },
      /** Multi-path update rather than a transaction: a transaction cannot atomically
       * touch a sibling node, so result and history could drift apart. Concurrency safety
       * is NOT lost — the rules already pin `revision` to stored + 1, so a device that
       * loses the race is rejected instead of overwriting.
       *
       * CONTRACT: `result` carries everything the client knows at write time and
       * deliberately OMITS `updatedAt`. The rules require `updatedAt === now` (server
       * clock), so the value is a `.sv` sentinel here and only exists once the server
       * resolves it. It arrives through `watchSession` on the decoded match, which is
       * where its only consumer reads it (tournament-day.js sorts recently-finished by
       * it). Reading it back would cost an extra round trip on the most
       * latency-sensitive action in the app, courtside, to hand back a value nobody
       * asks for synchronously. */
      saveResult: function (sessionId, command) {
        if (!validResult(command)) return Promise.resolve({ status: 'invalid' });
        if (!connected) return Promise.resolve({ status: 'offline' });
        return requireUser().then(function (user) {
          return resolveAuthorLabel(sessionId, user).then(function (authorLabel) {
            var base = 'tournaments/' + sessionId + '/';
            var revision = command.expectedRevision + 1;
            var result = {
              score1: command.score1, score2: command.score2, status: command.status,
              revision: revision, updatedBy: user.uid, updatedAt: { '.sv': 'timestamp' },
            };
            var action = historyAction(command.expectedRevision > 0 ? { revision: command.expectedRevision } : null, command);
            var payload = {};
            payload[base + 'results/' + command.matchId] = result;
            payload[base + 'resultHistory/' + command.matchId + '/' + revision] =
              historyEntry(command, revision, user.uid, authorLabel, action, { '.sv': 'timestamp' });
            return db.ref().update(payload).then(function () {
              // updatedAt stays unresolved here; the authoritative value arrives through
              // watchSession. No consumer reads it off this return value.
              return { status: 'synced', result: { score1: result.score1, score2: result.score2, status: result.status, revision: revision, updatedBy: user.uid } };
            }, function (error) {
              // Losing the race and lacking permission both surface as the same rejection,
              // so re-read the stored revision to tell them apart. The results node is
              // world-readable, so this read works even for a revoked scorer.
              return db.ref(base + 'results/' + command.matchId).once('value').then(function (snap) {
                var stored = snap.val();
                if ((stored ? stored.revision : 0) !== command.expectedRevision) {
                  return { status: 'conflict', current: clone(stored) };
                }
                throw error;
              }, function () { throw error; });
            });
          });
        }).catch(classify);
      },
      removeSession: function (sessionId) {
        return requireUser().then(function () {
          return db.ref('tournaments/' + sessionId).remove().then(function () { return { status: 'synced' }; });
        }).catch(classify);
      },
    };
  };
})();
