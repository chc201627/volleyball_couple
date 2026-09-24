/** Durable, per-match score intents for shared tournaments. The small interface
 * keeps local persistence, coalescing and acknowledgement out of the UI and
 * Firebase adapters: callers enqueue an intent and flush it through saveResult. */
/* exported ResultSyncQueue */
var ResultSyncQueue;
(function () {
  'use strict';

  var STORAGE_KEY = 'bv-pending-result-writes';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function validCommand(command) {
    return command && typeof command.matchId === 'string' && command.matchId &&
      Number.isInteger(command.expectedRevision) && command.expectedRevision >= 0;
  }

  function create(options) {
    options = options || {};
    var storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var entries = {};

    function read() {
      if (!storage) return;
      try {
        var stored = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
        entries = stored && typeof stored === 'object' ? stored : {};
      } catch (error) {
        entries = {};
      }
    }

    function persist() {
      if (!storage) return false;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(entries));
        return true;
      } catch (error) {
        return false;
      }
    }

    function keyFor(sessionId, matchId) {
      return String(sessionId) + ':' + String(matchId);
    }

    function list(sessionId) {
      return Object.keys(entries).filter(function (key) {
        return entries[key] && entries[key].sessionId === sessionId;
      }).map(function (key) { return clone(entries[key]); });
    }

    function enqueue(sessionId, command) {
      if (!sessionId || !validCommand(command)) return null;
      var key = keyFor(sessionId, command.matchId);
      var previous = entries[key];
      // The first expected revision is the server baseline. Later local edits
      // replace the payload only; treating a provisional local revision as a
      // server revision would manufacture a conflict after reconnect.
      var expectedRevision = previous ? previous.command.expectedRevision : command.expectedRevision;
      var entry = {
        sessionId: sessionId,
        matchId: command.matchId,
        command: {
          matchId: command.matchId,
          score1: command.score1,
          score2: command.score2,
          status: command.status,
          expectedRevision: expectedRevision,
          afterConflict: !!command.afterConflict,
        },
        generation: previous ? previous.generation + 1 : 1,
        status: 'saving',
        conflict: null,
      };
      entries[key] = entry;
      persist();
      return clone(entry);
    }

    function acknowledge(entry) {
      if (!entry) return false;
      var key = keyFor(entry.sessionId, entry.matchId);
      var current = entries[key];
      // A save only confirms the exact intent it sent. A newer edit made while
      // the request was in flight stays durable and gets its own retry.
      if (!current || current.generation !== entry.generation) return false;
      delete entries[key];
      persist();
      return true;
    }

    function discard(sessionId, matchId) {
      var key = keyFor(sessionId, matchId);
      if (!entries[key]) return false;
      delete entries[key];
      persist();
      return true;
    }

    function recordOutcome(entry, outcome) {
      var key = keyFor(entry.sessionId, entry.matchId);
      var current = entries[key];
      if (!current || current.generation !== entry.generation) return;
      current.status = outcome && outcome.status || 'offline';
      current.conflict = outcome && outcome.status === 'conflict' ? clone(outcome.current) : null;
      persist();
    }

    /** Flushes the current per-session snapshot with the repository's existing
     * expected-revision semantics. It never retries a conflict by force. */
    function flush(sessionId, saveResult) {
      if (typeof saveResult !== 'function') return Promise.resolve([]);
      var due = list(sessionId).filter(function (entry) { return entry.status === 'saving' || entry.status === 'offline'; });
      return Promise.all(due.map(function (entry) {
        return Promise.resolve().then(function () { return saveResult(entry.command); }).then(function (outcome) {
          outcome = outcome || { status: 'offline' };
          if (outcome.status === 'synced') acknowledge(entry);
          else recordOutcome(entry, outcome);
          return { entry: entry, outcome: outcome };
        }, function () {
          var offline = { status: 'offline' };
          recordOutcome(entry, offline);
          return { entry: entry, outcome: offline };
        });
      }));
    }

    function statusFor(sessionId, matchId) {
      var entry = entries[keyFor(sessionId, matchId)];
      return entry ? entry.status : null;
    }

    function conflictFor(sessionId, matchId) {
      var entry = entries[keyFor(sessionId, matchId)];
      return entry && entry.conflict ? clone(entry.conflict) : null;
    }

    read();
    return {
      enqueue: enqueue,
      list: list,
      flush: flush,
      acknowledge: acknowledge,
      discard: discard,
      statusFor: statusFor,
      conflictFor: conflictFor,
    };
  }

  ResultSyncQueue = { STORAGE_KEY: STORAGE_KEY, create: create };
})();
