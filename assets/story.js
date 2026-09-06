// The record, said in a sentence.
//
// A page of numbers is a report. The same numbers, said as one specific
// sentence about a person, are a story — and only one of the two is worth
// showing anyone. "9 comebacks" is a metric. "Away 51 days, back on 25 July,
// and active in 11 of the 12 months that followed" is about someone.
//
// No model writes these. Each is a template filled from the record, so every
// word is checkable against the data and the voice stays the person's own.
//
// Three rules every line here keeps:
//   · specific — a date, a name, a number, never a summary
//   · true without interpretation — nothing inferred about who they are
//   · never a judgement, never a comparison to another person

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const n = (x) => Number(x || 0).toLocaleString('en-US');
const mon = (ym) => { const t = new Date(ym + '-01T00:00:00Z'); return `${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
const day = (d) => { const t = new Date(d + 'T00:00:00Z'); return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
const plural = (c, one, many) => `${n(c)} ${c === 1 ? one : many}`;

/** Months strictly after a date, in order. */
const monthsAfter = (months, iso) => months.filter((m) => m.month > iso.slice(0, 7));

/**
 * What happened after the longest silence.
 *
 * The strongest thing this record can say, and the one no other product can:
 * a streak counter stops at the gap, so it never gets to tell you what came
 * next. Only run when there is enough after it to mean something.
 */
function longestReturn(d) {
  if (!d.comeback_dates?.length || !d.months?.length) return null;
  const longest = d.comeback_dates.reduce((a, b) => (b.away > a.away ? b : a));
  const after = monthsAfter(d.months, longest.on);
  if (after.length < 6) return null;

  const window = after.slice(0, 12);
  const alive = window.filter((m) => m.count > 0).length;
  return {
    weight: longest.away * 3 + alive * 4,
    text: `Away ${plural(longest.away, 'day', 'days')} — then back on ${day(longest.on)}, ` +
          `and working in ${n(alive)} of the ${plural(window.length, 'month', 'months')} that followed.`,
  };
}

/** Breadth that arrived one at a time — the gap between first and latest. */
function breadthArc(d) {
  if (!d.languages || d.languages.length < 3) return null;
  const first = d.languages[0], last = d.languages.at(-1);
  const years = Math.floor(
    (new Date(last.first) - new Date(first.first)) / (365 * 86400000));
  if (years < 1) return null;
  return {
    weight: d.languages.length * 5 + years * 6,
    text: `${first.name} has been here since ${mon(first.first.slice(0, 7))}. ` +
          `${last.name} arrived ${plural(years, 'year', 'years')} later, ` +
          `${plural(d.languages.length, 'language', 'languages')} in.`,
  };
}

/** Something still being pushed to long after it started. */
function longHaul(d) {
  const p = d.long_projects?.[0];
  if (!p || p.span_days < 365) return null;
  return {
    weight: Math.round(p.span_days / 8),
    text: `${p.name} was started in ${mon(p.started.slice(0, 7))} — ` +
          `and was still being pushed to ${plural(p.span_days, 'day', 'days')} later.`,
  };
}

/** The weeks that held work, and the longest run of them. Counts, not a rate. */
function rhythm(d) {
  if (d.active_weeks == null || d.longest_run_weeks < 8) return null;
  return {
    weight: d.longest_run_weeks * 2,
    text: `${plural(d.active_weeks, 'week', 'weeks')} held work, ` +
          `and ${n(d.longest_run_weeks)} of them ran unbroken.`,
  };
}

/** The busiest month, named. */
function peak(d) {
  if (!d.months?.length) return null;
  const top = d.months.reduce((a, b) => (b.count > a.count ? b : a));
  if (!top.count) return null;
  return { weight: 20, text: `The fullest month on record is ${mon(top.month)}.` };
}

/**
 * The one line the page opens with.
 *
 * Deliberately one. Three true sentences in a row is a report again — the
 * discipline is the product. The heaviest observation wins, so a record with a
 * dramatic return leads with the return, and a quiet one leads with its breadth.
 */
export function openingLine(d) {
  const found = [longestReturn(d), breadthArc(d), longHaul(d), rhythm(d), peak(d)]
    .filter(Boolean)
    .sort((a, b) => b.weight - a.weight);
  return found.length ? found[0].text : null;
}

export const _observations = { longestReturn, breadthArc, longHaul, rhythm, peak };
