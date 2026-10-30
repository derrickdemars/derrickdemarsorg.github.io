// Question bank: percents. Loaded by games/Play.dc.html?bank=percents
window.JPBanks = window.JPBanks || {};
window.JPBanks['percents'] = function (React) {

const NAMES = ['\\(\\Gamma\\) Gamma', '\\(\\Lambda\\) Lambda', '\\(\\Omega\\) Omega', '\\(\\Delta\\) Delta'];
const VALUES = [200, 400, 600, 800, 1000];
const M = '\u2212';
const fmt = n => n < 0 ? M + Math.abs(n) : String(n);
const T = s => '\\(' + s + '\\)';
const money = n => '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const r2 = n => Math.round(n * 100) / 100;
const dec = p => (p / 100).toString();
const Tm = n => T('\\$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}'));
const Tp = p => T(p + '\\%');
const prop = (p, whole, part) => T('\\frac{' + p + '}{100} = \\frac{' + part + '}{' + whole + '}');
const mulStep = (p, price, what) => 'Set up a proportion for the ' + what + ', ' + T('\\frac{\\text{percent}}{100} = \\frac{\\text{part}}{\\text{whole}}') + ': ' + prop(p, price.toFixed(2), 'x') + '. Cross-multiply, ' + T('100x = ' + p + ' \\times ' + price.toFixed(2)) + ', so ' + T('x = ' + r2(price * p / 100).toFixed(2)) + ' and the ' + what + ' is ' + Tm(r2(price * p / 100)) + '.';
const rngFrom = seed => { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const mk = r => ({ int: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)), pick: arr => arr[Math.floor(r() * arr.length)] });
const ITEMS = ['pair of sneakers', 'pair of headphones', 'hoodie', 'game pass', 'skateboard', 'phone case', 'backpack', 'concert ticket', 'water bottle', 'pair of earbuds', 'basketball', 'graphic novel', 'board game', 'jersey', 'gaming mouse'];
const FOOD = ['pizza order', 'smoothie run', 'taco dinner', 'birthday lunch', 'sushi order', 'burger meal'];
const EASY_P = [20, 25, 50, 5, 15, 30, 40];
const friendly = R => R.int(2, 24) * 5;
const messy = R => R.int(1, 3) === 1 ? R.int(10, 600) + 0.99 : R.int(10, 600) + R.pick([0.5, 0.95, 0.25, 0.49, 0.75]);

function genBasics(R, row) {
  const item = R.pick(ITEMS);
  if (row <= 2) {
    const pct = row === 0 ? R.pick([20, 25, 50]) : row === 1 ? R.pick(EASY_P) : R.pick([12, 15, 35, 45, 65, 85]);
    const n = row === 0 ? R.int(2, 20) * 10 : row === 1 ? R.int(4, 40) * 5 : R.int(10, 200) + R.pick([0.5, 0.25, 0.75, 0.99, 0.49, 0.95]);
    const ans = r2(n * pct / 100);
    const q = R.int(0, 1) ? 'A ' + item + ' costs ' + Tm(n) + '. What is ' + Tp(pct) + ' of the price?' : Tp(pct) + ' of ' + Tm(n) + ' is what amount?';
    return { q, a: Tm(ans), steps: ['Set up a proportion, ' + T('\\frac{\\text{percent}}{100} = \\frac{\\text{part}}{\\text{whole}}') + ': ' + prop(pct, n.toFixed(2), 'x') + '.', 'Cross-multiply: ' + T('100x = ' + pct + ' \\times ' + n.toFixed(2) + ' = ' + r2(pct * n).toFixed(2)) + '.', 'Divide both sides by ' + T(100) + ': ' + T('x = ' + ans.toFixed(2)) + ', so the amount is ' + Tm(ans) + '.'], strategy: 'The percent is out of 100; the part is out of the whole. Set the two ratios equal and cross-multiply.' };
  }
  // Rows 800/1000: apply a non-round percent to a price with cents; answer rounds to the nearest cent
  const whole = R.int(30, 400) + R.pick([0.5, 0.25, 0.75, 0.99, 0.49, 0.95, 0.35, 0.89]);
  let pct; do { pct = row === 3 ? R.int(6, 49) : R.int(51, 94); } while (pct % 5 === 0);
  const exact = whole * pct / 100, ans = r2(exact);
  const q = (R.int(0, 1) ? 'A ' + item + ' costs ' + Tm(whole) + '. What is ' + Tp(pct) + ' of the price?' : Tp(pct) + ' of ' + Tm(whole) + ' is what amount?') + '\n<small>Round to the nearest cent.</small>';
  return { q, a: Tm(ans), steps: ['Set up a proportion, ' + T('\\frac{\\text{percent}}{100} = \\frac{\\text{part}}{\\text{whole}}') + ': ' + prop(pct, whole.toFixed(2), 'x') + '.', 'Cross-multiply: ' + T('100x = ' + pct + ' \\times ' + whole.toFixed(2) + ' = ' + r2(pct * whole).toFixed(2)) + '.', 'Divide both sides by ' + T(100) + ': ' + T('x = ' + exact.toFixed(4).replace(/0+$/, '')) + ', which rounds to ' + Tm(ans) + '.'], strategy: 'Same proportion, messier numbers. Cross-multiply, divide by 100, then round to the nearest cent.' };
}

