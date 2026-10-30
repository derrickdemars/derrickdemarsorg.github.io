// Question bank: parent-functions. Loaded by games/Play.dc.html?bank=parent-functions
window.JPBanks = window.JPBanks || {};
window.JPBanks['parent-functions'] = function (React) {

const NAMES = ['Team f(x)', 'Team g(x)', 'Team h(x)'];
const VALUES = [200, 400, 600, 800, 1000];
const CATS = ['Describe the Transformations', 'Name the Parent', 'Write the Equation (Graph)', 'Write the Equation (Description)', 'Parent Function Facts', 'Vocabulary & Concepts'];
const DEDUCT = 100;
const M = '\u2212';
const fmt = n => n < 0 ? M + Math.abs(n) : String(n);
const T = s => '\\(' + s + '\\)';
const rngFrom = seed => { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mk = r => ({ int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), pick: arr => arr[Math.floor(r() * arr.length)], nz: (lo, hi) => { let v = 0; while (v === 0) v = lo + Math.floor(r() * (hi - lo + 1)); return v; }, chance: p => r() < p });

// Parent catalogue
const PARENTS = {
  lin: { name: 'Linear', tex: 'x', fn: x => x, dom: '(-\\infty, \\infty)', rng: '(-\\infty, \\infty)', sym: 'odd', inc: '(-\\infty, \\infty)', dec: 'never', asym: 'none', endL: '-\\infty', endR: '\\infty', pts: [[0, 0], [1, 1]] },
  quad: { name: 'Quadratic', tex: 'x^2', fn: x => x * x, dom: '(-\\infty, \\infty)', rng: '[0, \\infty)', sym: 'even', inc: '(0, \\infty)', dec: '(-\\infty, 0)', asym: 'none', endL: '\\infty', endR: '\\infty', pts: [[0, 0], [1, 1], [-1, 1]] },
  cub: { name: 'Cubic', tex: 'x^3', fn: x => x * x * x, dom: '(-\\infty, \\infty)', rng: '(-\\infty, \\infty)', sym: 'odd', inc: '(-\\infty, \\infty)', dec: 'never', asym: 'none', endL: '-\\infty', endR: '\\infty', pts: [[0, 0], [1, 1], [-1, -1]] },
  sqrt: { name: 'Square root', tex: '\\sqrt{x}', fn: x => x < 0 ? NaN : Math.sqrt(x), dom: '[0, \\infty)', rng: '[0, \\infty)', sym: 'neither', inc: '(0, \\infty)', dec: 'never', asym: 'none', endL: null, endR: '\\infty', pts: [[0, 0], [1, 1], [4, 2]] },
  abs: { name: 'Absolute value', tex: '|x|', fn: x => Math.abs(x), dom: '(-\\infty, \\infty)', rng: '[0, \\infty)', sym: 'even', inc: '(0, \\infty)', dec: '(-\\infty, 0)', asym: 'none', endL: '\\infty', endR: '\\infty', pts: [[0, 0], [1, 1], [-1, 1]] },
  rec: { name: 'Reciprocal', tex: '\\frac{1}{x}', fn: x => x === 0 ? NaN : 1 / x, dom: '(-\\infty, 0) \\cup (0, \\infty)', rng: '(-\\infty, 0) \\cup (0, \\infty)', sym: 'odd', inc: 'never', dec: '(-\\infty, 0) \\cup (0, \\infty)', asym: 'x = 0 and y = 0', endL: '0', endR: '0', pts: [[1, 1], [-1, -1]], va: 0, ha: 0 },
  exp: { name: 'Exponential', tex: '2^x', fn: x => Math.pow(2, x), dom: '(-\\infty, \\infty)', rng: '(0, \\infty)', sym: 'neither', inc: '(-\\infty, \\infty)', dec: 'never', asym: 'y = 0', endL: '0', endR: '\\infty', pts: [[0, 1], [1, 2]], ha: 0 },
  expe: { name: 'Exponential', tex: 'e^x', fn: x => Math.exp(x), dom: '(-\\infty, \\infty)', rng: '(0, \\infty)', sym: 'neither', inc: '(-\\infty, \\infty)', dec: 'never', asym: 'y = 0', endL: '0', endR: '\\infty', pts: [[0, 1]], ha: 0 },
  log: { name: 'Logarithmic', tex: '\\log_2 x', fn: x => x <= 0 ? NaN : Math.log2(x), dom: '(0, \\infty)', rng: '(-\\infty, \\infty)', sym: 'neither', inc: '(0, \\infty)', dec: 'never', asym: 'x = 0', endL: null, endR: '\\infty', pts: [[1, 0], [2, 1]], va: 0 },
};
const PKEYS = ['lin', 'quad', 'cub', 'sqrt', 'abs', 'rec', 'exp', 'log'];
const GRAPH_KEYS = ['quad', 'cub', 'sqrt', 'abs', 'rec', 'exp', 'log'];

// Build g(x) = a * P(b(x - h)) + k as LaTeX
const num = n => Number.isInteger(n) ? String(n) : (n === 0.5 ? '\\tfrac{1}{2}' : n === -0.5 ? '-\\tfrac{1}{2}' : n === 1 / 3 ? '\\tfrac{1}{3}' : n === -1 / 3 ? '-\\tfrac{1}{3}' : String(n));
const coef = n => n === 1 ? '' : n === -1 ? '-' : num(n);
function inner(b, hh) {
  const sh = hh === 0 ? 'x' : '(x ' + (hh > 0 ? '- ' + hh : '+ ' + (-hh)) + ')';
  if (b === 1) return hh === 0 ? 'x' : sh;
  if (hh === 0) return coef(b) + 'x';
  return coef(b) + sh;
}
function gTex(p, a, b, hh, k) {
  const inn = inner(b, hh), P = PARENTS[p]; let body;
  const simpleInner = inn === 'x';
  switch (p) {
    case 'lin': body = inn; break;
    case 'quad': body = (simpleInner || /^\(.*\)$/.test(inn)) ? inn + '^2' : '(' + inn + ')^2'; break;
    case 'cub': body = (simpleInner || /^\(.*\)$/.test(inn)) ? inn + '^3' : '(' + inn + ')^3'; break;
    case 'sqrt': body = '\\sqrt{' + inn + '}'; break;
    case 'abs': body = '|' + inn + '|'; break;
    case 'rec': body = '\\frac{1}{' + inn + '}'; break;
    case 'exp': body = '2^{' + inn + '}'; break;
    case 'expe': body = 'e^{' + inn + '}'; break;
    case 'log': body = '\\log_2' + (simpleInner ? ' x' : inn.startsWith('(') ? inn : '(' + inn + ')'); break;
  }
  let s = (a === 1 ? '' : a === -1 ? '-' : num(a) + (p === 'rec' ? '' : '')) + body;
  if (p === 'rec' && a !== 1 && a !== -1) s = '\\frac{' + num(Math.abs(a)) + '}{' + inn + '}', s = (a < 0 ? '-' : '') + s;
  if (p === 'rec' && a === -1) s = '-\\frac{1}{' + inn + '}';
  if (k !== 0) s += k > 0 ? ' + ' + k : ' - ' + (-k);
  return s;
}
const gFn = (p, a, b, hh, k) => x => a * PARENTS[p].fn(b * (x - hh)) + k;

// transformation descriptions (Kuta wording with stretch/shrink)
const unit = n => Math.abs(n) === 1 ? 'unit' : 'units';
function describe(a, b, hh, k) {
  const out = [];
  if (Math.abs(a) !== 1) out.push(Math.abs(a) > 1 ? 'stretch vertically by a factor of ' + num(Math.abs(a)) : 'shrink vertically by a factor of ' + num(1 / Math.abs(a)));
  if (Math.abs(b) !== 1) out.push(Math.abs(b) > 1 ? 'shrink horizontally by a factor of ' + num(Math.abs(b)) : 'stretch horizontally by a factor of ' + num(1 / Math.abs(b)));
  if (a < 0) out.push('reflect across the x-axis');
  if (b < 0) out.push('reflect across the y-axis');
  if (hh !== 0) out.push('translate ' + (hh > 0 ? 'right' : 'left') + ' ' + Math.abs(hh) + ' ' + unit(hh));
  if (k !== 0) out.push('translate ' + (k > 0 ? 'up' : 'down') + ' ' + Math.abs(k) + ' ' + unit(k));
  return out;
}
const whyFor = (a, b, hh, k) => {
  const w = [];
  if (Math.abs(a) !== 1 || a < 0) w.push('The number outside multiplies every output, so it stretches, shrinks, or flips vertically.');
  if (Math.abs(b) !== 1 || b < 0) w.push('A factor on x acts horizontally and does the opposite of what it looks like: ' + T('f(2x)') + ' is a shrink.');
  if (hh !== 0) w.push('Inside the function, ' + T('x - h') + ' moves the graph right ' + T('h') + ', opposite the sign.');
  if (k !== 0) w.push('Adding outside the function moves every point straight up or down.');
  return w.join(' ');
};

// pick a transformation set with n moves
function pickTransform(R, n, opts) {
  const allowH = opts.allowH !== false, p = opts.p;
  let a = 1, b = 1, hh = 0, k = 0;
  const moves = ['a', 'refx', 'h', 'k'].concat(allowH ? ['b', 'refy'] : []);
  const chosen = [];
  while (chosen.length < n) { const m = R.pick(moves); if (!chosen.includes(m) && !(m === 'refy' && (p === 'quad' || p === 'abs'))) chosen.push(m); }
  for (const m of chosen) {
    if (m === 'a') a *= R.pick([2, 3, 0.5, 1 / 3]);
    if (m === 'refx') a *= -1;
    if (m === 'b') b *= R.pick([2, 3, 0.5]);
    if (m === 'refy') b *= -1;
    if (m === 'h') hh = R.nz(-4, 4);
    if (m === 'k') k = R.nz(-4, 4);
  }
  return { a, b, hh, k };
}

// ---------- graph drawing ----------
function graph(fns) {
  const e = React.createElement, S = 320, pad = 10, u = (S - 2 * pad) / 16, X = x => pad + (x + 8) * u, Y = y => pad + (8 - y) * u;
  const kids = [];
  for (let i = -8; i <= 8; i++) { kids.push(e('line', { key: 'v' + i, x1: X(i), y1: Y(-8), x2: X(i), y2: Y(8), stroke: i === 0 ? 'var(--jp-muted)' : 'var(--jp-panel)', strokeWidth: i === 0 ? 2 : 1 })); kids.push(e('line', { key: 'h' + i, x1: X(-8), y1: Y(i), x2: X(8), y2: Y(i), stroke: i === 0 ? 'var(--jp-muted)' : 'var(--jp-panel)', strokeWidth: i === 0 ? 2 : 1 })); }
  [-8, -6, -4, -2, 2, 4, 6, 8].forEach(i => { kids.push(e('text', { key: 'tx' + i, x: X(i), y: Y(0) + 13, fill: 'var(--jp-muted)', fontSize: 10, textAnchor: 'middle', fontFamily: 'sans-serif' }, i)); kids.push(e('text', { key: 'ty' + i, x: X(0) - 4, y: Y(i) + 3, fill: 'var(--jp-muted)', fontSize: 10, textAnchor: 'end', fontFamily: 'sans-serif' }, i)); });
  fns.forEach((f, fi) => {
    if (f.va != null) kids.push(e('line', { key: 'va' + fi, x1: X(f.va), y1: Y(-8), x2: X(f.va), y2: Y(8), stroke: f.color, strokeWidth: 1.5, strokeDasharray: '6 5', opacity: .8 }));
    if (f.ha != null) kids.push(e('line', { key: 'ha' + fi, x1: X(-8), y1: Y(f.ha), x2: X(8), y2: Y(f.ha), stroke: f.color, strokeWidth: 1.5, strokeDasharray: '6 5', opacity: .8 }));
    let d = '', pen = false;
    for (let i = 0; i <= 640; i++) {
      const x = -8 + i / 40, y = f.fn(x);
      if (!isFinite(y) || isNaN(y) || Math.abs(y) > 40) { pen = false; continue; }
      const yc = Math.max(-8.6, Math.min(8.6, y));
      d += (pen ? 'L' : 'M') + X(x).toFixed(1) + ',' + Y(yc).toFixed(1); pen = Math.abs(y) <= 8.6;
      if (!pen) d += 'M' + X(x).toFixed(1) + ',' + Y(yc).toFixed(1), pen = true, pen = Math.abs(y) <= 8.6 ? true : false;
    }
    kids.push(e('path', { key: 'p' + fi, d, fill: 'none', stroke: f.color, strokeWidth: f.dashed ? 2 : 3, strokeDasharray: f.dashed ? '7 6' : undefined, strokeLinejoin: 'round', strokeLinecap: 'round' }));
  });
  return e('svg', { viewBox: '0 0 ' + S + ' ' + S, width: '100%', style: { display: 'block', background: 'var(--jp-bg)', borderRadius: 8, border: '1px solid var(--jp-border)' } }, ...kids);
}
const asymOf = (p, b, hh, k) => ({ va: PARENTS[p].va != null ? hh + PARENTS[p].va / b : null, ha: PARENTS[p].ha != null ? k : null });

// ---------- generators ----------
function genDescribe(R, row) {
  const n = [1, 2, 2, 3, 3][row], allowH = row >= 3, p = R.pick(PKEYS.filter(x => !(x === 'lin' && row >= 3)));
  const t = pickTransform(R, n, { allowH, p }), pk = p === 'exp' && R.chance(.4) ? 'expe' : p;
  const g = gTex(pk, t.a, t.b, t.hh, t.k), list = describe(t.a, t.b, t.hh, t.k);
  return { q: 'Describe the transformations necessary to transform the graph of ' + T('f(x) = ' + PARENTS[pk].tex) + ' into that of ' + T('g(x) = ' + g) + '.', a: list.join('\n'), steps: ['Compare ' + T('g(x)') + ' to the form ' + T('a \\cdot f(b(x - h)) + k') + ': ' + T('a = ' + num(t.a) + ',\\ b = ' + num(t.b) + ',\\ h = ' + t.hh + ',\\ k = ' + t.k) + '.', 'Read each letter as a move. Any order of listing is fine.'], strategy: whyFor(t.a, t.b, t.hh, t.k) };
}
function genNameParent(R, row) {
  const n = [1, 1, 2, 2, 3][row], p = R.pick(GRAPH_KEYS), t = pickTransform(R, n, { allowH: row >= 3, p });
  const fn = gFn(p, t.a, t.b, t.hh, t.k), as = asymOf(p, t.b, t.hh, t.k), P = PARENTS[p];
  return { q: 'Identify the parent function of the graphed function. Give its name and equation.', a: P.name + ': ' + T('f(x) = ' + P.tex), steps: ['Look at the overall shape, ignoring position and size: ' + ({ quad: 'a U-shaped parabola', cub: 'an S-curve through its center', sqrt: 'half a parabola on its side starting at an endpoint', abs: 'a V with straight sides', rec: 'two branches with a vertical and a horizontal asymptote', exp: 'a curve with a horizontal asymptote that rises steeply on one side', log: 'a curve with a vertical asymptote that rises slowly' })[p] + '.', 'The graph shown is ' + T('g(x) = ' + gTex(p, t.a, t.b, t.hh, t.k)) + '.'], strategy: 'Shape identifies the family; shifts, stretches, and flips never change the family.', fig: [{ fn, color: 'var(--jp-accent)', ...as }], parent: { fn: P.fn, color: 'var(--jp-accent2)', dashed: true, va: P.va, ha: P.ha } };
}
function genEqGraph(R, row) {
  const n = [1, 2, 2, 3, 3][row], p = R.pick(row >= 3 ? GRAPH_KEYS : GRAPH_KEYS.filter(x => x !== 'rec')), t = pickTransform(R, n, { allowH: row >= 3, p });
  const fn = gFn(p, t.a, t.b, t.hh, t.k), as = asymOf(p, t.b, t.hh, t.k), P = PARENTS[p], list = describe(t.a, t.b, t.hh, t.k);
  return { q: 'Identify the parent function and write an equation for the graphed function.', a: 'Parent: ' + T('f(x) = ' + P.tex) + '\n' + T('g(x) = ' + gTex(p, t.a, t.b, t.hh, t.k)), steps: ['Parent: ' + P.name + ', ' + T('f(x) = ' + P.tex) + '.', 'Transformations seen: ' + list.join('; ') + '.', 'So ' + T('a = ' + num(t.a) + ',\\ b = ' + num(t.b) + ',\\ h = ' + t.hh + ',\\ k = ' + t.k) + '.'], strategy: 'Locate the key point or asymptotes first to find h and k; then compare a second point to the parent for a and b.', fig: [{ fn, color: 'var(--jp-accent)', ...as }], parent: { fn: P.fn, color: 'var(--jp-accent2)', dashed: true, va: P.va, ha: P.ha } };
}
function genEqDesc(R, row) {
  const n = [1, 2, 2, 3, 3][row], p = R.pick(PKEYS), pk = p === 'exp' && R.chance(.4) ? 'expe' : p, t = pickTransform(R, n, { allowH: row >= 2, p });
  const list = describe(t.a, t.b, t.hh, t.k);
  return { q: 'Transform ' + T('f(x) = ' + PARENTS[pk].tex) + ' as described and write the resulting function as an equation.\n' + list.join('\n'), a: T('g(x) = ' + gTex(pk, t.a, t.b, t.hh, t.k)), steps: ['Translate each move into a letter of ' + T('a \\cdot f(b(x - h)) + k') + ': ' + T('a = ' + num(t.a) + ',\\ b = ' + num(t.b) + ',\\ h = ' + t.hh + ',\\ k = ' + t.k) + '.', 'Substitute into the parent: ' + T('g(x) = ' + gTex(pk, t.a, t.b, t.hh, t.k)) + '.'], strategy: whyFor(t.a, t.b, t.hh, t.k) };
}
function genFacts(R, row) {
  const p = R.pick(PKEYS), P = PARENTS[p], F = 'f(x) = ' + P.tex;
  const pool = [
    () => ({ q: 'State the domain of ' + T(F) + ' in interval notation.', a: T(P.dom), steps: [p === 'sqrt' ? 'The radicand cannot be negative.' : p === 'log' ? 'Logarithms accept only positive inputs.' : p === 'rec' ? 'Division by zero is undefined at ' + T('x = 0') + '.' : 'Every real number can be substituted.'], strategy: 'Domain: which x-values are allowed in?' }),
    () => ({ q: 'State the range of ' + T(F) + ' in interval notation.', a: T(P.rng), steps: [['quad', 'abs', 'sqrt'].includes(p) ? 'Outputs are never negative, and 0 is reached.' : p === 'exp' ? 'Powers of a positive base are always positive and never reach 0.' : p === 'rec' ? 'The output is never 0, but every other value occurs.' : 'The outputs cover all real numbers.'], strategy: 'Range: which y-values come out?' }),
    () => ({ q: 'Is ' + T(F) + ' even, odd, or neither? Explain.', a: P.sym === 'even' ? 'Even: ' + T('f(-x) = f(x)') + ', symmetric about the y-axis.' : P.sym === 'odd' ? 'Odd: ' + T('f(-x) = -f(x)') + ', symmetric about the origin.' : 'Neither; no symmetry about the y-axis or origin.', steps: [P.sym === 'neither' ? 'The graph is not a mirror image across the y-axis and does not repeat under a half-turn.' : 'Test ' + T('f(-x)') + ' and compare to ' + T('f(x)') + '.'], strategy: 'Even functions reflect across the y-axis; odd functions rotate 180° about the origin.' }),
    () => ({ q: 'On what interval(s) is ' + T(F) + ' increasing? Decreasing?', a: 'Increasing: ' + (P.inc === 'never' ? 'never' : T(P.inc)) + '\nDecreasing: ' + (P.dec === 'never' ? 'never' : T(P.dec)), steps: ['Read the graph left to right: rising means increasing.'], strategy: 'Intervals are written in terms of x, with open endpoints at turning points.' }),
    () => ({ q: 'Describe the end behavior of ' + T(F) + ' using limit notation.', a: (P.endL != null ? T('\\lim_{x \\to -\\infty} f(x) = ' + P.endL) + '\n' : '') + T('\\lim_{x \\to \\infty} f(x) = ' + P.endR) + (P.endL == null ? '\n(No left end: the domain starts at ' + T(p === 'sqrt' ? '0' : '0^+') + '.)' : ''), steps: ['Follow the graph far to the right' + (P.endL != null ? ' and far to the left.' : '; there is no far left for this function.')], strategy: 'End behavior describes where the outputs head as x grows without bound.' }),
  ];
  if (P.asym !== 'none') pool.push(() => ({ q: 'State the asymptote(s) of ' + T(F) + '.', a: T(P.asym.replace(' and ', '\\text{ and }')), steps: [p === 'rec' ? 'The graph never touches either axis.' : p === 'exp' ? 'Outputs approach 0 but never reach it as ' + T('x \\to -\\infty') + '.' : 'As ' + T('x \\to 0^+') + ', ' + T('\\log_2 x \\to -\\infty') + '.'], strategy: 'An asymptote is a line the graph approaches but does not cross (here).' }));
  const idx = Math.min(pool.length - 1, [0, 1, 2, 3, 4][row] + (P.asym !== 'none' && R.chance(.35) ? 99 : 0));
  return pool[idx >= pool.length ? pool.length - 1 : idx]();
}
const VOCAB = [
  [
    { q: 'What is a translation of a graph?', a: 'A slide: every point moves the same distance in the same direction, with no change in shape or size.', steps: ['Vertical: ' + T('f(x) + k') + '. Horizontal: ' + T('f(x - h)') + '.'], strategy: 'Translations come from adding or subtracting.' },
    { q: 'What is a parent function?', a: 'The simplest function in a family, with no transformations applied.', steps: ['Example: ' + T('x^2') + ' is the parent of every quadratic.'], strategy: 'Every family member is a transformed parent.' },
    { q: 'What is a reflection of a graph?', a: 'A flip across a line, producing a mirror image.', steps: [T('-f(x)') + ' flips across the x-axis; ' + T('f(-x)') + ' flips across the y-axis.'], strategy: 'A negative sign is a reflection.' },
  ],
  [
    { q: 'In ' + T('g(x) = a \\cdot f(b(x - h)) + k') + ', what does ' + T('k') + ' do?', a: 'Translates the graph vertically: up if ' + T('k > 0') + ', down if ' + T('k < 0') + '.', steps: ['It is added after the function acts, so it changes outputs.'], strategy: 'Outside the function: vertical.' },
    { q: 'In ' + T('g(x) = a \\cdot f(b(x - h)) + k') + ', what does ' + T('h') + ' do?', a: 'Translates the graph horizontally: right if ' + T('h > 0') + ', left if ' + T('h < 0') + '.', steps: ['It changes the input before the function acts.'], strategy: 'Inside the function: horizontal, and opposite the sign.' },
    { q: 'What is a dilation (stretch or shrink) of a graph?', a: 'A resizing toward or away from an axis by a constant factor, changing the shape but not the location of the axis.', steps: ['Vertical: multiply outputs by ' + T('a') + '. Horizontal: multiply inputs by ' + T('b') + '.'], strategy: 'Multiplication is a dilation.' },
  ],
  [
    { q: 'What is the difference between ' + T('f(x) + 2') + ' and ' + T('f(x + 2)') + '?', a: T('f(x) + 2') + ' shifts up 2; ' + T('f(x + 2)') + ' shifts left 2.', steps: ['Outside the parentheses: vertical, same direction as the sign.', 'Inside the parentheses: horizontal, opposite the sign.'], strategy: 'Inside vs outside decides the axis.' },
    { q: 'What is an asymptote?', a: 'A line that a graph approaches more and more closely without reaching it (as x or y grows without bound).', steps: ['Vertical asymptotes come from undefined inputs; horizontal ones describe end behavior.'], strategy: 'Asymptotes move with the graph under translations.' },
    { q: 'Define the domain and range of a function.', a: 'Domain: the set of all allowed inputs (x). Range: the set of all resulting outputs (y).', steps: ['Read domain left to right, range bottom to top.'], strategy: 'Inputs in, outputs out.' },
  ],
  [
    { q: 'Why does ' + T('f(x - 3)') + ' move the graph right, not left?', a: 'The input must be 3 larger to produce the same output as before, so every point lands 3 units further right.', steps: ['If ' + T('f(0)') + ' was a key output, now ' + T('x = 3') + ' gives ' + T('f(3 - 3) = f(0)') + '.'], strategy: 'Horizontal changes are inverse to how they look.' },
    { q: 'In ' + T('g(x) = a \\cdot f(b(x - h)) + k') + ', what does a negative ' + T('a') + ' do, and what does a negative ' + T('b') + ' do?', a: 'Negative ' + T('a') + ': reflect across the x-axis. Negative ' + T('b') + ': reflect across the y-axis.', steps: ['Outside sign flips outputs (y); inside sign flips inputs (x).'], strategy: 'Same inside/outside rule as every other transformation.' },
    { q: 'Which transformations change the domain of a function, and which change the range?', a: 'Horizontal moves (h, b, y-axis reflection) can change the domain; vertical moves (k, a, x-axis reflection) can change the range.', steps: ['Example: ' + T('\\sqrt{x - 2}') + ' has domain ' + T('[2, \\infty)') + '; ' + T('\\sqrt{x} - 2') + ' has range ' + T('[-2, \\infty)') + '.'], strategy: 'Domain lives on the x-axis, range on the y-axis.' },
  ],
  [
    { q: 'Why does ' + T('f(2x)') + ' shrink the graph horizontally by a factor of 2 instead of stretching it?', a: 'The function reaches each output at half the input, so the graph is compressed toward the y-axis.', steps: ['The point ' + T('(4, f(4))') + ' on ' + T('f') + ' becomes ' + T('(2, f(4))') + ' on ' + T('f(2x)') + '.'], strategy: 'Inside multipliers act inversely.' },
    { q: 'For which parent functions is a reflection across the y-axis indistinguishable from no change, and why?', a: 'Even functions such as ' + T('x^2') + ' and ' + T('|x|') + ', because ' + T('f(-x) = f(x)') + '.', steps: ['Their graphs are already symmetric about the y-axis.'], strategy: 'Symmetry can make two different transformations look identical.' },
    { q: 'How do the asymptotes of ' + T('f(x) = \\frac{1}{x}') + ' change under ' + T('g(x) = \\frac{1}{x - h} + k') + '?', a: 'Vertical asymptote moves to ' + T('x = h') + '; horizontal asymptote moves to ' + T('y = k') + '.', steps: ['Asymptotes translate along with every other feature of the graph.'], strategy: 'Track the asymptotes to read h and k off a reciprocal graph.' },
  ],
];

function tex(str) {
  const k = window.katex;
  const parts = String(str).split(/(\\\([\s\S]+?\\\))/g);
  return React.createElement(React.Fragment, null, ...parts.map((p, i) => {
    if (p.startsWith('\\(') && p.endsWith('\\)')) {
      const body = p.slice(2, -2);
      if (!k) return React.createElement('span', { key: i }, body);
      return React.createElement('span', { key: i, dangerouslySetInnerHTML: { __html: k.renderToString(body, { throwOnError: false }) } });
    }
    return p;
  }));
}

const seedsFrom = base => Array.from({ length: 30 }, (_, i) => (base * 31 + i * 7919) >>> 0);
function buildCategories(seeds) {
  const gens = [genDescribe, genNameParent, genEqGraph, genEqDesc, genFacts, (R, row) => R.pick(VOCAB[row])];
  return CATS.map((name, ci) => ({ name, items: VALUES.map((_, ri) => gens[ci](mk(rngFrom(seeds[ci * 5 + ri])), ri)) }));
}
const pickGame = s => ({ teams: s.teams, used: s.used, seeds: s.seeds, turn: s.turn, dd: s.dd });
const randDD = used => { const free = Array.from({ length: 30 }, (_, i) => i).filter(i => !used.includes(i)); return free.length ? free[Math.floor(Math.random() * free.length)] : -1; };
const KEY = 'transformJeopardy.v1';

  return { id: 'parent-functions', title: 'Parent Functions and Transformations Jeopardy', storageKey: 'transformJeopardy.v1', values: VALUES, seedCount: 30, defaultTimer: 144, build: seeds => buildCategories(seeds), tex, fig: (it, o) => it.fig ? graph(o && o.showParent && it.parent ? [it.parent, ...it.fig] : it.fig) : null, parentToggle: true };
};
