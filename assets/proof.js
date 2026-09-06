// TRUST Proof — renders one person's page from the signal engine.
// Counts, never percentages. The journey draws before any number is named.

import { T, MONTHS, setFormatter } from './strings.js';
import { playRecord } from './film.js';

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
function journey(months) {
  if (!months || months.length < 2) return '';
  const peak = Math.max(...months.map((m) => m.count), 1);
  const first = pretty(months[0].month + '-01');
  const last = pretty(months.at(-1).month + '-01');
  const bars = months.map((m) => {
    const h = m.count ? Math.max(4, Math.round((m.count / peak) * 100)) : 3;
    return `<i class="${m.count ? '' : 'void'}" style="height:${h}%" title="${esc(T.contributions(pretty(m.month + '-01'), m.count))}"></i>`;
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
    return `<figure class="ev">${img}<figcaption dir="auto">${note}
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

function signal(num, unit, title, how) {
  return `<div class="sig">
    <div class="n"><b>${esc(num)}</b> ${esc(unit)}</div>
    <div class="t">${title}</div>
    <div class="h">${esc(how)}</div>
  </div>`;
}

function render(d) {
  const years = Math.floor(d.days_of_record / 365);
  const sigs = [];

  if (d.comebacks != null) {
    sigs.push(signal(n(d.comebacks), T.comebacks(d.comebacks),
      d.last_comeback
        ? esc(T.comebackLast(d.last_comeback.away_days, prettyDay(d.last_comeback.returned_on)))
        : esc(T.comebackNone),
      T.howComebacks));

    sigs.push(signal(n(d.active_weeks), T.activeWeeks(d.active_weeks),
      esc(T.longestRun(d.longest_run_weeks)), T.howWeeks));
  }

  if (d.languages.length) {
    sigs.push(signal(n(d.languages.length), T.languages(d.languages.length),
      esc(T.languageSpan(pretty(d.languages[0].first), pretty(d.languages.at(-1).first))),
      T.howLanguages));
  }

  if (d.long_projects.length) {
    const top = d.long_projects[0];
    sigs.push(signal(n(d.long_projects.length), T.longProjects(d.long_projects.length),
      T.longest(esc(top.name), top.span_days), T.howProjects));
  }

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
    <div class="big"><span>${esc(n(d.days_of_record))}</span> ${esc(T.daysOfRecord)}</div>
    <div class="faint">${esc(T.since(pretty(d.since)))}${years >= 1 ? ` · ${esc(T.years(years))}` : ''}</div>
    ${d.months?.length > 1 ? `<button class="btn ghost play" id="play" type="button">▶ ${esc(T.play)}</button>` : ''}
  </div>

  ${journey(d.months)}

  <div class="signals">${sigs.join('')}</div>

  ${d.languages.length ? `<section style="border:0;padding:44px 0 0">
    <div class="eyebrow">${esc(T.langTimeline)}</div>
    <div class="tl">${langRows}</div></section>` : ''}

  ${d.long_projects.length ? `<section style="border:0;padding:40px 0 0">
    <div class="eyebrow">${esc(T.projectTimeline)}</div>
    <div class="tl">${projRows}</div></section>` : ''}

  ${addedLayer(d.added, d.storage_base)}

  <div class="foot">
    <p>${esc(T.footer(new Date(d.generated_at).toISOString().slice(0, 10)))}</p>
    ${d.depth === 'repos_only' ? `<p style="margin-top:10px">${esc(T.deeper)}</p>` : ''}
    <div class="cta">
      ${d.claimed ? `<a class="btn" href="/add">${esc(T.addToRecord)}</a>` : ''}
      <a class="btn ghost" href="/">${esc(T.buildOwn)}</a>
      <button class="btn ghost" id="copy" type="button">${esc(T.copyLink)}</button>
      <button class="btn ghost" id="badge" type="button">${esc(T.copyBadge)}</button>
    </div>
    <pre class="snippet" id="snip" hidden></pre>

    <form class="signup" id="signup" novalidate hidden>
      <p class="signup-lead">${esc(T.signupLead)}</p>
      <div class="field" style="margin:0">
        <label for="em">Email</label>
        <div class="wrap"><input id="em" type="email" inputmode="email"
          autocomplete="email" placeholder="${esc(T.signupPlace)}"></div>
        <button class="btn" type="submit">${esc(T.signupGo)}</button>
      </div>
      <p class="note" id="emsg"></p>
    </form>
  </div>`;
}

/**
 * The waiting list, shown only where it can actually keep what it is given.
 * It sits at the end, after someone has seen their own record — asking before
 * that is asking for a favour before anything has been offered.
 */
function wireSignup(cfg) {
  const form = document.getElementById('signup');
  if (!form || !cfg.signupOpen) return;
  form.hidden = false;

  const msg = document.getElementById('emsg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('em');
    const email = input.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = T.signupBad; return; }

    const btn = form.querySelector('button');
    btn.disabled = true;
    msg.textContent = '…';
    try {
      const r = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'proof-page' }),
      });
      if (!r.ok) throw new Error();
      track('email_left');
      form.innerHTML = `<p class="signup-lead">${esc(T.signupDone)}</p>`;
    } catch {
      msg.textContent = T.signupFail;
      btn.disabled = false;
    }
  });
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

  wireSignup(cfg);

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
