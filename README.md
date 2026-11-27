# Diálisis Contigo

Guía paso a paso para que los familiares de pacientes hagan la diálisis peritoneal en casa. Es una app web instalable: se publica gratis en GitHub Pages, los familiares la abren en Chrome de Android, la instalan con un toque y después funciona sin internet.

> **Prototipo en revisión.** Los pasos vienen de lo que dictó una enfermera del servicio, pero todavía no están aprobados formalmente por el equipo de nefrología. El teléfono es de ejemplo. No se la dé a familias hasta tener esa aprobación.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `docs/index.html` | La app completa: pantallas, textos, dibujos y lógica. |
| `docs/manifest.json` | Nombre, colores e íconos. Hace que Chrome ofrezca "Instalar app". |
| `docs/sw.js` | Guarda la app en el teléfono para que abra sin internet. |
| `docs/icons/` | Íconos para la pantalla de inicio. |
| `dialisis-contigo.html` | Versión de presentación: la app dentro de un teléfono, con notas que explican cada función. Se genera desde `docs/index.html`; no la edite a mano. |
| `scripts/generar-presentacion.mjs` | Vuelve a generar la versión de presentación. |

La app está en `docs/` porque GitHub Pages puede publicar esa carpeta directamente.

## Primera vez: configuración de una familia nueva

La primera vez que se abre, la app pide configurarla junto con la enfermera, una pregunta por pantalla:

1. Nombre del paciente y quién le hará la diálisis.
2. Tipo de diálisis (en el prototipo solo está la manual; la de máquina aparece como "Próximamente").
3. Recambios al día (3, 4 o 5) y sus horarios.
4. Tamaño de la bolsa (1,5 L, 2 L o 2,5 L). Se usa para proponer el volumen al anotar.
5. Nombre y teléfono de la unidad, que aparecen en las señales de alarma.

Al final se revisa un resumen y se puede **practicar un recambio** que no se anota en el registro.

También está **Tengo un código del hospital**: en la versión real la enfermera mostraría un código QR con todo configurado. En el prototipo no usa la cámara: simula la lectura y carga datos de ejemplo.

Todo se guarda solo en el teléfono. Para repetir la demostración desde cero: botón de ajustes en la pantalla de inicio → **Empezar de nuevo**.

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
- `APP_NAME`: el nombre de la app en pantalla (cámbielo también en `<title>` y en `docs/manifest.json`).
- `DEFAULTS`: el teléfono y el nombre de la unidad que se proponen en la configuración.
- `SCHEDULES`: los horarios que se proponen según el número de recambios.
- `EXAMPLE`: los datos que carga el código QR simulado.

Después de cambiar algo:

1. Cambie la versión, con el mismo valor, en `APP_VERSION` (`docs/index.html`) y en `VERSION` (`docs/sw.js`). Formato PRODUCCIÓN.GRANDE.RELEASE.MENOR: el RELEASE sube con cada cambio que llega a `main` (0.0.3.1 → 0.0.4.1), y el MENOR sube al corregir un release que salió mal (0.0.3.1 → 0.0.3.2).
2. Vuelva a generar la versión de presentación: `node scripts/generar-presentacion.mjs`.
3. Haga commit y suba los cambios a `main` (`git push`).
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

## Licencia

Diálisis Contigo es software libre, © 2026 Enrique Ortiz. Puede usarlo, estudiarlo, modificarlo y redistribuirlo según la [Licencia Pública General de GNU](https://www.gnu.org/licenses/gpl-3.0.html), versión 3 o (a su elección) cualquier versión posterior. Si distribuye una versión modificada, también debe publicarla como software libre bajo la misma licencia.

Se distribuye **sin ninguna garantía**. No reemplaza las indicaciones del equipo médico. El texto completo está en [LICENSE](LICENSE).
