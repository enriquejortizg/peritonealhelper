// Diálisis Contigo · Copyright (C) 2026 Enrique Ortiz · SPDX-License-Identifier: GPL-3.0-or-later
// Prueba exhaustiva del modo automático: la persona dice una orden mientras la app lee.
// El micrófono oye también a la app, y el reconocedor junta las dos voces en un mismo resultado.
// Con tiempo simulado, la app lee cada paso palabra por palabra y la persona dice "siguiente", "listo",
// "anterior" o "repita" después de cada palabra de cada frase de cada paso. Se prueba con el reconocedor
// del navegador y con Vosk (que escribe "[unk]" en lugar de las palabras que no son órdenes), con y sin
// eventos "boundary", con el eco cancelado, y con distintas velocidades de lectura y retrasos.
// También se prueba que el eco solo (nadie habla) nunca dé una orden.
// Uso, desde la carpeta del repositorio: node tests/eco.test.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'docs', 'index.html'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('No encontré ' + a); return src.slice(i, j); };
const code = [
  'const ' + cut('WASH =', 'const ALARMS'),
  cut('const nSubs', '// Texto que se lee'),
  cut('const COMMANDS', 'const recLang'),
  cut('const VOSK_WORDS', 'const VZ'),
  'return { STEPS, nSubs, subCount, hearCmd, norm, VOSK_WORDS, saidAdd, saidEnd, saidMark, saidCut, SAID };'
].join('\n');
let NOW = 1e6; Date.now = () => NOW;
const lib = new Function(code)();
const { STEPS, nSubs, subCount, hearCmd, norm, VOSK_WORDS } = lib;

let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log((c ? 'OK    ' : 'FALLA ') + msg); };

// Lo que lee el modo automático en cada paso y subpaso (como autoRead y stepSay).
const HINT = 'Cuando esté listo, diga Siguiente o pase la mano una vez frente a la cámara.';
const texts = [];
STEPS.forEach((st, i) => {
  const base = `${st.title}. ${st.text} ${st.items ? st.items.join(' ') : ''} ${nSubs(st) ? `Son ${subCount(st)}. Le explicamos cada uno.` : ''} ${st.tip || ''}`.replace(/\s+/g, ' ').trim();
  texts.push([`paso ${i + 1}`, st.timer ? `${base} El reloj empieza ahora. Le aviso cuando termine.` : `${base} ${HINT}`]);
  if (st.timer) texts.push([`paso ${i + 1} (reloj corriendo)`, `${base} ${HINT}`]);
  (st.subs || []).forEach((sb, k) => texts.push([`paso ${i + 1}.${k + 1}`, `${st.subLabel || 'Parte'} ${k + 1} de ${nSubs(st)}. ${sb.title}. ${sb.text || ''} ${sb.tip || ''} ${HINT}`.replace(/\s+/g, ' ').trim()]));
});
texts.push(['aviso del reloj', 'Tiempo terminado. Puede pasar al siguiente paso.']);
const split = t => String(t).split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
const VW = new Set(VOSK_WORDS.map(norm));
const USER = [['siguiente', 'next'], ['listo', 'next'], ['anterior', 'prev'], ['repita', 'repeat']];

// Línea de tiempo de una lectura: lo que hace la app (app) y lo que oye el micrófono (words).
function timeline(parts, cfg, t0) {
  const app = [], words = []; let t = t0;
  parts.forEach((p, k) => {
    const s = t, ws = [...p.matchAll(/\S+/g)];
    let r;
    app.push({ t: s, fn: () => { r = lib.saidAdd(p); } });
    ws.forEach((m, i) => {
      const wt = s + 150 + i * cfg.rate;
      if (cfg.boundary) app.push({ t: wt, fn: () => lib.saidMark(r, m.index) });
      norm(m[0]).split(' ').filter(Boolean).forEach(w => words.push({ t: wt + 200, w, k, i }));
    });
    const e = s + 150 + ws.length * cfg.rate + 100;
    app.push({ t: e, fn: () => lib.saidEnd(r) });
    t = e + 60;
  });
  return { app, words, end: t };
}
// Lo que escribe Vosk: las órdenes, y "[unk]" (una cada cfg.unk palabras) en lugar de las demás.
const asVosk = (ws, cfg) => ws.map((w, q) => (VW.has(w) ? w : (q % cfg.unk === 0 ? '[unk]' : ''))).filter(Boolean);

function scenario(parts, cfg, opt) {
  lib.SAID.length = 0;
  const tl = timeline(parts, cfg, 1e6);
  let heard = opt.aec ? [] : tl.words, userAt = Infinity;
  if (opt.user) {
    const after = tl.words.find(x => x.k === opt.k && x.i === opt.j - 1);
    userAt = after ? after.t + 100 : tl.words.find(x => x.k === opt.k).t - 300;
    heard = heard.concat([{ t: userAt, w: opt.user }]).sort((a, b) => a.t - b.t);
  }
  // El resultado empieza en la frase s0 y crece con cada palabra; se revisa cfg.lat ms después de oírla,
  // y también un rato después de que la app termina de leer.
  const seg = heard.filter(x => x.k === undefined || x.k >= opt.s0);
  const stopAt = opt.user ? Math.min(tl.end + 2000, userAt + 3000) : tl.end + 2000;
  const evals = seg.map(x => x.t + cfg.lat).concat([tl.end + 300, tl.end + 900, tl.end + 1600]).filter(t => t <= stopAt + 600).sort((a, b) => a - b);
  let ai = 0, got = null, gotAt = 0, last = '';
  const seen = [];
  for (const et of evals) {
    while (ai < tl.app.length && tl.app[ai].t <= et) { NOW = tl.app[ai].t; tl.app[ai].fn(); ai++; }
    NOW = et;
    let ws = seg.filter(x => x.t + cfg.lat <= et).map(x => x.w);
    if (cfg.vosk) ws = asVosk(ws, cfg);
    if (!ws.length) continue;
    last = ws.join(' ');
    const h = hearCmd(last, 0, cfg.vosk ? seen : undefined);
    if (h.cmd) { got = h.cmd; gotAt = et; break; }
  }
  const good = opt.want ? got === opt.want && gotAt >= userAt : !got;
  return { good, got, last };
}

