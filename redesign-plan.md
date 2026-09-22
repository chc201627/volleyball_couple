# Plan de implementación — TO-BE (v2.0.0)

> Fuente de diseño: `design/volleyball-couple.pen`, fila `04 · TO-BE · Propuesta` (35 artboards, 9 flujos).
> Estado de partida: v1.9.1 en producción.

---

## 1. Principio rector

El TO-BE no es un reskin: cambia la estructura de navegación (app bar + tab bar + sub-tabs + hojas), la densidad, y añade un flujo que hoy no existe (historial de cambios). Eso hace inviable seguir pintando todo desde un único `app.js` de 3.685 líneas contra un `index.html` que ya trae todas las secciones en estático.

Tres reglas para todo el trabajo:

1. **La lógica pura no toca el DOM.** Todo lo que se pueda decidir sin pantalla vive en un módulo testeable con un harness, como ya hacen `tournament-day.js` y `workspace.js`.
2. **Un componente, un sitio.** Si dos pantallas pintan lo mismo, se pinta desde la misma función. Hoy hay cuatro controles segmentados casi idénticos (`match-type`, `pairing-toggle`, `tournament-setup__opt`, `format-setup__opt`) con CSS duplicado.
3. **Un archivo por pantalla.** No por rendimiento —se carga todo al arrancar igual— sino para poder leerlo y para que dos personas toquen pantallas distintas sin pisarse.
4. **Cada slice borra lo que reemplaza.** Nada de "ya limpiaremos al final": el código muerto se elimina en el mismo PR que introduce su sustituto.

Se mantienen las restricciones del proyecto: sin build step, vanilla JS, orden de scripts contractual, cache-busting `?v=`.

---

## 2. Inventario de partida

| Archivo | LOC | Destino |
|---|---:|---|
| `js/app.js` | 3.685 | **Se descompone.** Queda como orquestador delgado (~400) |
| `css/styles.css` | 2.489 | **Se reconstruye.** ~40 % del CSS actual muere |
| `index.html` | 464 | **Se vacía.** Pasa a shell de ~60 líneas |
| `js/i18n.js` | 745 | Se conserva el mecanismo; alta rotación de claves |
| `js/tournament-repository.js` | 430 | Se extiende (historial) |
| `js/tournament.js` | 349 | Se conserva; expone la cadena de desempate |
| `js/tournament-format.js` | 340 | Se conserva intacto |
| `js/tournament-day.js` | 311 | Se conserva; se extiende |
| `js/pairing.js` | 280 | Se conserva intacto |
| `js/player-import.js` | 265 | Se conserva intacto |
| `js/workspace.js` | 191 | Se extiende (sub-vistas y overlays) |
| `js/king-of-court.js` | 132 | Se conserva intacto |
| `js/firebase-config.js` | 26 | Se conserva intacto |

**Lo mejor del código actual ya es reutilizable tal cual:** los cinco módulos de dominio puro (`pairing`, `player-import`, `tournament`, `tournament-format`, `king-of-court`) no tienen DOM y sobreviven sin cambios. El rediseño es casi todo capa de presentación.

---

## 3. Base de datos y reglas

### 3.1 Lo que falta (board H0)

`tournaments/{sid}/results/{matchId}` ya guarda `updatedBy`, `updatedAt` y `revision`, pero **sobrescribe en cada guardado**: no hay pasado. Además `firebase-rules.json` cierra el nodo con `"$other": {".validate": false}`.

### 3.2 Nodo nuevo

```
tournaments/{sid}/resultHistory/{matchId}/{revision}
  { score1, score2, status, revision, updatedBy, updatedAt, authorLabel, action }
```

- `action`: `"created" | "edited" | "conflictResolved"`.
- `authorLabel`: **denormalizado en el momento del guardado**. El label legible vive en `tournamentAccess/{sid}/members/{uid}/label`, cuya `.read` es solo el owner o ese mismo uid — sin denormalizar, un espectador vería UIDs. Copiarlo además es lo correcto semánticamente: el historial es una foto inmutable y el nombre de entonces es el dato verdadero.

### 3.3 Cambios en `firebase-rules.json`

