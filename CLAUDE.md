# Diálisis Contigo

App para que los familiares de pacientes de un servicio de diálisis hospitalario recuerden cómo hacer la **diálisis peritoneal en casa**. En el área de diálisis peritoneal les explican el procedimiento, pero a muchos les cuesta retenerlo por nervios o por bajo nivel educativo.

## Restricciones que guían todo
- **Costo cero.** Sin servidor ni servicios de pago. Por eso es una app web instalable (PWA) publicada en GitHub Pages.
- **Funciona sin internet**, y los datos (configuración, registro y recambio en curso) se quedan solo en el teléfono, en `localStorage` (`dp-config`, `dp-log`, `dp-progress`).
- **Usuarios nerviosos o con poca práctica leyendo.** Una cosa por pantalla, dibujo grande, frases cortas, botones grandes, botón Escuchar en cada paso y letra grande (botón Aa). Los textos van en español, tratando de "usted".

## Estado
- Es una **prueba de concepto**. Desde 0.0.5.1, "Antes de empezar" y los pasos vienen de lo que dictó una enfermera del servicio (con un video de enfermería como referencia para los nombres de las partes). Todavía falta la aprobación formal del equipo de nefrología, por eso la app sigue indicando en cada pantalla que el contenido es de ejemplo. Los teléfonos también son de ejemplo.
- El nombre "Diálisis Contigo" es provisional.
- App publicada: https://enriquejortizg.github.io/peritonealhelper/ (GitHub Pages desde `main`, carpeta `/docs`).
- Versión de presentación (la app dentro de un teléfono, con notas): https://claude.ai/artifact/ED46QZZbxHzQWuDv1pk2B1, privada del usuario. Se actualiza publicando `dialisis-contigo.html` con ese `url`.

## Estructura
- `docs/index.html`: **única fuente de la app**, con HTML, CSS y JS en un solo archivo y sin dependencias. El contenido editable está en constantes al principio del `<script>`: `PREP`, `STEPS`, `ALARMS`, `APP_NAME`, `DEFAULTS`, `SCHEDULES`, `EXAMPLE`. Los textos de `STEPS` van en frases cortas, una idea por frase, y no repiten el título (se leen seguidos).
- `docs/sw.js`: service worker para uso sin internet. Su `VERSION` debe ser igual a `APP_VERSION` (ver "Versiones").
- `docs/manifest.json` y `docs/icons/`: instalación en Android.
- `dialisis-contigo.html`: versión de presentación **generada**; no se edita a mano. Se regenera con `node scripts/generar-presentacion.mjs`, que quita los bloques `<!-- solo-app -->` y la clase `modo-app`.
- `tests/flujo.test.js`: prueba del flujo de familia nueva con un DOM simulado. Se corre con `node tests/flujo.test.js`.

