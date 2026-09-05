// The words on the proof page.
//
// English only, on purpose: this page gets sent to a recruiter, pasted into a
// README, posted to Hacker News. A language toggle in that header is noise on
// something that should read sharp.
//
// It stays a module rather than inline strings because of what it fixed —
// counts arrive here raw and are formatted at the last moment. Passing a
// pre-formatted "1" made every `c === 1` test fail silently, which is how the
// page once said "1 projects".

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let fmt = (x) => String(x);
export function setFormatter(f) { fmt = f; }

const s = (c, one, many) => `${fmt(c)} ${c === 1 ? one : many}`;

export const T = {
  loading: 'Reading the record…',
  daysOfRecord: 'days of record',
  since: (d) => `since ${d}`,
  years: (c) => s(c, 'year', 'years'),
  journey: 'The record, month by month',
  play: 'Play the record',
  range: (a, b) => `Monthly activity from ${a} to ${b}`,
  contributions: (m, c) => `${m}: ${s(c, 'contribution', 'contributions')}`,

  comebacks: (c) => c === 1 ? 'comeback' : 'comebacks',
  comebackLast: (days, date) => `Away ${s(days, 'day', 'days')} — then back on ${date}.`,
  comebackNone: 'Every stretch away ended with a return.',
  activeWeeks: (c) => c === 1 ? 'active week' : 'active weeks',
  longestRun: (c) => `Longest unbroken run: ${s(c, 'week', 'weeks')}.`,
  languages: (c) => c === 1 ? 'language' : 'languages',
  languageSpan: (a, b) => `First one in ${a}, most recent in ${b}.`,
  longProjects: (c) => c === 1 ? 'long project' : 'long projects',
  longest: (name, days) =>
    `Longest: <span class="mono">${name}</span> — still going ${s(days, 'day', 'days')} in.`,

  howDays: 'From the day the account opened until today.',
  howComebacks: 'A stretch of 14 or more days with nothing, followed by a day with something.',
  howWeeks: 'Weeks holding at least one day of activity.',
  howLanguages: 'The earliest repository created in each language.',
  howProjects: 'Projects still being pushed to 90 or more days after they were started.',

  langTimeline: 'When each language entered the work',
  projects: (c) => s(c, 'project', 'projects'),
  entered: (d) => `entered ${d}`,
  projectTimeline: 'Projects that were still being pushed to, months in',
  started: (d) => `started ${d}`,
  days: (c) => s(c, 'day', 'days'),

  addedTitle: 'What was added by hand',
  addedBody: (items, spread, from, to) =>
    `${s(items, 'item', 'items')} across ${s(spread, 'day', 'days')}, from ${from} to ${to}. ` +
    'Each one carries the day it arrived, and that date cannot be moved.',

  footer: (d) => `Built from public GitHub data on ${d}. Nothing private was read. ` +
    'No code, no commit messages, no AI — dates, counts and names only.',
  deeper: 'Day-level history opens up once the server key is set.',
  // The promise has to be one we can keep. This one is true: the second layer
  // is written and waiting on a database, not on a decision.
  signupLead: 'This page reads code. A record can hold more than that — a photo, a link, one line, dated the moment it arrives.',
  signupPlace: 'you@example.com',
  signupGo: 'Tell me when',
  signupDone: 'Noted. You will hear once.',
  signupBad: 'That address does not look complete.',
  signupFail: 'That did not go through. Try again in a moment.',
  buildOwn: 'Build your own page',
  copyLink: 'Copy link',
  copyBadge: 'Copy README badge',
  copied: 'Copied',
  copyBelow: 'Copy it below',

  errNoHandle: (h) => `No public GitHub account is open under <span class="mono">@${h}</span>.`,
  errRate: 'GitHub is holding requests for a minute. Try again shortly.',
  errBad: 'That handle has characters GitHub does not use.',
  errOffline: 'The connection dropped. Try again in a moment.',
  errOther: 'Something upstream is quiet right now.',
  tryAnother: 'Try another handle',
};
