// node scripts/test-drink-gen.mjs
const TARGET = 20, MIN_ML = 200, MAX_ML = 350;

function rand(min, max)    { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function buildDrinks(roundId, poolIn) {
  const pool     = poolIn.map(d => ({...d}));
  const spirits  = pool.filter(d => d.type === 'mixable');
  const mixers   = pool.filter(d => d.type === 'dilution');
  const straight = pool.filter(d => d.type === 'non-mixable');

  const canMix    = spirits.length > 0 && mixers.length > 0;
  const mixTarget = canMix ? Math.floor(TARGET * 0.45) : 0;
  const out = [];

  // Phase 1: Mixes
  for (let i = 0; i < mixTarget && out.length < TARGET; i++) {
    const avS = spirits.filter(s => s.available_ml >= MIN_ML / 2).sort((a,b) => b.available_ml - a.available_ml);
    const avM = mixers .filter(m => m.available_ml >= MIN_ML / 2).sort((a,b) => b.available_ml - a.available_ml);
    if (!avS.length || !avM.length) break;
    const spirit = avS[Math.floor(Math.random() * Math.min(3, avS.length))];
    const mixer  = avM[Math.floor(Math.random() * Math.min(3, avM.length))];
    const total  = randInt(MIN_ML/10, MAX_ML/10) * 10;
    const frac   = rand(0.25, 0.45);
    const sMl    = Math.round(total * frac / 10) * 10;
    const mMl    = total - sMl;
    if (spirit.available_ml < sMl || mixer.available_ml < mMl) continue;
    const alc = spirit.alc_percent > 0 ? Math.round(sMl * spirit.alc_percent / total * 10) / 10 : null;
    out.push({ label: `${spirit.name}+${mixer.name}`, is_mix: true, total, alc, sMl, mMl });
    spirit.available_ml -= sMl;
    mixer.available_ml  -= mMl;
  }

  // Phase 2: Straight
  const sp = [...straight, ...spirits.filter(s=>s.available_ml>=MIN_ML), ...mixers.filter(m=>m.available_ml>=MIN_ML)];
  const straightCount = TARGET - out.length;
  for (let i = 0; i < straightCount; i++) {
    const avail = sp.filter(d => d.available_ml >= MIN_ML);
    if (!avail.length) break;
    const tot = avail.reduce((s,d) => s+d.available_ml, 0);
    let rnd = Math.random()*tot, drink = avail[avail.length-1];
    for (const d of avail) { rnd -= d.available_ml; if (rnd <= 0) { drink = d; break; } }
    const cap = Math.min(drink.available_ml, MAX_ML);
    const amount = randInt(MIN_ML/10, cap/10) * 10;
    out.push({ label: drink.name, is_mix: false, total: amount, alc: drink.alc_percent });
    drink.available_ml -= amount;
  }
  return out;
}

function runTest(label, pool) {
  const out   = buildDrinks('test', pool);
  const total = out.reduce((s, d) => s + d.total, 0);
  const mixes = out.filter(d => d.is_mix).length;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`TEST: ${label}`);
  console.log(`${'─'.repeat(60)}`);
  out.forEach((d, i) => {
    const detail = d.is_mix
      ? `${d.sMl}ml Spirit + ${d.mMl}ml Mixer = ${d.total}ml  (${d.alc}% ABV)`
      : `${d.total}ml${d.alc ? '  ('+d.alc+'% ABV)' : ''}`;
    console.log(`  #${String(i+1).padStart(2)} ${d.label.padEnd(20)} ${detail}`);
  });
  console.log(`\n  Drinks: ${out.length}/${TARGET}   Mixes: ${mixes}   Gesamt: ${total} ml`);

  // Füllstand-Check (wie in add-drinks)
  const avail = pool.reduce((s,d) => s+d.available_ml, 0);
  const est   = Math.min(TARGET, Math.floor(avail / MIN_ML));
  const level = avail < TARGET*MIN_ML ? 'CRITICAL ❌' : avail < TARGET*((MIN_ML+MAX_ML)/2) ? 'LOW ⚠️' : 'OK ✅';
  console.log(`  Pool: ${avail} ml  →  Füllstand: ${level}  (schätzbar: ${est}/${TARGET} Schlücke)`);
}

runTest('2L Bier (5%)', [
  { name:'Bier', type:'non-mixable', available_ml:2000, alc_percent:5 },
]);

runTest('Zu wenig — nur 2× 400ml (critical)', [
  { name:'Bier', type:'non-mixable', available_ml:800, alc_percent:5 },
]);

runTest('Knapp — 5L gesamt (low)', [
  { name:'Bier', type:'non-mixable', available_ml:3000, alc_percent:5 },
  { name:'Wein', type:'non-mixable', available_ml:2000, alc_percent:12 },
]);

runTest('700ml Vodka + 1.5L Limo', [
  { name:'Vodka', type:'mixable',  available_ml:700,  alc_percent:40 },
  { name:'Limo',  type:'dilution', available_ml:1500, alc_percent:0  },
]);

runTest('Gemischt: Bier+Wein+Vodka+Saft (ok)', [
  { name:'Bier',  type:'non-mixable', available_ml:1000, alc_percent:5  },
  { name:'Wein',  type:'non-mixable', available_ml:750,  alc_percent:12 },
  { name:'Vodka', type:'mixable',     available_ml:700,  alc_percent:40 },
  { name:'OJ',    type:'dilution',    available_ml:1500, alc_percent:0  },
]);

runTest('Überschuss — 20L Bier (nur 20 generiert)', [
  { name:'Bier', type:'non-mixable', available_ml:20000, alc_percent:5 },
]);

console.log('\n' + '─'.repeat(60));