const CONFIGS = [
  { name: 'normal', rate: 450, lat: 500, unk: 1 },
  { name: 'lectura rápida', rate: 350, lat: 500, unk: 1 },
  { name: 'lectura lenta y reconocedor lento', rate: 600, lat: 1200, unk: 2 },
  { name: 'reconocedor rápido', rate: 450, lat: 300, unk: 3 }
];
for (const base of CONFIGS) {
  for (const vosk of [false, true]) {
    let total = 0, wrong = 0, echoTotal = 0, echoWrong = 0; const ex = [];
    for (const boundary of (base.name === 'normal' ? [false, true] : [false])) {
      const cfg = Object.assign({}, base, { vosk, boundary });
      for (const [label, t] of texts) {
        const parts = split(t);
        for (let s0 = 0; s0 < parts.length; s0++) {
          const r = scenario(parts, cfg, { s0 }); echoTotal++;
          if (!r.good) { echoWrong++; if (ex.length < 5) ex.push(`  ${label}, solo eco → ${r.got}: «${r.last}»`); }
        }
        parts.forEach((p, k) => {
          const n = p.split(/\s+/).length;
          for (let j = 0; j <= n; j++) for (const [user, want] of USER) for (const aec of [false, true]) {
            const r = scenario(parts, cfg, { s0: Math.max(0, k - 1), k, j, user, want, aec }); total++;
            if (!r.good) { wrong++; if (ex.length < 5) ex.push(`  ${label}, frase ${k + 1}, después de la palabra ${j}${aec ? ' (sin eco)' : ''}: "${user}" → ${r.got}: «${r.last}»`); }
          }
        });
      }
    }
    ok(!wrong, `${vosk ? 'Vosk' : 'Navegador'}, ${base.name}: entiende la orden dicha mientras lee (${total - wrong} de ${total})`);
    ok(!echoWrong, `${vosk ? 'Vosk' : 'Navegador'}, ${base.name}: el eco solo no da órdenes (${echoTotal - echoWrong} de ${echoTotal})`);
    ex.forEach(e => console.log(e));
  }
}

// Vosk escucha sin cortes: si la app sigue leyendo, la frase no se cierra y el resultado sigue creciendo.
// Después de una orden (skip), el eco del paso nuevo no cuenta, y un segundo "siguiente" sí.
{
  const cfg = { rate: 450, lat: 500, unk: 1 };
  lib.SAID.length = 0;
  const step = i => split(texts.find(x => x[0] === `paso ${i}`)[1]);
  let heard = [], skip = 0, seen = [], cmds = [];
  const listen = (tl, userAfter) => {
    let ai = 0; heard = heard.concat(tl.words);
    let ut = userAfter ? tl.words[userAfter].t + 100 : Infinity;
    if (userAfter) heard.push({ t: ut, w: 'siguiente' }), heard.sort((a, b) => a.t - b.t);
    for (const x of heard.filter(x => x.t >= tl.words[0].t)) {
      const et = x.t + cfg.lat;
      while (ai < tl.app.length && tl.app[ai].t <= et) { NOW = tl.app[ai].t; tl.app[ai].fn(); ai++; }
      NOW = et;
      const h = hearCmd(asVosk(heard.filter(y => y.t + cfg.lat <= et).map(y => y.w), cfg).join(' '), skip, seen);
      if (h.cmd) { skip = h.n; cmds.push(h.cmd); return et; }
    }
    while (ai < tl.app.length) { NOW = tl.app[ai].t; tl.app[ai].fn(); ai++; }
    return tl.end;
  };
  // Paso 1: dice "siguiente" a mitad de la última frase. La app corta y lee el paso 2 sin pausa.
  let t = listen(timeline(step(1), cfg, 1e6), 12);
  lib.saidCut();
  ok(cmds.join() === 'next', 'Vosk: "siguiente" a mitad de lectura cuenta una vez');
  // El resultado de Vosk sigue con el eco del paso 2 (incluye "listo… siguiente"): no debe avanzar otra vez.
  const tl2 = timeline(step(2), cfg, t + 50);
  t = listen(tl2, 0);
  ok(cmds.join() === 'next', 'Vosk: el eco del paso nuevo no cuenta, aunque la frase no se haya cerrado');
  // Paso 3: la persona vuelve a decir "siguiente" mientras lee, en el mismo resultado.
  listen(timeline(step(3), cfg, t + 50), 6);
  ok(cmds.join() === 'next,next', 'Vosk: un segundo "siguiente" en la misma frase sí cuenta');
}

console.log(fails ? `\n${fails} fallas` : '\nTodo bien');
process.exit(fails ? 1 : 0);
