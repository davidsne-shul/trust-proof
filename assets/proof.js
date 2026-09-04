// TRUST Proof — renders one person's page from the signal engine.
// Counts, never percentages. The journey draws before any number is named.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pretty = (d) => { const t = new Date(d + 'T00:00:00Z'); return `${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
// A comeback is a specific day. Rounding it to a month loses the thing that makes it real.
const prettyDay = (d) => { const t = new Date(d + 'T00:00:00Z'); return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
const n = (x) => Number(x || 0).toLocaleString('en-US');
const plural = (c, one, many) => `${n(c)} ${c === 1 ? one : many}`;

/** Counting, not tracking. Event names and coarse shape — never a handle. */
const track = (name, data) => { try { window.va?.('event', { name, ...(data ? { data } : {}) }); } catch {} };

/**
 * Coming back is the signal that there is a reason to — which is where a paid
 * tier would have to live. The handle is hashed to a short key so what sits in
 * the browser is a marker, not a name, and nothing leaves the device but the
 * bucket ("first", "same_week", "returned").
 */
function returnVisit(handle) {
  const key = 'tp:' + [...handle].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
  let seen = null;
  try { seen = localStorage.getItem(key); localStorage.setItem(key, String(Date.now())); }
  catch { return ['visit', { kind: 'unknown' }]; }   // private windows, blocked storage
  if (!seen) return ['visit', { kind: 'first' }];
  const days = (Date.now() - Number(seen)) / 86400000;
  return ['visit', { kind: days >= 7 ? 'returned' : 'same_week' }];
}

function handleFromLocation() {
  const q = new URLSearchParams(location.search).get('u');
  if (q) return q.trim().replace(/^@/, '');
  const m = location.pathname.match(/^\/@?([A-Za-z0-9-]{1,39})\/?$/);
  return m ? m[1] : '';
}

/** The hero. One bar per month across the whole record — story first, numbers after. */
function journey(months) {
  if (!months || months.length < 2) return '';
  const peak = Math.max(...months.map((m) => m.count), 1);
  const bars = months.map((m) => {
    const h = m.count ? Math.max(4, Math.round((m.count / peak) * 100)) : 3;
    const label = `${pretty(m.month + '-01')}: ${plural(m.count, 'contribution', 'contributions')}`;
    return `<i class="${m.count ? '' : 'void'}" style="height:${h}%" title="${esc(label)}"></i>`;
  }).join('');
  return `
    <div class="journey">
      <div class="eyebrow">The record, month by month</div>
      <div class="bars" role="img" aria-label="Monthly activity from ${esc(pretty(months[0].month + '-01'))} to ${esc(pretty(months.at(-1).month + '-01'))}">${bars}</div>
      <div class="axis"><span>${esc(pretty(months[0].month + '-01'))}</span><span>${esc(pretty(months.at(-1).month + '-01'))}</span></div>
    </div>`;
}

/**
 * The added layer.
 *
 * Deliberately never folded into the numbers above it. Summing "9 comebacks"
 * with "14 things you added" would turn evidence into a score and reward
 * whoever uploads most. Two layers, side by side, and the reader decides.
 *
 * We verify nothing here. The date does the work: items added the night
 * before an interview show as one day's worth, and there is no way to
 * make them look like anything else.
 */
function addedLayer(added, storageBase, who) {
  if (!added || !added.length) return '';

  const dayOf = (x) => x.added_at.slice(0, 10);
  const spread = new Set(added.map(dayOf)).size;
  const first = added.at(-1), last = added[0];

  const items = added.slice(0, 24).map((a) => {
    const img = a.image_path && storageBase
      ? `<img src="${esc(storageBase + a.image_path)}" alt="" loading="lazy">` : '';
    const note = a.link_url
      ? `<a href="${esc(a.link_url)}" rel="noopener nofollow ugc" target="_blank">${esc(a.note)}</a>`
      : esc(a.note);
    return `<figure class="ev">${img}<figcaption>${note}
      <span class="when">${esc(prettyDay(dayOf(a)))}</span></figcaption></figure>`;
  }).join('');

  return `
    <section style="border:0;padding:46px 0 0">
      <div class="eyebrow">What ${esc(who)} added</div>
      <p class="faint" style="font-size:.875rem;max-width:62ch;margin-bottom:20px">
        ${plural(added.length, 'item', 'items')} across ${plural(spread, 'day', 'days')},
        from ${esc(prettyDay(dayOf(first)))} to ${esc(prettyDay(dayOf(last)))}.
        Each one carries the day it arrived, and that date cannot be moved.</p>
      <div class="evs">${items}</div>
    </section>`;
}

function signal(num, unit, title, how) {
  return `<div class="sig">
    <div class="n"><b>${num}</b> ${esc(unit)}</div>
    <div class="t">${title}</div>
    <div class="h">${esc(how)}</div>
  </div>`;
}

function render(d) {
  const years = Math.floor(d.days_of_record / 365);
  const sigs = [];

  if (d.comebacks != null) {
    sigs.push(signal(
      n(d.comebacks), d.comebacks === 1 ? 'comeback' : 'comebacks',
      d.last_comeback
        ? `Away ${plural(d.last_comeback.away_days, 'day', 'days')} — then back on ${esc(prettyDay(d.last_comeback.returned_on))}.`
        : 'Every stretch away ended with a return.',
      d.how.comebacks));

    sigs.push(signal(
      n(d.active_weeks), d.active_weeks === 1 ? 'active week' : 'active weeks',
      `Longest unbroken run: ${plural(d.longest_run_weeks, 'week', 'weeks')}.`,
      d.how.active_weeks));
  }

  if (d.languages.length) {
    sigs.push(signal(
      n(d.languages.length), d.languages.length === 1 ? 'language' : 'languages',
      `First one in ${esc(pretty(d.languages[0].first))}, most recent in ${esc(pretty(d.languages.at(-1).first))}.`,
      d.how.languages));
  }

  if (d.long_projects.length) {
    const top = d.long_projects[0];
    sigs.push(signal(
      n(d.long_projects.length), d.long_projects.length === 1 ? 'long project' : 'long projects',
      `Longest: <span class="mono">${esc(top.name)}</span> — still going ${plural(top.span_days, 'day', 'days')} in.`,
      d.how.long_projects));
  }

  const langRows = d.languages.slice(0, 10).map((l) => `
    <div><b>${esc(l.name)}</b>
      <span class="dim">${plural(l.repos, 'project', 'projects')}</span>
      <span class="when">entered ${esc(pretty(l.first))}</span></div>`).join('');

  const projRows = d.long_projects.map((p) => `
    <div><b class="mono">${esc(p.name)}</b>
      <span class="dim">${p.language ? esc(p.language) + ' · ' : ''}started ${esc(pretty(p.started))}</span>
      <span class="when">${plural(p.span_days, 'day', 'days')}</span></div>`).join('');

  return `
  <div class="who">
    <img src="${esc(d.avatar)}" alt="" width="76" height="76" loading="lazy">
    <div>
      <h1>${esc(d.name)}</h1>
      <div class="at mono">@${esc(d.handle)}</div>
    </div>
  </div>
  ${d.bio ? `<p class="dim" style="max-width:60ch">${esc(d.bio)}</p>` : ''}

  <div class="span-line">
    <div class="big"><span>${n(d.days_of_record)}</span> days of record</div>
    <div class="faint">since ${esc(pretty(d.since))}${years >= 1 ? ` · ${plural(years, 'year', 'years')}` : ''}</div>
  </div>

  ${journey(d.months)}

  <div class="signals">${sigs.join('')}</div>

  ${d.languages.length ? `<section style="border:0;padding:44px 0 0">
    <div class="eyebrow">When each language entered the work</div>
    <div class="tl">${langRows}</div></section>` : ''}

  ${d.long_projects.length ? `<section style="border:0;padding:40px 0 0">
    <div class="eyebrow">Projects that were still being pushed to, months in</div>
    <div class="tl">${projRows}</div></section>` : ''}

  ${addedLayer(d.added, d.storage_base, d.name)}

  <div class="foot">
    <p>Built from public GitHub data on ${esc(new Date(d.generated_at).toISOString().slice(0, 10))}.
    Nothing private was read. No code, no commit messages, no AI — dates, counts and names only.</p>
    ${d.depth === 'repos_only' ? '<p style="margin-top:10px">Day-level history opens up once the server key is set.</p>' : ''}
    <div class="cta">
      <a class="btn" href="/">Build your own page</a>
      <button class="btn ghost" id="copy" type="button">Copy link</button>
      <button class="btn ghost" id="badge" type="button">Copy README badge</button>
    </div>
    <pre class="snippet" id="snip" hidden></pre>
  </div>`;
}

/** Config lives on the server so no key is written into this repository. */
async function config() {
  try { return await (await fetch('/api/config')).json(); }
  catch { return { supabaseUrl: '', supabaseAnonKey: '' }; }
}

/** The added layer, if this handle belongs to someone with an account. */
async function addedFor(handle, cfg) {
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  try {
    const r = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/proof_page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseAnonKey,
                 Authorization: `Bearer ${cfg.supabaseAnonKey}` },
      body: JSON.stringify({ p_handle: handle }),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/** A page with additions but no automatic record is still a page. */
function addedOnly(profile, handle) {
  return {
    handle, name: profile.display_name || handle,
    avatar: 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="76" height="76"><rect width="76" height="76" fill="#1a1a1a"/></svg>`),
    bio: null, since: profile.since.slice(0, 10),
    days_of_record: Math.round((Date.now() - new Date(profile.since)) / 86400000),
    languages: [], long_projects: [], repos_built: 0,
    generated_at: new Date().toISOString(), depth: 'added_only',
    how: { days_of_record: 'From the day this page was opened until today.' },
  };
}

async function main() {
  const root = document.getElementById('root');
  const handle = handleFromLocation();
  if (!handle) { location.replace('/'); return; }

  document.title = `${handle} — TRUST Proof`;
  root.innerHTML = `<div class="state"><div class="skl"></div><p style="margin-top:20px">Reading the record…</p></div>`;

  const cfg = await config();
  const profile = await addedFor(handle, cfg);
  const gh = profile?.github_handle || handle;

  let data = null, failure = null;
  try {
    const res = await fetch(`/api/proof?u=${encodeURIComponent(gh)}`);
    if (res.ok) data = await res.json();
    else failure = (await res.json().catch(() => ({}))).error || 'upstream';
  } catch { failure = 'offline'; }

  // Someone with an account but no public code still has a page worth showing.
  if (!data && profile) data = addedOnly(profile, handle);

  if (!data) {
    const why = {
      no_such_handle: `No public GitHub account is open under <span class="mono">@${esc(handle)}</span>.`,
      rate_limited: 'GitHub is holding requests for a minute. Try again shortly.',
      bad_handle: 'That handle has characters GitHub does not use.',
      offline: 'The connection dropped. Try again in a moment.',
    };
    root.innerHTML = `<div class="state"><p>${why[failure] || 'Something upstream is quiet right now.'}</p>
      <a class="btn ghost" href="/" style="margin-top:20px">Try another handle</a></div>`;
    return;
  }

  if (profile) {
    data.added = profile.added;
    data.storage_base = `${cfg.supabaseUrl}/storage/v1/object/public/proof-evidence/`;
    if (profile.display_name) data.name = profile.display_name;
  }

  root.innerHTML = render(data);
  // Pages built, links copied, and whether someone came back. Event names
  // only — no handle, no identity, nothing about who the person is.
  track('page_built', { depth: data.depth, added: data.added?.length ? 'yes' : 'no' });
  track(...returnVisit(data.handle));

  const url = `${location.origin}/@${data.handle}`;
  history.replaceState(null, '', `/@${data.handle}`);
  document.getElementById('copy')?.addEventListener('click', async (e) => {
    track('link_copied');
    try { await navigator.clipboard.writeText(url); e.target.textContent = 'Copied'; }
    catch { e.target.textContent = url; }
  });

  // The badge is the loop that lives inside GitHub: it sits in a profile README,
  // in front of the audience this is for, put there by the person it belongs to.
  const snippet = `[![TRUST Proof](${location.origin}/badge/${data.handle})](${url})`;
  document.getElementById('badge')?.addEventListener('click', async (e) => {
    track('badge_copied');
    const pre = document.getElementById('snip');
    pre.textContent = snippet;
    pre.hidden = false;
    try { await navigator.clipboard.writeText(snippet); e.target.textContent = 'Copied'; }
    catch { e.target.textContent = 'Copy it below'; }
  });
}

main();
