// Question bank: trig. Loaded by games/Play.dc.html?bank=trig
window.JPBanks = window.JPBanks || {};
window.JPBanks['trig'] = function (React) {

const NAMES = ['Pythagoreans', 'Euclideans', 'Archimedeans'];
const VALUES = [200, 400, 600, 800, 1000];
const CATS = ['Special Right Triangles', 'Trig Ratios', 'Find the Angle', 'Find the Side', 'Strategy'];
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [9, 40, 41], [20, 21, 29]];
const LET = [['A', 'B', 'C'], ['X', 'Y', 'Z'], ['P', 'Q', 'R'], ['D', 'E', 'F']];
const THETAS = [16, 18, 22, 23, 25, 27, 32, 35, 38, 41, 47, 51, 52, 55, 58, 63, 67, 72, 75];
const DEDUCT = 100;
const M = '\u2212';
const fmt = n => n < 0 ? M + Math.abs(n) : String(n);
const T = s => `\\(${s}\\)`;
const sq = n => `\\sqrt{${n}}`;
const rd = (k, n) => (k === 1 ? '' : k) + sq(n);
const rdU = (k, n) => (k === 1 ? '' : k) + '\u221A' + n;
const half2 = n => n % 2 === 0 ? rd(n / 2, 2) : `\\frac{${n}\\sqrt{2}}{2}`;
const third3 = n => n % 3 === 0 ? rd(n / 3, 3) : `\\frac{${n}\\sqrt{3}}{3}`;
const rngFrom = seed => { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mk = r => ({ int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), pick: arr => arr[Math.floor(r() * arr.length)] });