function genDiscount(R, row) {
  const item = R.pick(ITEMS);
  const price = row <= 2 ? friendly(R) : messy(R);
  const pct = row <= 2 ? R.pick(EASY_P) : (() => { let p; do { p = R.int(6, 65); } while (p === 10); return p; })();
  const kinds = [['discount', 'Discount'], ['markdown', 'Markdown'], ['sale', 'Sale'], ['coupon', 'Coupon'], ['clearance', 'Clearance']];
  const [word, Label] = kinds[row];
  const off = r2(price * pct / 100), sale = r2(price - off);
  const line2 = word === 'sale' ? 'Sale: ' + Tp(pct) + ' off' : word === 'coupon' ? 'Coupon: ' + Tp(pct) + ' off' : word === 'clearance' ? 'Clearance: ' + Tp(pct) + ' off' : Label + ': ' + Tp(pct);
  const amtName = word === 'sale' ? 'savings' : word === 'coupon' ? 'coupon savings' : word === 'clearance' ? 'clearance markdown' : word;
  const amtLabel = amtName[0].toUpperCase() + amtName.slice(1);
  return { q: 'Original price of a ' + item + ': ' + Tm(price) + '\n' + line2 + '\nFind the sale price.', a: amtLabel + ': ' + Tm(off) + '\nSale price: ' + Tm(sale), steps: [mulStep(pct, price, amtName), 'A ' + word + ' lowers the price, so subtract the ' + amtName + ' from the original price.', 'Check: ' + T(price.toFixed(2) + ' - ' + off.toFixed(2) + ' = ' + sale.toFixed(2)) + '.'], strategy: 'Discount, markdown, sale, coupon, and clearance all mean the same move: find the percent amount, then subtract it.' };
}

function genTax(R, row) {
  // Fixed by row so every game balances tip, tax, and fee
  const PLAN = ['tax', 'tip', 'fee', 'tax', 'tip'];
  const kind = PLAN[row];
  const list = kind === 'tip' ? FOOD : kind === 'fee' ? ['online ticket', 'app subscription', 'delivery order', 'event pass'] : ITEMS;
  const item = R.pick(list);
  const price = row <= 2 ? friendly(R) : messy(R);
  const taxPct = () => { let p; do { p = row <= 2 ? R.int(4, 9) : R.int(3, 12); } while (p % 5 === 0); return p; };
  const pct = kind === 'tip' ? R.pick([15, 20]) : kind === 'tax' ? taxPct() : (row <= 2 ? R.pick([3, 4, 5, 8]) : (() => { let p; do { p = R.int(2, 30); } while (p === 10); return p; })());
  const add = r2(price * pct / 100), total = r2(price + add);
  const label = kind === 'tip' ? 'Cost' : 'Price';
  return { q: label + ' of a ' + item + ': ' + Tm(price) + '\n' + kind[0].toUpperCase() + kind.slice(1) + ': ' + Tp(pct) + '\nFind the total.', a: kind[0].toUpperCase() + kind.slice(1) + ': ' + Tm(add) + '\nTotal: ' + Tm(total), steps: [mulStep(pct, price, kind), 'A ' + kind + ' is added on top, so add the ' + kind + ' to the ' + label.toLowerCase() + '.', 'Check: ' + T(price.toFixed(2) + ' + ' + add.toFixed(2) + ' = ' + total.toFixed(2)) + '.'], strategy: 'Find the percent amount first, then add it. Tax, tip, and fees always make the total go up.' };
}

