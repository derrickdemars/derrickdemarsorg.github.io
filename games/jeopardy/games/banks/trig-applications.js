// Question bank: trig-applications. Loaded by games/Play.dc.html?bank=trig-applications
// Modeled on the "Trig Jeopardy" worksheet: find the angle, find the side, solve the triangle,
// and two-triangle (shared altitude) problems. Every answer rounds to the nearest tenth.
window.JPBanks = window.JPBanks || {};
window.JPBanks['trig-applications'] = function (React) {

const VALUES = [200, 400, 600, 800, 1000];
const CATS = ['Find the Angle', 'Find the Side', 'Solve the Triangle', 'Two-Triangle Problems', 'Concepts & Strategy'];
const T = s => `\\(${s}\\)`;
const rngFrom = seed => { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mk = r => ({ int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), pick: arr => arr[Math.floor(r() * arr.length)] });
const RAD = Math.PI / 180, DEG = 180 / Math.PI;
const r1 = v => Math.round(v * 10) / 10;          // nearest tenth
const s1 = v => String(r1(v));                     // "14", "4.8" (no trailing .0, like the worksheet)
// A value sitting almost exactly on a rounding boundary (like 7.25) is unfair on a calculator, so those are re-rolled.
const tie = v => { const f = Math.abs(v * 10) % 1; return Math.abs(f - 0.5) < 0.04; };
const dec = (R, lo, hi) => R.int(lo * 10, hi * 10) / 10;
const WORD = { opp: 'opposite side', adj: 'adjacent side', hyp: 'hypotenuse' };
const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
const INV = { sin: Math.asin, cos: Math.acos, tan: Math.atan };
const PAIR = { sin: ['opp', 'hyp'], cos: ['adj', 'hyp'], tan: ['opp', 'adj'] };
const SOH = { sin: 'SOH', cos: 'CAH', tan: 'TOA' };

/* ---------- figures ---------- */
const e = React.createElement;
const hl = t => /^[xy?]$|^\\theta$/.test(t) ? 'var(--jp-accent2)' : 'var(--jp-text)';
function lab(t, x, y, anchor, extra) {
  if (!t || !String(t).trim()) return null; const o = extra || {}, fs = o.fontSize || 22, W = 170, Hh = 64;
  const ax = anchor === 'end' ? x - W : anchor === 'start' ? x : x - W / 2, jc = anchor === 'end' ? 'flex-end' : anchor === 'start' ? 'flex-start' : 'center';
  const k = window.katex, html = k ? k.renderToString(String(t), { throwOnError: false }) : null;
  return e('foreignObject', { x: ax, y: y - Hh / 2, width: W, height: Hh, style: { overflow: 'visible' } },
    e('div', { xmlns: 'http://www.w3.org/1999/xhtml', style: { width: W, height: Hh, display: 'flex', alignItems: 'center', justifyContent: jc, color: o.fill || hl(t), fontSize: fs, lineHeight: 1 } }, html ? e('span', { dangerouslySetInnerHTML: { __html: html } }) : String(t)));
}
const unit = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
// Label pushed away from a point along direction n; the text anchors on the side facing the figure.
function outLab(t, p, n, d, extra) {
  const side = Math.abs(n[0]) > 0.45, dd = side ? d * 0.6 : d;
  return lab(t, p[0] + n[0] * dd, p[1] + n[1] * dd, side ? (n[0] > 0 ? 'start' : 'end') : 'middle', extra);
}
// Arc marking the angle at V between rays VP and VQ, with its label on the bisector.
function angleMark(V, P, Q, text, kids) {
  const u = unit(V, P), w = unit(V, Q), r = 26, cross = u[0] * w[1] - u[1] * w[0];
  kids.push(e('path', { d: `M${V[0] + r * u[0]},${V[1] + r * u[1]}A${r},${r} 0 0 ${cross > 0 ? 1 : 0} ${V[0] + r * w[0]},${V[1] + r * w[1]}`, fill: 'none', stroke: 'var(--jp-accent2)', strokeWidth: 2 }));
  const half = Math.acos(Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1]))) / 2;
  const bx = u[0] + w[0], by = u[1] + w[1], bl = Math.hypot(bx, by) || 1, d = Math.max(48, Math.min(84, 19 / Math.sin(half)));
  kids.push(lab(text, V[0] + d * bx / bl, V[1] + d * by / bl, 'middle', { fontSize: 19 }));
}
const rightMark = (C, P, Q, kids) => { const u = unit(C, P), w = unit(C, Q), k = 14; kids.push(e('path', { d: `M${C[0] + k * u[0]},${C[1] + k * u[1]}L${C[0] + k * (u[0] + w[0])},${C[1] + k * (u[1] + w[1])}L${C[0] + k * w[0]},${C[1] + k * w[1]}`, fill: 'none', stroke: 'var(--jp-muted)', strokeWidth: 2 })); };
function fit(pts, W, H, pad) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0)), ox = (W - s * (x1 - x0)) / 2 - s * x0, oy = (H - s * (y1 - y0)) / 2 - s * y0;
  return pts.map(p => [p[0] * s + ox, p[1] * s + oy]);
}
const svg = (W, H, kids) => e('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: { display: 'block', overflow: 'visible' } }, ...kids.filter(Boolean));

// Right triangle ABC with the right angle at C. a = BC, b = AC. rot turns it, flip mirrors it.
function rt(o) {
  const W = 320, H = 250; let r = o.a / o.b; r = Math.max(0.5, Math.min(2, r));
  const th = (o.rot || 0) * RAD, cs = Math.cos(th), sn = Math.sin(th), fx = o.flip ? -1 : 1;
  const tf = p => [fx * p[0] * cs - p[1] * sn, fx * p[0] * sn + p[1] * cs];
  const [C, B, A] = fit([[0, 0], [r, 0], [0, -1]].map(tf), W, H, 52);
  const G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3], mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const kids = [e('polygon', { points: `${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]}`, fill: 'rgba(45,212,191,.12)', stroke: 'var(--jp-accent)', strokeWidth: 3, strokeLinejoin: 'round' })];
  rightMark(C, A, B, kids);
  if (o.angA) angleMark(A, C, B, o.angA, kids);
  if (o.angB) angleMark(B, C, A, o.angB, kids);
  const side = (t, p, q) => { const m = mid(p, q); let n = [-(q[1] - p[1]), q[0] - p[0]]; const l = Math.hypot(n[0], n[1]); n = [n[0] / l, n[1] / l]; if ((m[0] - G[0]) * n[0] + (m[1] - G[1]) * n[1] < 0) n = [-n[0], -n[1]]; kids.push(outLab(t, m, n, 24)); };
  side(o.sa, B, C); side(o.sb, A, C); side(o.sc, A, B);
  const nm = o.names || ['A', 'B', 'C'];
  [[A, nm[0]], [B, nm[1]], [C, nm[2]]].forEach(([p, t]) => kids.push(outLab(t, p, unit(G, p), 22, { fill: 'var(--jp-muted)', fontSize: 18 })));
  return svg(W, H, kids);
}

