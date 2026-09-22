/** Application state: the roster, the setup configuration, the generated teams
 * and their persistence.
 *
 * This is the half of v1's app.js that was worth keeping — state and storage,
 * with none of the rendering. It touches no DOM, so it is testable headless
 * like the domain modules around it.
 *
 * STORAGE COMPATIBILITY: the three localStorage keys are carried over from
 * v1.9.1 unchanged (`bv-players`, `bv-tournament`, `bv-king`). Anyone opening
 * the redesign on the phone they already used keeps their roster and their
 * running tournament. Changing the keys would have silently wiped both.
 */
/* exported AppState */
var AppState;
(function () {
  'use strict';

  var KEYS = {
    players: 'bv-players',
    tournament: 'bv-tournament',
    king: 'bv-king',
    // New in v2: remembered so the organiser types their name once, ever.
    ownerLabel: 'bv-owner-label',
  };
  var VALID_LEVELS = [1, 2, 3];
  var VALID_GENDERS = ['male', 'female', 'unspecified'];

  /** Storage can throw: Safari private mode, a full quota, a disabled origin.
   * None of those may take the app down, so every access is guarded and a
   * failure degrades to "this session is not persisted" rather than a crash. */
  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeKey(key) {
    try { localStorage.removeItem(key); } catch (error) { /* nothing to undo */ }
  }

  function isValidLevel(level) {
    return VALID_LEVELS.indexOf(Number(level)) !== -1;
  }

  /** Product invariant carried over verbatim: ids are `Date.now() + Math.random()`.
   * Kept because existing rosters in localStorage and in shared Firebase
   * sessions already hold ids of this shape, and tournament matches key off
   * them. */
  function createPlayer(input) {
    var player = {
      id: Date.now() + Math.random(),
      name: String(input.name || '').trim(),
      gender: VALID_GENDERS.indexOf(input.gender) !== -1 ? input.gender : 'unspecified',
    };
    // Level is optional and OMITTED when unset — never written as undefined or
    // null. Firebase set() rejects undefined, and omission keeps the balancing
    // pass's typeof check simple.
    if (input.level != null && input.level !== '' && isValidLevel(input.level)) {
      player.level = Number(input.level);
    }
    return player;
  }

  /** Mirrors pairing.js's own classification so a manually fixed pair is
   * labelled the same way a generated one is. */
  function teamTypeOf(members) {
    var genders = members.map(function (player) {
      return player.gender === 'male' || player.gender === 'female' ? player.gender : 'unspecified';
    });
    var distinct = genders.filter(function (gender, index) { return genders.indexOf(gender) === index; });
    return distinct.length > 1 ? 'mixed' : 'same';
  }

  /** Both shapes on every team, so no consumer has to branch. `player1`/
   * `player2` stay for the tournament and repository codecs, which already
   * read them. */
  function normaliseTeam(team) {
    var members = team.players || [team.player1, team.player2].filter(Boolean);
    return {
      players: members,
      player1: members[0] || null,
      player2: members[1] || null,
      type: team.type || teamTypeOf(members),
    };
  }

  function create(options) {
    options = options || {};

    var state = {
      players: [],
      teams: null,
      tournament: null,
      king: null,
      session: null,
      ownerLabel: '',
      unmatched: [],
      teamSize: 2,
      pairingMode: 'random',
      groupCount: 1,
      formatPreset: 'classic',
      manualPairs: [],
      lastImport: null,
    };

    var listeners = [];

    function emit() {
      listeners.slice().forEach(function (listener) { listener(snapshot()); });
    }

    function snapshot() {
      return {
        players: state.players.slice(),
        teams: state.teams ? state.teams.slice() : null,
        tournament: state.tournament,
        king: state.king,
        session: state.session,
        ownerLabel: state.ownerLabel,
        unmatched: state.unmatched.slice(),
        teamSize: state.teamSize,
        pairingMode: state.pairingMode,
        groupCount: state.groupCount,
        formatPreset: state.formatPreset,
        manualPairs: state.manualPairs.slice(),
        lastImport: state.lastImport,
        counts: counts(),
      };
    }

    function counts() {
      var result = { total: state.players.length, male: 0, female: 0, unspecified: 0 };
      state.players.forEach(function (player) {
        if (player.gender === 'male') result.male += 1;
        else if (player.gender === 'female') result.female += 1;
        else result.unspecified += 1;
      });
      return result;
    }

    function persistPlayers() {
      writeJSON(KEYS.players, state.players);
    }

    /** Any roster change invalidates the generated teams: a tournament built
     * from a roster that has since changed is the kind of quiet inconsistency
     * that only shows up mid-match. */
    function mutateRoster(mutator) {
      mutator(state.players);
      state.teams = null;
      state.unmatched = [];
      state.manualPairs = state.manualPairs.filter(function (pair) {
        return pair.every(function (id) {
          return state.players.some(function (player) { return player.id === id; });
        });
      });
      persistPlayers();
      emit();
    }

    return {
      subscribe: function (listener) {
        listeners.push(listener);
        listener(snapshot());
        return function () {
          listeners = listeners.filter(function (item) { return item !== listener; });
        };
      },

      get: snapshot,

      load: function () {
        var stored = readJSON(KEYS.players);
        if (Array.isArray(stored)) {
          // Stored rosters predate this module and may carry levels outside
          // 1|2|3 or a missing gender; normalise on the way in rather than
          // letting every consumer re-check.
          state.players = stored.filter(function (player) {
            return player && typeof player.name === 'string' && player.name.length > 0;
          }).map(function (player) {
            var normalised = {
              id: player.id,
              name: player.name,
              gender: VALID_GENDERS.indexOf(player.gender) !== -1 ? player.gender : 'unspecified',
            };
            if (isValidLevel(player.level)) normalised.level = Number(player.level);
            return normalised;
          });
        }
        state.tournament = readJSON(KEYS.tournament);
        state.king = readJSON(KEYS.king);
        var storedLabel = readJSON(KEYS.ownerLabel);
        if (typeof storedLabel === 'string') state.ownerLabel = storedLabel;
        // A restored tournament implies teams existed; without this the nav
        // locks Teams and Tournament after a reload even though a real
        // tournament is running.
        if (state.tournament && state.tournament.teams && !state.teams) {
          state.teams = state.tournament.teams.map(normaliseTeam);
        }
        emit();
        return snapshot();
      },

      addPlayer: function (input) {
        var player = createPlayer(input);
        if (!player.name) return { ok: false, reason: 'nameRequired' };
        // Duplicate names are allowed by REQ-VAL-06 and deliberately not
        // rejected here — two people called Carlos is a normal Saturday.
        mutateRoster(function (roster) { roster.push(player); });
        return { ok: true, player: player };
      },

      addPlayers: function (inputs) {
        var added = (inputs || []).map(createPlayer).filter(function (player) { return !!player.name; });
        if (!added.length) return { ok: false, reason: 'empty' };
        mutateRoster(function (roster) { roster.push.apply(roster, added); });
        state.lastImport = added.map(function (player) { return player.id; });
        emit();
        return { ok: true, added: added };
      },

      undoImport: function () {
        if (!state.lastImport || !state.lastImport.length) return { ok: false };
        var ids = state.lastImport;
        state.lastImport = null;
        mutateRoster(function (roster) {
          for (var i = roster.length - 1; i >= 0; i--) {
            if (ids.indexOf(roster[i].id) !== -1) roster.splice(i, 1);
          }
        });
        return { ok: true, removed: ids.length };
      },

      clearImportMark: function () {
        state.lastImport = null;
        emit();
      },

      removePlayer: function (id) {
        var index = state.players.findIndex(function (player) { return player.id === id; });
        if (index === -1) return { ok: false };
        mutateRoster(function (roster) { roster.splice(index, 1); });
        return { ok: true };
      },

      clearPlayers: function () {
        mutateRoster(function (roster) { roster.length = 0; });
        removeKey(KEYS.players);
        return { ok: true };
      },

      setConfig: function (patch) {
        var changed = false;
        if (patch.teamSize && patch.teamSize !== state.teamSize) {
          state.teamSize = patch.teamSize; changed = true;
        }
        if (patch.pairingMode && patch.pairingMode !== state.pairingMode) {
          state.pairingMode = patch.pairingMode; changed = true;
        }
        if (patch.groupCount && patch.groupCount !== state.groupCount) {
          state.groupCount = patch.groupCount; changed = true;
        }
        if (patch.formatPreset && patch.formatPreset !== state.formatPreset) {
          state.formatPreset = patch.formatPreset; changed = true;
        }
        // Changing the team size invalidates existing teams: 2v2 pairs are not
        // 3v3 teams, and silently keeping them would start a tournament with
        // the wrong shape.
        if (patch.teamSize && state.teams) { state.teams = null; state.unmatched = []; }
        if (changed) emit();
        return snapshot();
      },

      setManualPairs: function (pairs) {
        state.manualPairs = (pairs || []).slice();
        emit();
        return snapshot();
      },

      /** Delegates to pairing.js, which stays the single implementation of the
       * matching rules — including the same-gender swap pass that balances
       * levels. This module only decides what to feed it and what to keep.
       *
       * Teams are normalised to carry BOTH `players` and `player1`/`player2`.
       * pairing.js returns two different shapes (generateTeams gives `players`,
       * generateCouples gives `player1`/`player2`) and v1 spread
       * `team.players || [team.player1, team.player2]` across a dozen call
       * sites to paper over it. Normalising once here removes that fork. */
      generateTeams: function () {
        if (state.players.length < state.teamSize * 2) {
          return { ok: false, reason: 'notEnoughPlayers' };
        }

        // Manually fixed pairs are honoured first, then the rest is filled at
        // random from whoever is left — the behaviour v1 implemented inside its
        // confirm handler.
        var fixed = [];
        var takenIds = {};
        if (state.pairingMode === 'manual' && state.manualPairs.length) {
          state.manualPairs.forEach(function (pair) {
            var members = pair.map(function (id) {
              return state.players.filter(function (player) { return player.id === id; })[0];
            }).filter(Boolean);
            if (members.length !== state.teamSize) return;
            members.forEach(function (player) { takenIds[player.id] = true; });
            fixed.push(normaliseTeam({ players: members, type: teamTypeOf(members) }));
          });
        }

        var remaining = state.players.filter(function (player) { return !takenIds[player.id]; });
        var generated = generateTeams(remaining, state.teamSize);

        state.teams = fixed.concat((generated.teams || []).map(normaliseTeam));
        state.unmatched = generated.unmatched || [];
        emit();
        return { ok: true, teams: state.teams, unmatched: state.unmatched };
      },

      hasTeams: function () { return Array.isArray(state.teams) && state.teams.length > 0; },

      /* --- Tournament ---------------------------------------------------- */

      /** Builds the tournament and, when a repository is available, publishes
       * it in the same step. v1 did the same: the share link exists from the
       * moment the tournament starts, not from the moment someone remembers to
       * press Share. A tournament is played in one afternoon; asking people to
       * publish it as a separate errand is how a session ends up local-only
       * with three phones typing the same scores.
       *
       * `ownerLabel` is optional and falls back to "Organizador" in the
       * history. It is stored so the next tournament pre-fills it. */
      startTournament: function (options) {
        options = options || {};
        if (!state.teams || state.teams.length < 2) return { ok: false, reason: 'notEnoughTeams' };

        var teams = createTeams({ teams: state.teams });
        var groups = createGroups(teams, state.groupCount);

        var format = null;
        try {
          format = presetFormat(state.formatPreset, groups);
        } catch (error) {
          return { ok: false, reason: 'presetUnavailable' };
        }
        if (format) {
          var validation = validateFormat(format, groups);
          if (!validation.valid) return { ok: false, reason: 'invalidFormat', errors: validation.errors };
        }

        var tournament = {
          teams: teams,
          groups: groups,
          matches: generateStageMatches(format, groups),
          players: state.players.slice(),
        };
        // Classic carries no format at all (D1) — omitting the key keeps a
        // classic tournament byte-identical to what v1 wrote.
        if (format) tournament.format = format;

        state.tournament = tournament;
        writeJSON(KEYS.tournament, tournament);

        if (options.ownerLabel) {
          state.ownerLabel = String(options.ownerLabel).slice(0, 50);
          writeJSON(KEYS.ownerLabel, state.ownerLabel);
        }

        emit();
        return { ok: true, tournament: tournament, ownerLabel: state.ownerLabel };
      },

      /** Applies a result locally and returns the command the repository needs
       * to publish it. The local write happens first and unconditionally: the
       * court does not wait for the network, and a save that only lands when
       * the signal returns is still a save. The orchestrator publishes
       * afterwards and reports back what the server said. */
      applyResult: function (matchId, score1, score2, status) {
        if (!state.tournament) return { ok: false, reason: 'noTournament' };
        var match = state.tournament.matches.filter(function (item) { return item.id === matchId; })[0];
        if (!match) return { ok: false, reason: 'unknownMatch' };

        var expectedRevision = match.revision || 0;
        var resultMap = {};
        state.tournament.matches.forEach(function (item) {
          if (item.status && item.status !== 'pending') resultMap[item.id] = item;
        });
        resultMap[matchId] = {
          id: matchId,
          score1: score1,
          score2: score2,
          status: status,
          revision: expectedRevision + 1,
          updatedBy: match.updatedBy || null,
          updatedAt: match.updatedAt || null,
        };

        state.tournament = Object.assign({}, state.tournament, {
          matches: projectMatchResults(state.tournament.matches, resultMap),
        });
        writeJSON(KEYS.tournament, state.tournament);
        emit();

        return {
          ok: true,
          command: {
            matchId: matchId,
            score1: score1,
            score2: score2,
            status: status,
            expectedRevision: expectedRevision,
          },
        };
      },

      /** Replaces the local copy with what the server actually holds. Used when
       * a save loses a race: the conflict card offers both values and this is
       * how the server's version is taken. */
      adoptResult: function (matchId, result) {
        if (!state.tournament || !result) return { ok: false };
        var resultMap = {};
        state.tournament.matches.forEach(function (item) {
          if (item.status && item.status !== 'pending') resultMap[item.id] = item;
        });
        resultMap[matchId] = Object.assign({ id: matchId }, result);
        state.tournament = Object.assign({}, state.tournament, {
          matches: projectMatchResults(state.tournament.matches, resultMap),
        });
        writeJSON(KEYS.tournament, state.tournament);
        emit();
        return { ok: true };
      },

      /** Takes over the tournament from a shared session.
       *
       * The remote copy wins outright rather than being merged: the session is
       * the authority for a shared tournament, and a local edit that survived a
       * merge would be a result nobody else can see. The local copy is still
       * written to storage so the link keeps working with no signal.
       *
       * A legacy (schema v1) or unreadable session carries no tournament; the
       * session state is recorded either way so the screens can explain it
       * instead of rendering an empty destination. */
      adoptSession: function (sessionId, snapshot) {
        if (!snapshot) {
          state.session = { id: sessionId, state: 'notFound', role: 'spectator', accessStatus: null, requests: null, connection: 'offline', legacy: false };
          emit();
          return snapshot;
        }

        state.session = {
          id: sessionId,
          state: snapshot.error ? 'unsupported' : 'ok',
          role: snapshot.role || 'spectator',
          accessStatus: snapshot.accessStatus || null,
          requests: snapshot.requests || null,
          connection: snapshot.connection || 'online',
          authState: snapshot.authState || 'pending',
          legacy: !!snapshot.legacy,
          schemaVersion: snapshot.schemaVersion,
          ownerUid: snapshot.ownerUid || null,
          viewerUid: snapshot.viewerUid || null,
        };

        if (snapshot.tournament) {
          state.tournament = snapshot.tournament;
          state.teams = (snapshot.tournament.teams || []).map(normaliseTeam);
          writeJSON(KEYS.tournament, state.tournament);
        }
        emit();
        return snapshot;
      },

      clearSession: function () {
        state.session = null;
        emit();
      },

      resetTournament: function () {
        state.tournament = null;
        removeKey(KEYS.tournament);
        emit();
        return { ok: true };
      },

      /* --- King of the Court --------------------------------------------- */

      /** Local only, exactly as in v1: King never created a Firebase session.
       * Nothing about it is shared, so there is no session and no history. */
      startKing: function (options) {
        options = options || {};
        if (!state.teams || state.teams.length < 2) return { ok: false, reason: 'notEnoughTeams' };
        var teams = createTeams({ teams: state.teams });
        try {
          state.king = createKingGame(teams, options.winCondition || 'consecutive', options.target || 5);
        } catch (error) {
          return { ok: false, reason: 'notEnoughTeams' };
        }
        writeJSON(KEYS.king, state.king);
        emit();
        return { ok: true, king: state.king };
      },

      setKing: function (king) {
        state.king = king;
        writeJSON(KEYS.king, king);
        emit();
      },

      resetKing: function () {
        state.king = null;
        removeKey(KEYS.king);
        emit();
        return { ok: true };
      },

      storage: {
        keys: KEYS,
        readTournament: function () { return readJSON(KEYS.tournament); },
        writeTournament: function (value) { return writeJSON(KEYS.tournament, value); },
        clearTournament: function () { removeKey(KEYS.tournament); },
        readKing: function () { return readJSON(KEYS.king); },
        writeKing: function (value) { return writeJSON(KEYS.king, value); },
        clearKing: function () { removeKey(KEYS.king); },
      },
    };
  }

  AppState = { create: create, KEYS: KEYS, isValidLevel: isValidLevel };
})();
