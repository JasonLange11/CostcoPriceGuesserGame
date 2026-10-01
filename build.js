// Converts costco_items_v2.csv into data.js for the game.
// Run: node build.js
const fs = require('fs');
const lines = fs.readFileSync(__dirname + '/costco_items_v2.csv', 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);

function parseRow(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur); return out;
}

// "10 kg" -> 10000, "5" -> 5, "1 piece" -> 1
function qty(s) {
  const m = String(s).trim().match(/^([\d.]+)\s*([a-z]*)/i);
  if (!m) return NaN;
  const u = m[2].toLowerCase();
  return parseFloat(m[1]) * (u === 'kg' || u === 'l' ? 1000 : 1);
}

// Remove the package size from the name so players can't see it while guessing
function hideSize(name) {
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/,?\s*\d+(\.\d+)?\s*(kg|g|ml|l)\b(\s*[x×]\s*\d+\s*pack)?/gi, '')
    .replace(/,?\s*\d+\s*[x×]\s*(approx\.\s*)?/gi, '')
    .replace(/,?\s*\d+[\s-]*packs?( of \d+)?/gi, '')
    .replace(/,?\s*\d+\s*(pouches|units)/gi, '')
    .replace(/[\s,]+$/, '').replace(/\s{2,}/g, ' ').trim();
}

const items = [];
for (const line of lines.slice(1)) {
  const [cat, name, amount, price, img, url, serving, cal] = parseRow(line);
  const total = qty(amount), serv = qty(serving), c = parseFloat(cal), p = parseFloat(price);
  if (!(p > 0 && img)) continue;
  // calories are optional: items without them are only used in the price mode
  const calories = total > 0 && serv > 0 && c >= 0 ? Math.round(total / serv * c) : null;
  // ask Costco's image server for a small version so rounds load fast
  const smallImg = img.includes('gdx-assets') ? img + '?width=480' : img;
  const grams = / g$/.test(amount) && total > 0 ? total : null;
  items.push({ name, short: hideSize(name), amount, price: p, img: smallImg, url, grams,
    ppg: grams ? p / grams : null, calories, cpd: calories === null ? null : calories / p });
}
// drop items whose image link is broken
async function imageOk(url) {
  try {
    const r = await fetch(url);
    return r.ok && (r.headers.get('content-type') || '').startsWith('image/');
  } catch { return false; }
}

(async () => {
  const ok = await Promise.all(items.map(i => imageOk(i.img)));
  const broken = items.filter((_, k) => !ok[k]);
  const good = items.filter((_, k) => ok[k]);
  fs.writeFileSync(__dirname + '/data.js', 'const ITEMS = ' + JSON.stringify(good, null, 1) + ';\n');
  const withCal = good.filter(i => i.cpd !== null);
  console.log(good.length + ' items written to data.js (' + withCal.length + ' with calories)');
  if (broken.length) console.log('Skipped ' + broken.length + ' with broken images: ' + broken.map(i => i.short).join('; '));
  withCal.sort((a, b) => b.cpd - a.cpd).forEach(i => console.log(Math.round(i.cpd).toString().padStart(6), 'cal/$  ', i.short));
})();