// Two right triangles sharing a dashed altitude. L and R each: { base, hyp (labels), angBase, angApex (labels) }.
function two(o) {
  const W = 340, H = 250;
  const [Lp, F, Rp, P] = fit([[0, 0], [o.l, 0], [o.l + o.r, 0], [o.l, -o.h]], W, H, 50);
  const kids = [e('polygon', { points: `${Lp[0]},${Lp[1]} ${Rp[0]},${Rp[1]} ${P[0]},${P[1]}`, fill: 'rgba(45,212,191,.12)', stroke: 'var(--jp-accent)', strokeWidth: 3, strokeLinejoin: 'round' }),
    e('line', { x1: P[0], y1: P[1], x2: F[0], y2: F[1], stroke: 'var(--jp-muted)', strokeWidth: 2, strokeDasharray: '6 5' })];
  rightMark(F, P, Rp, kids);
  if (o.L.angBase) angleMark(Lp, F, P, o.L.angBase, kids);
  if (o.L.angApex) angleMark(P, F, Lp, o.L.angApex, kids);
  if (o.R.angBase) angleMark(Rp, F, P, o.R.angBase, kids);
  if (o.R.angApex) angleMark(P, F, Rp, o.R.angApex, kids);
  kids.push(lab(o.L.base, (Lp[0] + F[0]) / 2, Lp[1] + 24), lab(o.R.base, (Rp[0] + F[0]) / 2, Rp[1] + 24));
  const hyp = (t, Q, sgn) => { const u = unit(Q, P), n = [sgn * -Math.abs(u[1]), -Math.abs(u[0])]; kids.push(outLab(t, [(Q[0] + P[0]) / 2, (Q[1] + P[1]) / 2], n, 24)); };
  hyp(o.L.hyp, Lp, 1); hyp(o.R.hyp, Rp, -1);
  return svg(W, H, kids);
}

/* ---------- shared setup ---------- */
const ROT = [[0, false], [0, true], [90, false], [180, false], [270, false], [180, true]];
const TILT = [[20, false], [-20, true], [160, false], [200, true], [110, false], [-70, true]];
// Describes a triangle by its vertices: at angle A, opposite = BC (a) and adjacent = AC (b); at B they swap.
const SEG = { a: 'BC', b: 'AC', c: 'AB' };
const roleKey = (at, role) => role === 'hyp' ? 'c' : (at === 'A') === (role === 'opp') ? 'a' : 'b';
const orient = (R, row) => R.pick(row >= 2 && R.int(0, 2) === 0 ? TILT : ROT);

