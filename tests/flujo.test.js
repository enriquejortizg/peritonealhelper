// Prueba del flujo de familia nueva con un DOM mínimo simulado.
// Uso, desde la carpeta del repositorio: node tests/flujo.test.js
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'docs', 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

let appHTML = '', handler, toastMsg = '';
const inputs = {}, store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const attr = id => { const m = appHTML.match(new RegExp('id="' + id + '"[^>]*?value="([^"]*)"')); return m ? m[1] : ''; };
const app = {
  set innerHTML(v) { appHTML = v; for (const k in inputs) delete inputs[k]; },
  get innerHTML() { return appHTML; },
  querySelector(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      if (!appHTML.includes('id="' + id + '"')) return null;
      return { get value() { return id in inputs ? inputs[id] : attr(id); }, set value(v) { inputs[id] = v; } };
    }
    return { scrollTop: 0, style: {}, set textContent(v) {} };
  },
  addEventListener(t, f) { handler = f; }
};
global.document = {
  hidden: false, addEventListener() {},
  getElementById: () => app, querySelectorAll: () => [],
  querySelector: s => (s === '.toast' ? null : { appendChild() {}, remove() {} }),
  documentElement: { style: { setProperty() {} } },
  createElement: () => ({ remove() {}, set textContent(v) { toastMsg = v; } })
};
global.window = global; global.navigator = {};
// Voz simulada: guarda lo que se pide leer; cancel() avisa "interrupted" como el navegador.
global.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
global.speechSynthesis = {
  spoken: [], cur: null, getVoices: () => [],
  speak(u) { this.spoken.push(u); this.cur = u; },
  cancel() { const u = this.cur; this.cur = null; if (u && u.onerror) u.onerror({ error: 'interrupted' }); }
};
// Simula abrir la app (o volver a abrirla) con lo que haya guardado en el teléfono.
const boot = () => eval(js);
boot();

const click = (o) => handler({ target: { id: o.id || '', dataset: o.data || {}, closest() { return this; }, classList: { add() {}, remove() {} } } });
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) fails++; };
const has = s => appHTML.includes(s);