1. Abrir `resultHistory` en el `$other` del nodo de sesión.
2. `resultHistory/$matchId/$revision`:
   - `.read: true` (igual que el resto del torneo, para que el espectador lo vea).
   - `.write`: owner o `approved`, **y** `!data.exists()` → **append-only**. Nadie reescribe el pasado, ni el organizador.
   - `.validate`: `$revision` debe coincidir con `newData.child('revision')`, y con la revisión que queda en `results/$matchId`.
3. `ownerLabel` **opcional** en el nodo de sesión (ver §3.5).

### 3.4 Escritura atómica — decisión de arquitectura

Hoy `saveResult()` usa `resultRef.transaction()`. Una transacción de RTDB **no puede escribir un nodo hermano atómicamente**, así que resultado e historial podrían desincronizarse.

**Decidido:** sustituir la transacción por un `update()` multi-path:

```js
db.ref().update({
  ['tournaments/'+sid+'/results/'+matchId]: next,
  ['tournaments/'+sid+'/resultHistory/'+matchId+'/'+next.revision]: entry,
})
```

Es atómico, y la seguridad ante concurrencia **no se pierde**: la regla actual ya exige `revision === data.revision + 1`, así que si otro dispositivo escribió primero, el update es rechazado. El conflicto pasa de "transacción abortada" a "permiso denegado", así que el repositorio debe releer para construir la tarjeta de conflicto (board C5).

*Descartada:* mantener la transacción y escribir el historial después. Más simple, pero admite huecos en el historial si la segunda escritura falla.

### 3.5 Hueco descubierto: el organizador no tiene nombre

El owner nunca pide acceso, así que **no existe ninguna entrada suya en `tournamentAccess`** y no hay label que copiar. Hoy no se nota porque nunca se muestra el autor; con el historial sí.

**Decidido:** campo `ownerLabel` en la sesión, **pedido al crear el torneo** por trazabilidad. En las reglas va como **opcional**, para que las sesiones ya creadas sigan validando; la UI cae a "Organizador" cuando falta.

**Presentación en el historial:** el autor se muestra como **`Nombre — Organizador`** (p. ej. *"Pipe — Organizador"*), para distinguir de un vistazo quién tiene el control del torneo y quién es un anotador aprobado. Los anotadores se muestran solo con su label (*"May · Android"*). Afecta a los boards H2, H3 y H5.

### 3.6 Migración y scripts

**No hace falta script de migración.** El historial es aditivo y su ausencia está diseñada: las sesiones creadas antes muestran el estado *legacy* del board H5 ("solo se conserva el último cambio"), que se construye con el `updatedBy`/`updatedAt` que `results` ya guarda. `schemaVersion` **no sube**: sigue en 3.

Scripts que sí hacen falta, todos de desarrollo:

| Script | Para qué |
|---|---|
| `scripts/i18n-unused.js` | Barrido de claves de `i18n.js` sin uso. Con la rotación de textos del rediseño, hacerlo a ojo es inviable |
| `scripts/css-unused.js` | Cruce de los ~287 selectores de `styles.css` contra el marcado generado. Guía la limpieza y la verifica |
| `scripts/seed-session.js` | Siembra una sesión de demo en el emulador con historial, conflictos y empates, para QA de C3/C5/H2/H3 |
| `scripts/bump-version.js` | Reescribe todos los `?v=X.Y.Z` de `index.html` y el pie de página de una pasada. Con ~25 scripts, hacerlo a mano en cada release es una fuente garantizada de caché rancia |

---

## 4. Arquitectura objetivo

### 4.1 Módulos puros nuevos

| Módulo | Responsabilidad | Consumido por |
|---|---|---|
| `js/standings-view.js` | Toma las filas de `tournament.js` y devuelve los **bloques de empate** con su columna decisiva y el anidamiento. Réplica única de la cadena `PTS → DIF → PF → h2h → entrada`. También marca las tres primeras posiciones para las medallas | C3, F1, F2, G1 |
| `js/score-input.js` | Máquina de estados del marcador editable: valor tecleado, `+`/`−` sobre lo tecleado, confirmar al salir, vaciar revierte, validación de empate | C1, C2, C2b, G1 |
| `js/match-history.js` | Selectores sobre el historial: agrupar por día, filtrar por `action`, construir el diff, línea de tiempo por partido, estado legacy | H2, H3, H5 |

