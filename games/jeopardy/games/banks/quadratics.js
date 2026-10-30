// Question bank: quadratics. Loaded by games/Play.dc.html?bank=quadratics
window.JPBanks = window.JPBanks || {};
window.JPBanks['quadratics'] = function (React) {

const NAMES = ['Pythagoreans', 'Euclideans', 'Archimedeans'];
const VALUES = [200, 400, 600, 800, 1000];
const CATS = ['X-Intercepts', 'Square Roots', 'Factoring', 'Completing the Square', 'Strategy'];
const VARS = ['x', 'v', 'k', 'n', 'm', 'r'];
const DEDUCT = 100;
const M = '\u2212';
const fmt = n => n < 0 ? M + Math.abs(n) : String(n);
const T = s => '\\(' + s + '\\)';
const rngFrom = seed => { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mk = r => ({ int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), pick: arr => arr[Math.floor(r() * arr.length)], nz: (lo, hi) => { let v = 0; while (v === 0) v = lo + Math.floor(r() * (hi - lo + 1)); return v; } });
const MODES = ['rational', 'irrational', 'complex'];
const MODE_NAME = { rational: 'Rational only', irrational: 'Rational + irrational', complex: 'Rational, irrational & complex' };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const sgn = n => n < 0 ? '-' : '+';
const sq = n => '\\sqrt{' + n + '}';
const simp = n => { let k = 1, m = n; for (let p = 2; p * p <= m; p++) while (m % (p * p) === 0) { m /= p * p; k *= p; } return [k, m]; };
const radT = n => { const [k, m] = simp(n); return m === 1 ? String(k) : (k === 1 ? '' : k) + sq(m); };
const frac = (p, q) => { const g = gcd(p, q); p /= g; q /= g; if (q < 0) { p = -p; q = -q; } return q === 1 ? String(p) : (p < 0 ? '-' : '') + '\\frac{' + Math.abs(p) + '}{' + q + '}'; };
const term = (c, v, pow, first) => { if (c === 0) return ''; const a = Math.abs(c), body = pow === 2 ? v + '^2' : pow === 1 ? v : ''; const coef = (a === 1 && pow > 0) ? '' : String(a); return (first ? (c < 0 ? '-' : '') : ' ' + sgn(c) + ' ') + coef + body; };
const poly = (a, b, c, v) => { let s = term(a, v, 2, true); s += term(b, v, 1, s === ''); s += term(c, v, 0, s === ''); return s || '0'; };
const setT = (arr, v) => arr.map(x => (v || 'x') + ' = ' + x).join(',\\quad ');
const bin = (v, h) => v + ' ' + sgn(-h) + ' ' + Math.abs(h);
const pm = (h, k, m) => { const r = (k === 1 ? '' : k) + sq(m); return [h === 0 ? r : h + ' + ' + r, h === 0 ? '-' + r : h + ' - ' + r]; };
const pmI = (h, b) => { const r = (b === 1 ? '' : b) + 'i'; return [h === 0 ? r : h + ' + ' + r, h === 0 ? '-' + r : h + ' - ' + r]; };
const vertexForm = (a, hh, kk, v) => { const A = a === 1 ? '' : a === -1 ? '-' : String(a); return A + '(' + bin(v, hh) + ')^2' + (kk === 0 ? '' : ' ' + sgn(kk) + ' ' + Math.abs(kk)); };
const xint = roots => roots.length === 0 ? 'No x-intercepts' : T(setT(roots, 'x'));
const special = (R, mode) => mode === 'rational' ? 'rat' : R.int(0, 2) === 0 ? (mode === 'complex' && R.int(0, 1) === 0 ? 'cx' : 'irr') : 'rat';

function genXint(R, row) {
  const v = 'x', vertex = R.int(0, 1) === 0, big = row >= 3;
  if (!vertex) {
    const r1 = R.nz(-9, 9); let r2 = (row === 0 && R.int(0, 2) === 0) ? r1 : R.nz(-9, 9); const a = big ? R.pick([-3, -2, 2, 3, -1]) : 1;
    const b = -a * (r1 + r2), c = a * r1 * r2, f = poly(a, b, c, v);
    const roots = r1 === r2 ? [r1] : [r1, r2].sort((p, q) => p - q);
    const steps = ['Set ' + T('f(x) = 0') + ': ' + T(f + ' = 0') + '.'];
    if (a !== 1) steps.push('Factor out ' + T(String(a)) + ': ' + T(a + '(' + poly(1, -(r1 + r2), r1 * r2, v) + ') = 0') + '.');
    steps.push('Factor: ' + T('(' + bin(v, r1) + ')(' + bin(v, r2) + ') = 0') + ', so ' + roots.map(r => T(v + ' = ' + r)).join(' and ') + '.');
    return { q: 'Identify the x-intercepts of ' + T('f(x) = ' + f) + '.', a: xint(roots), steps, strategy: roots.length === 1 ? 'A perfect-square trinomial has one repeated zero, so the graph just touches the x-axis.' : 'X-intercepts are where y = 0. Set the function equal to zero and factor.' };
  }
  const hh = R.nz(-7, 7), a = big ? R.pick([-4, -3, -2, 2, 3, 4]) : R.pick([1, -1]), d = R.int(1, 7);
  let kk = -a * d * d, roots = [hh - d, hh + d];
  if (R.int(0, 5) === 0) { kk = a > 0 ? R.int(1, 9) : -R.int(1, 9); roots = []; }
  const f = vertexForm(a, hh, kk, v);
  const steps = roots.length
    ? ['Set equal to zero and isolate the square: ' + T('(' + bin(v, hh) + ')^2 = ' + (d * d)) + '.', 'Take square roots: ' + T(bin(v, hh) + ' = \\pm ' + d) + ', so ' + T(v + ' = ' + hh + ' \\pm ' + d) + '.']
    : ['Set equal to zero and isolate the square: ' + T('(' + bin(v, hh) + ')^2 = ' + frac(-kk, a)) + '.', 'A square cannot equal a negative number, so there are no real zeros.'];
  return { q: 'Identify the x-intercepts of ' + T('f(x) = ' + f) + '.', a: xint(roots), steps, strategy: roots.length ? 'In vertex form, isolate the squared binomial and take square roots. Remember the ±.' : 'The vertex is at ' + T('(' + hh + ', ' + kk + ')') + ' and the parabola opens ' + (a > 0 ? 'up' : 'down') + ', so it never reaches the x-axis.' };
}

function genSqrt(R, row, mode) {
  const v = R.pick(VARS), sp = special(R, mode);
  if (sp === 'cx') { const b = R.int(2, 9), c = R.int(1, 15), tot = -(b * b) + c; return { q: 'Solve by taking square roots: ' + T(v + '^2 + ' + c + ' = ' + tot) + '.', a: T(setT([b + 'i', '-' + b + 'i'], v)), steps: ['Isolate the square: ' + T(v + '^2 = ' + (-b * b)) + '.', 'Take square roots: ' + T(v + ' = \\pm\\sqrt{' + (-b * b) + '} = \\pm ' + b + 'i') + '.'], strategy: 'The square root of a negative number is imaginary: √(−1) = i.' }; }
  if (sp === 'irr') { const n = R.pick([8, 12, 18, 20, 24, 27, 28, 32, 45, 48, 50, 72]), c = R.int(1, 12), [k, m] = simp(n); return { q: 'Solve by taking square roots: ' + T(v + '^2 - ' + c + ' = ' + (n - c)) + '.', a: T(setT([radT(n), '-' + radT(n)], v)), steps: ['Isolate the square: ' + T(v + '^2 = ' + n) + '.', 'Take square roots and simplify: ' + T(v + ' = \\pm\\sqrt{' + n + '} = \\pm\\sqrt{' + (k * k) + '\\cdot ' + m + '} = \\pm ' + radT(n)) + '.'], strategy: 'Pull out the largest perfect-square factor to write the radical in simplest form.' }; }
  if (row === 0) { const r = R.int(2, 12); return { q: 'Solve by taking square roots: ' + T(v + '^2 = ' + (r * r)) + '.', a: T(setT([r, -r], v)), steps: ['Take the square root of both sides: ' + T(v + ' = \\pm\\sqrt{' + (r * r) + '}') + '.', 'Both ' + T(String(r)) + ' and ' + T('-' + r) + ' square to ' + T(String(r * r)) + '.'], strategy: 'Every positive number has two square roots. Write the ±.' }; }
  if (row <= 2) { const r = R.int(2, 12), c = R.nz(-15, 15); return { q: 'Solve by taking square roots: ' + T(v + '^2 ' + sgn(c) + ' ' + Math.abs(c) + ' = ' + (r * r + c)) + '.', a: T(setT([r, -r], v)), steps: ['Undo the constant: ' + T(v + '^2 = ' + (r * r)) + '.', 'Take square roots: ' + T(v + ' = \\pm ' + r) + '.'], strategy: 'Isolate the squared term before taking the root.' }; }
  const Q = R.pick([2, 3, 4, 5, 6, 10]), P = R.pick([1, 2, 3, 7].filter(x => gcd(x, Q) === 1 && x < Q * 2)), a2 = Q * Q, c = R.nz(-12, 12), rhs = P * P + c;
  return { q: 'Solve by taking square roots: ' + T(a2 + v + '^2 ' + sgn(c) + ' ' + Math.abs(c) + ' = ' + rhs) + '.', a: T(setT([frac(P, Q), frac(-P, Q)], v)), steps: ['Undo the constant: ' + T(a2 + v + '^2 = ' + (P * P)) + '.', 'Divide by ' + T(String(a2)) + ': ' + T(v + '^2 = \\frac{' + (P * P) + '}{' + a2 + '}') + ', then take square roots: ' + T(v + ' = \\pm\\frac{' + P + '}{' + Q + '}') + '.'], strategy: 'Isolate the variable completely, including dividing off the coefficient, before taking the root.' };
}

function genFactor(R, row) {
  const v = R.pick(VARS);
  if (row === 0) { const a = R.int(2, 5), b = R.nz(-7, 7), c = R.int(1, 5), d = R.nz(-9, 9); const f1 = a + v + ' ' + sgn(b) + ' ' + Math.abs(b), f2 = (c === 1 ? '' : c) + v + ' ' + sgn(d) + ' ' + Math.abs(d); return { q: 'Solve by factoring: ' + T('(' + f1 + ')(' + f2 + ') = 0') + '.', a: T(setT([frac(-b, a), frac(-d, c)], v)), steps: ['Zero product: one of the factors must be zero.', T(f1 + ' = 0') + ' gives ' + T(v + ' = ' + frac(-b, a)) + '; ' + T(f2 + ' = 0') + ' gives ' + T(v + ' = ' + frac(-d, c)) + '.'], strategy: 'If a product is zero, at least one factor is zero. Solve each small equation.' }; }
  if (row <= 2) { const r1 = R.nz(-9, 9); let r2 = R.nz(-9, 9); while (r2 === r1) r2 = R.nz(-9, 9); const b = -(r1 + r2), c = r1 * r2; return { q: 'Solve by factoring: ' + T(poly(1, b, c, v) + ' = 0') + '.', a: T(setT([r1, r2].sort((p, q) => p - q), v)), steps: ['Find two numbers that multiply to ' + T(String(c)) + ' and add to ' + T(String(b)) + ': ' + T(String(-r1)) + ' and ' + T(String(-r2)) + '.', 'Factor: ' + T('(' + bin(v, r1) + ')(' + bin(v, r2) + ') = 0') + ', so ' + T(v + ' = ' + r1) + ' or ' + T(v + ' = ' + r2) + '.'], strategy: 'Product is c, sum is b. Then set each factor to zero.' }; }
  const a = R.pick([2, 3, 5]), c1 = R.int(1, a === 2 ? 3 : 2), p = R.nz(-5, 5), q = R.nz(-7, 7);
  const A = a * c1, B = a * q + p * c1, C = p * q, f1 = a + v + ' ' + sgn(p) + ' ' + Math.abs(p), f2 = (c1 === 1 ? '' : c1) + v + ' ' + sgn(q) + ' ' + Math.abs(q);
  return { q: 'Solve by factoring: ' + T(poly(A, B, C, v) + ' = 0') + '.', a: T(setT([frac(-p, a), frac(-q, c1)], v)), steps: ['Look for two binomials whose product gives ' + T(poly(A, B, C, v)) + ': ' + T('(' + f1 + ')(' + f2 + ')') + '.', 'Set each factor to zero: ' + T(v + ' = ' + frac(-p, a)) + ' or ' + T(v + ' = ' + frac(-q, c1)) + '.'], strategy: 'With a ≠ 1, use the ac method or guess and check the outer and inner products.' };
}

function genCTS(R, row, mode) {
  const v = R.pick(VARS), sp = special(R, mode), big = row >= 3;
  const hh = R.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9]), a = big ? R.pick([2, 3, 5, 10]) : 1;
  let D, aText, lastStep;
  if (sp === 'cx') { const b = R.int(1, 6); D = -b * b; aText = setT(pmI(hh, b), v); lastStep = 'Take square roots: ' + T(bin(v, hh) + ' = \\pm ' + (b === 1 ? '' : b) + 'i') + ', so ' + T(v + ' = ' + hh + ' \\pm ' + (b === 1 ? '' : b) + 'i') + '.'; }
  else if (sp === 'irr') { D = R.pick([2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 18, 20]); const [k, m] = simp(D); aText = setT(pm(hh, k, m), v); lastStep = 'Take square roots: ' + T(bin(v, hh) + ' = \\pm\\sqrt{' + D + '}') + ', so ' + T(v + ' = ' + hh + ' \\pm ' + radT(D)) + '.'; }
  else { const d = R.int(1, 9); D = d * d; aText = setT([hh + d, hh - d].sort((p, q) => p - q), v); lastStep = 'Take square roots: ' + T(bin(v, hh) + ' = \\pm ' + d) + ', so ' + T(v + ' = ' + hh + ' \\pm ' + d) + '.'; }
  const b = -2 * hh, cLeft = hh * hh - D, shift = R.nz(-12, 12);
  const left = poly(a, a * b, a * (cLeft - shift), v), right = -a * shift;
  const steps = [];
  if (a !== 1) steps.push('Divide every term by ' + T(String(a)) + ': ' + T(poly(1, b, cLeft - shift, v) + ' = ' + (-shift)) + '.');
  steps.push('Move the constant to the right: ' + T(poly(1, b, 0, v) + ' = ' + (-cLeft)) + '.');
  steps.push('Add ' + T('\\left(\\tfrac{' + b + '}{2}\\right)^2 = ' + hh * hh) + ' to both sides: ' + T('(' + bin(v, hh) + ')^2 = ' + D) + '.');
  steps.push(lastStep);
  return { q: 'Solve by completing the square: ' + T(left + ' = ' + right) + '.', a: T(aText), steps, strategy: a !== 1 ? 'Get a leading coefficient of 1 first; then half of b, squared, completes the square.' : 'Half the middle coefficient, square it, add to both sides. The left side becomes a perfect square.' };
}

