// TRUST Proof — signal engine.
//
// Reads ONLY public GitHub data. No AI call anywhere in this path.
// No commit messages, no code, no file contents — dates, counts and names only.
//
// Three rules this file exists to keep:
//   · counts, never percentages
//   · process patterns over time, never a static hero score
//   · every number explainable in one sentence — see `how` on each signal
//
// GITHUB_TOKEN is read from the server env. It is never sent to the browser.

const GQL = 'https://api.github.com/graphql';
const REST = 'https://api.github.com';

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

function headers(token, json = true) {
  const h = { 'User-Agent': 'trust-proof', Accept: 'application/vnd.github+json' };
  if (json) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/**
 * A bad or expired token must never take the page down — it only costs depth.
 * On 401 we drop the credential and read the same public data anonymously.
 */
let tokenIsGood = true;

async function rest(path, token) {
  let r = await fetch(REST + path, { headers: headers(tokenIsGood ? token : '', false) });
  if (r.status === 401 && token) {
    tokenIsGood = false;
    r = await fetch(REST + path, { headers: headers('', false) });
  }
  if (!r.ok) {
    const e = new Error(`github ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

/** Daily contribution counts. GitHub caps each query at one year, so we walk year by year. */
async function contributionDays(login, fromISO, token) {
  if (!token || !tokenIsGood) return null;
  const out = [];
  let cursor = new Date(fromISO + 'T00:00:00Z');
  const now = new Date();

  while (cursor < now && out.length < 6000) {
    const end = new Date(Math.min(cursor.getTime() + 364 * DAY, now.getTime()));
    const body = {
      query: `query($login:String!,$from:DateTime!,$to:DateTime!){
        user(login:$login){ contributionsCollection(from:$from,to:$to){
          contributionCalendar{ weeks{ contributionDays{ date contributionCount } } } } } }`,
      variables: { login, from: cursor.toISOString(), to: end.toISOString() },
    };
    const r = await fetch(GQL, { method: 'POST', headers: headers(token), body: JSON.stringify(body) });
    if (r.status === 401) { tokenIsGood = false; return null; }
    if (!r.ok) break;
    const j = await r.json();
    const weeks = j?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
    if (!weeks) break;
    for (const w of weeks) for (const d of w.contributionDays) out.push(d);
    cursor = new Date(end.getTime() + DAY);
  }

  const seen = new Map();
  for (const d of out) seen.set(d.date, d.contributionCount);
  return [...seen.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, count]) => ({ date, count }));
}

/**
 * Returns after a pause.
 *
 * The signal nobody else shows. A contribution graph punishes a gap; this counts
 * the coming back — recovery after a setback, which predicts more than any
 * unbroken streak does.
 *
 * One sentence: a run of 14+ days with nothing, followed by a day with something.
 */
export function comebacks(days) {
  const active = days.filter((d) => d.count > 0);
  const out = [];
  for (let i = 1; i < active.length; i++) {
    const prev = new Date(active[i - 1].date).getTime();
    const here = new Date(active[i].date).getTime();
    const gap = Math.round((here - prev) / DAY);
    if (gap >= 14) out.push({ away_days: gap, returned_on: active[i].date });
  }
  return out;
}

/** Weeks that hold at least one active day, and the longest unbroken run of them. */
export function weekRhythm(days) {
  const weeks = new Map();
  for (const d of days) {
    const t = new Date(d.date + 'T00:00:00Z');
    const monday = new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * DAY);
    const k = iso(monday);
    weeks.set(k, (weeks.get(k) || 0) + d.count);
  }
  const keys = [...weeks.keys()].sort();
  let run = 0, longest = 0, activeWeeks = 0;
  for (const k of keys) {
    if (weeks.get(k) > 0) { activeWeeks++; run++; longest = Math.max(longest, run); }
    else run = 0;
  }
  return { active_weeks: activeWeeks, total_weeks: keys.length, longest_run_weeks: longest };
}

export function monthly(days) {
  const m = new Map();
  for (const d of days) {
    const k = d.date.slice(0, 7);
    m.set(k, (m.get(k) || 0) + d.count);
  }
  return [...m.entries()].sort().map(([month, count]) => ({ month, count }));
}

/** When each language first entered this person's work — breadth that accumulated gradually. */
export function languageTimeline(repos) {
  const m = new Map();
  for (const r of repos) {
    if (!r.language || r.fork) continue;
    const cur = m.get(r.language);
    const born = r.created_at.slice(0, 10);
    if (!cur) m.set(r.language, { name: r.language, first: born, repos: 1 });
    else { cur.repos++; if (born < cur.first) cur.first = born; }
  }
  return [...m.values()].sort((a, b) => (a.first < b.first ? -1 : 1));
}

/** Projects still being pushed to 90+ days after they were started — giving up today for tomorrow. */
export function longProjects(repos) {
  return repos
    .filter((r) => !r.fork)
    .map((r) => ({
      name: r.name,
      language: r.language,
      span_days: Math.round((new Date(r.pushed_at) - new Date(r.created_at)) / DAY),
      started: r.created_at.slice(0, 10),
      last_touch: r.pushed_at.slice(0, 10),
      stars: r.stargazers_count,
    }))
    .filter((r) => r.span_days >= 90)
    .sort((a, b) => b.span_days - a.span_days)
    .slice(0, 8);
}

export const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/** The whole record for one handle. Shared by the page and the README badge. */
export async function computeProof(handle, token) {
  const user = await rest(`/users/${handle}`, token);

  const repos = [];
  for (let page = 1; page <= 3; page++) {
    const chunk = await rest(`/users/${handle}/repos?per_page=100&sort=created&direction=asc&page=${page}`, token);
    repos.push(...chunk);
    if (chunk.length < 100) break;
  }

  const since = user.created_at.slice(0, 10);
  const days = await contributionDays(handle, since, token);

  const payload = {
    handle: user.login,
    name: user.name || user.login,
    avatar: user.avatar_url,
    bio: user.bio || null,
    since,
    days_of_record: Math.round((Date.now() - new Date(user.created_at)) / DAY),
    languages: languageTimeline(repos),
    long_projects: longProjects(repos),
    repos_built: repos.filter((r) => !r.fork).length,
    generated_at: new Date().toISOString(),
    depth: days ? 'full' : 'repos_only',
    how: {
      days_of_record: 'From the day the account opened until today.',
      comebacks: 'A stretch of 14 or more days with nothing, followed by a day with something.',
      active_weeks: 'Weeks holding at least one day of activity.',
      languages: 'The earliest repository created in each language.',
      long_projects: 'Projects still being pushed to 90 or more days after they were started.',
    },
  };

  if (days) {
    const back = comebacks(days);
    Object.assign(payload, {
      months: monthly(days),
      ...weekRhythm(days),
      comebacks: back.length,
      longest_away_days: back.reduce((a, b) => Math.max(a, b.away_days), 0),
      last_comeback: back.length ? back[back.length - 1] : null,
      active_days: days.filter((d) => d.count > 0).length,
    });
  }

  return payload;
}

export default async function handler(req, res) {
  const handle = String(req.query?.u || '').trim().replace(/^@/, '');
  if (!HANDLE_RE.test(handle)) return res.status(400).json({ error: 'bad_handle' });

  try {
    const payload = await computeProof(handle, process.env.GITHUB_TOKEN || '');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(payload);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'no_such_handle' });
    if (err.status === 403 || err.status === 429) return res.status(429).json({ error: 'rate_limited' });
    return res.status(500).json({ error: 'upstream' });
  }
}
