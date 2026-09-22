/** Who may do what in a shared session — pure, DOM-free. A permission rule written
 * in four files is four rules; the quiet one is that no session allows everything. */
/* exported SessionAccess */
var SessionAccess;

(function () {
  'use strict';

  function membersOf(session) {
    return (session && session.requests) || {};
  }

  /** Members with a given status, newest request last, each carrying its uid. */
  function membersWithStatus(session, status) {
    var members = membersOf(session);
    return Object.keys(members)
      .filter(function (uid) { return members[uid] && members[uid].status === status; })
      .map(function (uid) {
        return {
          uid: uid,
          label: members[uid].label || null,
          requestedAt: members[uid].requestedAt || null,
          decidedAt: members[uid].decidedAt || null,
        };
      })
      .sort(function (a, b) { return (a.requestedAt || 0) - (b.requestedAt || 0); });
  }

  /** A tournament that was never shared has no session and no roles: this
   * device is the only one that can reach it. */
  function isLocalOnly(session) {
    return !session;
  }

  function isOwner(session) {
    return !session || session.role === 'owner';
  }

  function isSpectator(session) {
    return !!session && session.role === 'spectator';
  }

  function canScore(session) {
    return !session || session.role === 'owner' || session.role === 'scorer';
  }

  /** Only the owner can see the request list, so for anybody else this is zero
   * rather than unknown. */
  function pendingCount(session) {
    return membersWithStatus(session, 'pending').length;
  }

  SessionAccess = {
    isLocalOnly: isLocalOnly,
    isOwner: isOwner,
    isSpectator: isSpectator,
    canScore: canScore,
    pendingRequests: function (session) { return membersWithStatus(session, 'pending'); },
    approvedScorers: function (session) { return membersWithStatus(session, 'approved'); },
    pendingCount: pendingCount,
  };
})();