/* ---------- Find the Angle ---------- */
function genAngle(R, row) {
  for (;;) {
    const fn = row < 3 ? ['sin', 'cos', 'tan'][row] : R.pick(['sin', 'cos', 'tan']), at = R.pick(['A', 'B']);
    const [nk, dk] = PAIR[fn], isDec = row >= 3;
    let num, den;
    if (fn === 'tan') { num = isDec ? dec(R, 3, 16) : R.int(2, 15); den = isDec && row === 4 ? dec(R, 3, 16) : R.int(2, 15); }
    else { den = isDec && row === 4 ? dec(R, 8, 20) : R.int(6, 20); num = isDec ? dec(R, 2, den - 1) : R.int(2, den - 1); }
    if (num === den || (fn !== 'tan' && num >= den)) continue;
    const ang = INV[fn](num / den) * DEG; if (ang < 14 || ang > 76 || tie(ang)) continue;
    const S = {}; S[nk] = num; S[dk] = den;
    if (fn === 'sin') S.adj = Math.sqrt(den * den - num * num); else if (fn === 'cos') S.opp = Math.sqrt(den * den - num * num); else S.hyp = Math.hypot(num, den);
    const len = {}; ['opp', 'adj', 'hyp'].forEach(k => { len[roleKey(at, k)] = S[k]; });
    const show = k => (k === roleKey(at, nk) || k === roleKey(at, dk)) ? String(len[k]) : '';
    const [rot, flip] = orient(R, row), th = '\\theta';
    const fig = rt({ a: len.a, b: len.b, rot, flip, sa: show('a'), sb: show('b'), sc: show('c'), angA: at === 'A' ? th : undefined, angB: at === 'B' ? th : undefined });
    const given = ['a', 'b', 'c'].filter(k => show(k)).map(k => T(`${SEG[k]} = ${len[k]}`)).join(' and ');
    const ans = s1(ang);
    return { fig, q: `Find ${T(`m\\angle ${at}`)} to the nearest tenth of a degree.\nRight angle at ${T('C')}, ${given}.`, a: T(`m\\angle ${at} \\approx ${ans}^\\circ`),
      steps: [`From angle ${T(at)}: ${T(SEG[roleKey(at, nk)])} is the ${WORD[nk]} and ${T(SEG[roleKey(at, dk)])} is the ${WORD[dk]}.`, `Those two sides go with ${fn} (${SOH[fn]}): ${T(`\\${fn}\\theta = \\frac{${num}}{${den}}`)}.`, `Undo the ratio with the inverse: ${T(`\\theta = \\${fn}^{-1}\\!\\left(\\frac{${num}}{${den}}\\right) \\approx ${ans}^\\circ`)}.`],
      strategy: 'Two sides known, angle unknown: label the sides from the angle, pick the ratio that uses both, then use its inverse.' };
  }
}

/* ---------- Find the Side ---------- */
function genSide(R, row) {
  const CFG = [[{ x: 'opp', g: 'hyp', fn: 'sin', op: 'mul' }], [{ x: 'adj', g: 'hyp', fn: 'cos', op: 'mul' }], [{ x: 'opp', g: 'adj', fn: 'tan', op: 'mul' }],
    [{ x: 'hyp', g: 'opp', fn: 'sin', op: 'div' }, { x: 'hyp', g: 'adj', fn: 'cos', op: 'div' }],
    [{ x: 'adj', g: 'opp', fn: 'tan', op: 'div' }, { x: 'hyp', g: 'opp', fn: 'sin', op: 'div' }, { x: 'hyp', g: 'adj', fn: 'cos', op: 'div' }]];
  for (;;) {
    const cfg = R.pick(CFG[row]), at = R.pick(['A', 'B']);
    const th = row === 4 ? dec(R, 21, 69) : R.int(20, 70), g = row >= 3 && R.int(0, 1) ? dec(R, 3, 18) : R.int(2, 20);
    const f = FN[cfg.fn](th * RAD), val = cfg.op === 'mul' ? g * f : g / f; if (tie(val) || val < 1) continue;
    const S = {}; S[cfg.g] = g; S[cfg.x] = val; const k3 = ['opp', 'adj', 'hyp'].find(k => !(k in S));
    S[k3] = k3 === 'hyp' ? Math.hypot(S.opp, S.adj) : Math.sqrt(S.hyp * S.hyp - (k3 === 'opp' ? S.adj : S.opp) ** 2);
    const len = {}, txt = { a: '', b: '', c: '' }; ['opp', 'adj', 'hyp'].forEach(k => { len[roleKey(at, k)] = S[k]; });
    txt[roleKey(at, cfg.g)] = String(g); txt[roleKey(at, cfg.x)] = 'x';
    const [rot, flip] = orient(R, row), al = th + '^\\circ';
    const fig = rt({ a: len.a, b: len.b, rot, flip, sa: txt.a, sb: txt.b, sc: txt.c, angA: at === 'A' ? al : undefined, angB: at === 'B' ? al : undefined });
    const ans = s1(val), gs = SEG[roleKey(at, cfg.g)], xs = SEG[roleKey(at, cfg.x)];
    const ratioEq = cfg.op === 'mul' ? `\\${cfg.fn} ${th}^\\circ = \\frac{x}{${g}}` : `\\${cfg.fn} ${th}^\\circ = \\frac{${g}}{x}`;
    const solve = cfg.op === 'mul' ? `x = ${g}\\,\\${cfg.fn} ${th}^\\circ \\approx ${ans}` : `x = \\frac{${g}}{\\${cfg.fn} ${th}^\\circ} \\approx ${ans}`;
    return { fig, q: `Find ${T('x')} to the nearest tenth.\nRight angle at ${T('C')}, ${T(`m\\angle ${at} = ${th}^\\circ`)}, ${T(`${gs} = ${g}`)}, and ${T(`${xs} = x`)}.`, a: T(`x \\approx ${ans}`),
      steps: [`From the ${T(al)} angle, ${T('x')} is the ${WORD[cfg.x]} and ${T(g)} is the ${WORD[cfg.g]}, so use ${cfg.fn} (${SOH[cfg.fn]}): ${T(ratioEq)}.`, `${cfg.op === 'mul' ? 'Multiply' : 'Divide'} to solve: ${T(solve)}.`],
      strategy: cfg.op === 'mul' ? 'When x is on top of the ratio, multiply the known side by the trig value.' : 'When x is in the denominator, divide the known side by the trig value.' };
  }
}