function genMulti(R, row) {
  const item = R.pick(ITEMS);
  const price = row <= 2 ? friendly(R) : messy(R);
  const pick = (easy, hard) => row <= 2 ? R.pick(easy) : R.int(hard[0], hard[1]);
  // Fixed term plan by row so every game shows each discount term
  const PLAN = [[['markup', 1], ['tax', 1]], [['promo code', -1], ['tax', 1]], [['markup', 1], ['price cut', -1]], [['markup', 1], ['discount', -1], ['tax', 1]], [['markup', 1], ['markdown', -1], ['tax', 1]]];
  const stages = PLAN[row];
  const noTen = (lo, hi) => { let p; do { p = R.int(lo, hi); } while (p === 10 || p === 100); return p; };
  const pctFor = k => k === 'tax' ? pick([5, 6, 8, 9], [1, 9]) : k === 'markup' ? (row <= 2 ? R.pick([20, 25, 50, 75]) : noTen(11, 95)) : (row <= 2 ? R.pick([20, 25, 50, 15]) : noTen(11, 45));
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const amtName = k => k === 'promo code' ? 'promo code savings' : k;
  let cur = price; const qLines = [(stages[0][0] === 'markup' ? 'Cost' : 'Original price') + ' of a ' + item + ': ' + Tm(price)], steps = [], aLines = [];
  stages.forEach(([k, sign], i) => {
    const p = pctFor(k); const amt = r2(cur * p / 100); const next = r2(cur + sign * amt);
    qLines.push(cap(k) + ': ' + Tp(p) + (k === 'promo code' || k === 'price cut' ? ' off' : ''));
    steps.push('Step ' + (i + 1) + ': ' + mulStep(p, cur, amtName(k)) + ' ' + (sign > 0 ? 'Add it' : 'Subtract it') + ': the price is now ' + Tm(next) + '.');
    aLines.push(cap(amtName(k)) + ': ' + Tm(amt));
    cur = next;
  });
  qLines.push('Find the selling price.');
  aLines.push('Selling price: ' + Tm(cur));
  return { q: qLines.join('\n'), a: aLines.join('\n'), steps, strategy: 'Work one percent at a time, in the order given. Each new percent is taken of the price from the step before, not the original.' };
}