`standings-view.js` es el que más deuda evita: hoy la tabla y el criterio de orden viven en sitios distintos y pueden divergir en silencio. Centralizarlo es la diferencia entre que el resaltado de desempate sea correcto o mentira.

### 4.2 Capa de presentación

Árbol completo. **Un archivo por pantalla**, por legibilidad y para que varias personas trabajen sin chocar en el mismo fichero:

```
sw.js                     service worker: caché versionada, offline shell
css/tokens.css            variables de diseño
css/components.css        los componentes de components.js
css/screens.css           lo específico de cada pantalla
css/animations.css        @keyframes, utilidades y guarda de reduced-motion
js/ui/dom.js              el(), escapeHTML(), icon(), mount(), clear()
js/ui/components.js       appBar, subTabs, tabBar, button, pill, toggle, input,
                          scoreField, matchRow, standingsRow, statusStrip,
                          sheet, emptyState, personRow, progressBar, coupleRow
js/ui/screens/setup.js            A1, A2
js/ui/screens/setup-import.js     A3
js/ui/screens/setup-pairing.js    A4
js/ui/screens/setup-format.js     A5, A6
js/ui/screens/teams.js            B1, B2, B3
js/ui/screens/today.js            C1, C6
js/ui/screens/groups.js           C3
js/ui/screens/bracket.js          C4
js/ui/screens/scoring.js          C2, C2b, C5
js/ui/screens/access.js           D1, D2, D3
js/ui/screens/share.js            D4
js/ui/screens/king.js             E1, E2
js/ui/screens/results.js          F1, F2, F3, F4
js/ui/screens/history.js          H1, H2, H3, H5
js/app.js                         orquestador: estado, routing, suscripciones
```

Ninguna pantalla escribe HTML suelto: todas se componen desde `components.js`.

**Decisión de autoría del marcado:** las pantallas se construyen **en JavaScript desde los componentes**, no con `<template>` en el HTML. La alternativa con plantillas deja el marcado más legible para quien no toca JS, pero las listas repetidas (filas de partido, de clasificación, de jugador) hay que generarlas en JS de todos modos, y acabaríamos con dos lenguajes de plantilla conviviendo. Una sola forma de pintar.

`js/ui/components.js` es el eje del punto que pediste: **es el equivalente en código de la fila `01 · Components` del canvas**, uno a uno. Cada pantalla se compone de esas piezas y ninguna pinta HTML suelto.

`escapeHTML()` se mueve de `app.js:3669` a `dom.js`. Sigue siendo invariante de producto: todo texto de usuario pasa por ahí.

### 4.3 Routing

`workspace.js` hoy resuelve 4 destinos. Se extiende —manteniéndolo puro y testeado— a tres ejes:

- **destino**: setup · equipos · torneo · resultados
- **sub-vista**: hoy · grupos · bracket (solo dentro de torneo)
- **overlay**: anotar · historial · historial-de-partido · pedir-acceso · anotadores · compartir · elegir-modo

Los overlays son pantallas o sheets apiladas con su propia barra y botón de volver, no destinos de la tab bar. Esa distinción es la que evita que la tab bar crezca.

### 4.4 `index.html` y el fin del alternado con `hidden`

Pasa de traer las 15 secciones en estático a ser un shell:

```html
<div id="app-bar"></div>
<main id="app-main"></main>
<div id="app-tabbar"></div>
<div id="app-overlay"></div>
```

**Solo existe en el DOM la pantalla que se está viendo.** No es que el `hidden` se gestione mejor: desaparece. Hoy el coste de tenerlo todo vivo a la vez está documentado en el propio código:

- `hidden` se alterna **103 veces** en `app.js`.
- `styles.css:128` lleva el parche `[hidden] { display: none !important; }` con el comentario *"Ensure display:flex/grid rules never override the hidden attribute"* — la cicatriz típica de reglas de layout peleándose con el atributo.
- Hay **17 referencias** a capturar y restaurar el foco (`captureCommandCenterFocus`, `restoreScoreboardFocus`, `focusAfterScoreSynced`), que existen en buena parte porque todas las pantallas comparten el mismo DOM y el foco se pierde al repintar lo de al lado.

Con render bajo demanda, los tres síntomas se caen solos.