function tri(o) {
  const W = 320, H = 250, pad = 46; let r = o.bw / o.bh; r = Math.max(.5, Math.min(2.1, r));
  const s = Math.min((W - 2 * pad) / r, H - 2 * pad); const w = r * s, h = s;
  const Cx = (W - w) / 2, Cy = (H + h) / 2, Bx = Cx + w, By = Cy, Ax = Cx, Ay = Cy - h;
  const e = React.createElement, hl = t => /^[xy?]$/.test(t) ? 'var(--jp-accent2)' : 'var(--jp-text)';
  const lab = (t, x, y, anchor, extra) => {
    if (!t || !String(t).trim()) return null; const o = extra || {}, fs = o.fontSize || 22, W = 170, Hh = 64;
    const ax = anchor === 'end' ? x - W : anchor === 'start' ? x : x - W / 2, jc = anchor === 'end' ? 'flex-end' : anchor === 'start' ? 'flex-start' : 'center';
    const k = window.katex, html = k ? k.renderToString(String(t), { throwOnError: false }) : null;
    return e('foreignObject', { x: ax, y: y - Hh / 2, width: W, height: Hh, style: { overflow: 'visible' } },
      e('div', { xmlns: 'http://www.w3.org/1999/xhtml', style: { width: W, height: Hh, display: 'flex', alignItems: 'center', justifyContent: jc, color: o.fill || hl(t), fontSize: fs, lineHeight: 1 } }, html ? e('span', { dangerouslySetInnerHTML: { __html: html } }) : String(t)));
  };
  const kids = [e('polygon', { points: `${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`, fill: 'rgba(45,212,191,.12)', stroke: 'var(--jp-accent)', strokeWidth: 3, strokeLinejoin: 'round' }),
    e('path', { d: `M${Cx},${Cy - 14}L${Cx + 14},${Cy - 14}L${Cx + 14},${Cy}`, fill: 'none', stroke: 'var(--jp-muted)', strokeWidth: 2 })];
  const len = Math.hypot(w, h), ux = w / len, uy = h / len;
  if (o.aA) { kids.push(e('path', { d: `M${Ax},${Ay + 26}A26,26 0 0 0 ${Ax + 26 * ux},${Ay + 26 * uy}`, fill: 'none', stroke: 'var(--jp-accent2)', strokeWidth: 2 })); const bx = ux, by = 1 + uy, bl = Math.hypot(bx, by); kids.push(lab(o.aA, Ax + 50 * bx / bl, Ay + 50 * by / bl, 'middle', { fontSize: 19 })); }
  if (o.aB) { kids.push(e('path', { d: `M${Bx - 26},${By}A26,26 0 0 1 ${Bx - 26 * ux},${By - 26 * uy}`, fill: 'none', stroke: 'var(--jp-accent2)', strokeWidth: 2 })); const bx = -1 - ux, by = -uy, bl = Math.hypot(bx, by); kids.push(lab(o.aB, Bx + 50 * bx / bl, By + 50 * by / bl, 'middle', { fontSize: 19 })); }
  kids.push(lab(o.lb, (Ax + Bx) / 2, Cy + 24), lab(o.ll, Cx - 12, (Ay + Cy) / 2, 'end'), lab(o.lh, (Ax + Bx) / 2 + 16 * uy, (Ay + By) / 2 - 16 * ux, 'start'));
  if (o.vA) kids.push(lab(o.vA, Ax - 8, Ay - 12, 'end', { fill: 'var(--jp-muted)', fontSize: 18 }), lab(o.vB, Bx + 10, By + 16, 'start', { fill: 'var(--jp-muted)', fontSize: 18 }), lab(o.vC, Cx - 8, Cy + 16, 'end', { fill: 'var(--jp-muted)', fontSize: 18 }));
  return e('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: { display: 'block', overflow: 'visible' } }, ...kids.filter(Boolean));
}

function genSpecial(R, row) {
  const X = T('x');
  if (row === 0) { const n = R.int(2, 12); return { fig: tri({ bw: 1, bh: 1.732, lb: String(n), lh: 'x', aA: '30^\\circ' }), q: `A 30-60-90 triangle has a short leg of ${T(n)}, across from the 30° angle. Find the hypotenuse ${X}.`, a: T(`x = ${2 * n}`), steps: ['The side across from the 30° angle is the short leg.', `The hypotenuse is twice the short leg: ${T(`2 \\cdot ${n} = ${2 * n}`)}.`], strategy: '30-60-90 sides are in the ratio 1 : √3 : 2 (short leg : long leg : hypotenuse).' }; }
  if (row === 1) { const n = R.int(2, 12); return { fig: tri({ bw: 1, bh: 1, lb: 'x', lh: rd(n, 2), aA: '45^\\circ' }), q: `A 45-45-90 triangle has a hypotenuse of ${T(rd(n, 2))}. Find the leg ${X}.`, a: T(`x = ${n}`), steps: [`In a 45-45-90 triangle, hypotenuse = leg · ${T(sq(2))}.`, `Divide by ${T(sq(2))}: ${T(`\\frac{${rd(n, 2)}}{\\sqrt{2}} = ${n}`)}.`], strategy: '45-45-90 sides are in the ratio 1 : 1 : √2. Both legs are equal.' }; }
  if (row === 2) { const n = R.int(2, 10); return { fig: tri({ bw: 1.732, bh: 1, lb: rd(n, 3), lh: 'x', aA: '60^\\circ' }), q: `A 30-60-90 triangle has a long leg of ${T(rd(n, 3))}, across from the 60° angle. Find the hypotenuse ${X}.`, a: T(`x = ${2 * n}`), steps: [`Long leg = short leg · ${T(sq(3))}, so the short leg is ${T(n)}.`, `Hypotenuse = 2 · short leg = ${T(2 * n)}.`], strategy: 'Always find the short leg first; the other two sides come from it.' }; }
  if (row === 3) { const n = R.int(3, 15); return { fig: tri({ bw: 1, bh: 1, lb: 'x', lh: String(n), aA: '45^\\circ' }), q: `A 45-45-90 triangle has a hypotenuse of ${T(n)}. Find the leg ${X} in simplest radical form.`, a: T(`x = ${half2(n)}`), steps: [`Leg = hypotenuse ÷ ${T(sq(2))}: ${T(`\\frac{${n}}{\\sqrt{2}}`)}.`, `Rationalize: multiply top and bottom by ${T(sq(2))} to get ${T(`\\frac{${n}\\sqrt{2}}{2}`)}${n % 2 === 0 ? `, which simplifies to ${T(half2(n))}` : ''}.`], strategy: 'A radical cannot stay in the denominator. Multiply by √2 over √2.' }; }
  const n = R.pick([4, 5, 7, 8, 10, 11, 13, 14]);
  return { fig: tri({ bw: 1.732, bh: 1, lb: String(n), ll: 'y', lh: 'x', aA: '60^\\circ' }), q: `A 30-60-90 triangle has a long leg of ${T(n)}, across from the 60° angle. Find the short leg ${T('y')} and the hypotenuse ${X} in simplest radical form.`, a: T(`y = ${third3(n)},\\quad x = ${third3(2 * n)}`), steps: [`Short leg = long leg ÷ ${T(sq(3))}: ${T(`\\frac{${n}}{\\sqrt{3}} = \\frac{${n}\\sqrt{3}}{3}`)}.`, `Hypotenuse = 2 · short leg = ${T(third3(2 * n))}.`], strategy: 'Divide by √3 to get the short leg, rationalize, then double it for the hypotenuse.' };
}

function setupTriple(R, row, bigK) {
  const t = R.pick(row < 2 ? TRIPLES.slice(0, 2) : TRIPLES); const k = bigK ? R.int(2, 4) : R.int(1, row < 2 ? 2 : 3);
  const [a, b, c] = t; const names = R.pick(LET), p = R.pick([[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1]]);
  const vA = names[p[0]], vB = names[p[1]], vC = names[p[2]];
  const atA = R.int(0, 1) === 0; const bottom = a * k, left = b * k, hyp = c * k;
  return { vA, vB, vC, atA, bottom, left, hyp, opp: atA ? bottom : left, adj: atA ? left : bottom, oppB: atA ? a : b, adjB: atA ? b : a, c, k, tName: atA ? vA : vB };
}
const WORD = { opp: 'opposite side', adj: 'adjacent side', hyp: 'hypotenuse' };
const DEF = { sin: 'opposite over hypotenuse', cos: 'adjacent over hypotenuse', tan: 'opposite over adjacent' };

function genRatio(R, row) {
  const s = setupTriple(R, row, row === 3); const fn = ['sin', 'cos', 'tan', R.pick(['sin', 'cos', 'tan']), 'tan'][row];
  const num = fn === 'cos' ? s.adj : s.opp, den = fn === 'tan' ? s.adj : s.hyp, numB = fn === 'cos' ? s.adjB : s.oppB, denB = fn === 'tan' ? s.adjB : s.c;
  const hide = row === 4;
  const fig = tri({ bw: s.bottom, bh: s.left, lb: hide && !s.atA ? '' : String(s.bottom), ll: hide && s.atA ? '' : String(s.left), lh: String(s.hyp), vA: s.vA, vB: s.vB, vC: s.vC, aA: s.atA ? '\u00a0' : undefined, aB: s.atA ? undefined : '\u00a0' });
  const given = [T(`${s.vA}${s.vC} = ${s.left}`), T(`${s.vC}${s.vB} = ${s.bottom}`), T(`${s.vA}${s.vB} = ${s.hyp}`)];
  if (hide) given.splice(s.atA ? 0 : 1, 1);
  const desc = `Right triangle ${T(s.vA + s.vB + s.vC)} has its right angle at ${T(s.vC)}, with ${given.join(', ')}.`;
  const ratioStep = `${fn} is ${DEF[fn]}: ${T(`\\${fn} ${s.tName} = \\frac{${num}}{${den}}${s.k > 1 ? ` = \\frac{${numB}}{${denB}}` : ''}`)}.`;
  return { fig, q: `Find ${T(`\\${fn} ${s.tName}`)} as a fraction in lowest terms.\n${desc}`, a: T(`\\${fn} ${s.tName} = \\frac{${numB}}{${denB}}`),
    steps: hide ? [`Only two sides are given. Find the missing leg first: ${T(`\\sqrt{${s.hyp}^2 - ${s.opp}^2} = \\sqrt{${s.hyp * s.hyp - s.opp * s.opp}} = ${s.adj}`)}.`, ratioStep] : [`From angle ${T(s.tName)}: opposite = ${T(s.opp)}, adjacent = ${T(s.adj)}, hypotenuse = ${T(s.hyp)}.`, ratioStep],
    strategy: 'SOH-CAH-TOA. Label opposite and adjacent from the angle named in the question, then reduce the fraction.' };
}

function genAngle(R, row) {
  const s = setupTriple(R, row, false); const fn = ['sin', 'cos', 'tan', 'tan', 'cos'][row];
  const deg = Math.round(Math.atan2(s.opp, s.adj) * 180 / Math.PI);
  const show = { opp: true, adj: true, hyp: true }; if (row === 3) show.hyp = false; if (row === 4) show.opp = false;
  const lbl = k => show[k] ? String(s[k]) : '';
  const fig = tri({ bw: s.bottom, bh: s.left, lb: s.atA ? lbl('opp') : lbl('adj'), ll: s.atA ? lbl('adj') : lbl('opp'), lh: lbl('hyp'), aA: s.atA ? '?' : undefined, aB: s.atA ? undefined : '?' });
  const known = ['opp', 'adj', 'hyp'].filter(k => show[k]).map(k => `${WORD[k]} ${s[k]}`).join(', ');
  const num = fn === 'cos' ? s.adj : s.opp, den = fn === 'tan' ? s.adj : s.hyp;
  return { fig, q: `Find the measure of the marked angle to the nearest degree.\nFrom the marked angle: ${known}.`, a: T(`${deg}^\\circ`),
    steps: [`The two known sides that go with the angle give ${fn}: ${T(`\\${fn}\\theta = \\frac{${num}}{${den}}`)}.`, `Undo the ratio with the inverse: ${T(`\\theta = \\${fn}^{-1}\\!\\left(\\frac{${num}}{${den}}\\right) \\approx ${deg}^\\circ`)}.`],
    strategy: 'Known sides, unknown angle: pick the ratio that uses the two sides you have, then apply its inverse on the calculator.' };
}

function genSide(R, row) {
  const th = R.pick(THETAS), g = R.int(8, 25), rad = th * Math.PI / 180;
  const cfg = [{ x: 'opp', g: 'hyp', fn: 'sin', op: 'mul' }, { x: 'adj', g: 'hyp', fn: 'cos', op: 'mul' }, { x: 'opp', g: 'adj', fn: 'tan', op: 'mul' }, { x: 'hyp', g: 'opp', fn: 'sin', op: 'div' }, { x: 'adj', g: 'opp', fn: 'tan', op: 'div' }][row];
  const f = { sin: Math.sin, cos: Math.cos, tan: Math.tan }[cfg.fn](rad);
  const val = (cfg.op === 'mul' ? g * f : g / f).toFixed(1);
  const L = { opp: '', adj: '', hyp: '' }; L[cfg.x] = 'x'; L[cfg.g] = String(g);
  const fig = tri({ bw: Math.tan(rad), bh: 1, lb: L.opp, ll: L.adj, lh: L.hyp, aA: th + '^\\circ' });
  const ratioEq = cfg.op === 'mul' ? `\\${cfg.fn} ${th}^\\circ = \\frac{x}{${g}}` : `\\${cfg.fn} ${th}^\\circ = \\frac{${g}}{x}`;
  const solve = cfg.op === 'mul' ? `x = ${g}\\,\\${cfg.fn} ${th}^\\circ \\approx ${val}` : `x = \\frac{${g}}{\\${cfg.fn} ${th}^\\circ} \\approx ${val}`;
  return { fig, q: `Find ${T('x')} to the nearest tenth.\nFrom the ${th}° angle, the ${WORD[cfg.g]} is ${T(g)} and ${T('x')} is the ${WORD[cfg.x]}.`, a: T(`x \\approx ${val}`),
    steps: [`${T('x')} is the ${WORD[cfg.x]} and ${T(g)} is the ${WORD[cfg.g]}, so use ${cfg.fn}: ${T(ratioEq)}.`, `${cfg.op === 'mul' ? 'Multiply' : 'Divide'} to solve: ${T(solve)}.`],
    strategy: cfg.op === 'mul' ? 'When x is on top of the ratio, multiply the known side by the trig value.' : 'When x is in the denominator, divide the known side by the trig value.' };
}

const STRATEGY = [
  [
    { q: `From angle ${T('\\theta')} you know the opposite side and the hypotenuse. Which trig ratio should you use?`, a: 'Sine', steps: [`SOH: ${T('\\sin\\theta = \\frac{\\text{opposite}}{\\text{hypotenuse}}')}.`], strategy: 'Match the two sides you know to the ratio that uses exactly those two.' },
    { q: 'Which side of a right triangle is the hypotenuse, and how can you always spot it?', a: 'The side across from the right angle. It is always the longest side.', steps: ['The right angle points at the hypotenuse.', 'The two sides that form the right angle are the legs.'], strategy: 'Find the right angle first; every other label comes from there.' },
    { q: `A right triangle has legs ${T(6)} and ${T(8)}. Which tool finds the hypotenuse: the Pythagorean theorem or a trig ratio?`, a: `Pythagorean theorem: ${T('c = 10')}`, steps: [T('6^2 + 8^2 = 36 + 64 = 100'), T('c = \\sqrt{100} = 10')], strategy: 'No angle given and no angle asked for means Pythagorean theorem, not trig.' },
    { q: `You know two sides of a right triangle and want an acute angle. Do you use ${T('\\sin')} or ${T('\\sin^{-1}')}?`, a: T('\\sin^{-1}'), steps: ['A trig ratio takes an angle and gives a ratio.', 'An inverse trig function takes a ratio and gives back the angle.'], strategy: 'Unknown angle means inverse.' },
  ],
  [
    { q: `A right triangle has legs ${T(5)} and ${T(7)}. Find the hypotenuse in simplest radical form.`, a: T('\\sqrt{74}'), steps: [T('5^2 + 7^2 = 25 + 49 = 74'), `${T('\\sqrt{74}')} has no perfect-square factor, so it is already in simplest form.`], strategy: 'Check for perfect-square factors (4, 9, 16, 25...) before calling a radical finished.' },
    { q: `From angle ${T('\\theta')} you know the adjacent side and the hypotenuse. Which ratio, and what is its formula?`, a: `Cosine: ${T('\\cos\\theta = \\frac{\\text{adjacent}}{\\text{hypotenuse}}')}`, steps: ['CAH: cosine is adjacent over hypotenuse.'], strategy: 'Hypotenuse with adjacent is cosine; hypotenuse with opposite is sine.' },
    { q: `Rationalize the denominator: ${T('\\frac{6}{\\sqrt{3}}')}`, a: T('2\\sqrt{3}'), steps: [`Multiply top and bottom by ${T('\\sqrt{3}')}: ${T('\\frac{6\\sqrt{3}}{3}')}.`, `Simplify: ${T('2\\sqrt{3}')}.`], strategy: 'A radical is not allowed to stay in the denominator in simplest form.' },
    { q: `A right triangle has a 45° angle and a hypotenuse of ${T(10)}. Which is faster, special-triangle ratios or a trig ratio? Find a leg.`, a: `Special triangle: leg = ${T('5\\sqrt{2}')}`, steps: [`45-45-90: leg = hypotenuse ÷ ${T('\\sqrt{2}')} = ${T('\\frac{10}{\\sqrt{2}} = \\frac{10\\sqrt{2}}{2} = 5\\sqrt{2}')}.`], strategy: '30°, 45°, and 60° angles give exact answers without a calculator.' },
  ],
  [
    { q: `A student writes ${T('\\tan\\theta = \\frac{8}{17}')} for a triangle where the side opposite ${T('\\theta')} is 8, the adjacent side is 15, and the hypotenuse is 17. What is the error?`, a: `Tangent is opposite over adjacent: ${T('\\tan\\theta = \\frac{8}{15}')}. ${T('\\frac{8}{17}')} is ${T('\\sin\\theta')}.`, steps: ['TOA: tangent never uses the hypotenuse.'], strategy: 'Spot-check every setup: does the ratio name match the sides used?' },
    { q: `A right triangle has hypotenuse ${T(13)} and one leg ${T(5)}. Find the other leg.`, a: T(12), steps: [`The legs squared add to the hypotenuse squared: ${T('5^2 + b^2 = 13^2')}.`, `${T('b^2 = 169 - 25 = 144')}, so ${T('b = 12')}.`], strategy: 'When the hypotenuse is known, subtract. Add only when solving for the hypotenuse.' },
    { q: `Rationalize the denominator: ${T('\\frac{10}{\\sqrt{5}}')}`, a: T('2\\sqrt{5}'), steps: [T('\\frac{10}{\\sqrt{5}} \\cdot \\frac{\\sqrt{5}}{\\sqrt{5}} = \\frac{10\\sqrt{5}}{5} = 2\\sqrt{5}')], strategy: 'Multiply by a form of 1 that clears the radical.' },
    { q: 'You know one acute angle and the hypotenuse, and you want the side opposite that angle. Which ratio, and do you multiply or divide?', a: `Sine; multiply: ${T('x = \\text{hyp} \\cdot \\sin\\theta')}`, steps: [`${T('\\sin\\theta = \\frac{x}{\\text{hyp}}')}, and ${T('x')} is on top.`, 'Multiply both sides by the hypotenuse.'], strategy: 'x on top means multiply; x on the bottom means divide.' },
  ],
  [
    { q: `A student computes ${T('\\sin^{-1}\\!\\left(\\frac{5}{13}\\right) \\approx 23^\\circ')} for the angle across from the side of length 12 in a 5-12-13 triangle. What went wrong, and what is the correct angle?`, a: `5 is adjacent to that angle, not opposite. Use ${T('\\cos^{-1}\\!\\left(\\frac{5}{13}\\right) \\approx 67^\\circ')}.`, steps: ['Opposite the angle is 12, adjacent is 5, hypotenuse is 13.', `${T('\\sin^{-1}(\\frac{12}{13})')} and ${T('\\cos^{-1}(\\frac{5}{13})')} both give about 67°.`], strategy: 'Always relabel opposite and adjacent from the angle you are actually solving for.' },
    { q: `A right triangle has hypotenuse ${T(9)} and one leg ${T(4)}. Find the other leg in simplest radical form.`, a: T('\\sqrt{65}'), steps: [T('b^2 = 81 - 16 = 65'), `65 = 5 · 13 has no perfect-square factor, so ${T('\\sqrt{65}')} is simplest.`], strategy: 'Subtract when the hypotenuse is given, then check the radical for perfect-square factors.' },
    { q: `Simplify: ${T('\\frac{12}{2\\sqrt{3}}')}`, a: T('2\\sqrt{3}'), steps: [`Reduce first: ${T('\\frac{12}{2\\sqrt{3}} = \\frac{6}{\\sqrt{3}}')}.`, `Rationalize: ${T('\\frac{6\\sqrt{3}}{3} = 2\\sqrt{3}')}.`], strategy: 'Cancel common whole-number factors before rationalizing.' },
    { q: `You want the hypotenuse. The opposite side is ${T(9)} and the angle is 40°. Without a calculator: is it ${T('9\\sin 40^\\circ')} or ${T('\\frac{9}{\\sin 40^\\circ}')}? Why?`, a: T('\\frac{9}{\\sin 40^\\circ}'), steps: [`Set up: ${T('\\sin 40^\\circ = \\frac{9}{x}')}.`, `${T('x')} is in the denominator, so ${T('x = \\frac{9}{\\sin 40^\\circ}')}.`], strategy: 'The hypotenuse must be longer than 9. Multiplying 9 by a number less than 1 would make it shorter, so that setup cannot be right.' },
  ],
  [
    { q: `A triangle has hypotenuse ${T(12)} and a 30° angle. A student finds ${T('x = 12\\sin 30^\\circ = 6')} for the opposite leg, then says the other leg is also 6. Find the error and the correct other leg.`, a: `The legs are not equal in a 30-60-90. Other leg = ${T('6\\sqrt{3}')}.`, steps: ['6 is the short leg (across from 30°).', `Long leg = short leg · ${T('\\sqrt{3}')} = ${T('6\\sqrt{3}')}. Check: ${T('6^2 + (6\\sqrt{3})^2 = 36 + 108 = 144 = 12^2')}.`], strategy: 'Only the 45-45-90 triangle has equal legs.' },
    { q: `A right triangle has legs ${T('2\\sqrt{3}')} and ${T(6)}. Find the hypotenuse in simplest radical form.`, a: T('4\\sqrt{3}'), steps: [`${T('(2\\sqrt{3})^2 = 4 \\cdot 3 = 12')} and ${T('6^2 = 36')}.`, T('c = \\sqrt{48} = \\sqrt{16 \\cdot 3} = 4\\sqrt{3}')], strategy: 'Square the radical carefully: square the coefficient and drop the root.' },
    { q: `Explain why ${T('\\sin\\theta')} can never be greater than 1 for an acute angle in a right triangle.`, a: 'The opposite leg is always shorter than the hypotenuse, so opposite ÷ hypotenuse is less than 1.', steps: ['The hypotenuse is the longest side of the triangle.', 'A fraction with a smaller top than bottom is less than 1.'], strategy: 'Use this as a sanity check: a sine or cosine bigger than 1 means the setup is wrong.' },
    { q: `A 30-60-90 triangle has hypotenuse ${T(10)}. A student says the short leg is ${T('\\frac{10\\sqrt{3}}{2}')}. What is the error, and what are the correct legs?`, a: `Short leg = ${T(5)}, long leg = ${T('5\\sqrt{3}')}`, steps: ['Short leg = hypotenuse ÷ 2 = 5. No radical involved.', `Long leg = short leg · ${T('\\sqrt{3}')} = ${T('5\\sqrt{3}')}.`], strategy: 'The √3 belongs to the long leg only.' },
  ],
];

const VOCAB = [
  [
    { q: 'What is the hypotenuse of a right triangle?', a: 'The side across from the right angle; the longest side.', steps: ['It never touches the right angle.'], strategy: 'Locate the hypotenuse first. The other two sides are the legs.' },
    { q: 'What are the legs of a right triangle?', a: 'The two sides that form the right angle.', steps: ['Legs are always shorter than the hypotenuse.'], strategy: 'In the Pythagorean theorem, the legs are a and b; the hypotenuse is c.' },
    { q: 'What does SOH stand for in SOH-CAH-TOA?', a: `Sine = Opposite ÷ Hypotenuse: ${T('\\sin\\theta = \\frac{\\text{opp}}{\\text{hyp}}')}`, steps: ['S for sine, O for opposite, H for hypotenuse.'], strategy: 'Each triple of letters is one ratio: name, numerator, denominator.' },
  ],
  [
    { q: `Relative to angle ${T('A')} in a right triangle, which side is the opposite side and which is the adjacent side?`, a: `Opposite: the leg across from ${T('A')} (not touching it). Adjacent: the leg that touches ${T('A')} and is not the hypotenuse.`, steps: ['The hypotenuse also touches A, but it is never called adjacent.'], strategy: 'Opposite and adjacent change when you switch angles; the hypotenuse never does.' },
    { q: 'What do CAH and TOA stand for?', a: `${T('\\cos\\theta = \\frac{\\text{adj}}{\\text{hyp}}')} and ${T('\\tan\\theta = \\frac{\\text{opp}}{\\text{adj}}')}`, steps: ['Cosine = Adjacent ÷ Hypotenuse.', 'Tangent = Opposite ÷ Adjacent.'], strategy: 'Tangent is the only one of the three that does not use the hypotenuse.' },
    { q: `In right triangle ${T('XYZ')} with the right angle at ${T('Y')}, name the legs and the hypotenuse.`, a: `Legs: ${T('\\overline{XY}')} and ${T('\\overline{YZ}')}. Hypotenuse: ${T('\\overline{XZ}')}.`, steps: ['The legs both contain the right-angle vertex Y.', 'The hypotenuse skips Y.'], strategy: 'The hypotenuse is named by the two vertices that are not the right angle.' },
  ],
  [
    { q: `What does ${T('\\sin^{-1}(0.5)')} mean in words? Is it the same as ${T('\\frac{1}{\\sin 0.5}')}?`, a: 'The angle whose sine is 0.5 (that is 30°). No, it is not a reciprocal.', steps: [`The ${T('-1')} is inverse-function notation, not an exponent.`], strategy: 'Inverse sine undoes sine: it takes a ratio in and gives an angle out.' },
    { q: 'State the side ratio of a 45-45-90 triangle (leg : leg : hypotenuse).', a: T('1 : 1 : \\sqrt{2}'), steps: ['Both legs are equal because both acute angles are equal.', `Hypotenuse = leg · ${T('\\sqrt{2}')}.`], strategy: 'This triangle is half of a square cut along a diagonal.' },
    { q: 'State the side ratio of a 30-60-90 triangle (short leg : long leg : hypotenuse).', a: T('1 : \\sqrt{3} : 2'), steps: ['The short leg is across from 30°, the long leg across from 60°.', 'Hypotenuse = 2 · short leg.'], strategy: 'This triangle is half of an equilateral triangle cut by an altitude.' },
  ],
  [
    { q: `In a right triangle with acute angles ${T('X')} and ${T('Z')}, the side opposite ${T('X')} is which side relative to ${T('Z')}? Explain.`, a: `It is adjacent to ${T('Z')}.`, steps: ['The two legs trade roles: each leg is opposite one acute angle and adjacent to the other.'], strategy: 'This is why sin X = cos Z: same two sides, different label.' },
    { q: `In words, what is ${T('\\tan^{-1}\\!\\left(\\frac{3}{4}\\right)')} asking for?`, a: 'The angle whose tangent is 3/4, that is, the angle with opposite 3 and adjacent 4 (about 37°).', steps: ['Inverse tangent takes a ratio of opposite to adjacent and returns the angle.'], strategy: 'Read inverse trig as a question: which angle has this ratio?' },
    { q: 'In a 30-60-90 triangle, which side is across from the 60° angle, and how is it related to the short leg?', a: `The long leg; it equals the short leg times ${T('\\sqrt{3}')}.`, steps: ['Bigger angle, bigger opposite side.', 'Long leg = short leg · √3.'], strategy: 'The largest side is always across from the largest angle.' },
  ],
  [
    { q: `Why are ${T('\\sin X')} and ${T('\\cos Z')} equal when ${T('X')} and ${T('Z')} are the two acute angles of a right triangle?`, a: 'They use the same two sides: the leg opposite X is the leg adjacent to Z, and both are divided by the hypotenuse.', steps: [`${T('\\sin X = \\frac{\\text{opp } X}{\\text{hyp}}')} and ${T('\\cos Z = \\frac{\\text{adj } Z}{\\text{hyp}}')}.`, 'Those are the same leg. X and Z add to 90°, so they are complementary.'], strategy: 'Co-function identity: sin θ = cos(90° − θ).' },
    { q: `What is the difference between ${T('\\sin^{-1} x')} and ${T('(\\sin x)^{-1}')}?`, a: `${T('\\sin^{-1} x')} is the inverse sine (an angle). ${T('(\\sin x)^{-1}')} is ${T('\\frac{1}{\\sin x}')}, a reciprocal.`, steps: ['Function notation puts the \\(-1\\) on the name: it means undo.', 'Parentheses around sin x make the \\(-1\\) a real exponent.'], strategy: 'Inverse means undo, reciprocal means flip.' },
    { q: `A 45-45-90 triangle has legs of length ${T('L')}. Explain why the hypotenuse is ${T('L\\sqrt{2}')}.`, a: `By the Pythagorean theorem, ${T('c^2 = L^2 + L^2 = 2L^2')}, so ${T('c = L\\sqrt{2}')}.`, steps: [T('c = \\sqrt{2L^2} = \\sqrt{2}\\cdot\\sqrt{L^2} = L\\sqrt{2}')], strategy: 'Special-triangle ratios are not memorized magic; they come straight from the Pythagorean theorem.' },
  ],
];

const an = n => /^(8|11|18|8\d)$/.test(String(n)) ? 'An' : 'A';
const ELEV = 'angle of elevation (the angle up from horizontal)', DEPR = 'angle of depression (the angle down from horizontal)';
const DEPR_NOTE = 'The angle of depression is measured at the top, from the horizontal. By alternate interior angles it equals the angle of elevation at the ground, so it goes in the bottom corner of the triangle.';
const inv = (fn, num, den, deg) => T(`\\theta = \\${fn}^{-1}\\!\\left(\\frac{${num}}{${den}}\\right) \\approx ${deg}^\\circ`);
const degOf = (fn, num, den) => Math.round((fn === 'tan' ? Math.atan(num / den) : fn === 'sin' ? Math.asin(num / den) : Math.acos(num / den)) * 180 / Math.PI);

function wpRatio(R, row) {
  const [a, b, c] = R.pick(TRIPLES.slice(0, 4)), k = R.int(1, 3), n = R.pick([4, 5, 6, 7, 8, 9, 10, 12]);
  const pool = row === 3 ? [
    () => ({ q: `${an(c * k)} ${c * k}-ft ladder leans against the Innova Prep gym wall and reaches ${b * k} ft up the wall. How far is the base of the ladder from the wall?`, a: `${a * k} ft`, steps: [`The ladder is the hypotenuse; the wall height is a leg. ${T(`${c * k}^2 - ${b * k}^2 = ${c * c * k * k - b * b * k * k}`)}.`, `${T(`\\sqrt{${a * a * k * k}} = ${a * k}`)} ft.`], strategy: 'No angle given or asked for: Pythagorean theorem. Subtract because the hypotenuse is known.' }),
    () => ({ q: `At a certain time the sun's rays hit the ground at a 45° ${ELEV}. A flagpole on the USM campus casts a shadow ${n} m long. How tall is the flagpole?`, a: `${n} m`, steps: ['The pole, its shadow, and the sun ray form a 45-45-90 triangle.', `The legs of a 45-45-90 triangle are equal, so the pole is ${T(n)} m tall.`], strategy: 'A 45° angle means the two legs match: shadow length equals height.' }),
    () => ({ q: `A kite string ${2 * n} yd long makes a 30° ${ELEV} with the ground. Exactly how high is the kite?`, a: `${n} yd`, steps: ['The string is the hypotenuse; the height is across from the 30° angle, so it is the short leg.', `Short leg = half the hypotenuse = ${T(n)} yd.`], strategy: 'In a 30-60-90 triangle the side across from 30° is always half the hypotenuse.' }),
    () => ({ q: `A wheelchair ramp at the Saenger Theater is ${c * k} ft long, and its top is ${a * k} ft above the sidewalk. How far along the sidewalk does the ramp run?`, a: `${b * k} ft`, steps: [`Ramp = hypotenuse, rise = leg. ${T(`${c * k}^2 - ${a * k}^2 = ${c * c * k * k - a * a * k * k}`)}.`, `${T(`\\sqrt{${b * b * k * k}} = ${b * k}`)} ft.`], strategy: 'Recognize the Pythagorean triple and you can skip the arithmetic.' }),
  ] : [
    () => ({ q: `${an(2 * n)} ${2 * n}-ft ladder makes a 60° angle with the ground. Exactly how high up the wall does it reach? Leave the answer in simplest radical form.`, a: T(`${n}\\sqrt{3}\\text{ ft}`), steps: [`30-60-90 triangle: the ladder is the hypotenuse, so the short leg (along the ground) is ${T(n)} ft.`, `The height is across from 60°, the long leg: ${T(`${n}\\sqrt{3}`)} ft.`], strategy: 'A 60° angle with the ground means the height is the long leg: short leg times √3.' }),
    () => ({ q: `The sun has a 60° ${ELEV}. A light pole along the Longleaf Trace casts a ${n}-ft shadow. Exactly how tall is the pole? Leave the answer in simplest radical form.`, a: T(`${n}\\sqrt{3}\\text{ ft}`), steps: ['The shadow is across from the 30° angle at the top of the pole, so it is the short leg.', `Height = long leg = short leg · ${T(sq(3))} = ${T(`${n}\\sqrt{3}`)} ft.`], strategy: 'Decide which leg is short before multiplying by √3.' }),
    () => ({ q: `A guy wire runs from the top of a pole to a point on the ground, making a 45° angle with the ground. The wire is ${n} m long. Exactly how tall is the pole? Simplest radical form.`, a: T(`${half2(n)}\\text{ m}`), steps: [`45-45-90: leg = hypotenuse ÷ ${T(sq(2))} = ${T(`\\frac{${n}}{\\sqrt{2}}`)}.`, `Rationalize: ${T(`\\frac{${n}\\sqrt{2}}{2}`)}${n % 2 === 0 ? ` = ${T(half2(n))}` : ''} m.`], strategy: 'Hypotenuse to leg in a 45-45-90: divide by √2, then rationalize.' }),
  ];
  return R.pick(pool)();
}

function wpAngle(R, row) {
  const pool = row === 3 ? [
    () => { const r = R.int(1, 3), run = R.int(8, 20), d = degOf('tan', r, run); return { q: `A ramp at the Innova Prep entrance rises ${r} ft over a horizontal run of ${run} ft. To the nearest degree, what angle does the ramp make with the ground?`, a: `${d}°`, steps: [`Rise is opposite the angle, run is adjacent: ${T(`\\tan\\theta = \\frac{${r}}{${run}}`)}.`, inv('tan', r, run, d)], strategy: 'Rise and run are the two legs, so tangent is the ratio.' }; },
    () => { const L = R.int(12, 24), d0 = R.int(3, 8), d = degOf('cos', d0, L); return { q: `${an(L)} ${L}-ft ladder has its base ${d0} ft from a wall. To the nearest degree, what angle does the ladder make with the ground?`, a: `${d}°`, steps: [`The base distance is adjacent to the angle; the ladder is the hypotenuse: ${T(`\\cos\\theta = \\frac{${d0}}{${L}}`)}.`, inv('cos', d0, L, d)], strategy: 'Adjacent and hypotenuse known: inverse cosine.' }; },
    () => { const h = R.int(8, 30), dist = R.int(10, 40), d = degOf('tan', h, dist); return { q: `Standing ${dist} m from a tree, you measure that its top is ${h} m above your eye level. To the nearest degree, what is the ${ELEV} to the top of the tree?`, a: `${d}°`, steps: [`Height is opposite, distance is adjacent: ${T(`\\tan\\theta = \\frac{${h}}{${dist}}`)}.`, inv('tan', h, dist, d)], strategy: 'Elevation problems almost always pair a height with a ground distance: tangent.' }; },
  ] : [
    () => { const h = R.int(20, 40), w = h + R.int(5, 15), d = degOf('sin', h, w); return { q: `${an(w)} ${w}-ft guy wire runs from the top of a ${h}-ft pole to a stake in the ground. To the nearest degree, what angle does the wire make with the ground?`, a: `${d}°`, steps: [`The pole is opposite the ground angle; the wire is the hypotenuse: ${T(`\\sin\\theta = \\frac{${h}}{${w}}`)}.`, inv('sin', h, w, d)], strategy: 'Opposite and hypotenuse known: inverse sine.' }; },
    () => { const h = R.int(40, 90), dist = R.int(100, 300), d = degOf('tan', h, dist); return { q: `A lighthouse keeper ${h} ft above the water spots a boat ${dist} ft from the base of the lighthouse. To the nearest degree, what is the ${DEPR} to the boat?`, a: `${d}°`, steps: [DEPR_NOTE, `From the boat: height ${h} is opposite, distance ${dist} is adjacent: ${inv('tan', h, dist, d)}.`], strategy: 'Move the angle of depression to the ground corner, then it is an ordinary tangent problem.' }; },
    () => { const h = R.int(15, 35), L = h + R.int(2, 10), d = degOf('sin', h, L); return { q: `${an(L)} ${L}-yd zip line runs from a ${h}-yd platform at a Hattiesburg park straight to the ground. To the nearest degree, what is the ${DEPR} from the platform to the landing spot?`, a: `${d}°`, steps: [DEPR_NOTE, `From the landing spot: platform height is opposite, cable is hypotenuse: ${inv('sin', h, L, d)}.`], strategy: 'Depression at the top equals elevation at the bottom.' }; },
  ];
  return R.pick(pool)();
}

function wpSide(R, row) {
  const th = R.pick(THETAS), rad = th * Math.PI / 180;
  const pool = row === 3 ? [
    () => { const d = R.int(20, 80), v = (d * Math.tan(rad)).toFixed(1); return { q: `From a point ${d} ft from the base of the Saenger Theater, the ${ELEV} to the top of the building is ${th}°. How tall is the building, to the nearest tenth of a foot?`, a: `${v} ft`, steps: [`Height is opposite, ground distance is adjacent: ${T(`\\tan ${th}^\\circ = \\frac{h}{${d}}`)}.`, `${T(`h = ${d}\\tan ${th}^\\circ \\approx ${v}`)} ft.`], strategy: 'h is on top of the ratio, so multiply.' }; },
    () => { const L = R.int(10, 30), v = (L * Math.sin(rad)).toFixed(1); return { q: `${an(L)} ${L}-ft ladder leans against the Innova Prep gym at a ${th}° angle with the ground. How high up the wall does it reach, to the nearest tenth?`, a: `${v} ft`, steps: [`Height is opposite, ladder is hypotenuse: ${T(`\\sin ${th}^\\circ = \\frac{h}{${L}}`)}.`, `${T(`h = ${L}\\sin ${th}^\\circ \\approx ${v}`)} ft.`], strategy: 'The ladder is always the hypotenuse.' }; },
    () => { const L = R.int(50, 150), v = (L * Math.sin(rad)).toFixed(1); return { q: `A kite is flying on ${L} m of string, which makes a ${th}° ${ELEV} with the ground. How high is the kite, to the nearest tenth of a meter?`, a: `${v} m`, steps: [`Height is opposite, string is hypotenuse: ${T(`\\sin ${th}^\\circ = \\frac{h}{${L}}`)}.`, `${T(`h = ${L}\\sin ${th}^\\circ \\approx ${v}`)} m.`], strategy: 'Opposite over hypotenuse is sine; multiply to find the top.' }; },
  ] : [
    () => { const h = R.pick([1500, 2000, 2500, 3000]), v = (h / Math.tan(rad)).toFixed(1); return { q: `A plane flying at ${h.toLocaleString()} m sees the Hattiesburg airport at a ${th}° ${DEPR}. How far is the plane, along the ground, from the airport, to the nearest tenth of a meter?`, a: `${v} m`, steps: [DEPR_NOTE, `From the airport: altitude is opposite, ground distance is adjacent: ${T(`\\tan ${th}^\\circ = \\frac{${h}}{x}`)}, so ${T(`x = \\frac{${h}}{\\tan ${th}^\\circ} \\approx ${v}`)} m.`], strategy: 'x is in the denominator: divide.' }; },
    () => { const sm = R.pick([5, 6, 7, 8, 9, 10]), L = R.int(12, 30), v = (L * Math.sin(sm * Math.PI / 180)).toFixed(1); return { q: `A wheelchair ramp is ${L} ft long and makes a ${sm}° angle with the sidewalk. How high is the top of the ramp, to the nearest tenth of a foot?`, a: `${v} ft`, steps: [`Rise is opposite, ramp is hypotenuse: ${T(`\\sin ${sm}^\\circ = \\frac{h}{${L}}`)}.`, `${T(`h = ${L}\\sin ${sm}^\\circ \\approx ${v}`)} ft.`], strategy: 'Shallow angle, small rise: check that the answer is much shorter than the ramp.' }; },
    () => { const h = R.int(20, 60), v = (h / Math.tan(rad)).toFixed(1); return { q: `${an(h)} ${h}-ft tall building on the USM campus casts a shadow when the sun's ${ELEV} is ${th}°. How long is the shadow, to the nearest tenth of a foot?`, a: `${v} ft`, steps: [`Height is opposite the sun angle, shadow is adjacent: ${T(`\\tan ${th}^\\circ = \\frac{${h}}{s}`)}.`, `${T(`s = \\frac{${h}}{\\tan ${th}^\\circ} \\approx ${v}`)} ft.`], strategy: 'The unknown is on the bottom, so divide the height by the tangent.' }; },
  ];
  return R.pick(pool)();
}

const STRATEGY_WP = [
  [
    { q: 'A 20-ft ladder leans against a wall at a 70° angle with the ground. You want to know how far the base of the ladder is from the wall. Which ratio, and what is the setup?', a: `Cosine: ${T('x = 20\\cos 70^\\circ')}`, steps: ['The base distance is adjacent to the 70° angle; the ladder is the hypotenuse.', `CAH: ${T('\\cos 70^\\circ = \\frac{x}{20}')}.`], strategy: 'Name the side you want and the side you know relative to the angle, then pick the ratio with both.' },
    { q: `From a boat, the ${ELEV} to the top of a 150-ft lighthouse is 25°. You want the distance from the boat to the base. Which ratio, and what is the setup?`, a: `Tangent: ${T('x = \\frac{150}{\\tan 25^\\circ}')}`, steps: ['Lighthouse height is opposite, distance to the base is adjacent.', `TOA: ${T('\\tan 25^\\circ = \\frac{150}{x}')}; x is on the bottom, so divide.`], strategy: 'Height plus ground distance means tangent.' },
    { q: `A student finding the height of a kite on a 100-ft string at a 35° ${ELEV} writes ${T('x = \\frac{100}{\\sin 35^\\circ}')}. What is the error?`, a: `Height is on top: ${T('x = 100\\sin 35^\\circ')}`, steps: [`${T('\\sin 35^\\circ = \\frac{x}{100}')}, so multiply, not divide.`, 'Dividing gives about 174 ft, taller than the string itself, which is impossible.'], strategy: 'The height can never exceed the hypotenuse. Use that to catch a flipped setup.' },
  ],
  [
    { q: `A pilot at 3,000 ft sees the runway at a 10° ${DEPR}. A student says the angle at the runway must be 80°. What is the error, and what is the correct angle at the runway?`, a: 'The angle at the runway is 10°, by alternate interior angles.', steps: ['The angle of depression is measured from the horizontal at the plane, outside the triangle.', 'The horizontal at the plane is parallel to the ground, so the angle of elevation at the runway is also 10°. The 80° is the angle inside the triangle at the plane.'], strategy: 'Depression at the top equals elevation at the bottom. Put it in the ground corner.' },
    { q: `A 10-ft board leans against a wall at a 40° angle with the ground. A student finds the height on the wall as ${T('10\\tan 40^\\circ \\approx 8.4')} ft. What is the error?`, a: `The board is the hypotenuse, so use sine: ${T('10\\sin 40^\\circ \\approx 6.4')} ft`, steps: ['Tangent treats 10 as the adjacent side, but the board is the hypotenuse.', `SOH: ${T('\\sin 40^\\circ = \\frac{h}{10}')}.`], strategy: 'The slanted object (ladder, board, string, wire) is almost always the hypotenuse.' },
    { q: `A flagpole casts a 30-ft shadow when the sun's ${ELEV} is 50°. One student writes ${T('h = 30\\tan 50^\\circ')}; another writes ${T('h = \\frac{30}{\\tan 50^\\circ}')}. Who is right, and why?`, a: `The first: ${T('h = 30\\tan 50^\\circ \\approx 35.8')} ft`, steps: [`Height is opposite the sun angle, shadow is adjacent: ${T('\\tan 50^\\circ = \\frac{h}{30}')}.`, 'h is on top, so multiply.'], strategy: 'Write the ratio with the unknown first, then decide whether to multiply or divide.' },
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

const NUMRE = /√(\d+)|(\d+(?:,\d{3})*(?:\.\d+)?)-(\d+(?:,\d{3})*(?:\.\d+)?)-(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)-(ft|yd|mi|m)\b|(\d+(?:,\d{3})*(?:\.\d+)?) ?(ft|yd|mi|m)\b|(\d+(?:,\d{3})*(?:\.\d+)?)°|(\d+(?:,\d{3})*(?:\.\d+)?)/g;
const nf = n => n.replace(/,/g, '{,}');
function mathify(str) {
  if (typeof str !== 'string') return str;
  return str.split(/(\\\([\s\S]+?\\\))/g).map(p => p.startsWith('\\(') ? p : p.replace(NUMRE, (m, r, t1, t2, t3, hn, hu, un, uu, dg, bare) => {
    if (r) return T(`\\sqrt{${r}}`);
    if (t1) return `${T(nf(t1))}-${T(nf(t2))}-${T(nf(t3))}`;
    if (hn) return `${T(nf(hn))}-${hu}`;
    if (un) return T(`${nf(un)}\\text{ ${uu}}`);
    if (dg) return T(`${nf(dg)}^\\circ`);
    return T(nf(bare));
  })).join('');
}
const norm = it => ({ ...it, q: mathify(it.q), a: mathify(it.a), steps: it.steps.map(mathify), strategy: mathify(it.strategy) });
const seedsFrom = base => Array.from({ length: 25 }, (_, i) => (base * 31 + i * 7919) >>> 0);
function buildCategories(seeds) {
  const gens = [genSpecial, genRatio, genAngle, genSide, (R, row) => R.pick(STRATEGY[row])];
  const WP = { 1: wpRatio, 2: wpAngle, 3: wpSide };
  return CATS.map((name, ci) => ({ name, items: VALUES.map((_, ri) => {
    const R = mk(rngFrom(seeds[ci * 5 + ri]));
    if (ri >= 3 && R.int(0, 1) === 0) { if (WP[ci]) return norm(WP[ci](R, ri)); if (ci === 4) return norm(R.pick(STRATEGY_WP[ri - 3])); }
    return norm(gens[ci](R, ri));
  }) }));
}
const pickGame = s => ({ teams: s.teams, used: s.used, seeds: s.seeds, turn: s.turn, dd: s.dd });
const randDD = used => { const free = Array.from({ length: 25 }, (_, i) => i).filter(i => !used.includes(i)); return free.length ? free[Math.floor(Math.random() * free.length)] : -1; };
const KEY = 'trigJeopardy.v3';

  return { id: 'trig', title: 'Trigonometry Jeopardy', storageKey: 'trigJeopardy.v3', values: VALUES, seedCount: 25, defaultTimer: 144, build: seeds => buildCategories(seeds), tex, fig: it => it.fig || null, calcCats: [2, 3], refCard: 0 };
};
