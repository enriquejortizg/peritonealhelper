# Diálisis Contigo

App para que los familiares de pacientes de un servicio de diálisis hospitalario recuerden cómo hacer la **diálisis peritoneal en casa**. En el área de diálisis peritoneal les explican el procedimiento, pero a muchos les cuesta retenerlo por nervios o por bajo nivel educativo.

## Restricciones que guían todo
- **Costo cero.** Sin servidor ni servicios de pago. Por eso es una app web instalable (PWA) publicada en GitHub Pages.
- **Funciona sin internet**, y los datos (configuración, registro y recambio en curso) se quedan solo en el teléfono, en `localStorage` (`dp-config`, `dp-log`, `dp-progress`).
- **Usuarios nerviosos o con poca práctica leyendo.** Una cosa por pantalla, dibujo grande, frases cortas, botones grandes, botón Escuchar en cada paso y letra grande (botón Aa). Los textos van en español, tratando de "usted".

## Estado
- Es una **prueba de concepto**. Los pasos, tiempos y teléfonos son **de ejemplo** y la app lo indica en cada pantalla. El procedimiento real está pendiente: debe venir del equipo de nefrología del hospital y ser aprobado por él.
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
- Configuración inicial con la enfermera: nombre del paciente, tipo de diálisis (solo la manual; la de máquina aparece como "Próximamente"), recambios al día y horarios, tamaño de la bolsa, unidad y teléfono. Termina con un resumen y un recambio de práctica que no se anota.
- Código QR del hospital **simulado**: no usa la cámara y carga `EXAMPLE`.
- Recambio guiado de 10 pasos con temporizadores, aspecto del líquido, alarmas, registro, recordatorios y ajustes (incluye "Empezar de nuevo" para repetir la demostración).
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

Historial: 0.0.1 prototipo inicial · 0.0.2 configuración inicial y nombre · 0.0.3 mejoras tras probar en teléfono · 0.0.3.1 versión visible.

## Decisiones tomadas
- Se descartó un bot de Telegram: necesita algo encendido siempre, requiere internet y da poco control de la presentación.
- PWA ahora. Para alarmas confiables a la hora del recambio, empaquetar después como APK con Capacitor, reutilizando el mismo contenido.

## Pendientes e ideas
- Pasos reales del hospital y audios grabados por las enfermeras, en lugar de la voz del teléfono.
- Código QR real de configuración generado por el personal.
- APK con alarmas locales.
- Diálisis con máquina nocturna (DPA).
- Posible `short_name` más corto en el manifiesto, por si Android corta el nombre bajo el ícono.
