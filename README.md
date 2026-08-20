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
index.html              Aplicación de página única
css/styles.css          Estilos BEM mobile-first con variables CSS
js/pairing.js           Módulo independiente del algoritmo de emparejamiento
js/player-import.js     Parser y validador puro para listas pegadas
js/i18n.js              Internacionalización (ES/EN)
js/app.js               Lógica de UI (IIFE, depende de pairing.js + i18n.js)
tests/
  pairing.test.html     Tests unitarios del algoritmo (6 escenarios + casos límite)
  player-import.test.html Tests del contrato de importación masiva
  integration.test.html Tests de integración del flujo completo
```

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

Abre los archivos de test directamente en el navegador:

- `tests/pairing.test.html` — Tests unitarios (6 escenarios, casos límite 0/1/200 jugadores, aleatorización, unicidad)
- `tests/player-import.test.html` — Formatos de lista, normalización EN/ES, validación y límite de 200 jugadores
- `tests/integration.test.html` — Flujo completo (agregar jugadores, validar, generar, regenerar, limpiar todo)
- `tests/tournament.test.html` — calendario, estados y clasificación
- `tests/tournament-repository.test.html` — repositorio, conflictos y compatibilidad v1/v2
- `tests/king-of-court.test.html` — modo King of the Court

Para probar la aplicación contra los emuladores sin tocar producción:

```bash
npx firebase emulators:start --project demo-volleyball-couple --only auth,database
python3 -m http.server 4173 --bind 127.0.0.1
```

Abra `http://127.0.0.1:4173/?firebaseEmulator=1`. El parámetro solamente se
activa en `localhost` o `127.0.0.1`. Consulte `firebase-plan.md` para despliegue,
migración y rollback.

## Flujo de marcadores colaborativos

1. El organizador inicia el torneo y comparte el enlace `#s=`.
2. El anotador abre el enlace, identifica su dispositivo y solicita acceso.
3. El organizador aprueba la solicitud desde su panel privado.
4. El anotador guarda progreso Live o finaliza un partido; los espectadores ven
   el resultado y la clasificación en tiempo real.
5. Una revocación bloquea la siguiente escritura. Los conflictos, desconexiones
   y permisos rechazados conservan el último resultado confirmado y permiten reintentar.

## Importar una lista

Seleccione **Pegar lista**, pegue una persona por línea y revise antes de importar. Formato: `Nombre, Género, Nivel`; género y nivel son opcionales, y el nivel admite `1`, `2` o `3`. En español, `H` significa hombre y `M` mujer. La acción **Deshacer importación** elimina solamente el último lote agregado.

## Navegadores Soportados

Chrome, Firefox, Safari, Edge (últimas 2 versiones), iOS Safari 13+