## Funciones actuales
- "Antes de empezar": cada punto tiene un botón **i** que abre lo que hay que hacer para darlo por cumplido (`PREP[].items`, más `ask` para lo que hay que confirmar con la enfermera), con Escuchar y "Listo, ya lo hice", que marca el punto y abre el detalle de la siguiente casilla sin marcar (si ya están todas, cierra el detalle).
- Configuración inicial con la enfermera: nombre del paciente, tipo de diálisis (solo la manual; la de máquina aparece como "Próximamente"), recambios al día (de 1 a 4, por defecto 4) y horarios, unidad y teléfono. La bolsa de la diálisis manual siempre es de 2 L (`BAG_ML`), así que no se pregunta. Termina con un resumen y un recambio de práctica que no se anota.
- Código QR del hospital **simulado**: no usa la cámara y carga `EXAMPLE`.
- Recambio guiado de 29 pasos (limpieza con un paño de 5 caras, tres lavados de manos, conexión, drenaje, infusión, desconexión y pesado de la bolsa). Los pasos pueden tener una lista corta (`STEPS[].items`), que se muestra en la misma pantalla, o subpasos con pantalla propia (`STEPS[].subs`, con `subLabel`), como los 8 movimientos del lavado quirúrgico y la desconexión. El paso con subpasos muestra primero un resumen y el reloj; el reloj sigue corriendo al pasar por sus subpasos. El subpaso en curso se guarda en `dp-progress` (`sub`). Solo hay temporizador en los lavados de manos y en "contar hasta 5"; el drenaje y la infusión no tienen tiempo fijo porque el familiar ve cuándo terminan. Incluye aspecto del líquido, alarmas, registro, recordatorios y ajustes (incluye "Empezar de nuevo" para repetir la demostración).
- **Modo automático** (botón en "Antes de empezar", junto a "Empezar los pasos"): para cuando el familiar ya tiene las manos lavadas. La app lee cada paso y avanza cuando la persona **pasa la mano una vez frente a la cámara de adelante**, también mientras la app lee. La cámara compara con la imagen de cómo estaba al empezar: avanza cuando aparece algo nuevo y en menos de 2 s la imagen vuelve a ser como antes. Lo que ya estaba (la cara) no cuenta, y lo que aparece y se queda (la cámara tapada, alguien que se acerca y se queda) pasa a ser la nueva referencia sin avanzar. No usa reconocimiento de voz: se quitó en 0.0.12.1 (ver "Decisiones tomadas"). El permiso de la cámara se pide al tocar el botón, antes de lavarse las manos; si la cámara falla, sale del modo automático y lo dice. Los pasos con reloj lo inician solos al terminar de leer. Mantiene la pantalla encendida y se apaga al salir de los pasos o con el botón Salir. Antes de leer, enciende la cámara y espera a que esté lista (`autoWake`), y empieza con una frase corta ("Modo automático."), porque Android puede cortar el comienzo de la primera frase. Al salir de la app se callan la voz y la cámara (`autoSleep`); al volver se enciende la cámara y lee el paso en el que iba. `dp-progress` guarda `auto`: al volver a abrir la app sigue en modo automático; si el teléfono no deja hablar sin tocar la pantalla (`not-allowed`), muestra un botón "Seguir".
- Escuchar se lee frase por frase, con Pausar (continúa desde la frase en curso) y Detener (la próxima vez empieza desde el principio). La pausa propia del navegador no es confiable en Android.
- Botón "Ver video" en cada paso: se activa cuando el paso tiene `video` en `STEPS`; si no, aparece deshabilitado.
- El temporizador cuenta contra la hora de término y mantiene la pantalla encendida. Si termina con la app en segundo plano, suena una alarma fuerte durante un minuto y llega una notificación; el aviso hablado se da al volver a la app.
- Cada recambio es **una sola** entrada del registro (`S.session.id`): cambiar el aspecto del líquido actualiza esa entrada.
- El recambio en curso se guarda; al reabrir la app continúa en el mismo paso. Durante el recambio, Inicio pide confirmación porque se pierde el progreso.

## Forma de trabajar
1. Trabajar en una rama nueva y editar `docs/index.html`.
2. Cambiar la versión en `APP_VERSION` (`docs/index.html`) y en `VERSION` (`docs/sw.js`), con el mismo valor.
3. Correr `node tests/flujo.test.js` y `node scripts/generar-presentacion.mjs`.
4. Hacer commit, push y PR. El usuario fusiona los PR, y al fusionar en `main` se publica solo en uno o dos minutos.
5. Para probar en local: `python -m http.server 8080` desde la raíz y abrir http://localhost:8080/docs/.

## Versiones
La versión se ve junto al título de la app, en letra pequeña y gris (por ejemplo, `v0.0.3.1`). Tiene el formato **PRODUCCIÓN.GRANDE.RELEASE.MENOR**:
- **PRODUCCIÓN**: 0 mientras sea prototipo; pasa a 1 al salir a producción.
- **GRANDE**: cambios grandes.
- **RELEASE**: sube con **cada cambio que llega a `main`**, y el número MENOR vuelve a 1.
- **MENOR**: correcciones de un release que salió con algo equivocado y se vuelve a subir (0.0.3.1 → 0.0.3.2).