/* ---------- Solve the Triangle ---------- */
function genSolve(R, row) {
  for (;;) {
    let A, a, b, c, given, steps, find, strategy; const an = (v, n) => T(`m\\angle ${n} = ${v}^\\circ`), ap = (v, n) => T(`m\\angle ${n} \\approx ${v}^\\circ`);
    if (row <= 2) {
      A = R.int(20, 70); const B = 90 - A;
      if (row === 0) {
        c = R.int(5, 20); a = c * Math.sin(A * RAD); b = c * Math.cos(A * RAD);
        given = `${an(A, 'A')} and ${T(`AB = ${c}`)}`; find = [an(B, 'B'), T(`BC \\approx ${s1(a)}`), T(`AC \\approx ${s1(b)}`)];
        steps = [`The acute angles add to ${T('90^\\circ')}: ${T(`m\\angle B = 90^\\circ - ${A}^\\circ = ${B}^\\circ`)}.`, `${T('BC')} is opposite ${T('A')}: ${T(`BC = ${c}\\sin ${A}^\\circ \\approx ${s1(a)}`)}.`, `${T('AC')} is adjacent to ${T('A')}: ${T(`AC = ${c}\\cos ${A}^\\circ \\approx ${s1(b)}`)}.`];
        strategy = 'With the hypotenuse known, both legs are multiplications: sine for the opposite leg, cosine for the adjacent leg.';
      } else if (row === 1) {
        b = R.int(3, 16); a = b * Math.tan(A * RAD); c = b / Math.cos(A * RAD);
        given = `${an(A, 'A')} and ${T(`AC = ${b}`)}`; find = [an(B, 'B'), T(`BC \\approx ${s1(a)}`), T(`AB \\approx ${s1(c)}`)];
        steps = [`The acute angles add to ${T('90^\\circ')}: ${T(`m\\angle B = 90^\\circ - ${A}^\\circ = ${B}^\\circ`)}.`, `${T('AC')} is adjacent to ${T('A')} and ${T('BC')} is opposite: ${T(`BC = ${b}\\tan ${A}^\\circ \\approx ${s1(a)}`)}.`, `${T('AB')} is the hypotenuse: ${T(`\\cos ${A}^\\circ = \\frac{${b}}{AB}`)}, so ${T(`AB = \\frac{${b}}{\\cos ${A}^\\circ} \\approx ${s1(c)}`)}.`];
        strategy = 'Use the given side for every step. If you reuse a rounded answer, the rounding error can change the next answer.';
      } else {
        a = R.int(3, 16); b = a / Math.tan(A * RAD); c = a / Math.sin(A * RAD);
        given = `${an(A, 'A')} and ${T(`BC = ${a}`)}`; find = [an(B, 'B'), T(`AC \\approx ${s1(b)}`), T(`AB \\approx ${s1(c)}`)];
        steps = [`The acute angles add to ${T('90^\\circ')}: ${T(`m\\angle B = 90^\\circ - ${A}^\\circ = ${B}^\\circ`)}.`, `${T('BC')} is opposite ${T('A')} and ${T('AC')} is adjacent: ${T(`\\tan ${A}^\\circ = \\frac{${a}}{AC}`)}, so ${T(`AC = \\frac{${a}}{\\tan ${A}^\\circ} \\approx ${s1(b)}`)}.`, `${T('AB')} is the hypotenuse: ${T(`\\sin ${A}^\\circ = \\frac{${a}}{AB}`)}, so ${T(`AB = \\frac{${a}}{\\sin ${A}^\\circ} \\approx ${s1(c)}`)}.`];
        strategy = 'When the given side is the opposite leg, both unknown sides are in the denominator, so both steps divide.';
      }
      if ([a, b, c].some(tie) || Math.min(a, b) < 0.95) continue;
    } else if (row === 3) {
      a = R.int(3, 16); b = R.int(3, 16); if (a === b) continue; c = Math.hypot(a, b); A = Math.atan(a / b) * DEG;
      if (tie(c) || tie(A) || A < 15 || A > 75) continue; const Ar = r1(A), Br = r1(90 - Ar);
      given = `${T(`BC = ${a}`)} and ${T(`AC = ${b}`)}`; find = [T(`AB \\approx ${s1(c)}`), ap(Ar, 'A'), ap(Br, 'B')];
      steps = [`Both legs are known, so use the Pythagorean theorem: ${T(`AB = \\sqrt{${a}^2 + ${b}^2} = \\sqrt{${a * a + b * b}} \\approx ${s1(c)}`)}.`, `From ${T('A')}, ${T('BC')} is opposite and ${T('AC')} is adjacent: ${T(`m\\angle A = \\tan^{-1}\\!\\left(\\frac{${a}}{${b}}\\right) \\approx ${Ar}^\\circ`)}.`, `The acute angles add to ${T('90^\\circ')}: ${T(`m\\angle B \\approx 90^\\circ - ${Ar}^\\circ = ${Br}^\\circ`)}.`];
      strategy = 'Two sides given: Pythagorean theorem for the third side, an inverse ratio for one angle, then subtract from 90° for the other.';
    } else {
      c = R.int(0, 1) ? dec(R, 8, 20) : R.int(8, 20); a = R.int(0, 1) ? dec(R, 3, c - 1) : R.int(3, Math.floor(c - 1)); if (a >= c - 0.5) continue;
      b = Math.sqrt(c * c - a * a); A = Math.asin(a / c) * DEG; if (tie(b) || tie(A) || A < 15 || A > 75) continue; const Ar = r1(A), Br = r1(90 - Ar);
      given = `${T(`BC = ${a}`)} and ${T(`AB = ${c}`)}`; find = [T(`AC \\approx ${s1(b)}`), ap(Ar, 'A'), ap(Br, 'B')];
      steps = [`The hypotenuse is known, so subtract: ${T(`AC = \\sqrt{${c}^2 - ${a}^2} \\approx ${s1(b)}`)}.`, `From ${T('A')}, ${T('BC')} is opposite and ${T('AB')} is the hypotenuse: ${T(`m\\angle A = \\sin^{-1}\\!\\left(\\frac{${a}}{${c}}\\right) \\approx ${Ar}^\\circ`)}.`, `The acute angles add to ${T('90^\\circ')}: ${T(`m\\angle B \\approx 90^\\circ - ${Ar}^\\circ = ${Br}^\\circ`)}.`];
      strategy = 'Find the angles from the two given sides, not from the side you just rounded.';
    }
    const [rot, flip] = orient(R, row), has = k => given.includes(SEG[k] + ' ='), gA = given.includes('angle A');
    const fig = rt({ a, b, rot, flip, sa: has('a') ? String(a) : '', sb: has('b') ? String(b) : '', sc: has('c') ? String(c) : '', angA: gA ? A + '^\\circ' : undefined });
    return { fig, q: `Solve the triangle. Round to the nearest tenth.\nRight angle at ${T('C')}, ${given}.`, a: find.join(',  '), steps, strategy };
  }
}

