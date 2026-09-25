/** Change history — boards H1 (the menu), H2 (everything), H3 (one match) and H5.
 * What a change IS comes from match-history.js; this decides how it looks. */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var activeFilter = 'all';


  /* --- Shared pieces ---------------------------------------------------- */

  function matchTitle(tournament, matchId) {
    return TournamentText.matchTitleById(tournament, matchId,
      translate('history.unknownMatch', 'Partido'));
  }

  /** "Tú (organizador)" · "Pipe — Organizador" · "Caro · iPhone": the organiser is
   * named because it changes what a reader can infer from the entry. */
  function authorText(author) {
    if (!author) return translate('history.unknownAuthor', 'anotador desconocido');
    if (author.isYou) {
      return author.isOwner
        ? translate('history.youOrganiser', 'Tú (organizador)')
        : translate('history.you', 'Tú');
    }
    if (author.unknown || !author.label) {
      return author.isOwner
        ? translate('access.organiser', 'Organizador')
        : translate('history.unknownAuthor', 'anotador desconocido');
    }
    return author.isOwner
      ? translate('history.ownerSuffix', author.label + ' — Organizador', { name: author.label })
      : author.label;
  }

  /** Which version stood after a conflict: named when the viewer can tell who
   * it belonged to, generic when the author is unknown. */
  function conflictKeptText(author) {
    if (author && author.isYou) return translate('history.conflictKept', 'se quedó tu versión');
    if (author && !author.unknown && author.label) {
      return translate('history.conflictKeptBy', 'se quedó la versión de ' + author.label, { name: author.label });
    }
    return translate('history.conflictKeptUnknown', 'se quedó esta versión');
  }

  function timeText(at) {
    if (!at || at.unknown) return translate('history.unknownTime', 'sin hora');
    if (at.relative) {
      return at.minutesAgo < 1
        ? translate('history.justNow', 'hace un momento')
        : translate('history.minutesAgo', 'hace ' + at.minutesAgo + ' min', { count: at.minutesAgo });
    }
    return at.clock;
  }

  function actionText(action) {
    if (action === 'created') return translate('history.action.created', 'Resultado registrado');
    if (action === 'conflictResolved') return translate('history.action.conflictResolved', 'Conflicto resuelto');
    if (action === 'unknown') return translate('history.action.unknown', 'Último cambio');
    return translate('history.action.edited', 'Corrección');
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
    if (group.key === 'unknown') return translate('history.dayUnknown', 'Sin fecha');
    if (group.dayOffset === 0) return translate('history.today', 'Hoy');
    if (group.dayOffset === 1) return translate('history.yesterday', 'Ayer');
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
        // The diff already says whether it is new or a correction. A resolved
        // conflict is the exception: two numbers cannot show an overwrite.
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
      var owner = SessionAccess.isOwner(session);
      var pending = SessionAccess.pendingCount(session);
      var history = ctx.history || [];

      var items = [{
        icon: 'history',
        label: translate('history.fullTitle', 'Historial de cambios'),
        count: history.length || null,
        onClick: function () { ctx.openOverlay('history'); },
      }];

      if (owner) {
        items.push({
          icon: 'users',
          label: translate('scorers.title', 'Anotadores'),
          count: pending || null,
          onClick: function () { ctx.openOverlay('scorers'); },
        });
      }

      items.push({
        icon: 'share-2',
        label: translate('day.share', 'Compartir'),
        onClick: function () { ctx.openOverlay('share'); },
      });

      if (owner) {
        // Below a divider and marked destructive. Resetting deletes the whole
        // session, so it does not sit a thumb's width from "Share".
        items.push({ divider: true });
        items.push({
          icon: 'rotate-ccw',
          tone: 'danger',
          label: translate('tournament.reset', 'Reiniciar torneo'),
          onClick: function () {
            ctx.openOverlay('confirmReset');
          },
        });
      }

      return C.menu({
        label: translate('history.menuLabel', 'Opciones del torneo'),
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
          title: translate('history.localTitle', 'Este torneo es solo tuyo'),
          text: translate('history.localText',
            'El historial guarda quién cambió cada resultado, y eso solo existe cuando compartes el torneo.'),
        }));
        return shell(ctx, body, null);
      }

      if (session.connection === 'offline') {
        body.push(C.statusStrip({
          icon: 'triangle-alert',
          tone: 'warn',
          text: translate('history.offline', 'Sin conexión — puede faltar lo más reciente'),
        }));
      }

      // A session older than the history has no record to show: what `results`
      // still carries is shown, and the gap is stated (board H5, case B).
      if (session.legacy || (!entries.length && hasResults(tournament))) {
        // The uids are still passed: `results` kept who wrote last. Only the
        // readable label was never stored, and that is what reads as unknown.
        var legacy = legacyHistoryView(tournament ? tournament.matches : [], {
          now: Date.now(),
          ownerUid: session.ownerUid || null,
          viewerUid: session.viewerUid || null,
        });
        body.push(C.statusStrip({
          icon: 'info',
          tone: 'neutral',
          text: translate('history.legacy',
            'Este torneo empezó antes del historial. Solo se conserva el último cambio de cada partido.'),
        }));
        body.push(el('div', { class: 'history__group' }, legacy.rows.map(function (row) {
          return historyRow(ctx, tournament, row, {});
        })));
        return shell(ctx, body, legacy.total + ' ' + translate('history.records', 'registros'));
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
          title: translate('history.emptyTitle', 'Aún no hay cambios'),
          text: translate('history.emptyText',
            'Cuando alguien registre o corrija un resultado, aparecerá aquí con su nombre y la hora.'),
        }));
        return shell(ctx, body, null);
      }

      body.push(el('div', { class: 'history__filters' }, view.filters.map(function (id) {
        return C.pill({
          label: {
            all: translate('history.filter.all', 'Todo'),
            created: translate('history.filter.created', 'Nuevos'),
            edited: translate('history.filter.edited', 'Ediciones'),
            conflictResolved: translate('history.filter.conflictResolved', 'Conflictos'),
          }[id],
          active: view.filter === id,
          onClick: function () { activeFilter = id; ctx.rerender(); },
        });
      })));

      if (!view.shown) {
        body.push(C.statusStrip({
          icon: 'info',
          tone: 'neutral',
          text: translate('history.noneOfThisKind', 'No hay registros de este tipo'),
        }));
      }

      view.groups.forEach(function (group) {
        body.push(el('section', { class: 'history__group' }, [
          el('div', { class: 'history__day' }, [
            C.overline(dayHeading(group)),
            el('span', {
              class: 'history__day-count',
              text: group.count + ' ' + translate('history.records', 'registros'),
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
        view.total + ' ' + translate('history.records', 'registros') + ' · ' +
        view.matchCount + ' ' + translate('results.matches', 'partidos'));
    },
  };

  function hasResults(tournament) {
    return ((tournament && tournament.matches) || []).some(function (match) {
      return match.status && match.status !== 'pending';
    });
  }

  function shell(ctx, body, sub) {
    return el('div', { class: 'overlay-screen' }, [
      C.subBar({
        title: translate('history.fullTitle', 'Historial de cambios'),
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
          title: translate('history.matchEmptyTitle', 'Sin cambios registrados'),
          text: translate('history.matchEmptyText',
            'Este resultado se guardó antes de que existiera el historial, o el torneo no está compartido.'),
        }));
      } else {
        // The result that stands, first and largest: whoever opens this is
        // usually checking what the score IS, not how it got there.
        body.push(C.panel({
          label: translate('history.current', 'Resultado actual'),
          meta: translate('history.revision', 'Edición ' + view.current.revision, { n: view.current.revision }),
        }, [
          // The teams are already under the title; repeating them here would
          // make the panel restate its own heading.
          el('p', { class: 'history__current-score', text: view.current.score || '—' }),
          el('p', {
            class: 'history__meta',
            text: translate('history.savedBy', 'Guardado por', {}) + ' ' +
              authorText(view.current.author) + ' · ' + timeText(view.current.at),
          }),
        ]));

        body.push(el('section', { class: 'history__timeline' }, [
          el('div', { class: 'history__day' }, [
            C.overline(translate('history.timeline', 'Línea de tiempo')),
            el('span', {
              class: 'history__day-count',
              text: view.total + ' ' + translate('history.records', 'registros'),
            }),
          ]),
        ].concat(view.rows.map(function (row) {
          return el('div', { class: 'history__node' }, [
            el('div', { class: 'history__head' }, [
              el('span', {
                class: 'history__revision',
                text: translate('history.revision', 'Edición ' + row.revision, { n: row.revision }),
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
                (row.action === 'conflictResolved' ? ' · ' + conflictKeptText(row.author) : ''),
            }),
          ]);
        }))));
      }

      return el('div', { class: 'overlay-screen' }, [
        C.subBar({
          title: translate('history.matchTitle', 'Historial del partido'),
          sub: matchTitle(tournament, matchId),
          onBack: function () { ctx.closeOverlay(); },
        }),
        el('div', { class: 'overlay-screen__body' }, body),
      ]);
    },
  };
})();
