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
  getElementById: () => app, querySelectorAll: () => [],
  querySelector: s => (s === '.toast' ? null : { appendChild() {}, remove() {} }),
  documentElement: { style: { setProperty() {} } },
  createElement: () => ({ remove() {}, set textContent(v) { toastMsg = v; } })
};
global.window = global; global.navigator = {};
eval(js);

const click = (o) => handler({ target: { id: o.id || '', dataset: o.data || {}, closest() { return this; }, classList: { add() {}, remove() {} } } });
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALLA') + ' ' + msg); if (!cond) fails++; };
const has = s => appHTML.includes(s);

(async () => {
  ok(has('Bienvenidos'), 'Primera vez: pantalla de bienvenida');
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
  for (let i = 0; i < 10; i++) click({ id: 'next' });
  click({ data: { aspect: 'claro' } });
  click({ id: 'save' });
  ok(has('¡Recambio terminado!') && JSON.parse(store['dp-log']).length === 1, 'Recambio real queda anotado');
  click({ data: { go: 'home' } });
  ok(has('<b>1 de 3</b>'), 'Inicio: 1 de 3 recambios hoy');
  click({ data: { go: 'alarms' } });
  ok(has('33 1234 5678') && !has('Número de ejemplo'), 'Alarmas muestran el teléfono configurado');

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