/* ---------- Two-Triangle Problems ---------- */
// Step 1 finds the shared altitude h from the triangle with a known side; step 2 uses the ROUNDED h in the other triangle.
function genTwo(R, row) {
  // [known side, its angle spot, x side, its angle spot]
  const CFG = [[['base', 'base', 'base', 'base']], [['hyp', 'base', 'hyp', 'base']], [['hyp', 'base', 'base', 'base'], ['base', 'base', 'hyp', 'base']],
    [['hyp', 'apex', 'base', 'base'], ['base', 'base', 'base', 'apex'], ['hyp', 'base', 'hyp', 'apex']],
    [['hyp', 'apex', 'hyp', 'apex'], ['base', 'apex', 'hyp', 'base'], ['base', 'apex', 'base', 'apex'], ['hyp', 'apex', 'base', 'apex']]];
  for (;;) {
    const [gk, gSpot, xk, xSpot] = R.pick(CFG[row]), al = R.int(22, 68), be = R.int(22, 68), g = R.int(6, 45); if (al === be) continue;
    // Step 1
    const baseAng1 = gSpot === 'base' ? al : 90 - al;      // true base angle of the known triangle (for drawing)
    let f1, hRaw, e1;
    if (gk === 'hyp') { f1 = gSpot === 'base' ? 'sin' : 'cos'; hRaw = g * FN[f1](al * RAD); e1 = [`\\${f1} ${al}^\\circ = \\frac{h}{${g}}`, `h = ${g}\\,\\${f1} ${al}^\\circ`]; }
    else if (gSpot === 'base') { f1 = 'tan'; hRaw = g * Math.tan(al * RAD); e1 = [`\\tan ${al}^\\circ = \\frac{h}{${g}}`, `h = ${g}\\tan ${al}^\\circ`]; }
    else { f1 = 'tan'; hRaw = g / Math.tan(al * RAD); e1 = [`\\tan ${al}^\\circ = \\frac{${g}}{h}`, `h = \\frac{${g}}{\\tan ${al}^\\circ}`]; }
    if (tie(hRaw) || hRaw < 3) continue; const h = r1(hRaw), hs = String(h);
    // Step 2 (uses the rounded h)
    let f2, xRaw, e2;
    if (xk === 'base' && xSpot === 'base') { f2 = 'tan'; xRaw = h / Math.tan(be * RAD); e2 = [`\\tan ${be}^\\circ = \\frac{${hs}}{x}`, `x = \\frac{${hs}}{\\tan ${be}^\\circ}`]; }
    else if (xk === 'base') { f2 = 'tan'; xRaw = h * Math.tan(be * RAD); e2 = [`\\tan ${be}^\\circ = \\frac{x}{${hs}}`, `x = ${hs}\\tan ${be}^\\circ`]; }
    else { f2 = xSpot === 'base' ? 'sin' : 'cos'; xRaw = h / FN[f2](be * RAD); e2 = [`\\${f2} ${be}^\\circ = \\frac{${hs}}{x}`, `x = \\frac{${hs}}{\\${f2} ${be}^\\circ}`]; }
    if (tie(xRaw) || xRaw < 2) continue;
    // If rounding h first could not be told apart from not rounding, fine; if exact work gives a different tenth, the rule matters, so say so in the steps.
    const baseAng2 = xSpot === 'base' ? be : 90 - be, w1 = hRaw / Math.tan(baseAng1 * RAD), w2 = hRaw / Math.tan(baseAng2 * RAD);
    const ratio = (w1 + w2) / hRaw; if (ratio < 0.9 || ratio > 2.6 || Math.min(w1, w2) / Math.max(w1, w2) < 0.3) continue;
    const K = { base: gk === 'base' ? String(g) : '', hyp: gk === 'hyp' ? String(g) : '', angBase: gSpot === 'base' ? al + '^\\circ' : undefined, angApex: gSpot === 'apex' ? al + '^\\circ' : undefined };
    const X = { base: xk === 'base' ? 'x' : '', hyp: xk === 'hyp' ? 'x' : '', angBase: xSpot === 'base' ? be + '^\\circ' : undefined, angApex: xSpot === 'apex' ? be + '^\\circ' : undefined };
    const knownLeft = R.int(0, 1) === 0, sideK = knownLeft ? 'left' : 'right', sideX = knownLeft ? 'right' : 'left';
    const fig = two(knownLeft ? { h: hRaw, l: w1, r: w2, L: K, R: X } : { h: hRaw, l: w2, r: w1, L: X, R: K });
    const spot = s => s === 'base' ? 'at the base' : 'at the top', cap = w => w[0].toUpperCase() + w.slice(1);
    const role1 = gk === 'hyp' ? 'hypotenuse' : (gSpot === 'base' ? 'adjacent side' : 'opposite side'), hRole1 = gk === 'hyp' ? (gSpot === 'base' ? 'opposite' : 'adjacent') : (gSpot === 'base' ? 'opposite' : 'adjacent');
    const xRole = xk === 'hyp' ? 'hypotenuse' : (xSpot === 'base' ? 'adjacent side' : 'opposite side'), hRole2 = xSpot === 'base' ? 'opposite' : 'adjacent';
    const exact = r1(xk === 'base' ? (xSpot === 'base' ? hRaw / Math.tan(be * RAD) : hRaw * Math.tan(be * RAD)) : hRaw / FN[f2](be * RAD));
    const ans = s1(xRaw);
    const steps = [`The dashed altitude ${T('h')} is a leg of both right triangles. In the ${sideK} triangle, ${T(g)} is the ${role1} and ${T('h')} is ${hRole1} to the ${T(al + '^\\circ')} angle: ${T(e1[0])}, so ${T(`${e1[1]} \\approx ${hs}`)}.`,
      `In the ${sideX} triangle, ${T('h = ' + hs)} is ${hRole2} to the ${T(be + '^\\circ')} angle and ${T('x')} is the ${xRole}: ${T(e2[0])}, so ${T(`${e2[1]} \\approx ${ans}`)}.`];
    if (exact !== r1(xRaw)) steps.push(`Without rounding ${T('h')} first you would get ${T(String(exact))}. These directions say to use the rounded ${T(hs)}, so the answer is ${T(ans)}.`);
    return { fig, q: `Find ${T('x')}. Round the altitude to the nearest tenth before you use it.\n${cap(sideK)} triangle: ${gk === 'hyp' ? 'hypotenuse' : 'base'} ${T(g)}, ${T(al + '^\\circ')} angle ${spot(gSpot)}.\n${cap(sideX)} triangle: ${T(be + '^\\circ')} angle ${spot(xSpot)}, ${xk === 'hyp' ? 'hypotenuse' : 'base'} ${T('x')}.`, a: T(`x \\approx ${ans}`), steps,
      strategy: 'Find the shared side first. The altitude is the bridge: it is the only length that belongs to both triangles.' };
  }
}

