/** Collaboration — canvas boards D2, D3 and D4.
 *
 * Three overlays over one idea: who is allowed to score this tournament.
 *
 * The permission is per TOURNAMENT, not per match. It lives at
 * tournamentAccess/{sessionId}/members/{uid}, so a button offering to "score
 * this match" would imply a scope the data model does not have. That is why
 * requesting access is one card at the top of the spectator view rather than a
 * button on every match.
 */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var labelDraft = null;
  var requestState = null;

  function label(key, fallback, params) {
    if (typeof t !== 'function') return fallback;
    var value = t(key, params);
    return value === key ? fallback : value;
  }

  /* --- Request access (D2) ---------------------------------------------- */

  UIScreens.requestAccess = {
    render: function (ctx) {
      var session = ctx.appState.get().session || {};
      if (labelDraft === null) labelDraft = ctx.appState.get().ownerLabel || '';

      var body = [
        el('section', { class: 'c-panel access__explainer' }, [
          IconRegistry.icon('users', { size: 26, class: 'access__icon' }),
          el('p', {
            class: 'access__title',
            text: label('access.title', 'Pide permiso para anotar'),
          }),
          el('p', {
            class: 'access__body',
            text: label('access.body',
              'El organizador recibe tu solicitud y, si la aprueba, podrás guardar resultados de cualquier partido de este torneo desde este teléfono. El permiso es del torneo completo. No podrás cambiar el formato ni los equipos.'),
          }),
        ]),
      ];

      // Already asked, or already answered: show where the request stands
      // rather than offering to send it again.
      if (session.accessStatus === 'pending') {
        body.push(C.statusStrip({
          icon: 'history',
          tone: 'warn',
          text: label('access.pending', 'Pendiente — el organizador aún no responde'),
        }));
      } else if (session.accessStatus === 'revoked') {
        body.push(C.statusStrip({
          icon: 'circle-alert',
          tone: 'error',
          text: label('access.revoked', 'Rechazado — sigues viendo en solo lectura'),
        }));
      }

      body.push(C.panel({}, [
        C.input({
          id: 'access-label',
          label: label('access.identify', '¿Cómo te identificamos?'),
          placeholder: label('access.placeholder', 'Tu nombre o dispositivo'),
          value: labelDraft,
          maxLength: 50,
          onInput: function (event) { labelDraft = event.target.value; },
        }),
        el('p', {
          class: 'access__hint',
          text: label('access.hint', 'Aparecerá en la lista de anotadores del organizador y en el historial de cambios.'),
        }),
        C.button({
          label: session.accessStatus === 'pending'
            ? label('access.resend', 'Volver a pedir')
            : label('tournament.access.request', 'Pedir acceso'),
          disabled: requestState === 'sending',
          onClick: function () {
            requestState = 'sending';
            ctx.rerender();
            ctx.requestAccess(labelDraft || label('access.anonymous', 'Anotador')).then(function () {
              requestState = null;
              ctx.rerender();
            });
          },
        }),
      ]));

      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: label('access.screenTitle', 'Anotar este torneo'),
          sub: label('access.screenSub', 'Pide acceso al organizador'),
          onBack: function () { ctx.closeOverlay(); },
        }),
        el('div', { class: 'overlay-screen__body' }, body),
      ]);
    },
  };

  /* --- Scorers (D3) ----------------------------------------------------- */

  UIScreens.scorers = {
    render: function (ctx) {
      var session = ctx.appState.get().session || {};
      var requests = session.requests || {};
      var uids = Object.keys(requests);
      var pending = uids.filter(function (uid) { return requests[uid].status === 'pending'; });
      var approved = uids.filter(function (uid) { return requests[uid].status === 'approved'; });

      var body = [];

      if (pending.length) {
        body.push(C.panel({
          label: label('scorers.requests', 'Solicitudes') + ' · ' + pending.length,
          labelTone: 'warn',
        }, pending.map(function (uid) {
          return C.personRow({
            icon: 'users',
            name: requests[uid].label || label('access.anonymous', 'Anotador'),
            meta: label('scorers.asked', 'Pidió acceso'),
            actions: [
              {
                label: label('tournament.access.approve', 'Aprobar'),
                variant: 'primary',
                onClick: function () { ctx.setAccess(uid, 'approved'); },
              },
              {
                label: label('tournament.access.deny', 'No'),
                variant: 'ghost',
                onClick: function () { ctx.setAccess(uid, 'revoked'); },
              },
            ],
          });
        })));
      }

      body.push(C.panel({
        label: label('scorers.approved', 'Con acceso') + ' · ' + (approved.length + 1),
      }, [
        C.personRow({
          icon: 'users',
          name: (ctx.appState.get().ownerLabel || label('access.organiser', 'Organizador')) +
            ' · ' + label('scorers.you', 'tú'),
          meta: label('scorers.owner', 'Organizador'),
          actions: [],
        }),
      ].concat(approved.map(function (uid) {
        return C.personRow({
          icon: 'users',
          name: requests[uid].label || label('access.anonymous', 'Anotador'),
          meta: label('scorers.canScore', 'Puede anotar'),
          actions: [{
            label: label('scorers.remove', 'Quitar'),
            variant: 'danger',
            onClick: function () { ctx.setAccess(uid, 'revoked'); },
          }],
        });
      }))));

      // Anonymous auth identifies a device, not a person. That is invisible
      // until someone clears their browser and loses access, so it is said here
      // rather than left as knowledge of the data model.
      body.push(C.statusStrip({
        icon: 'info',
        tone: 'neutral',
        text: label('scorers.deviceNote',
          'Un anotador es un dispositivo, no una persona: si borra los datos del navegador o cambia de teléfono, tendrá que pedir acceso otra vez.'),
      }));

      body.push(C.button({
        label: label('share.linkBtn', 'Compartir link del torneo'),
        variant: 'ghost',
        icon: 'share-2',
        onClick: function () { ctx.openOverlay('share'); },
      }));

      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: label('scorers.title', 'Anotadores'),
          sub: pending.length
            ? pending.length + ' ' + label('scorers.pendingShort', 'solicitud(es)')
            : approved.length + 1 + ' ' + label('scorers.withAccess', 'con acceso'),
          onBack: function () { ctx.closeOverlay(); },
        }),
        el('div', { class: 'overlay-screen__body' }, body),
      ]);
    },
  };

  /* --- Share (D4) ------------------------------------------------------- */

  UIScreens.share = {
    render: function (ctx) {
      var url = ctx.shareUrl();
      var shortUrl = url ? url.replace(/^https?:\/\//, '') : '';

      function copy() {
        if (!url) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            ctx.toast({ title: label('share.copied', 'Link copiado') });
          }).catch(function () { fallbackCopy(); });
          return;
        }
        fallbackCopy();
      }

      function fallbackCopy() {
        // execCommand is deprecated but remains the only path on older mobile
        // browsers and on any non-secure origin, where the Clipboard API is
        // simply absent.
        var scratch = document.createElement('textarea');
        scratch.value = url;
        scratch.setAttribute('readonly', '');
        scratch.style.position = 'absolute';
        scratch.style.left = '-9999px';
        document.body.appendChild(scratch);
        scratch.select();
        try { document.execCommand('copy'); ctx.toast({ title: label('share.copied', 'Link copiado') }); } catch (error) { /* nothing to offer */ }
        document.body.removeChild(scratch);
      }

      return C.sheet({
        title: label('share.title', 'Compartir torneo'),
        sub: label('share.sub',
          'Quien abra el link ve la tabla y los resultados en vivo. No podrá anotar salvo que le des acceso.'),
        onDismiss: function () { ctx.closeOverlay(); },
      }, [
        el('div', { class: 'share__link' }, [
          IconRegistry.icon('share-2', { size: 16, class: 'share__link-icon' }),
          el('p', { class: 'share__url', text: shortUrl || label('share.none', 'Todavía sin link') }),
          url ? el('button', {
            class: 'c-status__action',
            attrs: { type: 'button' },
            on: { click: copy },
          }, [el('span', { text: label('share.copy', 'Copiar') })]) : null,
        ]),
        url ? el('div', { class: 'share__actions' }, [
          shareAction('share-2', label('share.system', 'Compartir'), function () {
            if (navigator.share) navigator.share({ url: url, title: label('share.title', 'Compartir torneo') }).catch(function () {});
            else copy();
          }),
          shareAction('users', label('scorers.title', 'Anotadores'), function () { ctx.openOverlay('scorers'); }),
        ]) : C.statusStrip({
          icon: 'info',
          tone: 'warn',
          text: label('share.localOnly',
            'Este torneo es local: no se creó sesión compartida, así que no hay link que enviar.'),
        }),
      ]);
    },
  };

  function shareAction(icon, text, onClick) {
    return el('button', {
      class: 'results__action',
      attrs: { type: 'button' },
      on: { click: onClick },
    }, [
      IconRegistry.icon(icon, { size: 18 }),
      el('span', { class: 'results__action-label', text: text }),
    ]);
  }
})();