### 4.5 Carga: se descarta la carga diferida

Medición sobre v1.9.1: HTML + CSS + los 10 JS suman **412 KB en crudo, 90 KB comprimidos**. No hay problema de peso que resolver.

Se evaluaron y **se descartan** las cuatro variantes de carga diferida:

| Opción | `file://` | Motivo del descarte |
|---|---|---|
| Fragmentos `.html` con `fetch()` | ❌ | Rompe abrir `index.html` directamente, capacidad que `CLAUDE.md` documenta como soportada |
| Módulos ES con `import()` dinámico | ❌ | Mismo problema, y obliga a reescribir los 10 harness de test |
| Inyectar `<script>` clásicos bajo demanda | ✅ | Viable, pero sin beneficio medible a 90 KB |
| `<template>` inertes | ✅ | No difiere carga, solo difiere el parseo a DOM vivo |

**El argumento decisivo es de producto, no técnico:** esta app se usa en la cancha, al sol y con señal mala. Con carga diferida, el instante en que alguien toca "Anotar" es el instante en que el navegador sale a buscar un archivo; si falla, falla justo cuando importa. Bajar los 90 KB completos al abrir es más lento una vez y fiable siempre.

**Fragmentar el código y fragmentar la carga son decisiones independientes.** Se fragmenta el código al máximo (§4.2) y se cargan todos los archivos al arrancar. La opción de `<script>` inyectados queda abierta sin rehacer nada si algún día el peso crece de verdad.

**Coste a tener en cuenta:** el orden de scripts pasa de 10 a ~25 archivos, y el checklist de release exige bumpear `?v=` en todos — de ahí `scripts/bump-version.js` (§3.6). Hay que actualizar el paso 2 del checklist en `CLAUDE.md` y la tabla de arquitectura.

### 4.6 Invalidación de caché

**Hoy no hay ninguna configuración de hosting en el repo** — ni `railway.toml`, ni `Caddyfile`, ni `_headers`. Railway sirve con `RAILPACK_SPA_OUTPUT_DIR=.` y las cabeceras que traiga por defecto.

Eso deja el `?v=` a medias: **los assets versionados solo se renuevan si el navegador revalida `index.html` primero**, porque es ahí donde viven las URLs nuevas. Si `index.html` está cacheado, nadie ve el cambio. Es exactamente el escenario que nos preocupa en v2: un anotador con la versión vieja escribiendo resultados sin dejar entrada en el historial (§9.2).

Tres capas, de menos a más:

**1 · Cabeceras HTTP.** `Cache-Control: no-cache` en `index.html` (revalidar siempre) y `max-age=31536000, immutable` en los assets con `?v=`. Es la respuesta clásica y correcta. **Hay que verificar qué admite Railpack para servir estáticos** — no doy por hecho que se pueda sin comprobarlo.

**2 · Service Worker.** Independiente del hosting, así que funciona pase lo que pase con la capa 1:
- Nombre de caché versionado; en `activate` se borran los anteriores.
- `skipWaiting()` + `clients.claim()` para activar sin esperar a cerrar pestañas.
- **Network-first para `index.html`**, cache-first para los assets versionados. Esto es lo que impide que un SW malo deje la app clavada en una versión.
- **Beneficio mayor que la propia invalidación: la app funciona sin señal.** Hoy, abrirla con caché fría y sin datos no carga nada. Con SW, el shell arranca y los flujos locales —alta de jugadores, generar equipos— siguen funcionando. Es el mismo escenario de cancha que ya usamos para descartar la carga diferida.

**3 · Aviso de versión.** Un nodo `config/minClientVersion` en RTDB; si el cliente en ejecución es anterior, se muestra "hay una versión nueva" con un botón de recargar. ~20 líneas, y cierra definitivamente el riesgo de huecos en el historial para cualquiera que esté conectado.

**Recomendado: 2 + 3**, y verificar 1 como refuerzo. El Service Worker entra en el slice B; el aviso de versión en el A, junto al resto del contrato de datos.

---

## 5. Plan por slices

Cada slice es una unidad de trabajo y un commit, todos sobre **una sola rama: `feat/redesign-v2`**. La cadena se mantiene en el orden de los commits, no en ramas separadas — una rama por slice multiplicaba los merges sin dar nada a cambio, porque la cadena es lineal y nadie trabaja en paralelo sobre ella.

