// Question bank: equations. Loaded by games/Play.dc.html?bank=equations
window.JPBanks = window.JPBanks || {};
window.JPBanks['equations'] = function (React) {

const NAMES = ['The Integers', 'The Variables', 'The Coefficients', 'The Constants'];
const VALUES = [200, 400, 600, 800, 1000];
const VARS = ['x', 'n', 'm', 'k', 'p', 'b', 'v', 'r', 'a'];
const M = '\u2212';
const fmt = n => n < 0 ? M + Math.abs(n) : String(n);
// LaTeX helpers: math is written inside \( ... \)
const T = s => `\\(${s}\\)`;
const par = n => n < 0 ? `(${n})` : String(n);
const coef = (a, v) => (a === 1 ? '' : a === -1 ? '-' : String(a)) + v;
const frac = (top, bot) => `\\frac{${top}}{${bot}}`;
const undoW = c => c >= 0 ? `Subtract ${T(c)} from both sides to undo the ${T('+' + c)}.` : `Add ${T(Math.abs(c))} to both sides to undo the ${T('-' + Math.abs(c))}.`;
const divW = a => `Divide both sides by ${T(a)} to undo the multiplication.`;
const mulW = a => `Multiply both sides by ${T(a)} to undo the division.`;
const first = s => s.replace(' to undo', ' first to undo');
const rngFrom = seed => { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mk = r => ({ int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), nz: (lo, hi) => { let n; do { n = lo + Math.floor(r() * (hi - lo + 1)); } while (n === 0); return n; }, pick: arr => arr[Math.floor(r() * arr.length)] });

function genAddSub(R, row) {
  const v = R.pick(VARS);
  if (row === 0) { const a = R.int(2, 15), x = R.int(3, 20), b = a + x; return { q: T(`${v} + ${a} = ${b}`), a: T(`${v} = ${x}`), steps: [undoW(a)], strategy: `Adding ${T(a)} is undone by subtracting ${T(a)}. Whatever you do to one side, do to the other.` }; }
  if (row === 1) { const a = R.int(5, 20), b = R.nz(-10, 15), x = a + b; return { q: T(`${v} - ${a} = ${b}`), a: T(`${v} = ${x}`), steps: [undoW(-a)], strategy: `Subtracting ${T(a)} is undone by adding ${T(a)} to both sides.` }; }
  if (row === 2) { const a = R.int(-20, -3), x = R.nz(-15, 15), b = a + x; return { q: T(`${b} = ${a} + ${v}`), a: T(`${v} = ${x}`), steps: [undoW(a)], strategy: `The constant ${T(a)} is negative, so add ${T(Math.abs(a))} to both sides to cancel it. The variable can sit on either side.` }; }
  if (row === 3) { const a = R.int(3, 20), x = R.nz(-15, -1), b = x - a; return { q: T(`${b} = ${v} - ${a}`), a: T(`${v} = ${x}`), steps: [undoW(-a)], strategy: `The variable is on the right side. Add ${T(a)} to both sides to undo the subtraction; the answer stays negative.` }; }
  const d = n => (Math.round(n * 10) / 10).toFixed(1);
  const a = -R.int(15, 95) / 10, x = R.nz(-120, 120) / 10;
  let b = x + a; if (b >= 0) b = x - Math.abs(a) - 10;
  const xx = b - a;
  return { q: T(`${d(b)} = ${d(a)} + ${v}`), a: T(`${v} = ${d(xx)}`), steps: [`Add ${T(d(-a))} to both sides to undo the ${T(d(a))}.`, `${T(d(b))} plus ${T(d(-a))}: ${xx < 0 ? 'the negative is bigger, so the answer stays negative' : 'the positive is bigger, so the answer is positive'}.`], strategy: `The constant ${T(d(a))} is negative, so add ${T(d(-a))} to both sides to cancel it. Line up the decimal points and watch the signs.` };
}

function genMulDiv(R, row) {
  const v = R.pick(VARS);
  if (row === 0) { const a = R.int(2, 9), x = R.int(2, 12), b = a * x; return { q: T(`${coef(a, v)} = ${b}`), a: T(`${v} = ${x}`), steps: [divW(a)], strategy: `${T(coef(a, v))} means ${T(a)} times ${T(v)}. Multiplication is undone by division.` }; }
  if (row === 1) { const a = R.int(2, 12), b = R.int(2, 12), x = a * b; return { q: T(`${frac(v, a)} = ${b}`), a: T(`${v} = ${x}`), steps: [mulW(a)], strategy: `${T(frac(v, a))} means ${T(v)} divided by ${T(a)}. Division is undone by multiplication.` }; }
  if (row === 2) { const a = -R.int(2, 12), x = R.nz(-12, 12), b = a * x; return { q: T(`${coef(a, v)} = ${b}`), a: T(`${v} = ${x}`), steps: [divW(a), `Check the sign: ${x < 0 ? 'a positive divided by a negative is negative' : 'a negative divided by a negative is positive'}.`], strategy: `Divide by the whole coefficient, sign included.` }; }
  if (row === 3) { const a = R.int(3, 13), b = -R.int(2, 12), x = a * b; const flip = R.int(0, 1); return { q: T(flip ? `${b} = ${frac(v, a)}` : `${frac(v, a)} = ${b}`), a: T(`${v} = ${x}`), steps: [mulW(a), 'Check the sign: a negative times a positive is negative.'], strategy: `Undo the division by multiplying. A negative times a positive is negative.` }; }
  const a = -R.int(11, 19), x = R.nz(-20, 20), b = a * x;
  return { q: T(`${b} = ${coef(a, v)}`), a: T(`${v} = ${x}`), steps: [divW(a), `Check the sign: ${x < 0 ? 'positive \u00F7 negative is negative' : 'negative \u00F7 negative is positive'}.`], strategy: `Big numbers, same rule: divide both sides by the coefficient ${T(a)} and watch the sign.` };
}

function genTwoStep(R, row) {
  const v = R.pick(VARS);
  if (row === 0) { const a = R.int(2, 9), b = R.int(1, 12), x = R.int(2, 12), c = a * x + b; return { q: T(`${coef(a, v)} + ${b} = ${c}`), a: T(`${v} = ${x}`), steps: [first(undoW(b)), divW(a)], strategy: `Undo addition or subtraction first, then undo multiplication. Reverse the order of operations.` }; }
  if (row === 1) { const a = R.int(2, 9), b = R.int(1, 12), x = R.nz(-9, 12), c = a * x - b; return { q: T(`${c} = ${coef(a, v)} - ${b}`), a: T(`${v} = ${x}`), steps: [first(undoW(-b)), divW(a)], strategy: `Get the variable term alone first (add ${T(b)}), then divide by the coefficient.` }; }
  if (row === 2) { const a = R.int(2, 9), b = R.int(1, 12), k = R.nz(-10, 12), x = a * k, c = k - b; return { q: T(`${frac(v, a)} - ${b} = ${c}`), a: T(`${v} = ${x}`), steps: [first(undoW(-b)), mulW(a)], strategy: `Only ${T(v)} is divided by ${T(a)}, so clear the ${T('-' + b)} first, then multiply.` }; }
  if (row === 3) { const a = R.int(2, 9), b = R.int(1, 12), c = R.nz(-8, 8), x = a * c - b; return { q: T(`${frac(v + ' + ' + b, a)} = ${c}`), a: T(`${v} = ${x}`), steps: [`Multiply both sides by ${T(a)} first, because the whole top ${T(v + ' + ' + b)} is divided by ${T(a)}.`, undoW(b)], strategy: `When the entire expression ${T(v + ' + ' + b)} is divided, undo the division first, then the addition.` }; }
  const a = -R.int(2, 8), b = R.int(1, 12), c = R.nz(-6, 6), x = b + a * c;
  return { q: T(`${frac(v + ' - ' + b, a)} = ${c}`), a: T(`${v} = ${x}`), steps: [`Multiply both sides by ${T(a)} first, because the whole top ${T(v + ' - ' + b)} is divided by ${T(a)}. Watch the sign.`, undoW(-b)], strategy: `Multiply both sides by the negative denominator first (watch the sign), then add ${T(b)}.` };
}

const STRATEGY = [
  { q: `Which operation undoes the subtraction in this equation?\n${T('x - 7 = 12')}`, a: `Addition: add ${T(7)} to both sides`, steps: [T('x - 7 + 7 = 12 + 7'), T('x = 19')], strategy: 'Every operation has an inverse. Subtraction is undone by addition.' },
  { q: `What is the FIRST step to solve this equation?\n${T('4x + 9 = 25')}`, a: `Subtract ${T(9)} from both sides`, steps: [T('4x + 9 - 9 = 25 - 9 \\;\\Rightarrow\\; 4x = 16'), `Then divide by ${T(4)}: ${T('x = 4')}`], strategy: 'In a two-step equation, undo the addition or subtraction before the multiplication.' },
  { q: `Do you undo the subtraction or the multiplication first?\n${T('3n - 5 = 16')}`, a: `Undo the subtraction first (add ${T(5)}), then divide by ${T(3)}`, steps: [T('3n - 5 + 5 = 16 + 5 \\;\\Rightarrow\\; 3n = 21'), T('n = 7')], strategy: 'Solving reverses the order of operations: the last thing done to the variable is the first thing you undo.' },
  { q: `Fill in the blanks: To solve the equation ${T('2x - 9 = 15')}, first ______ ${T(9)} to both sides, then ______ both sides by ______.`, a: `add ${T(9)}; divide by ${T(2)}`, steps: [`Adding ${T(9)} undoes the subtraction and leaves ${T('2x = 24')}.`, `Dividing by ${T(2)} undoes the multiplication, so ${T('x = 12')}.`], strategy: 'Undo in reverse order: the subtraction first, then the multiplication.' },
  { q: `What is the first step to solve this equation, and why?\n${T('\\frac{y + 8}{3} = 5')}`, a: `Multiply both sides by ${T(3)}, because the whole quantity ${T('y + 8')} is divided by ${T(3)}`, steps: [T('y + 8 = 15'), `Subtract ${T(8)}: ${T('y = 7')}`], strategy: `The fraction bar groups ${T('y + 8')} together, so the division happens last and must be undone first.` },
];

const VOCAB = [
  { q: 'What is a variable?', a: 'A letter or symbol that stands for an unknown number', steps: [`In ${T('3x + 7 = 19')}, the variable is ${T('x')}.`], strategy: 'The goal of solving is to find the value the variable stands for.' },
  { q: `Which numbers are the constants?\n${T('3x + 7 = 19')}`, a: `${T(7)} and ${T(19)}`, steps: ['A constant is a number on its own, not attached to a variable.', `${T(3)} is a coefficient, not a constant: it multiplies ${T('x')}.`], strategy: 'Constants are the numbers you add or subtract to move; coefficients are the numbers you divide by.' },
  { q: 'What does it mean to "isolate the variable"?', a: 'Get the variable alone on one side of the equals sign', steps: [`${T('x + 4 = 10 \\;\\Rightarrow\\; x = 6')}: ${T('x')} is now isolated.`], strategy: 'Every step in solving is a move toward getting the variable by itself.' },
  { q: `Name the inverse operation of each:\n1. Adding ${T(5)}\n2. Multiplying by ${T(-4)}`, a: `1. Subtracting ${T(5)}\n2. Dividing by ${T(-4)}`, steps: ['Inverse operations undo each other.', 'Addition \u2194 Subtraction.  Multiplication \u2194 Division.'], strategy: 'To cancel an operation, apply its inverse to both sides.' },
  { q: `Which is an equation and which is an expression? What is the difference?\n${T('5x - 3')}\n${T('5x - 3 = 22')}`, a: `${T('5x - 3')} is an expression; ${T('5x - 3 = 22')} is an equation`, steps: ['An expression has no equals sign. You can simplify or evaluate it, but not solve it.', `An equation has an equals sign and can be solved: here ${T('x = 5')}.`], strategy: 'No equals sign, no solving. Only equations have solutions.' },
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

const seedsFrom = base => Array.from({ length: 15 }, (_, i) => (base * 31 + i * 7919) >>> 0);
function buildCategories(seeds) {
  let n = 0;
  const gen = (fn, name) => ({ name, items: VALUES.map((_, i) => fn(mk(rngFrom(seeds[n++])), i)) });
  return [gen(genAddSub, 'Add & Subtract'), gen(genMulDiv, 'Multiply & Divide'), gen(genTwoStep, 'Two-Step'), { name: 'Strategy', items: STRATEGY }, { name: 'Vocabulary', items: VOCAB }];
}

const KEY = 'eqJeopardy.v1';

  return { id: 'equations', title: 'Equations Jeopardy', storageKey: 'eqJeopardy.v1', values: VALUES, seedCount: 15, defaultTimer: 90, build: seeds => buildCategories(seeds), tex };
};
