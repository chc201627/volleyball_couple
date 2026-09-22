/** Change history presentation — pure, DOM-free.
 *
 * The repository hands over a flat list of entries, newest first, each one a
 * frozen snapshot of what a match's result was at a given revision. That list
 * answers "what happened" but not the three questions a person actually asks
 * when they open the history:
 *
 *   what changed   a row showing only "9 – 7" says nothing. The change is the
 *                  pair: 9 – 8 became 9 – 7. The previous value is not in the
 *                  entry, it is the entry one revision below for the same
 *                  match, so the diff is derived here rather than in a screen.
 *   when           grouped by day, because "14:32" without a day is a riddle
 *                  once a tournament crosses midnight.
 *   who            the author label is copied into every entry on purpose (the
 *                  live one is unreadable for a spectator), and the viewer's
 *                  own edits and the organiser's are named as such.
 *
 * Sessions created before the history existed have no `resultHistory` node at
 * all. That past cannot be invented, so `legacyHistoryView()` builds what the
 * results themselves still carry — one last change per match — and says so.
 *
 * Everything takes `now` rather than reading the clock, so a test can place an
 * entry on either side of midnight and get a stable answer.
 */
/* exported matchHistoryView, matchTimelineView, legacyHistoryView, HISTORY_FILTERS */
var matchHistoryView, matchTimelineView, legacyHistoryView, HISTORY_FILTERS;

(function () {
  'use strict';

  /** 'created', 'edited' and 'conflictResolved' are different events that share
   * one node. Separating them is the point of the filter: a correction and a
   * resolved race are not the same news. */
  var FILTERS = ['all', 'created', 'edited', 'conflictResolved'];

  function startOfDay(timestamp) {
    var date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  /** Whole calendar days between two instants, in local time. Subtracting
   * milliseconds and dividing would be wrong across a daylight-saving change,
   * which is a real afternoon on a court in March. */
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

  /** Who to credit. The viewer comes first: "you" is more useful than your own
   * device label. The owner is named as the organiser because that is the one
   * distinction that changes what a reader can infer — an organiser could also
   * have changed the format or the access list; a scorer could not. */
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

  /** How to say when. Anything from the last hour today reads better as "4 min
   * ago"; older than that, the clock time is what people compare against their
   * own memory of the afternoon. */
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

  /** The previous revision of the same match, which is what the new value is a
   * change FROM. Entries arrive newest first and may be sparse (a revision can
   * be missing if a write was rejected), so the lookup is by position within
   * the match's own ascending list rather than by `revision - 1`. */
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

  /** The whole history (board H2): filtered, grouped by day, newest first.
   *
   * `total` and `matchCount` describe the WHOLE history, not the filtered
   * slice — the header is a statement about the tournament, and a count that
   * moved every time a filter changed would read as data appearing and
   * vanishing. `shown` and `hidden` describe the slice. */
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

  /** Sessions that predate the history (board H5, case B). `results` keeps the
   * last writer and time for each match, and that is all there is: one row per
   * played match, no diff, and the caller says out loud that the rest is gone
   * rather than showing a suspiciously short list. */
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