/* ---------- Concepts & Strategy: $200-$400 vocabulary, $600 concepts, $800 strategy, $1000 error analysis ---------- */
const CONCEPTS = [
  [
    { q: 'What does it mean to "solve a triangle"?', a: 'Find every missing side length and every missing angle measure.', steps: ['A triangle has 3 sides and 3 angles: six measurements in all.', 'Solving means finding whichever of the six are not given.'], strategy: 'Count what you have. In a right triangle you need three more facts after the given ones are used.' },
    { q: 'What is an angle of elevation?', a: 'The angle measured up from a horizontal line to the line of sight.', steps: ['Start with a level (horizontal) line at the observer.', 'Tilt up to the object. The amount of tilt is the angle of elevation.'], strategy: 'Elevation looks up. It always sits in a bottom corner of the right triangle, on the ground.' },
    { q: `In a triangle diagram, what does the symbol ${T('\\theta')} stand for, and what is it called?`, a: 'Theta. It stands for an unknown angle measure.', steps: [`${T('\\theta')} is a Greek letter used the way ${T('x')} is used for an unknown length.`], strategy: 'x usually marks a missing side; θ usually marks a missing angle.' },
    { q: 'Name the three sides of a right triangle as seen from one of its acute angles.', a: 'Opposite, adjacent, and hypotenuse.', steps: ['Opposite: the leg across from the angle.', 'Adjacent: the leg touching the angle. Hypotenuse: the side across from the right angle.'], strategy: 'Label the three sides from the angle before you write any ratio.' },
  ],
  [
    { q: 'What is an angle of depression?', a: 'The angle measured down from a horizontal line to the line of sight.', steps: ['Start with a level (horizontal) line at the observer.', 'Tilt down to the object. The amount of tilt is the angle of depression.'], strategy: 'Depression at the top equals elevation at the bottom, because the two horizontals are parallel (alternate interior angles).' },
    { q: 'What is an altitude of a triangle?', a: 'A segment from a vertex that is perpendicular to the opposite side (or the line containing it).', steps: ['It meets the opposite side at a right angle.', 'Its length is the height of the triangle from that side.'], strategy: 'Drawing an altitude turns one triangle into two right triangles.' },
    { q: 'The two acute angles of a right triangle are always what kind of angle pair? What do they add to?', a: 'Complementary. They add to 90°.', steps: ['All three angles add to 180°.', 'The right angle uses 90°, leaving 90° for the other two.'], strategy: 'Once you know one acute angle, the other is a subtraction, not a trig problem.' },
    { q: `What does an inverse trig function such as ${T('\\tan^{-1}')} do?`, a: 'It takes a ratio of two sides and gives back the angle.', steps: ['A trig ratio goes from an angle to a ratio.', 'An inverse trig function goes from a ratio back to the angle.'], strategy: 'Unknown angle means inverse.' },
  ],
  [
    { q: 'Besides the right angle, what is the least information you need to solve a right triangle? Why are two angles not enough?', a: 'Two sides, or one side and one acute angle. Angles alone fix the shape but not the size.', steps: ['Triangles with the same angles are similar: same shape, any size.', 'At least one side length is needed to set the size.'], strategy: 'No side length, no solution.' },
    { q: `In right triangle ${T('ABC')} with the right angle at ${T('C')}, which side is opposite ${T('\\angle A')} and which is adjacent to ${T('\\angle A')}?`, a: `Opposite: ${T('\\overline{BC}')}. Adjacent: ${T('\\overline{AC}')}.`, steps: [`The opposite side does not touch ${T('A')}, so it is ${T('\\overline{BC}')}.`, `${T('\\overline{AC}')} touches ${T('A')} and is a leg. ${T('\\overline{AB}')} also touches ${T('A')}, but it is the hypotenuse.`], strategy: 'The opposite side is named by the two letters that are not the angle.' },
    { q: 'Why does drawing an altitude help you find a side of a triangle that has no right angle?', a: 'It splits the triangle into two right triangles that share the altitude, so right-triangle trig works in each.', steps: ['Trig ratios only work in right triangles.', 'The altitude is a leg of both new triangles, so it carries information from one to the other.'], strategy: 'No right angle? Make one.' },
    { q: 'You know one acute angle of a right triangle is 37°. How do you find the other acute angle, and what is it?', a: '53°. Subtract from 90°.', steps: ['The acute angles are complementary.', '90° − 37° = 53°.'], strategy: 'Never use trig for something subtraction can do.' },
    { q: 'In a right triangle, one acute angle gets larger while the hypotenuse stays the same. What happens to the side opposite that angle?', a: 'It gets longer.', steps: ['Opposite = hypotenuse · sin θ.', 'Sine grows as the angle grows from 0° toward 90°.'], strategy: 'Bigger angle, bigger opposite side. Use it to check whether an answer is reasonable.' },
  ],
  [
    { q: `From angle ${T('\\theta')} you know the adjacent side is 9 and you want the hypotenuse ${T('x')}. Which ratio do you use, and do you multiply or divide?`, a: `Cosine; divide: ${T('x = \\frac{9}{\\cos\\theta}')}`, steps: [`CAH: ${T('\\cos\\theta = \\frac{9}{x}')}.`, `${T('x')} is in the denominator, so divide 9 by ${T('\\cos\\theta')}.`], strategy: 'The hypotenuse must come out longer than 9. Dividing by a number less than 1 makes it bigger.' },
    { q: 'You are given both legs of a right triangle and asked to solve it. List a good order of steps.', a: 'Pythagorean theorem for the hypotenuse, inverse tangent for one acute angle, then subtract from 90° for the other.', steps: ['Both legs known: the hypotenuse needs no trig.', 'Opposite and adjacent known: inverse tangent uses only given values.'], strategy: 'Build each step from the given numbers so that no rounded answer gets reused.' },
    { q: 'In a two-triangle problem with a shared altitude, which length do you find first, and why?', a: 'The altitude, because it is the only side that belongs to both triangles.', steps: ['Start in the triangle that has a known side.', 'Use it to find the altitude, then carry the altitude into the other triangle.'], strategy: 'Shared side first.' },
    { q: 'When solving a triangle, why is it better to use the given measurements than your own rounded answers in later steps?', a: 'Rounded answers carry rounding error, and the error can change the final digit.', steps: ['A rounded value is slightly off.', 'Multiplying or dividing by it can push the next answer to a different tenth.'], strategy: 'Use given values when you can. If the directions say to use the rounded value, follow the directions.' },
    { q: 'A right triangle has a 20° angle and a hypotenuse of 10. Without a calculator, is the side opposite the 20° angle closer to 3 or to 9? Explain.', a: 'Closer to 3. A small angle has a short opposite side.', steps: ['The opposite side grows as the angle grows.', `20° is a small angle, so the opposite side is short: ${T('10\\sin 20^\\circ \\approx 3.4')}.`], strategy: 'Estimate first. If the calculator disagrees with the picture, check the setup.' },
  ],
  [
    { q: `To find an angle with opposite side 5 and hypotenuse 13, a student types ${T('\\sin\\left(\\frac{5}{13}\\right)')} and gets about 0.0067. What is the error, and what is the angle?`, a: `They used sine instead of inverse sine: ${T('\\sin^{-1}\\!\\left(\\frac{5}{13}\\right) \\approx 22.6^\\circ')}`, steps: ['Sine takes an angle and gives a ratio. Here the ratio is known and the angle is not.', `Use the inverse: ${T('\\sin^{-1}\\!\\left(\\frac{5}{13}\\right) \\approx 22.6^\\circ')}.`], strategy: 'An answer near 0 for an angle is a red flag: you found a ratio, not an angle.' },
    { q: `A student sets up ${T('\\tan 40^\\circ = \\frac{12}{x}')} correctly, then writes ${T('x = 12\\tan 40^\\circ \\approx 10.1')}. What is the error, and what is ${T('x')}?`, a: `${T('x')} is in the denominator, so divide: ${T('x = \\frac{12}{\\tan 40^\\circ} \\approx 14.3')}`, steps: [`Multiply both sides by ${T('x')}: ${T('x\\tan 40^\\circ = 12')}.`, `Divide by ${T('\\tan 40^\\circ')}: ${T('x \\approx 14.3')}.`], strategy: 'x on top means multiply; x on the bottom means divide.' },
    { q: `A student types ${T('\\cos^{-1}\\!\\left(\\frac{15}{9}\\right)')} and the calculator shows an error. The adjacent side is 9 and the hypotenuse is 15. What went wrong, and what is the angle?`, a: `The ratio is upside down. ${T('\\cos^{-1}\\!\\left(\\frac{9}{15}\\right) \\approx 53.1^\\circ')}`, steps: ['Cosine is adjacent over hypotenuse, and the hypotenuse is the longest side.', 'So the ratio must be less than 1. A ratio above 1 has no angle.'], strategy: 'Sine and cosine ratios are never bigger than 1.' },
    { q: `A student's calculator says ${T('\\sin 30^\\circ \\approx -0.988')}. What is wrong, and what should it say?`, a: 'The calculator is in radian mode. In degree mode, sin 30° = 0.5.', steps: ['A sine of an acute angle can never be negative.', 'Switch the mode to degrees and try again.'], strategy: 'Test your calculator with sin 30° before a quiz. If it is not 0.5, fix the mode.' },
    { q: 'In a two-triangle problem, the left triangle has a hypotenuse of 36. A student uses 36 as the hypotenuse of the right triangle too. What is the error?', a: 'The 36 belongs only to the left triangle. Only the altitude is shared.', steps: ['Each right triangle has its own hypotenuse.', 'Find the altitude from the left triangle, then use the altitude in the right triangle.'], strategy: 'Before using a number, ask which triangle it belongs to.' },
    { q: 'A student solves a right triangle and reports acute angles of 62° and 38°. Without doing any trig, how do you know there is a mistake?', a: 'The acute angles of a right triangle must add to 90°. These add to 100°.', steps: ['62° + 38° = 100°.', 'With the right angle the total would be 190°, not 180°.'], strategy: 'Check the angle sum every time you solve a triangle.' },
  ],
];

