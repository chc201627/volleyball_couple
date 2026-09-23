/** Collaboration — boards D2, D3 and D4: who may score this tournament. The
 * permission is per tournament, never per match, so asking is one card. */
(function () {
  'use strict';

  var el = DomHelpers.el;
  var C = UIComponents;

  var labelDraft = null;
  var requestState = null;


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
            text: translate('access.title', 'Pide permiso para anotar'),
          }),
          el('p', {
            class: 'access__body',
            text: translate('access.body',
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
          text: translate('access.pending', 'Pendiente — el organizador aún no responde'),
        }));
      } else if (session.accessStatus === 'revoked') {
        body.push(C.statusStrip({
          icon: 'circle-alert',
          tone: 'error',
          text: translate('access.revoked', 'Rechazado — sigues viendo en solo lectura'),
        }));
      }

      body.push(C.panel({}, [
        C.input({
          id: 'access-label',
          label: translate('access.identify', '¿Cómo te identificamos?'),
          placeholder: translate('access.placeholder', 'Tu nombre o dispositivo'),
          value: labelDraft,
          maxLength: 50,
          onInput: function (event) { labelDraft = event.target.value; },
        }),
        el('p', {
          class: 'access__hint',
          text: translate('access.hint', 'Aparecerá en la lista de anotadores del organizador y en el historial de cambios.'),
        }),
        C.button({
          label: session.accessStatus === 'pending'
            ? translate('access.resend', 'Volver a pedir')
            : translate('access.requestShort', 'Pedir acceso'),
          disabled: requestState === 'sending',
          onClick: function () {
            requestState = 'sending';
            ctx.rerender();
            ctx.requestAccess(labelDraft || translate('access.anonymous', 'Anotador')).then(function () {
              requestState = null;
              ctx.rerender();
            });
          },
        }),
      ]));

      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: translate('access.screenTitle', 'Anotar este torneo'),
          sub: translate('access.screenSub', 'Pide acceso al organizador'),
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
      var pending = SessionAccess.pendingRequests(session);
      var approved = SessionAccess.approvedScorers(session);

      var body = [];

      if (pending.length) {
        body.push(C.panel({
          label: translate('scorers.requests', 'Solicitudes') + ' · ' + pending.length,
          labelTone: 'warn',
        }, pending.map(function (member) {
          return C.personRow({
            icon: 'users',
            name: member.label || translate('access.anonymous', 'Anotador'),
            meta: translate('scorers.asked', 'Pidió acceso'),
            actions: [
              {
                label: translate('tournament.access.approve', 'Aprobar'),
                variant: 'primary',
                onClick: function () { ctx.setAccess(member.uid, 'approved'); },
              },
              {
                label: translate('tournament.access.deny', 'No'),
                variant: 'ghost',
                onClick: function () { ctx.setAccess(member.uid, 'revoked'); },
              },
            ],
          });
        })));
      }

      body.push(C.panel({
        label: translate('scorers.approved', 'Con acceso') + ' · ' + (approved.length + 1),
      }, [
        C.personRow({
          icon: 'users',
          name: (ctx.appState.get().ownerLabel || translate('access.organiser', 'Organizador')) +
            ' · ' + translate('scorers.you', 'tú'),
          meta: translate('scorers.owner', 'Organizador'),
          actions: [],
        }),
      ].concat(approved.map(function (member) {
        return C.personRow({
          icon: 'users',
          name: member.label || translate('access.anonymous', 'Anotador'),
          meta: translate('scorers.canScore', 'Puede anotar'),
          actions: [{
            label: translate('scorers.remove', 'Quitar'),
            variant: 'danger',
            onClick: function () { ctx.setAccess(member.uid, 'revoked'); },
          }],
        });
      }))));

      // Anonymous auth identifies a device, not a person — invisible until someone
      // clears their browser and loses access, so it is said out loud.
      body.push(C.statusStrip({
        icon: 'info',
        tone: 'neutral',
        text: translate('scorers.deviceNote',
          'Un anotador es un dispositivo, no una persona: si borra los datos del navegador o cambia de teléfono, tendrá que pedir acceso otra vez.'),
      }));

      body.push(C.button({
        label: translate('share.linkBtn', 'Compartir link del torneo'),
        variant: 'ghost',
        icon: 'share-2',
        onClick: function () { ctx.openOverlay('share'); },
      }));

      return el('div', { class: 'overlay-screen anim-screen-in' }, [
        C.subBar({
          title: translate('scorers.title', 'Anotadores'),
          sub: pending.length
            ? pending.length + ' ' + translate('scorers.pendingShort', 'solicitud(es)')
            : approved.length + 1 + ' ' + translate('scorers.withAccess', 'con acceso'),
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
            ctx.toast({ title: translate('share.copied', 'Link copiado') });
          }).catch(function () { fallbackCopy(); });
          return;
        }
        fallbackCopy();
      }

      function fallbackCopy() {
        // Deprecated, but the only path on older mobile browsers and on any
        // non-secure origin, where the Clipboard API is absent.
        var scratch = document.createElement('textarea');
        scratch.value = url;
        scratch.setAttribute('readonly', '');
        scratch.style.position = 'absolute';
        scratch.style.left = '-9999px';
        document.body.appendChild(scratch);
        scratch.select();
        try { document.execCommand('copy'); ctx.toast({ title: translate('share.copied', 'Link copiado') }); } catch (error) { /* nothing to offer */ }
        document.body.removeChild(scratch);
      }

      return C.sheet({
        title: translate('share.title', 'Compartir torneo'),
        sub: translate('share.sub',
          'Quien abra el link ve la tabla y los resultados en vivo. No podrá anotar salvo que le des acceso.'),
        onDismiss: function () { ctx.closeOverlay(); },
      }, [
        el('div', { class: 'share__link' }, [
          IconRegistry.icon('share-2', { size: 16, class: 'share__link-icon' }),
          el('p', { class: 'share__url', text: shortUrl || translate('share.none', 'Todavía sin link') }),
          url ? el('button', {
            class: 'c-status__action',
            attrs: { type: 'button' },
            on: { click: copy },
          }, [el('span', { text: translate('share.copy', 'Copiar') })]) : null,
        ]),
        url ? el('div', { class: 'share__actions' }, [
          shareAction('share-2', translate('share.system', 'Compartir'), function () {
            if (navigator.share) navigator.share({ url: url, title: translate('share.title', 'Compartir torneo') }).catch(function () {});
            else copy();
          }),
          shareAction('users', translate('scorers.title', 'Anotadores'), function () { ctx.openOverlay('scorers'); }),
        ]) : C.statusStrip({
          icon: 'info',
          tone: 'warn',
          text: translate('share.localOnly',
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
