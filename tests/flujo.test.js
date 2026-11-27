// Diálisis Contigo · Copyright (C) 2026 Enrique Ortiz · SPDX-License-Identifier: GPL-3.0-or-later
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
  hidden: false, addEventListener(t, f) { if (t === 'visibilitychange') this.onvis = f; },
  getElementById: () => app, querySelectorAll: () => [],
  querySelector: s => (s === '.toast' ? null : { appendChild() {}, remove() {} }),
  documentElement: { style: { setProperty() {} } },
  // video y canvas para la cámara simulada del modo automático (ver CAM más abajo).
  createElement: tag => tag === 'video' ? { setAttribute() {}, play: () => Promise.resolve(), readyState: 2 }
    : tag === 'canvas' ? { getContext: () => ({ drawImage() {}, getImageData: () => ({ data: CAM.frame }) }) }
    : { remove() {}, set textContent(v) { toastMsg = v; } }
};
global.window = global; global.navigator = {};
// Cámara simulada: la imagen que "ve" es CAM.frame; open cuenta las cámaras encendidas.
const frame = v => new Uint8ClampedArray(32 * 24 * 4).fill(v);
const CAM = { open: 0, frame: frame(90) };
// Voz simulada: guarda lo que se pide leer; cancel() avisa "interrupted" como el navegador.
// Avisa "start" al empezar y "end" al terminar (finish), con la propiedad onend y con addEventListener.
global.SpeechSynthesisUtterance = class {
  constructor(t) { this.text = t; this.ls = {}; }
  addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
  emit(t, e) { const p = this['on' + t]; if (p) p(e); (this.ls[t] || []).forEach(f => f(e)); }
};
global.speechSynthesis = {
  spoken: [], cur: null, getVoices: () => [],
  // block: el teléfono no deja hablar (al volver a abrir la app, antes de tocar la pantalla).
  speak(u) { if (this.block) { this.block = false; u.emit('error', { error: 'not-allowed' }); return; } this.spoken.push(u); this.cur = u; u.emit('start'); },
  finish() { const u = this.cur; if (!u) return false; this.cur = null; u.emit('end'); return true; },
  cancel() { const u = this.cur; this.cur = null; if (u) u.emit('error', { error: 'interrupted' }); }
};
// Simula abrir la app (o volver a abrirla) con lo que haya guardado en el teléfono.
const boot = () => eval(js);
boot();

