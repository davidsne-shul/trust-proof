// TRUST Proof — renders one person's page from the signal engine.
// Counts, never percentages. The journey draws before any number is named.

import { T, MONTHS, setFormatter } from './strings.js';
import { playRecord } from './film.js';
import { openingLine } from './story.js';

// Replaced at publish time. See scripts/export-proof-public.sh
const BUILD = '260906.2101';
/** Unreplaced token means this file was never run through the publish script. */
const buildLabel = () => (BUILD.startsWith('__') ? 'dev' : 'v' + BUILD);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (x) => Number(x || 0).toLocaleString('en-US');
setFormatter(n);
const pretty = (d) => { const t = new Date(d + 'T00:00:00Z'); return `${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
// A comeback is a specific day. Rounding it to a month loses the thing that makes it real.
const prettyDay = (d) => { const t = new Date(d + 'T00:00:00Z'); return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };

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
function journey(months, comebacks = []) {
  if (!months || months.length < 2) return '';
  const landed = new Set(comebacks.map((c) => c.on.slice(0, 7)));
  // Heights are relative to the fullest month, but a floor stops a thin record
  // from drawing itself as a full one: with a peak of a single contribution,
  // that month used to reach 100% and read like a career high.
  const peak = Math.max(...months.map((m) => m.count), 8);
  const first = pretty(months[0].month + '-01');
  const last = pretty(months.at(-1).month + '-01');
  const bars = months.map((m) => {
    const h = m.count ? Math.max(4, Math.round((m.count / peak) * 100)) : 3;
    const hit = landed.has(m.month) ? ' hit' : '';
    return `<i class="${m.count ? '' : 'void'}${hit}" style="height:${h}%" title="${esc(T.contributions(pretty(m.month + '-01'), m.count))}"></i>`;
  }).join('');
  return `
    <div class="journey">
      <div class="eyebrow">${esc(T.journey)}</div>
      <div class="bars" role="img" aria-label="${esc(T.range(first, last))}">${bars}</div>
      <div class="axis"><span>${esc(first)}</span><span>${esc(last)}</span></div>
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
function addedLayer(added, storageBase) {
  if (!added || !added.length) return '';

  const dayOf = (x) => x.added_at.slice(0, 10);
  const spread = new Set(added.map(dayOf)).size;

  const items = added.slice(0, 24).map((a) => {
    const img = a.image_path && storageBase
      ? `<img src="${esc(storageBase + a.image_path)}" alt="" loading="lazy">` : '';
    const note = a.link_url
      ? `<a href="${esc(a.link_url)}" rel="noopener nofollow ugc" target="_blank">${esc(a.note)}</a>`
      : esc(a.note);
    // dir="auto" belongs on the note alone. On the caption it let a Hebrew note
    // flip the date beside it, so "6 Sep 2026" rendered as "Sep 2026 6".
    return `<figure class="ev">${img}<figcaption><span dir="auto">${note}</span>
      <span class="when">${esc(prettyDay(dayOf(a)))}</span></figcaption></figure>`;
  }).join('');

  return `
    <section style="border:0;padding:46px 0 0">
      <div class="eyebrow">${esc(T.addedTitle)}</div>
      <p class="faint" style="font-size:.875rem;max-width:62ch;margin-bottom:20px">
        ${esc(T.addedBody(added.length, spread, prettyDay(dayOf(added.at(-1))), prettyDay(dayOf(added[0]))))}</p>
      <div class="evs">${items}</div>
    </section>`;
}

/**
 * The counts, in one line.
 *
 * They were four bordered boxes in a 2x2 grid — the most generic pattern on the
 * web, and one that gave a person's returns the same weight as their language
 * list. The numbers still matter; competing for attention is what did not.
 */
function counts(d) {
  const parts = [];
  if (d.active_weeks) parts.push(T.activeWeeks2(d.active_weeks, d.longest_run_weeks));
  if (d.comebacks) parts.push(T.returns(d.comebacks));
  if (d.languages?.length) parts.push(T.langs(d.languages.length));
  if (d.long_projects?.length) parts.push(T.projs(d.long_projects.length));
  if (!parts.length) return '';
  return `<p class="counts">${parts.map(esc).join(' · ')}</p>
    ${d.comebacks ? `<p class="counts-how">${esc(T.howComebacks)}</p>` : ''}`;
}

/**
 * The number in the largest type has to be the one that cannot be had by
 * waiting. Account age was the old headline: open an account, do nothing for
 * three years, and the page announced "1,095 days of record" — the exact claim
 * this product exists to make unfakeable. Days that carried work rise only when
 * someone came back. The span drops to the line beneath, as context.
 *
 * Without a token there is no day-by-day record, so the span leads instead and
 * the reader is told the reading is shallower.
 */
function headline(d) {
  if (typeof d.active_days !== 'number') {
    return `<div class="big"><span>${esc(n(d.days_of_record))}</span> ${esc(T.daysOfRecord)}</div>
      <div class="faint">${esc(T.since(pretty(d.since)))}</div>`;
  }
  return `<div class="big"><span>${esc(n(d.active_days))}</span> ${esc(T.daysCarried(d.active_days))}</div>
    <div class="faint">${esc(T.spread(d.days_of_record, pretty(d.worked_from), pretty(d.worked_to)))}</div>`;
}

function render(d) {

  const langRows = d.languages.slice(0, 10).map((l) => `
    <div><b>${esc(l.name)}</b>
      <span class="dim">${esc(T.projects(l.repos))}</span>
      <span class="when">${esc(T.entered(pretty(l.first)))}</span></div>`).join('');

  const projRows = d.long_projects.map((p) => `
    <div><b class="mono">${esc(p.name)}</b>
      <span class="dim">${p.language ? esc(p.language) + ' · ' : ''}${esc(T.started(pretty(p.started)))}</span>
      <span class="when">${esc(T.days(p.span_days))}</span></div>`).join('');

  return `
  <div class="who">
    <img src="${esc(d.avatar)}" alt="" width="76" height="76" loading="lazy">
    <div>
      <h1 dir="auto">${esc(d.name)}</h1>
      <div class="at mono">@${esc(d.handle)}</div>
    </div>
  </div>
  ${d.bio ? `<p class="dim" dir="auto" style="max-width:60ch">${esc(d.bio)}</p>` : ''}

  <div class="span-line">
    ${headline(d)}
    ${d.months?.length > 1 ? `<button class="btn ghost play" id="play" type="button">▶ ${esc(T.play)}</button>` : ''}
  </div>

  ${(() => { const line = openingLine(d); return line ? `<p class="opening">${esc(line)}</p>` : ''; })()}

  ${journey(d.months, d.comeback_dates)}

  ${counts(d)}

  ${addedLayer(d.added, d.storage_base)}

  ${d.languages.length ? `<section style="border:0;padding:44px 0 0">
    <div class="eyebrow">${esc(T.langTimeline)}</div>
    <div class="tl">${langRows}</div></section>` : ''}

  ${d.long_projects.length ? `<section style="border:0;padding:40px 0 0">
    <div class="eyebrow">${esc(T.projectTimeline)}</div>
    <div class="tl">${projRows}</div></section>` : ''}


  <div class="foot">
    <p>${esc(T.footerShort(new Date(d.generated_at).toISOString().slice(0, 10)))}</p>
    ${d.depth === 'repos_only' ? `<p style="margin-top:8px">${esc(T.deeper)}</p>` : ''}

    <div class="cta">
      <a class="btn" href="/">${esc(T.buildOwn)}</a>
    </div>

    <p class="quiet-acts">
      <button class="lnk" id="copy" type="button">${esc(T.copyLink)}</button>
      <button class="lnk" id="badge" type="button">${esc(T.copyBadge)}</button>
      ${d.claimed ? `<a class="lnk" href="/add">${esc(T.addToRecord)}</a>` : ''}
    </p>
    <pre class="snippet" id="snip" hidden></pre>
    <p class="build">${buildLabel()}</p>
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
      // A new-format key (sb_publishable_…) is rejected in an Authorization
      // Bearer header; a legacy eyJ… JWT expects it. Send what each accepts.
      headers: { 'Content-Type': 'application/json',
                 apikey: cfg.supabaseAnonKey,
                 ...(cfg.supabaseAnonKey.startsWith('eyJ')
                     ? { Authorization: `Bearer ${cfg.supabaseAnonKey}` } : {}) },
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
  };
}

async function main() {
  const root = document.getElementById('root');
  const handle = handleFromLocation();
  if (!handle) { location.replace('/'); return; }

  document.title = `${handle} — TRUST Proof`;
  root.innerHTML = `<div class="state"><div class="skl"></div><p style="margin-top:20px">${esc(T.loading)}</p></div>`;

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
      no_such_handle: T.errNoHandle(esc(handle)),
      rate_limited: esc(T.errRate),
      bad_handle: esc(T.errBad),
      offline: esc(T.errOffline),
    };
    root.innerHTML = `<div class="state"><p>${why[failure] || esc(T.errOther)}</p>
      <a class="btn ghost" href="/" style="margin-top:20px">${esc(T.tryAnother)}</a></div>`;
    return;
  }

  if (profile) {
    data.claimed = true;
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
    try { await navigator.clipboard.writeText(url); e.target.textContent = T.copied; }
    catch { e.target.textContent = url; }
  });

  // The badge is the loop that lives inside GitHub: it sits in a profile README,
  // in front of the audience this is for, put there by the person it belongs to.
  // Loaded only when someone actually presses play — the page stays light for
  // everyone who just reads it.
  document.getElementById('play')?.addEventListener('click', async (e) => {
    track('film_played');
    e.target.disabled = true;
    try { await playRecord(data); }
    catch { e.target.textContent = T.playFailed; }   // never fail silently
    finally { e.target.disabled = false; }
  });

  const snippet = `[![TRUST Proof](${location.origin}/badge/${data.handle})](${url})`;
  document.getElementById('badge')?.addEventListener('click', async (e) => {
    track('badge_copied');
    const pre = document.getElementById('snip');
    pre.textContent = snippet;
    pre.hidden = false;
    try { await navigator.clipboard.writeText(snippet); e.target.textContent = T.copied; }
    catch { e.target.textContent = T.copyBelow; }
  });
}

main();