Va en dos lugares que deben coincidir: `APP_VERSION` en `docs/index.html` y `VERSION` en `docs/sw.js`. La prueba falla si no son iguales. Cambiar `VERSION` es lo que hace que los teléfonos descarguen la app nueva.

Historial: 0.0.1 prototipo inicial · 0.0.2 configuración inicial y nombre · 0.0.3 mejoras tras probar en teléfono · 0.0.3.1 versión visible · 0.0.4.1 detalle de "Antes de empezar" · 0.0.5.1 pasos dictados por la enfermera · 0.0.6.1 recambios de 1 a 4, bolsa fija de 2 L y "Marque cada casilla" · 0.0.7.1 subpasos con pantalla propia y modo automático por voz · 0.0.8.1 hablar o pasar la mano mientras se lee, gesto de la mano corregido, "Listo, ya lo hice" abre la siguiente casilla y voz sin internet con Vosk · 0.0.9.1 mano que compara con la imagen inicial, órdenes mientras lee aunque se mezclen con la voz de la app y «Anterior» en pantalla · 0.0.10.1 órdenes mientras lee, corregido: se separa el eco de la app de la voz de la persona alineando lo oído con lo que la app ya dijo · 0.0.11.1 el modo automático no corta el primer paso y sigue al volver a la app; voz sin internet con barra de avance y opción de borrarla; "Falta 1". · 0.0.12.1 se quita el reconocimiento de voz: el modo automático avanza solo con la mano frente a la cámara. · 0.0.13.1 textos de los pasos más cortos y sencillos (sin repetir el título, una idea por frase).

## Licencia
Software libre bajo **GPL-3.0-or-later**, © 2026 Enrique Ortiz. El texto oficial está en `LICENSE`. Los archivos de código llevan una cabecera SPDX, y Ajustes muestra el aviso de licencia con un enlace al código fuente. Los archivos nuevos de código deben llevar la misma cabecera.

## Decisiones tomadas
- Se quitó el reconocimiento de voz del modo automático (0.0.12.1): con el navegador y con Vosk sin internet traía demasiados problemas (eco de la propia app, cortes, pitidos, necesidad de internet o de descargar un modelo de 40 MB) y no terminaba de funcionar bien. Queda solo la mano frente a la cámara. Al abrir la versión nueva se borra la voz sin internet que se hubiera descargado (`dp-voz`, IndexedDB `/vosk` y caché `voz`).
- Se descartó un bot de Telegram: necesita algo encendido siempre, requiere internet y da poco control de la presentación.
- PWA ahora. Para alarmas confiables a la hora del recambio, empaquetar después como APK con Capacitor, reutilizando el mismo contenido.

## Pendientes e ideas
- Textos detallados de cada movimiento del lavado quirúrgico, para validar: `/mnt/project-files/pasos/subpasos-para-validar.md` (proyecto de Claude). Hasta entonces, cada subpaso usa solo lo que dictó la enfermera.
- Probar el modo automático en teléfonos reales: luz, distancia a la cámara y pasar la mano con guantes.
- Dudas abiertas con la enfermera: si la mascarilla va antes del primer lavado de manos (hoy está antes, como suposición), cómo pasar el peso de la bolsa de drenaje a ml, el color del tapón de cada concentración, si se incluye el cuidado diario del orificio y si la ruptura de la línea de transferencia va como alarma.
- Dibujos definitivos para los pasos nuevos (paño, Exsept, pinza, paral, empaque, línea, pesa); los actuales son provisionales.
- Pasos reales del hospital y audios grabados por las enfermeras, en lugar de la voz del teléfono.
- Código QR real de configuración generado por el personal.
- APK con alarmas locales.
- Diálisis con máquina nocturna (DPA).
- Posible `short_name` más corto en el manifiesto, por si Android corta el nombre bajo el ícono.