| # | Slice | Contenido | Boards | Depende de |
|---|---|---|---|---|
| **A** | Contrato de datos | Reglas `resultHistory` + `ownerLabel`; repositorio con `watchHistory()` y `saveResult()` multi-path; conflicto por rechazo de reglas; aviso de versión (`config/minClientVersion`); tests de reglas | H0 | — |
| **B** | Fundación UI | Tokens CSS nuevos; `dom.js`; `components.js` completo; `animations.css`; shell de `index.html`; app bar + tab bar; routing extendido en `workspace.js` + harness; **service worker** | 00, 01, M1 | A |
| **C** | Setup | Alta rápida, lista con buscador, readiness como barra, pegar lista, emparejar a mano, configurar torneo, editor de formato | A1–A6 | B |
| **D** | Equipos | Filas compactas de pareja, avisos y opciones, hoja de elegir modo | B1–B3 | B |
| **E** | Día de torneo | Sub-tabs; Hoy; Grupos con `standings-view.js`; Bracket | C1, C3, C4 | B |
| **F** | Anotar | `score-input.js`; pantalla de anotación; campo editable; estados de sync y conflicto; celebración del ganador | C2, C2b, C5, M2 | A, E |
| **G** | Colaboración | Espectador, pedir acceso, anotadores, compartir | D1–D4 | B |
| **H** | Historial | `match-history.js`; submenú; historial completo; historial por partido; entrypoints; estados límite | H1–H5 | A, E |
| **I** | King of the Court | Trono, rally, cola, campeón | E1, E2 | B |
| **J** | Cierre | Resultados en progreso, con campeón, vacío, sesión no disponible | F1–F4 | E |
| **K** | Responsive | ≥600 nav en app bar y dos columnas; ≥960 tres columnas | G1, G2 | C–J |
| **L** | Limpieza y release | Auditoría con los scripts de barrido; borrado final; docs; v2.0.0 | — | todo |

Los slices C, D, G, I y J son paralelizables una vez cerrado B.

---

## 6. Qué se reutiliza, qué se reescribe

### Se conserva sin tocar
`pairing.js` · `player-import.js` · `tournament-format.js` · `king-of-court.js` · `firebase-config.js`

### Se extiende
- `tournament.js` — expone la cadena de desempate para que `standings-view.js` no la duplique.
- `tournament-day.js` — ya resuelve próximo partido, listas y progreso; alimenta C1 tal cual.
- `workspace.js` — tres ejes de routing.
- `tournament-repository.js` — historial y escritura multi-path.
- `i18n.js` — mecanismo intacto, claves nuevas.

### Se reescribe
`index.html` · `css/styles.css` · toda la capa de render de `app.js`

---

## 7. Limpieza

### 7.1 CSS que desaparece

| Bloque | Líneas aprox. | Motivo |
|---|---:|---|
| Live Scoreboard Panel | 389 | Sustituido por la pantalla de anotación (C2/C2b) |
| Match Card | 168 | Sustituido por la fila compacta |
| Manual Pairing Panel | 93 | Emparejar a mano se rediseña a tocar-dos (A4) |
| Header + Language Switcher | 56 | La cabecera de 170px muere; el idioma pasa a control de 36px |
| Couples Grid / Couple Card | 62 | Fila compacta de pareja (B1) |
| Match Type + Pairing Toggle | 88 | Colapsan en **un** componente `toggle` |
| Tournament Setup Row + Format Setup opts | ~60 | Mismo componente `toggle` |
| Unmatched Notice | 25 | Pasa a `statusStrip` |
| Read-only Banner | 83 | Pasa a la tarjeta de acceso (D1) |
| Readiness checklist | ~25 | Barra de progreso + bloqueos |
| Variantes de `.btn` | ~80 | Se reducen a primary / ghost / danger |

Estimado: **~1.100 de 2.489 líneas de CSS se eliminan.**

### 7.2 JS que desaparece de `app.js`