(async () => {
  ok(has('Bienvenidos'), 'Primera vez: pantalla de bienvenida');

  // Versión visible e igual en la app y en el service worker
  const appVer = (js.match(/APP_VERSION = '([^']+)'/) || [])[1];
  const swVer = (fs.readFileSync(path.join(__dirname, '..', 'docs', 'sw.js'), 'utf8').match(/VERSION = '([^']+)'/) || [])[1];
  ok(/^\d+\.\d+\.\d+\.\d+$/.test(appVer || '') && has('v' + appVer), `Se muestra la versión v${appVer} junto al título`);
  ok(appVer === swVer, `La versión de la app (${appVer}) es igual a la de sw.js (${swVer})`);

  // Escuchar: pausar, continuar y detener
  const ss = speechSynthesis, sayText = () => appHTML.match(/data-say="([^"]*)"/)[1];
  click({ data: { say: sayText() } });
  ok(has('Pausar') && has('Detener') && ss.cur.text === 'Bienvenidos.', 'Escuchar empieza a leer y muestra Pausar y Detener');
  ss.cur.onend();
  ok(ss.cur.text.startsWith('Esta guía'), 'Lee la frase siguiente');
  click({ data: { say: sayText() } });
  ok(has('Continuar') && ss.cur === null, 'Pausar calla la voz y ofrece Continuar');
  click({ data: { say: sayText() } });
  ok(ss.cur && ss.cur.text.startsWith('Esta guía'), 'Continuar sigue desde la frase en curso');
  click({ data: { saystop: '1' } });
  ok(has('Escuchar') && !has('Detener') && ss.cur === null, 'Detener calla la voz y vuelve a Escuchar');
  click({ data: { say: sayText() } });
  ok(ss.cur.text === 'Bienvenidos.', 'Después de Detener empieza desde el principio');
  click({ data: { saystop: '1' } });
  click({ data: { act: 'start' } });
  ok(has('¿Cómo se llama el paciente?'), 'Empezar → nombre del paciente');
  click({ id: 'ob-next' });
  ok(has('¿Cómo se llama el paciente?') && toastMsg.includes('nombre'), 'Sin nombre no avanza y avisa');
  inputs['ob-patient'] = 'Don José';
  click({ id: 'ob-next' });
  ok(has('¿Qué tipo de diálisis'), 'Avanza a tipo de diálisis');
  click({ id: 'ob-next' });
  ok(has('¿Cuántos recambios al día?'), 'Avanza a recambios');
  click({ data: { pick: 'count:3' } });
  ok(has('Recambio 3') && !has('Recambio 4'), 'Elegir 3 recambios muestra 3 horarios');
  inputs['ob-t2'] = '20:30';
  click({ id: 'ob-next' });
  ok(has('¿De qué tamaño es la bolsa?'), 'Avanza a bolsa');
  click({ data: { pick: 'bag:2500' } });
  click({ id: 'ob-next' });
  ok(has('¿A dónde llamar'), 'Avanza a teléfono');
  inputs['ob-phone'] = '33 1234 5678';
  click({ id: 'ob-next' });
  ok(has('Revise los datos') && has('Don José') && has('2,5 L') && has('20:30') && has('33 1234 5678'), 'Resumen con todos los datos');
  click({ data: { edit: 'obPatient' } });
  ok(has('¿Cómo se llama el paciente?') && has('Listo'), 'Cambiar desde el resumen');
  inputs['ob-patient'] = 'Don José Pérez';
  click({ id: 'ob-next' });
  ok(has('Revise los datos') && has('Don José Pérez'), 'Vuelve al resumen con el cambio');
  click({ id: 'ob-save' });
  ok(has('Todo listo') && JSON.parse(store['dp-config']).patient === 'Don José Pérez', 'Guarda la configuración');

  click({ data: { act: 'practice' } });
  ok(has('Antes de empezar') && has('MODO PRÁCTICA'), 'Práctica: lista de preparación en modo práctica');
  for (let i = 0; i < 5; i++) click({ data: { check: String(i) } });
  click({ data: { go: 'step' } });
  for (let i = 0; i < 10; i++) click({ id: 'next' });
  click({ data: { aspect: 'claro' } });
  ok(has('Líquido que salió') && attr('vol') === '2500', 'Registro propone el volumen de la bolsa (2500 ml)');
  click({ id: 'save' });
  ok(has('¡Práctica terminada!') && JSON.parse(store['dp-log']).length === 0, 'La práctica no se anota');
  click({ data: { go: 'home' } });
  ok(has('Hola, familia de Don José Pérez') && has('3 recambios al día') && !has('MODO PRÁCTICA'), 'Inicio con los datos de la familia');

  click({ data: { go: 'prep' } });
  for (let i = 0; i < 5; i++) click({ data: { check: String(i) } });
  click({ data: { go: 'step' } });
  ok(has('disabled title="Todavía no hay video'), 'Paso sin video: botón Ver video deshabilitado');
  for (let i = 0; i < 10; i++) click({ id: 'next' });
  // Se prueban varios colores antes del correcto: debe quedar una sola entrada, con la última opción.
  click({ data: { aspect: 'turbio' } });
  click({ data: { go: 'aspect' } });
  click({ data: { aspect: 'sangre' } });
  click({ data: { go: 'aspect' } });
  click({ data: { aspect: 'claro' } });
  click({ id: 'save' });
  const log1 = JSON.parse(store['dp-log']);
  ok(has('¡Recambio terminado!') && log1.length === 1 && log1[0].aspect === 'claro' && log1[0].vol === 2500, 'Probar varios colores deja una sola entrada con la última opción');
  click({ data: { go: 'home' } });
  ok(has('<b>1 de 3</b>'), 'Inicio: 1 de 3 recambios hoy');
  click({ data: { go: 'alarms' } });
  ok(has('33 1234 5678') && !has('Número de ejemplo'), 'Alarmas muestran el teléfono configurado');

  // Recambio interrumpido: se retoma al reabrir, e Inicio pide confirmación
  click({ data: { go: 'home' } });
  click({ data: { go: 'prep' } });
  for (let i = 0; i < 5; i++) click({ data: { check: String(i) } });
  click({ data: { go: 'step' } });
  for (let i = 0; i < 5; i++) click({ id: 'next' });
  ok(has('Drene el líquido') && has('data-act="home-ask"'), 'Durante el recambio, Inicio pide confirmación');
  click({ id: 't-toggle' });
  ok(JSON.parse(store['dp-progress']).timer.running, 'Se guarda el progreso con el reloj corriendo');
  boot();
  ok(has('Drene el líquido') && has('id="t-toggle">Pausar') && toastMsg.includes('Continuamos'), 'Al reabrir la app sigue en el mismo paso con el reloj corriendo');
  click({ data: { act: 'home-ask' } });
  ok(has('¿Volver al inicio?') && has('se perderá el progreso'), 'Inicio muestra la confirmación');
  click({ data: { act: 'modal-close' } });
  ok(!has('¿Volver al inicio?') && has('Drene el líquido'), '"No, seguir" vuelve al mismo paso');
  click({ data: { act: 'home-ask' } });
  click({ data: { act: 'home-yes' } });
  ok(has('Hola, familia') && !store['dp-progress'] && JSON.parse(store['dp-log']).length === 1, '"Sí, ir al inicio" descarta el progreso sin anotar nada');

  click({ data: { go: 'settings' } });
  click({ data: { act: 'edit' } });
  click({ data: { edit: 'obTimes' } });
  click({ data: { pick: 'count:5' } });
  click({ id: 'ob-next' });
  click({ id: 'ob-save' });
  ok(has('Ajustes') && JSON.parse(store['dp-config']).count === 5 && JSON.parse(store['dp-log']).length === 1, 'Editar en Ajustes conserva el registro');

  click({ data: { act: 'reset' } });
  ok(has('Sí, borrar todo'), 'Reiniciar pide confirmación');
  click({ data: { act: 'reset-yes' } });
  ok(has('Bienvenidos') && !store['dp-config'] && !store['dp-log'], 'Reinicio vuelve a familia nueva');

  click({ data: { go: 'obScan' } });
  ok(has('Escanee el código'), 'Pantalla del código QR');
  await new Promise(r => setTimeout(r, 2900));
  ok(has('Código leído') && has('Rosa'), 'El código simulado carga la configuración de ejemplo');
  click({ id: 'ob-save' });
  ok(has('Todo listo'), 'Guardar desde el código termina la configuración');

  console.log(fails ? `\n${fails} fallas` : '\nTodo bien');
  process.exit(fails ? 1 : 0);
})();
