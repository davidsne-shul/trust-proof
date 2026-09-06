// Known-answer checks for the signal math. Run: node proof/test/signals.test.mjs
import assert from 'node:assert/strict';
import { comebacks, weekRhythm, monthly, workSpan, languageTimeline, longProjects } from '../api/proof.js';

const DAY = 86400000;
const day = (iso, count) => ({ date: iso, count });
const plus = (start, n) => new Date(new Date(start + 'T00:00:00Z').getTime() + n * DAY).toISOString().slice(0, 10);

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ok  ' + name); };

console.log('comebacks');
t('a 20-day silence followed by work counts once', () => {
  const d = [day('2026-01-01', 3), day('2026-01-21', 1)];
  const c = comebacks(d);
  assert.equal(c.length, 1);
  assert.equal(c[0].away_days, 20);
  assert.equal(c[0].returned_on, '2026-01-21');
});
t('a 13-day silence is still one stretch of work, not a comeback', () => {
  assert.equal(comebacks([day('2026-01-01', 1), day('2026-01-14', 1)]).length, 0);
});
t('exactly 14 days is a comeback', () => {
  assert.equal(comebacks([day('2026-01-01', 1), day('2026-01-15', 1)]).length, 1);
});
t('empty days between are ignored — only days with work anchor a gap', () => {
  const d = [day('2026-01-01', 2), ...Array.from({ length: 30 }, (_, i) => day(plus('2026-01-02', i), 0)), day('2026-02-05', 4)];
  assert.equal(comebacks(d).length, 1);
});
t('a record with no work at all has no comebacks and does not throw', () => {
  assert.equal(comebacks([day('2026-01-01', 0), day('2026-01-02', 0)]).length, 0);
});

console.log('weekRhythm');
t('counts weeks holding work, and the longest unbroken run of them', () => {
  // three consecutive active weeks, one silent week, then one active week
  const d = [];
  for (let i = 0; i < 35; i++) {
    const date = plus('2026-01-05', i);              // 2026-01-05 is a Monday
    const week = Math.floor(i / 7);
    d.push(day(date, week === 3 ? 0 : 1));
  }
  const r = weekRhythm(d);
  assert.equal(r.total_weeks, 5);
  assert.equal(r.active_weeks, 4);
  assert.equal(r.longest_run_weeks, 3);
});

console.log('monthly');
t('sums per month and stays in date order', () => {
  const m = monthly([day('2026-02-03', 2), day('2026-01-09', 5), day('2026-02-20', 1)]);
  assert.deepEqual(m, [{ month: '2026-01', count: 5 }, { month: '2026-02', count: 3 }]);
});

console.log('languageTimeline');
t('keeps the earliest repo per language and orders by entry date', () => {
  const l = languageTimeline([
    { language: 'Rust', created_at: '2025-06-01T00:00:00Z', fork: false },
    { language: 'Python', created_at: '2020-01-01T00:00:00Z', fork: false },
    { language: 'Python', created_at: '2019-03-04T00:00:00Z', fork: false },
    { language: 'Go', created_at: '2018-01-01T00:00:00Z', fork: true },   // forks are not your record
    { language: null, created_at: '2021-01-01T00:00:00Z', fork: false },
  ]);
  assert.deepEqual(l.map((x) => x.name), ['Python', 'Rust']);
  assert.equal(l[0].first, '2019-03-04');
  assert.equal(l[0].repos, 2);
});

console.log('longProjects');
t('keeps only what was still pushed to 90+ days in, longest first', () => {
  const p = longProjects([
    { name: 'short', language: 'JS', fork: false, created_at: '2026-01-01T00:00:00Z', pushed_at: '2026-02-01T00:00:00Z', stargazers_count: 0 },
    { name: 'long', language: 'Rust', fork: false, created_at: '2024-01-01T00:00:00Z', pushed_at: '2026-01-01T00:00:00Z', stargazers_count: 9 },
    { name: 'mid', language: 'Go', fork: false, created_at: '2026-01-01T00:00:00Z', pushed_at: '2026-05-01T00:00:00Z', stargazers_count: 1 },
  ]);
  assert.deepEqual(p.map((x) => x.name), ['long', 'mid']);
  assert.equal(p[0].span_days, 731);
});
t('a boundary of exactly 90 days is kept', () => {
  const p = longProjects([{ name: 'edge', language: 'C', fork: false, created_at: '2026-01-01T00:00:00Z', pushed_at: '2026-04-01T00:00:00Z', stargazers_count: 0 }]);
  assert.equal(p.length, 1);
  assert.equal(p[0].span_days, 90);
});

console.log('the record starts when the work starts');
t('months before the first day of work are not drawn', () => {
  // An account opened in January, first touched in April. The three silent
  // months are not a pause — nothing was being recorded yet.
  const d = [];
  for (let i = 0; i < 120; i++) d.push(day(plus('2026-01-01', i), 0));
  d.push(day('2026-05-01', 4));
  const m = monthly(d);
  assert.equal(m[0].month, '2026-05');
});
t('a gap inside the record is kept — it is what a comeback rests on', () => {
  const d = [day('2026-01-05', 2)];
  for (let i = 1; i <= 70; i++) d.push(day(plus('2026-01-05', i), 0));
  d.push(day('2026-03-20', 1));
  const m = monthly(d);
  assert.deepEqual(m.map((x) => x.month), ['2026-01', '2026-02', '2026-03']);
  assert.equal(m[1].count, 0);
});
t('a record with nothing in it draws nothing', () => {
  assert.deepEqual(monthly([day('2026-01-01', 0), day('2026-01-02', 0)]), []);
});

console.log('the span measures work, never account age');
t('counts first day with work to the last, inclusive', () => {
  const d = [day('2025-02-19', 1), day('2025-06-01', 0), day('2026-09-06', 3)];
  const sp = workSpan(d);
  assert.equal(sp.from, '2025-02-19');
  assert.equal(sp.to, '2026-09-06');
  assert.equal(sp.days, 565);
});
t('an account open for years with nothing in it has no span at all', () => {
  const d = [];
  for (let i = 0; i < 1000; i++) d.push(day(plus('2023-01-01', i), 0));
  assert.equal(workSpan(d), null);
});
t('one single day of work is a span of one day, not of the account', () => {
  const sp = workSpan([day('2020-01-01', 0), day('2026-09-06', 2)]);
  assert.equal(sp.days, 1);
});

console.log(`\n${pass} checks passed.`);