const click = (o) => handler({ target: { id: o.id || '', dataset: o.data || {}, closest() { return this; }, classList: { add() {}, remove() {} } } });
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) fails++; };
const has = s => appHTML.includes(s);
const STEPS_SRC = js.match(/const STEPS = \[([\s\S]*?)\n  \];/)[1];
// Pantallas del recambio: una por paso y una por cada subpaso con pantalla propia.
const NSTEPS = STEPS_SRC.match(/\{ pic:/g).length + (STEPS_SRC.match(/\{ title:/g) || []).length;

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
  ss.finish();
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
  ok(has('¿Cuántos recambios al día?') && has('data-pick="count:4" aria-pressed="true"'), 'Avanza a recambios, con 4 por defecto');
  click({ data: { pick: 'count:3' } });
  ok(has('Recambio 3') && !has('Recambio 4'), 'Elegir 3 recambios muestra 3 horarios');
  ok(has('data-pick="count:1"') && has('data-pick="count:4"') && !has('data-pick="count:5"'), 'Se pueden elegir de 1 a 4 recambios');
  inputs['ob-t2'] = '20:30';
  click({ id: 'ob-next' });
  ok(has('¿A dónde llamar') && !has('¿De qué tamaño es la bolsa?'), 'Avanza a teléfono sin preguntar la bolsa');
  inputs['ob-phone'] = '33 1234 5678';
  click({ id: 'ob-next' });
  ok(has('Revise los datos') && has('Don José') && has('2 L') && !has('data-edit="obBag"') && has('20:30') && has('33 1234 5678'), 'Resumen con todos los datos y la bolsa fija de 2 L');
  click({ data: { edit: 'obPatient' } });
  ok(has('¿Cómo se llama el paciente?') && has('Listo'), 'Cambiar desde el resumen');
  inputs['ob-patient'] = 'Don José Pérez';
  click({ id: 'ob-next' });
  ok(has('Revise los datos') && has('Don José Pérez'), 'Vuelve al resumen con el cambio');
  click({ id: 'ob-save' });
  ok(has('Todo listo') && JSON.parse(store['dp-config']).patient === 'Don José Pérez', 'Guarda la configuración');

  click({ data: { act: 'practice' } });
  ok(has('Antes de empezar') && has('Marque cada casilla') && !has('tapón nuevo y las pinzas') && has('MODO PRÁCTICA'), 'Práctica: lista de preparación en modo práctica');
  ok((appHTML.match(/data-act="prep-info"/g) || []).length === 5, 'Cada punto de preparación tiene su botón de información');
  click({ data: { act: 'prep-info', i: '3' } });
  ok(has('Para darlo por listo') && has('Limpie la mesa 1') && has('otra de repuesto'), 'El botón i muestra qué hacer para la mesa 1');
  click({ data: { act: 'prep-done' } });
  ok(/aria-checked="true" data-check="3"/.test(appHTML) && has('Para darlo por listo') && has('<h3 id="m-t">Lavé en la bandeja'), '"Listo, ya lo hice" marca el punto y abre el detalle del siguiente');
  click({ data: { act: 'prep-done' } });
  ok(/aria-checked="true" data-check="4"/.test(appHTML) && has('<h3 id="m-t">El paciente se bañó'), 'Después del último, vuelve al primero que falta');
  click({ data: { act: 'modal-close' } });
  ok(!has('Para darlo por listo'), 'Cerrar deja la lista');
  for (let i = 0; i < 3; i++) click({ data: { check: String(i) } });
  click({ data: { go: 'step' } });
  for (let i = 0; i < NSTEPS; i++) click({ id: 'next' });
  click({ data: { aspect: 'claro' } });
  ok(has('Líquido que salió') && attr('vol') === '2000', 'Registro propone el volumen de la bolsa (2000 ml)');
  click({ id: 'save' });
  ok(has('¡Práctica terminada!') && JSON.parse(store['dp-log']).length === 0, 'La práctica no se anota');
  click({ data: { go: 'home' } });
  ok(has('Hola, familia de Don José Pérez') && has('3 recambios al día') && !has('MODO PRÁCTICA'), 'Inicio con los datos de la familia');

  click({ data: { go: 'prep' } });
  for (let i = 0; i < 5; i++) click({ data: { check: String(i) } });
  click({ data: { go: 'step' } });
  ok(has('disabled title="Todavía no hay video'), 'Paso sin video: botón Ver video deshabilitado');
  for (let i = 0; i < NSTEPS; i++) click({ id: 'next' });
  // Se prueban varios colores antes del correcto: debe quedar una sola entrada, con la última opción.
  click({ data: { aspect: 'turbio' } });
  click({ data: { go: 'aspect' } });
  click({ data: { aspect: 'sangre' } });
  click({ data: { go: 'aspect' } });
  click({ data: { aspect: 'claro' } });
  click({ id: 'save' });
  const log1 = JSON.parse(store['dp-log']);
  ok(has('¡Recambio terminado!') && log1.length === 1 && log1[0].aspect === 'claro' && log1[0].vol === 2000, 'Probar varios colores deja una sola entrada con la última opción');
  click({ data: { go: 'home' } });
  ok(has('<b>1 de 3</b>'), 'Inicio: 1 de 3 recambios hoy');
  click({ data: { go: 'alarms' } });
  ok(has('33 1234 5678') && !has('Número de ejemplo'), 'Alarmas muestran el teléfono configurado');

  // Recambio interrumpido: se retoma al reabrir, e Inicio pide confirmación
  click({ data: { go: 'home' } });
  click({ data: { go: 'prep' } });
  for (let i = 0; i < 5; i++) click({ data: { check: String(i) } });
  click({ data: { go: 'step' } });
  for (let i = 0; i < 14; i++) click({ id: 'next' });
  ok(has('Lavado de manos quirúrgico') && has('data-act="home-ask"'), 'Durante el recambio, Inicio pide confirmación');
  ok(has('class="substeps"') && has('<li>Palma con palma</li>') && has('Son 8 movimientos'), 'El paso con subpasos muestra primero el resumen');
  click({ id: 't-toggle' });
  click({ id: 'next' });
  ok(has('Movimiento 1 de 8') && has('<h2 class="scr">Palma con palma</h2>') && /data-say="Movimiento 1 de 8. Palma con palma/.test(appHTML), 'Cada subpaso tiene su pantalla y se lee con Escuchar');
  ok(has('id="t-toggle">Pausar'), 'El reloj del paso sigue corriendo en los subpasos');
  click({ id: 'next' });
  ok(has('Movimiento 2 de 8') && has('id="t-toggle">Pausar'), 'Siguiente pasa al otro subpaso sin reiniciar el reloj');
  click({ id: 'prev' });
  click({ id: 'prev' });
  ok(has('Son 8 movimientos') && !has('Movimiento 1 de 8'), 'Atrás vuelve del subpaso al resumen del paso');
  click({ id: 'next' });
  ok(JSON.parse(store['dp-progress']).timer.running, 'Se guarda el progreso con el reloj corriendo');
  boot();
  ok(has('Lavado de manos quirúrgico') && has('Movimiento 1 de 8') && has('id="t-toggle">Pausar') && toastMsg.includes('Continuamos'), 'Al reabrir la app sigue en el mismo subpaso con el reloj corriendo');
  click({ data: { act: 'home-ask' } });
  ok(has('¿Volver al inicio?') && has('se perderá el progreso'), 'Inicio muestra la confirmación');
  click({ data: { act: 'modal-close' } });
  ok(!has('¿Volver al inicio?') && has('Lavado de manos quirúrgico'), '"No, seguir" vuelve al mismo paso');
  click({ data: { act: 'home-ask' } });
  click({ data: { act: 'home-yes' } });
  ok(has('Hola, familia') && !store['dp-progress'] && JSON.parse(store['dp-log']).length === 1, '"Sí, ir al inicio" descarta el progreso sin anotar nada');

  click({ data: { go: 'settings' } });
  click({ data: { act: 'edit' } });
  click({ data: { edit: 'obTimes' } });
  click({ data: { pick: 'count:1' } });
  click({ id: 'ob-next' });
  click({ id: 'ob-save' });
  ok(has('Ajustes') && JSON.parse(store['dp-config']).count === 1 && JSON.parse(store['dp-log']).length === 1, 'Editar en Ajustes conserva el registro');

  ok(has('GPL-3.0') && has('Código fuente'), 'Ajustes muestra la licencia libre y el enlace al código');
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

  // Modo automático: lee cada paso y avanza cuando el familiar pasa la mano frente a la cámara, sin tocar el teléfono.
  navigator.mediaDevices = { getUserMedia: () => { CAM.open++; return Promise.resolve({ getTracks: () => [{ stop() { CAM.open--; } }] }); } };
  const camOn = () => CAM.open > 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // La cámara aprende cómo se ve quieta; luego aparece algo (la mano) y en menos de 2 s vuelve a verse igual.
  const passHand = async () => { await wait(800); CAM.frame = frame(220); await wait(400); CAM.frame = frame(90); await wait(300); };
  // Termina de "leer" todo lo pendiente y devuelve lo que se dijo.
  const finishSpeech = async () => {
    const from = speechSynthesis.spoken.length - (speechSynthesis.cur ? 1 : 0);
    for (let k = 0; k < 200; k++) if (!speechSynthesis.finish()) break;
    await wait(300);
    return speechSynthesis.spoken.slice(from).map(u => u.text).join(' ');
  };
  click({ data: { go: 'home' } });
  click({ data: { go: 'prep' } });
  ok(/data-act="auto-start" disabled/.test(appHTML) && has('Empezar los pasos') === false, 'Modo automático espera a que se marque todo');
  for (let i = 0; i < 4; i++) click({ data: { check: String(i) } });
  ok(has('Falta 1') && !has('Faltan 1'), 'Con una casilla sin marcar dice "Falta 1"');
  click({ data: { check: '4' } });
  ok(has('Empezar los pasos') && /data-act="auto-start" >/.test(appHTML), '"Antes de empezar" tiene Empezar los pasos y Modo automático');
  ok(!/Siguiente»|diga/i.test(appHTML.match(/autonote[\s\S]*?<\/p>/)[0]) && has('pase la mano'), 'El modo automático se explica solo con la mano (sin voz)');
  const n0 = speechSynthesis.spoken.length;
  click({ data: { act: 'auto-start' } });
  await wait(700);   // primero enciende la cámara, después lee
  ok(has('Paso 1 de') && has('Leyendo') && camOn(), 'Modo automático: lee el primer paso y mira la cámara a la vez');
  ok(speechSynthesis.spoken[n0] && speechSynthesis.spoken[n0].text === 'Modo automático.', 'Lo primero que dice es "Modo automático." (no se corta el paso)');
  ok(typeof webkitSpeechRecognition === 'undefined' && !has('micrófono') && !has('Diga'), 'No usa el reconocimiento de voz ni habla del micrófono');
  await passHand();
  ok(has('Póngase la mascarilla'), 'Pasar la mano mientras lee avanza al paso siguiente');
  let said = await finishSpeech();
  ok(/Usted y el paciente se ponen la mascarilla/.test(said) && /pase la mano una vez frente a la cámara de arriba/.test(said) && !/diga/i.test(said), 'Lee el paso y dice que pase la mano (no que diga «Siguiente»)');
  ok(camOn() && has('Pase la mano una vez frente a la cámara'), 'Al terminar de leer, sigue mirando la cámara');
  await passHand();
  said = await finishSpeech();
  ok(has('Primer lavado de manos') && /El reloj empieza ahora/.test(said) && has('id="t-toggle">Pausar'), 'En los pasos con reloj, el reloj arranca solo al terminar de leer');
  // Salir de la app y volver: se calla y apaga la cámara; al volver la enciende y lee el paso en el que iba.
  const setHidden = h => { document.hidden = h; document.onvis(); };
  setHidden(true);
  ok(!camOn() && !speechSynthesis.cur, 'Al salir de la app se callan la voz y la cámara');
  setHidden(false);
  await wait(700);
  ok(camOn() && speechSynthesis.cur && speechSynthesis.cur.text === 'Seguimos en modo automático.' && has('Primer lavado de manos'), 'Al volver a la app sigue en modo automático y lee el paso en el que iba');
  // Cerrar la app y volver a abrirla: sigue en el mismo paso y en modo automático.
  ok(JSON.parse(store['dp-progress']).auto === true, 'Se guarda que el recambio iba en modo automático');
  CAM.open = 0; speechSynthesis.cur = null;
  speechSynthesis.block = true;   // el teléfono no deja hablar hasta que se toque la pantalla
  boot();
  await wait(700);
  ok(has('Primer lavado de manos') && camOn() && has('Toque una vez') && has('data-act="auto-resume"'), 'Al volver a abrir la app sigue en modo automático; si el teléfono no deja hablar, pide tocar una vez');
  click({ data: { act: 'auto-resume' } });
  ok(speechSynthesis.cur && speechSynthesis.cur.text === 'Seguimos en modo automático.' && has('Leyendo'), 'Al tocar "Seguir" lee el paso en el que iba');
  click({ data: { act: 'auto-exit' } });
  ok(!has('autobar') && !camOn() && has('Primer lavado de manos'), 'Salir del modo automático apaga la cámara y deja el paso en modo táctil');
  click({ data: { act: 'home-ask' } });
  click({ data: { act: 'home-yes' } });

  console.log(fails ? `\n${fails} fallas` : '\nTodo bien');
  process.exit(fails ? 1 : 0);
})();
