/** Turns the repository's flat entry list into what a person asks: what changed,
 * when, and who. Pure and DOM-free, and `now` is always passed in. */
/* exported matchHistoryView, matchTimelineView, legacyHistoryView, HISTORY_FILTERS */
var matchHistoryView, matchTimelineView, legacyHistoryView, HISTORY_FILTERS;

(function () {
  'use strict';

  /** Three different events share one node, and the filter is what separates them:
   * a correction and a resolved race are not the same news. */
  var FILTERS = ['all', 'created', 'edited', 'conflictResolved'];

  function startOfDay(timestamp) {
    var date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  /** Whole calendar days apart, in local time: dividing milliseconds would be
   * wrong across a daylight-saving change. */
  function dayOffset(timestamp, now) {
    if (timestamp == null) return null;
    var days = Math.round((startOfDay(now) - startOfDay(timestamp)) / 86400000);
    return days < 0 ? 0 : days;
  }

  function dayKey(timestamp) {
    var date = new Date(timestamp);
    function pad(value) { return (value < 10 ? '0' : '') + value; }
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function clockTime(timestamp) {
    var date = new Date(timestamp);
    function pad(value) { return (value < 10 ? '0' : '') + value; }
    return pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function scoreText(entry) {
    if (!entry || entry.score1 == null || entry.score2 == null) return null;
    return entry.score1 + ' – ' + entry.score2;
  }

  /** Who to credit. "You" beats your own device label, and the organiser is named
   * because only they could also have changed the format or the access list. */
  function authorOf(entry, options) {
    var uid = entry && entry.updatedBy;
    var label = entry && entry.authorLabel;
    return {
      label: label || null,
      uid: uid || null,
      isYou: !!uid && uid === options.viewerUid,
      isOwner: !!uid && uid === options.ownerUid,
      unknown: !label && !uid,
    };
  }

  /** Anything from the last hour reads better as "4 min ago"; older than that, the
   * clock time is what people compare against their memory of the afternoon. */
  function timeOf(timestamp, now) {
    if (timestamp == null) return { timestamp: null, unknown: true, dayOffset: null, minutesAgo: null, clock: null };
    var minutesAgo = Math.max(0, Math.floor((now - timestamp) / 60000));
    var offset = dayOffset(timestamp, now);
    return {
      timestamp: timestamp,
      unknown: false,
      dayOffset: offset,
      minutesAgo: minutesAgo,
      clock: clockTime(timestamp),
      relative: offset === 0 && minutesAgo < 60,
    };
  }

  /** What each value is a change FROM. Revisions can be sparse, so this looks up
   * the entry below it in the match's own order, not `revision - 1`. */
  function previousByEntry(entries) {
    var byMatch = {};
    entries.forEach(function (entry) {
      (byMatch[entry.matchId] = byMatch[entry.matchId] || []).push(entry);
    });
    var previous = {};
    Object.keys(byMatch).forEach(function (matchId) {
      var ordered = byMatch[matchId].slice().sort(function (a, b) {
        return (a.revision || 0) - (b.revision || 0);
      });
      ordered.forEach(function (entry, index) {
        previous[matchId + '@' + entry.revision] = index > 0 ? ordered[index - 1] : null;
      });
    });
    return previous;
  }

  function toRow(entry, previous, options) {
    var before = previous ? scoreText(previous) : null;
    var after = scoreText(entry);
    return {
      matchId: entry.matchId,
      revision: entry.revision,
      action: entry.action || 'edited',
      status: entry.status,
      score: after,
      previousScore: before === after ? null : before,
      // A first result has nothing to compare against, so it is stated rather
      // than shown as a change from nothing.
      isFirst: !previous,
      author: authorOf(entry, options),
      at: timeOf(entry.updatedAt, options.now),
    };
  }

  function normalise(options) {
    options = options || {};
    return {
      now: options.now == null ? Date.now() : options.now,
      viewerUid: options.viewerUid || null,
      ownerUid: options.ownerUid || null,
      filter: FILTERS.indexOf(options.filter) === -1 ? 'all' : options.filter,
      limit: options.limit == null ? 0 : options.limit,
    };
  }

  /** The whole history (board H2): filtered, grouped by day, newest first. `total`
   * describes the tournament and `shown`/`hidden` the filtered slice. */
  matchHistoryView = function (entries, options) {
    var opts = normalise(options);
    var all = (entries || []).filter(function (entry) { return entry && entry.matchId; });
    var previous = previousByEntry(all);

    var matches = {};
    all.forEach(function (entry) { matches[entry.matchId] = true; });

    var selected = all.filter(function (entry) {
      return opts.filter === 'all' || (entry.action || 'edited') === opts.filter;
    });

    var visible = opts.limit > 0 ? selected.slice(0, opts.limit) : selected;
    var groups = [];
    var index = {};
    visible.forEach(function (entry) {
      var offset = dayOffset(entry.updatedAt, opts.now);
      var key = entry.updatedAt == null ? 'unknown' : dayKey(entry.updatedAt);
      if (!index[key]) {
        index[key] = { key: key, dayOffset: offset, count: 0, rows: [] };
        groups.push(index[key]);
      }
      index[key].count += 1;
      index[key].rows.push(toRow(entry, previous[entry.matchId + '@' + entry.revision], opts));
    });

    return {
      total: all.length,
      matchCount: Object.keys(matches).length,
      filter: opts.filter,
      filters: FILTERS.slice(),
      shown: visible.length,
      hidden: Math.max(0, selected.length - visible.length),
      groups: groups,
      empty: all.length === 0,
    };
  };

  /** One match's timeline (board H3): the result that stands, then every
   * revision from newest to the first. */
  matchTimelineView = function (entries, matchId, options) {
    var opts = normalise(options);
    var mine = (entries || []).filter(function (entry) { return entry && entry.matchId === matchId; });
    var previous = previousByEntry(mine);
    var ordered = mine.slice().sort(function (a, b) { return (b.revision || 0) - (a.revision || 0); });
    var rows = ordered.map(function (entry) {
      return toRow(entry, previous[entry.matchId + '@' + entry.revision], opts);
    });
    return {
      matchId: matchId,
      total: rows.length,
      current: rows.length ? rows[0] : null,
      rows: rows,
      empty: rows.length === 0,
    };
  };

  /** Sessions older than the history (board H5, case B): `results` kept the last
   * writer and time, so one row per played match and no diff. */
  legacyHistoryView = function (matches, options) {
    var opts = normalise(options);
    var rows = (matches || []).filter(function (match) {
      return match && match.status && match.status !== 'pending';
    }).map(function (match) {
      return {
        matchId: match.id,
        revision: match.revision || 0,
        action: 'unknown',
        status: match.status,
        score: scoreText(match),
        previousScore: null,
        isFirst: false,
        author: authorOf({ updatedBy: match.updatedBy, authorLabel: null }, opts),
        at: timeOf(match.updatedAt, opts.now),
      };
    }).sort(function (a, b) {
      return (b.at.timestamp || 0) - (a.at.timestamp || 0);
    });
    return { legacy: true, total: rows.length, rows: rows, empty: rows.length === 0 };
  };

  HISTORY_FILTERS = FILTERS.slice();
})();
