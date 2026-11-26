// Genera dialisis-contigo.html (versión de presentación: la app dentro de un teléfono, con notas)
// a partir de docs/index.html, que es la única fuente de la app.
//
// Uso, desde la carpeta del repositorio:
//   node scripts/generar-presentacion.mjs
//
// Quita los bloques marcados con <!-- solo-app --> ... <!-- /solo-app --> (manifiesto, service worker)
// y la clase "modo-app", que es la que pone la app a pantalla completa.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const strip = s => s.replace(/<!-- solo-app[\s\S]*?<!-- \/solo-app -->\s*/g, '');

const head = src.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = src.match(/<body>([\s\S]*?)<\/body>/)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];

const out = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  strip(head).replace(title, '').trim(),
  '',
  strip(body).trim(),
  ''
].join('\n');

writeFileSync(new URL('../dialisis-contigo.html', import.meta.url), out);
console.log('Listo: dialisis-contigo.html');
