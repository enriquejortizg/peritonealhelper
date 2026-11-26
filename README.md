# Mi Diálisis en Casa

Guía paso a paso para que los familiares de pacientes hagan la diálisis peritoneal en casa. Es una app web instalable: se publica gratis en GitHub Pages, los familiares la abren en Chrome de Android, la instalan con un toque y después funciona sin internet.

> **Prototipo con contenido de ejemplo.** Los pasos, tiempos y el teléfono son ilustrativos. Antes de dársela a familias, reemplácelos con el procedimiento aprobado por el equipo de nefrología.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `docs/index.html` | La app completa: pantallas, textos, dibujos y lógica. |
| `docs/manifest.json` | Nombre, colores e íconos. Hace que Chrome ofrezca "Instalar app". |
| `docs/sw.js` | Guarda la app en el teléfono para que abra sin internet. |
| `docs/icons/` | Íconos para la pantalla de inicio. |
| `mi-dialisis-en-casa.html` | Versión de presentación: la app dentro de un teléfono, con notas que explican cada función. |

La app está en `docs/` porque GitHub Pages puede publicar esa carpeta directamente.

## Publicar en GitHub Pages (una sola vez)

1. Suba este repositorio a GitHub (público).
2. En el repositorio, vaya a **Settings → Pages**. En **Source** elija **Deploy from a branch**. En **Branch** elija `main` y la carpeta `/docs`, y toque **Save**.
3. Espere uno o dos minutos. La dirección de la app aparece arriba en esa misma página, con esta forma:
   `https://SU-USUARIO.github.io/peritonealhelper/`

Desde ahí, cada cambio que se suba a `main` se publica solo en uno o dos minutos.

## Instalarla en un teléfono Android

1. Abra la dirección en **Chrome**.
2. Chrome muestra **Instalar app**. Si no aparece, toque el menú **⋮ → Instalar app** (o **Agregar a la pantalla principal**).
3. Aparece el ícono de la gota en la pantalla de inicio. Ábrala una vez con internet. Desde ahí funciona sin conexión.

Sugerencia: haga que el personal la instale en el teléfono del familiar durante la capacitación.

## Código QR para el área de diálisis

Convierta la dirección de la app en un código QR con cualquier generador gratuito. Chrome lo hace sin instalar nada: abra la dirección, toque **⋮ → Compartir → Código QR** y descárguelo. Imprímalo junto con una frase como "Escanee para instalar la guía en su teléfono".

## Cambiar el contenido

Todo el contenido está al principio del `<script>` de `docs/index.html`:

- `PREP`: la lista de "Antes de empezar".
- `STEPS`: cada paso, con `title` (título), `text` (texto), `tip` (aviso, opcional) y `timer` (segundos, opcional).
- `ALARMS`: las señales de alarma y qué hacer en cada una.
- `PHONE` y `UNIT`: el teléfono y el nombre de la unidad.
- `reminders`: los horarios de los recambios.

Después de cambiar algo:

1. Abra `docs/sw.js` y suba la versión: `const VERSION = 'v1';` pasa a `'v2'`, y así cada vez.
2. Haga commit y suba los cambios a `main` (`git push`).
3. Los teléfonos reciben la versión nueva la próxima vez que abran la app con internet.

## Lo que esta versión todavía no hace

- **Alarmas a la hora del recambio.** Una app web no puede programar alarmas confiables. Para eso hay que empaquetarla como APK de Android (con Capacitor); el contenido se reutiliza tal cual.
- **Audios grabados.** Ahora la voz es la del teléfono. Si el teléfono no tiene voz en español instalada, el botón Escuchar puede no sonar.
- **Registro compartido.** El registro se queda en cada teléfono. Si el familiar borra los datos de Chrome o desinstala la app, se pierde.

## Probarla en su computadora

Los service workers solo funcionan desde `https://` o `localhost`, no abriendo el archivo con doble clic. Con Python instalado, desde la carpeta del repositorio:

```bash
python -m http.server 8080 --directory docs
```

y abra <http://localhost:8080>.
