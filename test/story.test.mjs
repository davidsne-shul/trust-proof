// The sentences the page opens with. Run: node proof/test/story.test.mjs
import assert from 'node:assert/strict';
import { openingLine, _observations as o } from '../assets/story.js';

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ok  ' + name); };

const months = (from, count, live = () => true) => {
  const out = [];
  let [y, m] = from.split('-').map(Number);
  for (let i = 0; i < count; i++) {
    out.push({ month: `${y}-${String(m).padStart(2, '0')}`, count: live(i) ? 5 : 0 });
    if (++m > 12) { m = 1; y++; }
  }
  return out;
};

console.log('the return after the longest silence');
t('names the days away, the day back, and what followed', () => {
  const r = o.longestReturn({
    comeback_dates: [{ on: '2022-07-25', away: 51 }, { on: '2024-01-05', away: 20 }],
    months: months('2022-01', 30),
  });
  assert.match(r.text, /51 days/);
  assert.match(r.text, /25 Jul 2022/);
  assert.match(r.text, /12 months that followed/);
});
t('stays silent when too little followed to mean anything', () => {
  assert.equal(o.longestReturn({
    comeback_dates: [{ on: '2026-08-01', away: 40 }],
    months: months('2026-06', 4),
  }), null);
});
t('picks the longest silence, not the most recent', () => {
  const r = o.longestReturn({
    comeback_dates: [{ on: '2022-07-25', away: 51 }, { on: '2025-01-05', away: 15 }],
    months: months('2022-01', 40),
  });
  assert.match(r.text, /51 days/);
});

console.log('breadth');
t('names the first language, the latest, and the years between', () => {
  const r = o.breadthArc({ languages: [
    { name: 'Python', first: '2021-04-01' },
    { name: 'Go',     first: '2023-01-01' },
    { name: 'Rust',   first: '2024-06-01' }] });
  assert.match(r.text, /Python has been here since Apr 2021/);
  assert.match(r.text, /Rust arrived 3 years later/);
});
t('stays silent for one language, and for a single year', () => {
  assert.equal(o.breadthArc({ languages: [{ name: 'C', first: '2021-01-01' }] }), null);
  assert.equal(o.breadthArc({ languages: [
    { name: 'A', first: '2026-01-01' }, { name: 'B', first: '2026-03-01' },
    { name: 'C', first: '2026-06-01' }] }), null);
});

console.log('choosing which line to open with');
t('a dramatic return outranks the quieter observations', () => {
  const line = openingLine({
    comeback_dates: [{ on: '2022-07-25', away: 51 }],
    months: months('2022-01', 36),
    languages: [{ name: 'Python', first: '2021-01-01' }, { name: 'Go', first: '2023-01-01' }, { name: 'Rust', first: '2024-01-01' }],
    long_projects: [{ name: 'atlas', started: '2022-01-01', span_days: 400 }],
    active_weeks: 100, longest_run_weeks: 20,
  });
  assert.match(line, /Away 51 days/);
});
t('a record with no returns still opens with something true', () => {
  const line = openingLine({
    months: months('2024-01', 20),
    languages: [], long_projects: [],
    active_weeks: 60, longest_run_weeks: 18,
  });
  assert.ok(line && line.length > 10, 'expected a line');
  assert.doesNotMatch(line, /Away/);
});
t('an empty record says nothing rather than something hollow', () => {
  assert.equal(openingLine({ months: [], languages: [], long_projects: [] }), null);
});

console.log('what these sentences may never say');
t('no judgement, no ranking, no comparison, no percentages', () => {
  const line = openingLine({
    comeback_dates: [{ on: '2022-07-25', away: 51 }],
    months: months('2022-01', 36),
    languages: [{ name: 'Python', first: '2021-01-01' }, { name: 'Go', first: '2023-01-01' }, { name: 'Rust', first: '2024-01-01' }],
    long_projects: [{ name: 'atlas', started: '2022-01-01', span_days: 400 }],
    active_weeks: 100, longest_run_weeks: 20,
  });
  for (const banned of ['%', 'better', 'worse', 'top ', 'rank', 'score', 'average', 'most people', 'only ']) {
    assert.ok(!line.toLowerCase().includes(banned), `"${banned}" must never appear: ${line}`);
  }
});

console.log(`\n${pass} checks passed.`);