const STRATEGY = [
  { q: 'Sales tax is ' + Tp(8) + ' on a ' + Tm(50) + ' game. Do you ADD or SUBTRACT the tax amount? What is the total?', a: 'Add. Tax: ' + Tm(4) + '. Total: ' + Tm(54) + '.', steps: ['Proportion: ' + T('\\frac{8}{100} = \\frac{x}{50}') + '. Cross-multiply: ' + T('100x = 400') + ', so ' + T('x = 4') + '.', 'Tax is added to the price: ' + T('50 + 4 = 54') + '.'], strategy: 'Tax goes on top of the price, so the total is always more than the price.' },
  { q: 'A hoodie is on sale for ' + Tp(20) + ' off. Do you ADD or SUBTRACT the percent amount? Name two other situations where you do the same thing.', a: 'Subtract. Also: discount, markdown, coupon, clearance, promo code, price cut.', steps: ['Discounts lower the price, so the percent amount comes off.', 'Tax, tip, fees, markup, and commission are added instead.'], strategy: 'Decide the direction first: does this percent make the price go up or down?' },
  { q: 'Two stores sell the same ' + Tm(80) + ' sneakers.\nStore A: ' + Tp(25) + ' off coupon\nStore B: ' + Tm(15) + ' off coupon\nWhich is the better deal?', a: 'Store A. ' + Tp(25) + ' of ' + Tm(80) + ' is ' + Tm(20) + ' off, which beats ' + Tm(15) + ' off.', steps: ['Turn the percent into dollars: ' + T('\\frac{25}{100} = \\frac{x}{80}') + ', so ' + T('100x = 2000') + ' and ' + T('x = 20') + '.', 'Compare the dollar amounts: ' + Tm(20) + ' off is more than ' + Tm(15) + ' off.'], strategy: 'To compare deals, convert everything to the same thing, usually dollars.' },
  { q: 'A ' + Tm(150) + ' jacket is ' + Tp(20) + ' off and tax is ' + Tp(8) + '. Does it matter whether you take the discount first or the tax first?', a: 'No. Either order gives ' + Tm(129.60) + '.', steps: ['Discount first: ' + T('150 - 30 = 120') + ', then tax: ' + T('120 + 9.60 = 129.60') + '.', 'Tax first: ' + T('150 + 12 = 162') + ', then discount: ' + T('162 - 32.40 = 129.60') + '.', 'Either way the price is scaled by the same two percents, and the order of scaling does not change the result.'], strategy: 'Multiplying by percents is commutative, so the order of discount and tax does not change the final price.' },
  { q: 'Which is the better deal on a ' + Tm(60) + ' backpack?\nDeal 1: ' + Tp(30) + ' discount\nDeal 2: ' + Tp(20) + ' discount, then an extra ' + Tp(15) + ' off the sale price', a: 'Deal 2. It gives ' + Tm(40.80) + '; Deal 1 gives ' + Tm(42) + '.', steps: ['Deal 1: ' + T('\\frac{30}{100} = \\frac{x}{60}') + ' gives ' + T('x = 18') + ', so ' + T('60 - 18 = 42') + '.', 'Deal 2: ' + T('\\frac{20}{100} = \\frac{x}{60}') + ' gives ' + T('x = 12') + ', so ' + T('60 - 12 = 48') + '; then ' + T('\\frac{15}{100} = \\frac{x}{48}') + ' gives ' + T('x = 7.20') + ', so ' + T('48 - 7.20 = 40.80') + '.', 'The extra ' + Tp(15) + ' is taken from the sale price, not the original, so it is worth ' + Tm(7.20) + ' rather than ' + Tm(9) + '.'], strategy: 'Stacked percents do not add. 20% then 15% off is less than 35% off, but here it still beats 30% off. Always compute.' },
];

function answerEl(str) {
  const lines = String(str).split('\n');
  if (lines.length < 2) return tex(str);
  const inter = lines.slice(0, -1), last = lines[lines.length - 1];
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { fontSize: '0.55em', fontWeight: 500, color: 'var(--jp-accent)', textShadow: '2px 2px 0 var(--jp-ink)', lineHeight: 1.4, marginBottom: '0.3em' } }, ...inter.map((l, i) => React.createElement('div', { key: i }, tex(l)))),
    React.createElement('div', null, tex(last)));
}

function tex(str) {
  const k = window.katex;
  const parts = String(str).split(/(\\\([\s\S]+?\\\)|<small>[\s\S]*?<\/small>)/g);
  return React.createElement(React.Fragment, null, ...parts.map((p, i) => {
    if (p.startsWith('<small>')) return React.createElement('span', { key: i, style: { fontSize: '0.55em', fontWeight: 400, opacity: 0.85 } }, p.slice(7, -8));
    if (p.startsWith('\\(') && p.endsWith('\\)')) {
      const body = p.slice(2, -2);
      if (!k) return React.createElement('span', { key: i }, body);
      return React.createElement('span', { key: i, dangerouslySetInnerHTML: { __html: k.renderToString(body, { throwOnError: false }) } });
    }
    return p;
  }));
}

const seedsFrom = base => Array.from({ length: 20 }, (_, i) => (base * 31 + i * 7919) >>> 0);
function buildCategories(seeds) {
  let n = 0;
  const gen = (fn, name) => ({ name, items: VALUES.map((_, i) => fn(mk(rngFrom(seeds[n++])), i)) });
  return [gen(genBasics, 'Percent Basics'), gen(genDiscount, 'Discounts & Markdowns'), gen(genTax, 'Tax, Tip & Fees'), gen(genMulti, 'Multi-Step'), { name: 'Strategy', items: STRATEGY }];
}

const KEY = 'pctJeopardy.v1';

  return { id: 'percents', title: 'Percent Jeopardy', storageKey: 'pctJeopardy.v1', values: VALUES, seedCount: 20, defaultTimer: 90, build: seeds => buildCategories(seeds), tex, answerEl, extraTime: (ci, ri) => (ci === 3 || ci === 4) ? (ri >= 3 ? 60 : 30) : 0 };
};
