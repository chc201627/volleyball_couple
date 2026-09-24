# Emparejamiento de Vóley Playa

Aplicación web estática que registra jugadores de vóley playa y genera parejas aleatorias usando un algoritmo de emparejamiento por prioridad: parejas mixtas primero, luego del mismo género, con manejo de jugador sin pareja.

**Demo en vivo:** https://chc201627.github.io/volleyball_couple/

## Características

- Registro de jugadores con nombre y género
- Importación masiva desde texto pegado con vista previa editable, validación y deshacer
- Validación en tiempo real (largo mínimo/máximo, campos obligatorios)
- Algoritmo de emparejamiento por prioridad (mixto > mismo género > sin pareja)
- Regenerar parejas con nuevas combinaciones aleatorias
- Diseño responsivo (320px a 1920px)
- Soporte bilingüe (Español / Inglés)
- Transiciones con Animate.css
- Torneos por grupos con resultados Pending, Live y Finished
- Marcadores colaborativos en tiempo real desde dispositivos autorizados
- Solicitud, aprobación y revocación de anotadores por parte del organizador
- Protección contra sobrescrituras mediante revisiones por partido
- Enlaces Firebase v2 y lectura compatible de enlaces v1

## Stack Tecnológico

- HTML5, CSS3, JavaScript (ES6+) sin frameworks
- [Animate.css](https://animate.style/) vía CDN
- GitHub Pages para hosting
- Firebase Authentication anónima y Realtime Database para sesiones compartidas
- Railway para el despliegue principal

## Inicio Rápido

No requiere compilación. Abre `index.html` en cualquier navegador moderno:

```bash
# Clonar el repositorio
git clone https://github.com/chc201627/volleyball_couple.git
cd volleyball_couple

# Abrir en el navegador
open index.html
```

## Estructura del Proyecto

```
index.html                    Aplicación de página única y orden contractual de scripts
css/                          Tokens, reset, shell, componentes, pantallas y animaciones
js/pairing.js                 Algoritmo puro de generación y balance de niveles 1–5
js/player-import.js           Parser, normalizador y validador puro de listas pegadas
js/app-state.js               Estado y persistencia local; no depende del DOM
js/app-orchestrator.js        Composición de estado, navegación, pantallas y repositorios
js/tournament*.js             Dominio, formatos y selectores de torneos
js/ui/                        Componentes, registro de pantallas y pantallas por módulo
scripts/run-browser-tests.js  Runner determinista de los harnesses del navegador
tests/                        Harnesses browser y pruebas de reglas Firebase
```

El orden de scripts de `index.html` es parte del contrato: Firebase carga antes
que los módulos de dominio, estos antes de UI, y `app-orchestrator.js` cierra la
composición. No existe un monolito `js/app.js` ni una hoja `css/styles.css`.

## Algoritmo de Emparejamiento

1. Separar jugadores por género y mezclar ambas listas aleatoriamente
2. **Prioridad 1:** Crear parejas mixtas (hombre + mujer)
3. **Prioridad 2:** Emparejar jugadores restantes del mismo género
4. **Prioridad 3:** Marcar jugador sobrante como sin pareja (total impar)

## Ejecutar Tests

Instale una vez las dependencias de desarrollo y ejecute las reglas con los
emuladores reales de Auth y Realtime Database:

```bash
npm install
npm run test:rules
```

Ejecute todos los harnesses browser de forma determinista:

```bash
npm run test:browser
```

`test:browser` sirve los archivos solo en `127.0.0.1`, encuentra Chrome o
Chromium en rutas habituales (o en `BROWSER=/ruta/al/navegador`), aísla el
almacenamiento de cada harness y falla por aserciones, timeouts o errores de
consola. Es tooling de desarrollo: no agrega un runtime de producción.

Incluye los 16 harnesses actuales: `app-state`, `king-of-court`,
`match-history`, `offline-scoring`, `pairing`, `player-import`, `score-input`,
`session-access`, `standings-view`, `storage-mobile`, `teams-ui`,
`tournament-day-selectors`, `tournament-format`, `tournament-repository`,
`tournament` y `workspace-view-machine`.

Para probar la aplicación contra los emuladores sin tocar producción:

```bash
npx firebase emulators:start --project demo-volleyball-couple --only auth,database
python3 -m http.server 4173 --bind 127.0.0.1
```

Abra `http://127.0.0.1:4173/?firebaseEmulator=1`. El parámetro solamente se
activa en `localhost` o `127.0.0.1`. Consulte `firebase-plan.md` para despliegue,
migración y rollback.

### Verificar 320px con una ventana real

Los harnesses verifican contratos de UI, almacenamiento y controles; la
validación de breakpoints sigue requiriendo un viewport real de 320px. En
Chrome 151+, `--window-size=320,568` en modo headless se recorta a un mínimo de
~500px, por lo que una ejecución headless simple omite silenciosamente el CSS
real de 320px. Para verificar breakpoints, use Playwright contra el Chrome del
sistema en un directorio temporal y compruebe `window.innerWidth === 320` antes
de medir objetivos y overflow.

## Flujo de marcadores colaborativos

1. El organizador inicia el torneo y comparte el enlace `#s=`.
2. El anotador abre el enlace, identifica su dispositivo y solicita acceso.
3. El organizador aprueba la solicitud desde su panel privado.
4. El anotador guarda progreso Live o finaliza un partido; los espectadores ven
   el resultado y la clasificación en tiempo real.
5. Una revocación bloquea la siguiente escritura. Los conflictos, desconexiones
   y permisos rechazados conservan el último resultado confirmado y permiten reintentar.

## Importar una lista

Seleccione **Pegar lista**, pegue una persona por línea y revise antes de importar. Formato: `Nombre, Género, Nivel`; género y nivel son opcionales, y el nivel admite valores enteros de `1` a `5`. En español, `H` significa hombre y `M` mujer. La acción **Deshacer importación** elimina solamente el último lote agregado.

## Navegadores Soportados

Chrome, Firefox, Safari, Edge (últimas 2 versiones), iOS Safari 13+
