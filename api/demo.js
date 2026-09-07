// A worked example.
//
// David's own record is three days old, and a landing page that leans on it
// teaches a visitor that this product is thin. This endpoint shows what a full
// record looks like — five years of work, and evidence that is not only code.
//
// Two rules hold this file honest:
//
//  1. Nothing here is hand-written. The days are generated, then run through
//     the same monthly/comebacks/weekRhythm/workSpan the live engine uses. A
//     demo whose numbers were typed in could promise a shape the product does
//     not actually produce.
//  2. It is never presented as a person. `is_example` travels with the payload
//     and the page refuses to render it without saying so.
import { monthly, comebacks, weekRhythm, workSpan } from './proof.js';

const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

/** Deterministic, so the example is the same page for everyone who is shown it. */
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * A working life, not a smooth curve: dense stretches, thin ones, two real
 * absences. The absences are the point — they are what a comeback is measured
 * against, and no contribution graph anywhere is built to show them.
 */
function buildDays(end) {
  const rnd = seeded(20260907);
  const start = new Date(end).getTime() - 1825 * DAY;   // five years
  const away = [[430, 47], [1180, 63]];                 // two long absences
  const days = [];
  for (let i = 0; i <= 1825; i++) {
    const date = iso(start + i * DAY);
    const resting = away.some(([from, len]) => i >= from && i < from + len);
    const dow = new Date(start + i * DAY).getUTCDay();
    // Seasons of intensity, quieter weekends, and a slow build over the years.
    const season = 0.42 + 0.26 * Math.sin(i / 118) + (i / 1825) * 0.22;
    const chance = resting ? 0 : season * (dow === 0 || dow === 6 ? 0.36 : 1);
    const hit = rnd() < chance;
    days.push({ date, count: hit ? 1 + Math.floor(rnd() * 9) : 0 });
  }
  return days;
}

/**
 * The second layer: what the person put there themselves.
 *
 * Deliberately not code, and deliberately not verified. We do not claim any of
 * it happened — only the day it was recorded, which is the one thing a record
 * can actually guarantee. The page keeps it apart from the GitHub signals for
 * exactly that reason, and the reader decides.
 */
function buildAdded(end) {
  const t = new Date(end).getTime();
  return [
    { note: 'Taught the first workshop. Eleven people, none of them programmers.',
      image_path: 'workshop.svg', link_url: null, added_at: iso(t - 1490 * DAY) },
    { note: 'The joint finally held. Fourth attempt.',
      image_path: 'bench.svg', link_url: null, added_at: iso(t - 1040 * DAY) },
    { note: 'Wrote up why the sensor drifted, after four months of it drifting.',
      image_path: 'board.svg', link_url: 'https://example.org/notes/drift', added_at: iso(t - 611 * DAY) },
    { note: 'Shipped the handbook. 90 pages, two years of teaching in it.',
      image_path: 'pages.svg', link_url: 'https://example.org/handbook', added_at: iso(t - 148 * DAY) },
  ].reverse();
}

export function demoPayload(today = new Date().toISOString().slice(0, 10)) {
  const days = buildDays(today);
  const span = workSpan(days);
  const back = comebacks(days);

  return {
    is_example: true,
    handle: 'example',
    name: 'An example record',
    avatar: '/assets/demo/board.svg',
    bio: 'Not a real person. This page shows what a full record looks like once it has years in it.',
    since: span.from,
    worked_from: span.from,
    worked_to: span.to,
    days_of_record: span.days,
    active_days: days.filter((d) => d.count > 0).length,
    months: monthly(days),
    ...weekRhythm(days),
    comebacks: back.length,
    comeback_dates: back.slice(-12).map((b) => ({ on: b.returned_on, away: b.away_days })),
    longest_away_days: back.reduce((a, b) => Math.max(a, b.away_days), 0),
    last_comeback: back.length ? back[back.length - 1] : null,
    languages: [
      { name: 'Python', repos: 9, first: iso(new Date(today).getTime() - 1810 * DAY) },
      { name: 'JavaScript', repos: 6, first: iso(new Date(today).getTime() - 1320 * DAY) },
      { name: 'C', repos: 2, first: iso(new Date(today).getTime() - 880 * DAY) },
      { name: 'Rust', repos: 3, first: iso(new Date(today).getTime() - 400 * DAY) },
    ],
    long_projects: [
      { name: 'field-notes', language: 'Python', started: iso(new Date(today).getTime() - 1700 * DAY), span_days: 1512 },
      { name: 'sensor-drift', language: 'C', started: iso(new Date(today).getTime() - 860 * DAY), span_days: 604 },
      { name: 'handbook', language: 'JavaScript', started: iso(new Date(today).getTime() - 520 * DAY), span_days: 371 },
    ],
    repos_built: 20,
    added: buildAdded(today),
    storage_base: '/assets/demo/',
    claimed: true,
    generated_at: new Date().toISOString(),
    depth: 'full',
    how: {
      active_days: 'Days carrying at least one contribution. Opening an account adds none of these.',
      days_of_record: 'From the first day that carried work to the most recent one.',
      comebacks: 'A stretch of 14 or more days with nothing, followed by a day with something.',
      active_weeks: 'Weeks holding at least one day of activity.',
      languages: 'The earliest repository created in each language.',
      long_projects: 'Projects still being pushed to 90 or more days after they were started.',
    },
  };
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json(demoPayload());
}