| Funciones | Líneas aprox. |
|---|---:|
| `renderScoreboardPanel` + captura/restauración de foco + `refreshScoreboardPanel` + `requestFinishConfirmation` | ~420 |
| Bloque de emparejado manual (`renderManualDropdowns` … `handleConfirmManualCouples`) | ~200 |
| `renderResults` (tarjetas de pareja) | ~90 |
| `patchWorkspaceNavItems` / `patchWorkspaceNavButton` / `patchWorkspaceCta` | ~70 |
| `renderMatchCard` / `renderMatchList` en su forma actual | ~160 |
| Acrobacias de foco entre pantallas (`captureCommandCenterFocus`, `restoreCommandCenterFocus`, `captureScoreboardFocus`, `restoreScoreboardFocus`, `focusAfterScoreSynced`) | ~90 |

Y con ellas el parche `[hidden] { display: none !important; }` de `styles.css:128`: sin DOM compartido no hay nada que ocultar a la fuerza.

### 7.3 Dependencias — Animate.css

**Corrección respecto a la primera versión de este plan:** no se usa en un sitio, se usa en **siete** (`app.js` líneas 642, 701, 1702, 2152, 2598, 2878, 3559). La entrada escalonada de listas es un patrón transversal, no un adorno aislado.

Aun así **se elimina**, por tres motivos, el primero de peso:

1. **Hay un bug funcional en producción.** `removePlayer()` (`app.js:642`) añade `animate__fadeOut` y espera el evento `animationend` para confirmar el borrado. Si la CDN no carga —sin señal, caché fría, `file://`— la clase no tiene animación, el evento **nunca se dispara** y **el jugador no se borra**. Una operación funcional depende de una hoja de estilos externa.
2. Se usan 3 animaciones de una librería de cientos, y el TO-BE añade 6 propias que Animate.css no tiene. Conservarla no ahorra nada.
3. Una petición externa menos en cancha con mala señal — el mismo argumento con el que se descarta la carga diferida (§4.5).

**Sustituto: `css/animations.css`**, un único archivo con todos los `@keyframes`, las clases de utilidad y la guarda de `prefers-reduced-motion`. Centralizado, no repartido por los archivos de pantalla. Especificado en los boards **M1** (inventario y reglas) y **M2** (celebración del ganador).

Inventario: se conservan `list-in`, `list-out` y `toast-in`; se añaden `score-bump`, `winner-flash`, `sheet-in`, `screen-in`, `progress-fill` y `sync-pulse`.

Dos reglas que salen del bug:

- **Ninguna animación puede ser requisito para completar una operación.** El borrado confirma el estado primero y anima después, con `setTimeout` de respaldo junto a `animationend`.
- **Con `prefers-reduced-motion` se quita el movimiento, no la información.** La celebración del ganador sigue mostrando su estado final (check, toast, fila resaltada) sin transición. El bloque de `styles.css:1898` ya neutraliza las duraciones con `!important`; esa garantía se conserva sin depender de la librería.

### 7.4 Otros

- `i18n.js`: barrido de claves huérfanas con `scripts/i18n-unused.js`.
- `tests/`: se conservan y amplían los harness de módulos puros; se añaden `standings-view`, `score-input` y `match-history`; `integration.test.html` se reescribe para el shell nuevo; `firebase-rules.test.js` suma los casos de `resultHistory`.
- `.playwright-mcp/` ya está en `.gitignore`.

**Criterio de cierre del slice L:** `scripts/css-unused.js` y `scripts/i18n-unused.js` devuelven cero, y ninguna función de `app.js` queda sin llamar.

---

## 8. Verificación

Por cada slice, además de lo del checklist de release:

- Harness del módulo puro que introduzca, en verde.
- `npm run test:rules` en verde (obligatorio en A, F y H).
- **320px sin overflow horizontal** — sigue siendo blocker de release. Ojo con C3: la tabla completa tiene 7 columnas numéricas; la verificación a 320px real exige Playwright con `setViewportSize`, no headless a secas (ver `CLAUDE.md`).
- Targets táctiles ≥44px, y ≥56px en los controles de anotación.
- EN/ES sin claves sin traducir.

---

## 9. Decisiones

### 9.1 Tomadas