const STRATEGY = [
  [
    { q: 'Which method is fastest for ' + T('x^2 = 49') + ', and why?', a: 'Square roots: ' + T('x = 7,\\quad x = -7'), steps: ['There is no x term, so the squared variable is already isolated.'], strategy: 'No middle term means square roots.' },
    { q: 'Which method is fastest for ' + T('(x - 3)(x + 8) = 0') + '?', a: 'Zero product property: ' + T('x = 3,\\quad x = -8'), steps: ['The equation is already factored and equals zero.'], strategy: 'Already factored and equal to zero: set each factor to zero.' },
    { q: 'Why does ' + T('(x - 2)(x + 5) = 0') + ' let you set each factor equal to zero?', a: 'If two numbers multiply to 0, one of them must be 0.', steps: ['No pair of nonzero numbers has a product of zero.', 'So either ' + T('x - 2 = 0') + ' or ' + T('x + 5 = 0') + '.'], strategy: 'This is the zero product property, and it only works when the other side is 0.' },
  ],
  [
    { q: 'Which method fits ' + T('x^2 + 7x + 12 = 0') + ' best, and what are the solutions?', a: 'Factoring: ' + T('x = -3,\\quad x = -4'), steps: ['Two numbers multiply to 12 and add to 7: 3 and 4.', T('(x + 3)(x + 4) = 0') + '.'], strategy: 'Try factoring first when a = 1 and the numbers are small.' },
    { q: 'Why does taking the square root of both sides of ' + T('x^2 = 25') + ' give two answers?', a: 'Both ' + T('5') + ' and ' + T('-5') + ' square to 25, so ' + T('x = 5,\\quad x = -5') + '.', steps: ['Squaring erases the sign, so undoing it must allow both signs.'], strategy: 'Every positive number has two square roots.' },
    { q: 'Which method fits ' + T('3x^2 - 27 = 0') + ' best, and what are the solutions?', a: 'Square roots: ' + T('x = 3,\\quad x = -3'), steps: ['No x term, so isolate ' + T('x^2') + ': ' + T('x^2 = 9') + '.'], strategy: 'Isolate the square, then take roots.' },
  ],
  [
    { q: 'Which method fits ' + T('x^2 + 6x = 40') + ' best, and why?', a: 'Completing the square (or factor after moving 40): ' + T('x = 4,\\quad x = -10'), steps: ['Half of 6 is 3, squared is 9: ' + T('(x + 3)^2 = 49') + '.', T('x + 3 = \\pm 7') + '.'], strategy: 'An even middle coefficient makes completing the square clean.' },
    { q: 'Why do you add ' + T('\\left(\\tfrac{b}{2}\\right)^2') + ' when completing the square on ' + T('x^2 + bx') + '?', a: 'Because ' + T('x^2 + bx + \\left(\\tfrac{b}{2}\\right)^2 = \\left(x + \\tfrac{b}{2}\\right)^2') + ', a perfect square.', steps: ['Expanding ' + T('(x + h)^2') + ' gives ' + T('x^2 + 2hx + h^2') + '.', 'Matching ' + T('2h = b') + ' gives ' + T('h = \\tfrac{b}{2}') + ', so the constant must be ' + T('h^2') + '.'], strategy: 'Completing the square builds the perfect-square pattern on purpose.' },
    { q: 'Why must one side be 0 before using the zero product property on ' + T('(x - 4)(x + 1) = 6') + '?', a: 'A product of 6 tells you nothing about the factors; only a product of 0 forces a factor to be 0.', steps: ['Expand, subtract 6, then factor ' + T('x^2 - 3x - 10 = (x - 5)(x + 2)') + '.', 'Solutions: ' + T('x = 5,\\quad x = -2') + '.'], strategy: 'Zero is the only number with this special product property.' },
  ],
  [
    { q: 'Which method fits ' + T('3x^2 - 12x + 5 = 0') + ' best? Explain.', a: 'Completing the square (or the quadratic formula); it does not factor over the integers.', steps: ['No pair of integer factors of ' + T('3 \\cdot 5 = 15') + ' adds to ' + T('-12') + '.', 'Divide by 3, then complete the square: ' + T('(x - 2)^2 = \\tfrac{7}{3}') + '.'], strategy: 'If factoring fails quickly, switch methods rather than keep guessing.' },
    { q: 'Why do you divide by the leading coefficient before completing the square on ' + T('2x^2 + 8x = 10') + '?', a: 'The half-of-b trick only builds a perfect square when the ' + T('x^2') + ' coefficient is 1.', steps: ['Divide: ' + T('x^2 + 4x = 5') + '.', 'Then ' + T('(x + 2)^2 = 9') + ', so ' + T('x = 1,\\quad x = -5') + '.'], strategy: 'Normalize to a = 1 first.' },
    { q: 'Why does ' + T('f(x) = 2(x - 3)^2 + 5') + ' have no x-intercepts, without solving?', a: 'The vertex ' + T('(3, 5)') + ' is above the x-axis and the parabola opens up.', steps: ['Setting ' + T('f(x) = 0') + ' gives ' + T('(x - 3)^2 = -\\tfrac{5}{2}') + ', impossible for a real square.'], strategy: 'Vertex form tells you the minimum value directly.' },
  ],
  [
    { q: 'Why does ' + T('x^2 + 4 = 0') + ' have no real solution, yet still have solutions?', a: 'A real square is never negative; in the complex numbers ' + T('x = 2i,\\quad x = -2i') + '.', steps: [T('x^2 = -4') + '.', T('\\sqrt{-4} = 2i') + '.'], strategy: 'No real solution is not the same as no solution.', cx: true },
    { q: 'Which method fits ' + T('(x + 3)^2 = 20') + ' best, and what are the solutions in simplest radical form?', a: 'Square roots: ' + T('x = -3 + 2\\sqrt{5},\\quad x = -3 - 2\\sqrt{5}'), steps: ['The square is already isolated.', T('\\sqrt{20} = \\sqrt{4 \\cdot 5} = 2\\sqrt{5}') + '.'], strategy: 'When a binomial is already squared, take roots directly.' },
    { q: 'Without solving, how can you tell ' + T('x^2 - 2x + 5 = 0') + ' has no real solutions?', a: 'Complete the square: ' + T('(x - 1)^2 = -4') + ', and a square is never negative. (Solutions: ' + T('x = 1 + 2i,\\quad x = 1 - 2i') + '.)', steps: ['Half of ' + T('-2') + ' is ' + T('-1') + ', squared is 1.', T('x^2 - 2x + 1 = -5 + 1 = -4') + '.'], strategy: 'A perfect square equal to a negative number signals complex solutions.', cx: true },
    { q: 'Why does the vertex form of a quadratic make x-intercepts easy to find?', a: 'The squared binomial is already isolated, so one step of algebra and a square root finishes it.', steps: ['From ' + T('a(x - h)^2 + k = 0') + ': ' + T('(x - h)^2 = -\\tfrac{k}{a}') + '.', 'Take square roots: ' + T('x = h \\pm \\sqrt{-k/a}') + '.'], strategy: 'Vertex form is one square root away from the zeros.' },
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

const seedsFrom = base => Array.from({ length: 25 }, (_, i) => (base * 31 + i * 7919) >>> 0);
function buildCategories(seeds, mode) {
  const gens = [genXint, genSqrt, genFactor, genCTS, (R, row, md) => R.pick(STRATEGY[row].filter(it => md === 'complex' || !it.cx))];
  return CATS.map((name, ci) => ({ name, items: VALUES.map((_, ri) => gens[ci](mk(rngFrom(seeds[ci * 5 + ri])), ri, mode)) }));
}
const pickGame = s => ({ teams: s.teams, used: s.used, seeds: s.seeds, turn: s.turn, dd: s.dd, mode: s.mode });
const randDD = used => { const free = Array.from({ length: 25 }, (_, i) => i).filter(i => !used.includes(i)); return free.length ? free[Math.floor(Math.random() * free.length)] : -1; };
const KEY = 'quadJeopardy.v3';

  return { id: 'quadratics', title: 'Solving Quadratics Jeopardy', storageKey: 'quadJeopardy.v3', values: VALUES, seedCount: 25, defaultTimer: 144, build: (seeds, mode) => buildCategories(seeds, mode), tex, modes: { list: MODES, names: MODE_NAME, labels: { rational: 'Rational', irrational: '+ Irrational', complex: '+ Complex' }, initial: 'rational' } };
};
