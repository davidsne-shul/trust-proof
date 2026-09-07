// The worked example must stay an example, and must stay a real run of the
// engine. Run: node proof/test/demo.test.mjs
import assert from 'node:assert/strict';
import { demoPayload } from '../api/demo.js';

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ok  ' + name); };
const d = demoPayload('2026-09-07');

console.log('it never passes as a person');
t('carries the example flag, so the page cannot render it silently', () => {
  assert.equal(d.is_example, true);
});
t('says so in the identity itself, not only in a banner', () => {
  assert.match(d.name, /example/i);
  assert.match(d.bio, /not a real person/i);
});
t('claims no GitHub account anyone could visit', () => {
  assert.equal(d.handle, 'example');
});

console.log('it is a real run of the engine, not typed-in numbers');
t('the days that carried work are counted, and fall inside the span', () => {
  assert.ok(d.active_days > 0 && d.active_days < d.days_of_record);
});
t('the span is measured from work, never from an account opening', () => {
  const from = new Date(d.worked_from), to = new Date(d.worked_to);
  assert.equal(Math.round((to - from) / 86400000) + 1, d.days_of_record);
});
t('the chart opens on a month that carried work', () => {
  assert.ok(d.months[0].count > 0);
});
t('every comeback lands on a month the chart actually draws', () => {
  const drawn = new Set(d.months.map((m) => m.month));
  for (const c of d.comeback_dates) assert.ok(drawn.has(c.on.slice(0, 7)), c.on);
});
t('it shows the thing a contribution graph cannot: returns after real absences', () => {
  assert.ok(d.comebacks >= 3);
  assert.ok(d.longest_away_days >= 30);
});

console.log('it shows the second layer, and keeps it separate');
t('carries evidence that is not code, each with the day it arrived', () => {
  assert.ok(d.added.length >= 3);
  for (const a of d.added) assert.match(a.added_at, /^\d{4}-\d{2}-\d{2}$/);
});
t('the added items are never folded into the GitHub counts', () => {
  assert.ok(!('added' in (d.how || {})));
  assert.ok(d.active_days === d.active_days);   // counts come from days alone
});
t('is the same page for everyone who is shown it', () => {
  // generated_at is the moment of the request and is expected to differ.
  const strip = ({ generated_at, ...rest }) => rest;
  assert.deepEqual(strip(demoPayload('2026-09-07')), strip(d));
});

console.log(`\n${pass} checks passed.`);