/* ---------- rendering helpers (same behavior as the Intro to Trigonometry bank) ---------- */
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
const NUMRE = /(\d+(?:\.\d+)?)°|(\d+(?:\.\d+)?)/g;
function mathify(str) {
  if (typeof str !== 'string') return str;
  return str.split(/(\\\([\s\S]+?\\\))/g).map(p => p.startsWith('\\(') ? p : p.replace(NUMRE, (m, dg, bare) => dg ? T(`${dg}^\\circ`) : T(bare))).join('');
}
const norm = it => ({ ...it, q: mathify(it.q), a: mathify(it.a), steps: it.steps.map(mathify), strategy: mathify(it.strategy) });

function buildCategories(seeds) {
  const gens = [genAngle, genSide, genSolve, genTwo, (R, row) => R.pick(CONCEPTS[row])];
  return CATS.map((name, ci) => ({ name, items: VALUES.map((_, ri) => norm(gens[ci](mk(rngFrom(seeds[ci * 5 + ri])), ri))) }));
}

  return { id: 'trig-applications', title: 'Applications of Trigonometry', storageKey: 'trigAppsJeopardy.v1', values: VALUES, seedCount: 25, defaultTimer: 144, build: seeds => buildCategories(seeds), tex, fig: it => it.fig || null, calcCats: [0, 1, 2, 3], extraTime: ci => (ci === 2 || ci === 3) ? 60 : 0 };
};
