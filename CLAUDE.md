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
- `docs/index.html`: **única fuente de la app**, con HTML, CSS y JS en un solo archivo y sin dependencias. El contenido editable está en constantes al principio del `<script>`: `PREP`, `STEPS`, `ALARMS`, `APP_NAME`, `DEFAULTS`, `SCHEDULES`, `EXAMPLE`.
- `docs/sw.js`: service worker para uso sin internet. Su `VERSION` debe ser igual a `APP_VERSION` (ver "Versiones").
- `docs/manifest.json` y `docs/icons/`: instalación en Android.
- `dialisis-contigo.html`: versión de presentación **generada**; no se edita a mano. Se regenera con `node scripts/generar-presentacion.mjs`, que quita los bloques `<!-- solo-app -->` y la clase `modo-app`.
- `tests/flujo.test.js`: prueba del flujo de familia nueva con un DOM simulado. Se corre con `node tests/flujo.test.js`.

## Funciones actuales
- "Antes de empezar": cada punto tiene un botón **i** que abre lo que hay que hacer para darlo por cumplido (`PREP[].items`, más `ask` para lo que hay que confirmar con la enfermera), con Escuchar y "Listo, ya lo hice", que marca el punto y abre el detalle de la siguiente casilla sin marcar (si ya están todas, cierra el detalle).
- Configuración inicial con la enfermera: nombre del paciente, tipo de diálisis (solo la manual; la de máquina aparece como "Próximamente"), recambios al día (de 1 a 4, por defecto 4) y horarios, unidad y teléfono. La bolsa de la diálisis manual siempre es de 2 L (`BAG_ML`), así que no se pregunta. Termina con un resumen y un recambio de práctica que no se anota.
- Código QR del hospital **simulado**: no usa la cámara y carga `EXAMPLE`.
- Recambio guiado de 29 pasos (limpieza con un paño de 5 caras, tres lavados de manos, conexión, drenaje, infusión, desconexión y pesado de la bolsa). Los pasos pueden tener una lista corta (`STEPS[].items`), que se muestra en la misma pantalla, o subpasos con pantalla propia (`STEPS[].subs`, con `subLabel`), como los 8 movimientos del lavado quirúrgico y la desconexión. El paso con subpasos muestra primero un resumen y el reloj; el reloj sigue corriendo al pasar por sus subpasos. El subpaso en curso se guarda en `dp-progress` (`sub`). Solo hay temporizador en los lavados de manos y en "contar hasta 5"; el drenaje y la infusión no tienen tiempo fijo porque el familiar ve cuándo terminan. Incluye aspecto del líquido, alarmas, registro, recordatorios y ajustes (incluye "Empezar de nuevo" para repetir la demostración).
- **Modo automático** (botón en "Antes de empezar", junto a "Empezar los pasos"): para cuando el familiar ya tiene las manos lavadas. La app lee cada paso y avanza cuando la persona dice "Siguiente" o **pasa la mano una vez frente a la cámara de adelante**. La cámara compara con la imagen de cómo estaba al empezar: avanza cuando aparece algo nuevo y en menos de 2 s la imagen vuelve a ser como antes. Lo que ya estaba (la cara) no cuenta, y lo que aparece y se queda (la cámara tapada, alguien que se acerca y se queda) pasa a ser la nueva referencia sin avanzar. También entiende "Anterior" (o "Volver", "Atrás", "Regresar"), "Repetir", "Pausa" e "Iniciar" (reloj). Se puede hablar o pasar la mano **mientras la app lee**: el reconocedor suele juntar la voz de la app con la de la persona en un solo resultado, así que `pickCmd` toma la última orden que no esté en la frase que se está leyendo (ni en las vecinas); justo después de leer, ignora frases de varias palabras que sean solo eco de lo leído. Si la familia descargó la **voz sin internet** (Ajustes), usa Vosk; si no, el reconocimiento de voz del navegador (Web Speech API), que en Android casi siempre necesita internet. La cámara funciona siempre, con o sin voz. Los permisos de micrófono y cámara se piden al tocar el botón, antes de lavarse las manos. Si la voz falla (sin internet, sin permiso o sin soporte), queda la mano. Los pasos con reloj lo inician solos al terminar de leer. Mantiene la pantalla encendida y se apaga al salir de los pasos o con el botón Salir.
- **Voz sin internet** (Ajustes → Descargar): [vosk-browser](https://github.com/ccoreilly/vosk-browser) 0.0.8 (`docs/vosk/vosk.js`) con el modelo `vosk-model-small-es-0.42` (`docs/vosk/modelo-es.tar.gz`, unos 40 MB), ambos Apache 2.0 (ver `docs/vosk/LEEME.md`). Se descarga una sola vez: Vosk guarda el modelo descomprimido en IndexedDB y el service worker guarda `vosk.js` en la caché `voz`, que no se borra al cambiar de versión. `dp-voz` en `localStorage` indica que ya está descargada. Solo reconoce las palabras de `VOSK_WORDS` y escucha de forma continua, sin cortes entre pasos. El modelo lo trae al repositorio el flujo `.github/workflows/modelo-voz.yml` (el contenedor de Claude no puede descargarlo de alphacephei.com).
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

Historial: 0.0.1 prototipo inicial · 0.0.2 configuración inicial y nombre · 0.0.3 mejoras tras probar en teléfono · 0.0.3.1 versión visible · 0.0.4.1 detalle de "Antes de empezar" · 0.0.5.1 pasos dictados por la enfermera · 0.0.6.1 recambios de 1 a 4, bolsa fija de 2 L y "Marque cada casilla" · 0.0.7.1 subpasos con pantalla propia y modo automático por voz · 0.0.8.1 hablar o pasar la mano mientras se lee, gesto de la mano corregido, "Listo, ya lo hice" abre la siguiente casilla y voz sin internet con Vosk · 0.0.9.1 mano que compara con la imagen inicial, órdenes mientras lee aunque se mezclen con la voz de la app y «Anterior» en pantalla.

## Licencia
Software libre bajo **GPL-3.0-or-later**, © 2026 Enrique Ortiz. El texto oficial está en `LICENSE`. Los archivos de código llevan una cabecera SPDX, y Ajustes muestra el aviso de licencia con un enlace al código fuente. Los archivos nuevos de código deben llevar la misma cabecera.

## Decisiones tomadas
- Voz sin internet con Vosk y no con Porcupine: el plan gratis de Picovoice terminó el 30 de junio de 2026 y no habrá uno no comercial.
- Se descartó un bot de Telegram: necesita algo encendido siempre, requiere internet y da poco control de la presentación.
- PWA ahora. Para alarmas confiables a la hora del recambio, empaquetar después como APK con Capacitor, reutilizando el mismo contenido.

## Pendientes e ideas
- Textos detallados de cada movimiento del lavado quirúrgico, para validar: `/mnt/project-files/pasos/subpasos-para-validar.md` (proyecto de Claude). Hasta entonces, cada subpaso usa solo lo que dictó la enfermera.
- Probar el modo automático en teléfonos reales: ruido, mascarilla, y el pitido que hace Android cada vez que vuelve a escuchar.
- Dudas abiertas con la enfermera: si la mascarilla va antes del primer lavado de manos (hoy está antes, como suposición), cómo pasar el peso de la bolsa de drenaje a ml, el color del tapón de cada concentración, si se incluye el cuidado diario del orificio y si la ruptura de la línea de transferencia va como alarma.
- Dibujos definitivos para los pasos nuevos (paño, Exsept, pinza, paral, empaque, línea, pesa); los actuales son provisionales.
- Pasos reales del hospital y audios grabados por las enfermeras, en lugar de la voz del teléfono.
- Código QR real de configuración generado por el personal.
- APK con alarmas locales.
- Diálisis con máquina nocturna (DPA).
- Posible `short_name` más corto en el manifiesto, por si Android corta el nombre bajo el ícono.
