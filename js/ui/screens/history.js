/** Change history — canvas boards H1, H2, H3 and H5.
 *
 * Three views over one question: who changed what, and when.
 *
 * H1 is the overflow menu that finally gives the tournament screen a place to
 * put everything that is not the match in front of you. Share, scorers and
 * reset were three loose buttons; they live here now, and the history joins
 * them with its own count.
 *
 * H2 and H3 are the history itself — the whole tournament, and one match. Both
 * read their rows from match-history.js, which decides what a change IS (the
 * value it replaced, the day it belongs to, who to credit). This file decides
 * only how it looks.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var activeFilter = 'all';

  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  /* --- Shared pieces ---------------------------------------------------- */

  function matchTitle(tournament, matchId) {
    var match = ((tournament && tournament.matches) || []).filter(function (item) {
      return item.id === matchId;
    })[0];
    if (!match) return label('history.unknownMatch', 'Partido');
    function teamName(teamId) {
      var team = ((tournament && tournament.teams) || []).filter(function (item) {
        return item.id === teamId;
      })[0];
      return team ? team.name : teamId;
    }
    return teamName(match.team1Id) + '  vs  ' + teamName(match.team2Id);
  }

  /** "Tú (organizador)" · "Pipe — Organizador" · "Caro · iPhone". The organiser
   * is named as such because it is the one thing that changes what a reader can
   * infer from the entry. */
  function authorText(author) {
    if (!author) return label('history.unknownAuthor', 'anotador desconocido');
    if (author.isYou) {
      return author.isOwner
        ? label('history.youOrganiser', 'Tú (organizador)')
        : label('history.you', 'Tú');
    }
    if (author.unknown || !author.label) {
      return author.isOwner
        ? label('access.organiser', 'Organizador')
        : label('history.unknownAuthor', 'anotador desconocido');
    }
    return author.isOwner
      ? label('history.ownerSuffix', author.label + ' — Organizador', { name: author.label })
      : author.label;
  }

  function timeText(at) {
    if (!at || at.unknown) return label('history.unknownTime', 'sin hora');
    if (at.relative) {
      return at.minutesAgo < 1
        ? label('history.justNow', 'hace un momento')
        : label('history.minutesAgo', 'hace ' + at.minutesAgo + ' min', { count: at.minutesAgo });
    }
    return at.clock;
  }

  function actionText(action) {
    if (action === 'created') return label('history.action.created', 'Resultado registrado');
    if (action === 'conflictResolved') return label('history.action.conflictResolved', 'Conflicto resuelto');
    if (action === 'unknown') return label('history.action.unknown', 'Último cambio');
    return label('history.action.edited', 'Corrección');
  }

  /** The diff, read without opening anything: the value that was there, struck
   * through, and the one that replaced it. */
  function scoreDiff(row) {
    var parts = [];
    if (row.previousScore) {
      parts.push(el('span', { class: 'history__score history__score--old', text: row.previousScore }));
      parts.push(IconRegistry.icon('arrow-right', { size: 12, class: 'history__arrow' }));
    }
    parts.push(el('span', {
      class: ['history__score', row.previousScore && 'history__score--new'],
      text: row.score || '—',
    }));
    return el('div', { class: 'history__scores' }, parts);
  }

  function dayHeading(group) {
    if (group.key === 'unknown') return label('history.dayUnknown', 'Sin fecha');
    if (group.dayOffset === 0) return label('history.today', 'Hoy');
    if (group.dayOffset === 1) return label('history.yesterday', 'Ayer');
    return new Date(group.rows[0].at.timestamp).toLocaleDateString(
      typeof getLanguage === 'function' ? getLanguage() : 'es',
      { weekday: 'long', day: 'numeric', month: 'long' }
    );
  }

  function historyRow(ctx, tournament, row, options) {
    options = options || {};
    return el('button', {
      class: 'history__row',
      attrs: { type: 'button' },
      on: {
        click: function () {
          if (options.onClick) options.onClick();
        },
      },
    }, [
      el('div', { class: 'history__head' }, [
        el('p', { class: 'history__match', text: matchTitle(tournament, row.matchId) }),
        // No tag for a new result or a correction: the diff already says which
        // it is — one value, or one replacing another. A resolved conflict is
        // the exception, because "somebody else's result was overwritten" is
        // not something two numbers can show.
        row.action === 'conflictResolved' ? el('span', {
          class: 'history__action history__action--conflictResolved',
          text: actionText(row.action),
        }) : null,
      ]),
      scoreDiff(row),
      el('p', {
        class: 'history__meta',
        text: authorText(row.author) + ' · ' + timeText(row.at),
      }),
    ]);
  }

  /* --- H1 · Tournament overflow menu ------------------------------------ */

  UIScreens.tournamentMenu = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var session = snapshot.session;
      var owner = !session || session.role === 'owner';
      var pending = session && session.requests
        ? Object.keys(session.requests).filter(function (uid) {
            return session.requests[uid].status === 'pending';
          }).length
        : 0;
      var history = ctx.history || [];

      var items = [{
        icon: 'history',
        label: label('history.fullTitle', 'Historial de cambios'),
        count: history.length || null,
        onClick: function () { ctx.openOverlay('history'); },
      }];

      if (owner) {
        items.push({
          icon: 'users',
          label: label('scorers.title', 'Anotadores'),
          count: pending || null,
          onClick: function () { ctx.openOverlay('scorers'); },
        });
      }

      items.push({
        icon: 'share-2',
        label: label('day.share', 'Compartir'),
        onClick: function () { ctx.openOverlay('share'); },
      });

      if (owner) {
        // Below a divider and marked destructive. Resetting deletes the whole
        // session, so it does not sit a thumb's width from "Share".
        items.push({ divider: true });
        items.push({
          icon: 'rotate-ccw',
          tone: 'danger',
          label: label('tournament.reset', 'Reiniciar torneo'),
          onClick: function () {
            if (!window.confirm(label('tournament.confirmReset',
              '¿Seguro que quieres reiniciar el torneo? Se borran los resultados y el link deja de funcionar.'))) return;
            ctx.resetTournament();
          },
        });
      }

      return C.menu({
        label: label('history.menuLabel', 'Opciones del torneo'),
        onDismiss: function () { ctx.closeOverlay(); },
      }, items);
    },
  };

  /* --- H2 · The whole history, and H5 · its edge states ------------------ */

  UIScreens.history = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var tournament = snapshot.tournament;
      var session = snapshot.session;
      var entries = ctx.history || [];
      var body = [];

      // The history lives in the session. Without one there is nothing to show
      // and nothing to explain away: this tournament was never shared.
      if (!session) {
        body.push(C.emptyState({
          icon: 'history',
          title: label('history.localTitle', 'Este torneo es solo tuyo'),
          text: label('history.localText',
            'El historial guarda quién cambió cada resultado, y eso solo existe cuando compartes el torneo.'),
        }));
        return shell(ctx, body, null);
      }

      if (session.connection === 'offline') {
        body.push(C.statusStrip({
          icon: 'triangle-alert',
          tone: 'warn',
          text: label('history.offline', 'Sin conexión — puede faltar lo más reciente'),
        }));
      }

      // A session created before the history existed has no record to show. Its
      // past cannot be invented, so what little `results` still carries is shown
      // and the gap is stated (board H5, case B).
      if (session.legacy || (!entries.length && hasResults(tournament))) {
        // The uids are still passed: `results` kept who wrote last, so a row the
        // organiser wrote can say so. Only the readable label was never stored,
        // and that is the part reported as unknown.
        var legacy = legacyHistoryView(tournament ? tournament.matches : [], {
          now: Date.now(),
          ownerUid: session.ownerUid || null,
          viewerUid: session.viewerUid || null,
        });
        body.push(C.statusStrip({
          icon: 'info',
          tone: 'neutral',
          text: label('history.legacy',
            'Este torneo empezó antes del historial. Solo se conserva el último cambio de cada partido.'),
        }));
        body.push(el('div', { class: 'history__group' }, legacy.rows.map(function (row) {
          return historyRow(ctx, tournament, row, {});
        })));
        return shell(ctx, body, legacy.total + ' ' + label('history.records', 'registros'));
      }

      var view = matchHistoryView(entries, {
        now: Date.now(),
        filter: activeFilter,
        ownerUid: session.ownerUid || null,
        viewerUid: session.viewerUid || null,
      });

      if (view.empty) {
        body.push(C.emptyState({
          icon: 'history',
          title: label('history.emptyTitle', 'Aún no hay cambios'),
          text: label('history.emptyText',
            'Cuando alguien registre o corrija un resultado, aparecerá aquí con su nombre y la hora.'),
        }));
        return shell(ctx, body, null);
      }

      body.push(el('div', { class: 'history__filters' }, view.filters.map(function (id) {
        return C.pill({
          label: {
            all: label('history.filter.all', 'Todo'),
            created: label('history.filter.created', 'Nuevos'),
            edited: label('history.filter.edited', 'Ediciones'),
            conflictResolved: label('history.filter.conflictResolved', 'Conflictos'),
          }[id],
          active: view.filter === id,
          onClick: function () { activeFilter = id; ctx.rerender(); },
        });
      })));

      if (!view.shown) {
        body.push(C.statusStrip({
          icon: 'info',
          tone: 'neutral',
          text: label('history.noneOfThisKind', 'No hay registros de este tipo'),
        }));
      }

      view.groups.forEach(function (group) {
        body.push(el('section', { class: 'history__group' }, [
          el('div', { class: 'history__day' }, [
            C.overline(dayHeading(group)),
            el('span', {
              class: 'history__day-count',
              text: group.count + ' ' + label('history.records', 'registros'),
            }),
          ]),
        ].concat(group.rows.map(function (row) {
          return historyRow(ctx, tournament, row, {
            onClick: function () {
              ctx.openOverlay('matchHistory', { matchId: row.matchId, revisions: row.revision });
            },
          });
        }))));
      });

      return shell(ctx, body,
        view.total + ' ' + label('history.records', 'registros') + ' · ' +
        view.matchCount + ' ' + label('results.matches', 'partidos'));
    },
  };

  function hasResults(tournament) {
    return ((tournament && tournament.matches) || []).some(function (match) {
      return match.status && match.status !== 'pending';
    });
  }

  function shell(ctx, body, sub) {
    return el('div', { class: 'overlay-screen anim-screen-in' }, [
      C.subBar({
        title: label('history.fullTitle', 'Historial de cambios'),
        sub: sub,
        onBack: function () { ctx.closeOverlay(); },
      }),
      el('div', { class: 'overlay-screen__body' }, body),
    ]);
  }

  /* --- H3 · One match --------------------------------------------------- */

  UIScreens.matchHistory = {
    render: function (ctx) {
      var snapshot = ctx.appState.get();
      var tournament = snapshot.tournament;
      var session = snapshot.session;
      var matchId = ctx.state.overlayMatchId;
      var view = matchTimelineView(ctx.history || [], matchId, {
        now: Date.now(),
        ownerUid: session && session.ownerUid,
        viewerUid: session && session.viewerUid,
      });

      var body = [];

      if (view.empty) {
        body.push(C.emptyState({
          icon: 'history',
          title: label('history.matchEmptyTitle', 'Sin cambios registrados'),
          text: label('history.matchEmptyText',
            'Este resultado se guardó antes de que existiera el historial, o el torneo no está compartido.'),
        }));
      } else {
        // The result that stands, first and largest: whoever opens this is
        // usually checking what the score IS, not how it got there.
        body.push(C.panel({
          label: label('history.current', 'Resultado actual'),
          meta: label('history.revision', 'rev ' + view.current.revision, { n: view.current.revision }),
        }, [
          // The teams are already under the title; repeating them here would
          // make the panel restate its own heading.
          el('p', { class: 'history__current-score', text: view.current.score || '—' }),
          el('p', {
            class: 'history__meta',
            text: label('history.savedBy', 'Guardado por', {}) + ' ' +
              authorText(view.current.author) + ' · ' + timeText(view.current.at),
          }),
        ]));

        body.push(el('section', { class: 'history__timeline' }, [
          el('div', { class: 'history__day' }, [
            C.overline(label('history.timeline', 'Línea de tiempo')),
            el('span', {
              class: 'history__day-count',
              text: view.total + ' ' + label('history.records', 'registros'),
            }),
          ]),
        ].concat(view.rows.map(function (row) {
          return el('div', { class: 'history__node' }, [
            el('div', { class: 'history__head' }, [
              el('span', {
                class: 'history__revision',
                text: label('history.revision', 'rev ' + row.revision, { n: row.revision }),
              }),
              el('span', {
                class: ['history__action', 'history__action--' + row.action],
                text: actionText(row.action),
              }),
              el('span', { class: 'history__time', text: timeText(row.at) }),
            ]),
            scoreDiff(row),
            el('p', {
              class: 'history__meta',
              text: authorText(row.author) +
                (row.action === 'conflictResolved'
                  ? ' · ' + label('history.conflictKept', 'se quedó esta versión')
                  : ''),
            }),
          ]);
        }))));
      }

      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: label('history.matchTitle', 'Historial del partido'),
          sub: matchTitle(tournament, matchId),
          onBack: function () { ctx.closeOverlay(); },
        }),
        el('div', { class: 'overlay-screen__body' }, body),
      ]);
    },
  };
})();