| Decisión | Resolución |
|---|---|
| Escritura del historial | **`update()` multi-path atómico.** El conflicto pasa a detectarse por rechazo de reglas; el repositorio relee para construir la tarjeta de conflicto (§3.4) |
| Nombre del organizador | **Se pide al crear el torneo**, por trazabilidad. En el historial se muestra como `Nombre — Organizador` para distinguirlo de un anotador (§3.5) |
| Fragmentación del código | **Un archivo por pantalla** (§4.2), cargados todos al arrancar |
| Carga diferida | **Descartada.** 90 KB comprimidos y uso en cancha con señal mala (§4.5) |
| Autoría del marcado | **JavaScript desde `components.js`**, sin `<template>` (§4.2) |
| Versión | **v2.0.0**. `schemaVersion` se queda en 3, así que los links `#s=` compartidos siguen funcionando en ambos sentidos |
| Invalidación de caché | **Service worker + aviso de versión** (§4.6). Verificar además las cabeceras de Railpack |
| Animate.css | **Se elimina**, sustituida por `css/animations.css`. Se conservan las animaciones actuales, se arregla el bug de borrado y se añaden seis (§7.3, boards M1/M2) |
| Alcance del historial | **Solo resultados de partido.** Los accesos los concede una sola persona y la estructura no es mutable —reiniciar borra la sesión entera, no la edita— así que auditarlas no aporta |
| Tablas de Resultados | **Se igualan a la de Grupos**: mismas columnas, mismos bloques de empate, misma fuente (`standings-view.js`). Ya compartían implementación en `app.js:1506` y `app.js:3197` |
| Medallas | **🥇🥈🥉 en las tres primeras posiciones** de las tablas de Resultados (F1 y F2), en lugar del número de posición |

### 9.2 Abiertas

1. **Podio de F2:** al llevar las medallas a la tabla, las tarjetas de 2º y 3º que había encima quedaron duplicando información y **las quité**. El campeón sigue teniendo su tarjeta grande. Si prefieres recuperar el podio, es reversible.
2. **Medallas en F1 (torneo en curso):** están puestas, con la línea *"Posiciones provisionales: quedan 20 partidos por jugar"* debajo de la tabla. Una medalla de oro a mitad de torneo puede leerse como "ya ganó"; la leyenda lo acota, pero si prefieres que F1 vaya sin medallas hasta que el torneo cierre, es un cambio de una línea.

### 9.3 Pendientes, para el final

Trabajo identificado y **deliberadamente aplazado**, no olvidado. Se cierra antes del release de v2.0.0.

| # | Pendiente | Por qué está fuera de su slice | Dónde entra |
|---|---|---|---|
| P1 | **Código QR en el menú del torneo (board H1).** El menú lleva Historial, Anotadores, Compartir y Reiniciar; el QR del canvas no está. | Generar un QR sin dependencias y sin build es trabajo propio —o una librería, que choca con el criterio de no añadir dependencias, o un generador a mano—, no un detalle del slice H. | Antes de L, como slice propio. |
| ~~P2~~ | ~~**Buscador de partidos por jugador o pareja.**~~ **Hecho**, y no como port de v1: board **C6 · TORNEO · TODOS LOS PARTIDOS**, con el buscador dentro del listado completo. Al implementarlo apareció que en v2 «Ver todos» llevaba a Grupos —que solo tiene la tabla— así que el calendario completo no existía en ninguna pantalla; C6 lo es. | — | Cerrado. |

**Nota de ramas:** toda la cadena vive en **una sola rama, `feat/redesign-v2`**. Los slices son commits, no ramas: la convención de Feature Branch Chain de §5 se sigue en el orden del trabajo, no en su topología.

---

## 10. Trazabilidad boards → slices

| Flujo | Boards | Slice |
|---|---|---|
| A · Alta y configuración | A1–A6 | C |
| B · Equipos | B1–B3 | D |
| C · Día de torneo | C1, C3, C4 | E |
| C · Todos los partidos y su buscador | C6 | P2 |
| C · Anotar | C2, C2b, C5 | F |
| D · Colaboración | D1–D4 | G |
| E · King of the Court | E1, E2 | I |
| F · Cierre y estados | F1–F4 | J |
| G · Responsive | G1, G2 | K |
| H · Historial | H0 | A |
| H · Historial | H1–H5 | H |
| M · Movimiento | M1 | B |
| M · Movimiento | M2 | F |
