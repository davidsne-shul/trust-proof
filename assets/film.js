// The record, played.
//
// A separate module on purpose. What it takes is a sequence and a lens, not a
// GitHub payload — so the same engine can later play a folder, a project, or a
// year of someone's own photos, which is where this is going.
//
// Two rules it will not break:
//   · It never flatters. The quiet stretches are in the film, because a film
//     that only shows the good months is one nobody can show anyone.
//   · No model reads anything. The film is assembled from dates and counts;
//     the words in it are the person's own.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (x) => Number(x || 0).toLocaleString('en-US');
const mon = (ym) => { const t = new Date(ym + '-01T00:00:00Z'); return `${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
const day = (d) => { const t = new Date(d + 'T00:00:00Z'); return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, still() ? Math.min(ms, 900) : ms));

/** Bars for the whole record. Months with nothing keep their place as a stub. */
function barsHTML(months, upto = months.length) {
  const peak = Math.max(...months.map((m) => m.count), 1);
  return months.map((m, i) => {
    const shown = i < upto;
    const h = m.count ? Math.max(4, Math.round((m.count / peak) * 100)) : 3;
    return `<i data-m="${esc(m.month)}" class="${m.count ? '' : 'void'}"
      style="height:${shown ? h : 0}%"></i>`;
  }).join('');
}

export async function playRecord(d, opts = {}) {
  const stage = document.createElement('div');
  stage.className = 'film';
  stage.setAttribute('role', 'dialog');
  stage.setAttribute('aria-modal', 'true');
  stage.setAttribute('aria-label', `The record of ${d.name}, played`);
  stage.innerHTML = `
    <button class="film-x" type="button" aria-label="Close">Close</button>
    <div class="film-stage" id="film-stage"></div>
    <div class="film-bar"><span id="film-fill"></span></div>`;
  document.body.appendChild(stage);
  document.body.style.overflow = 'hidden';

  let stopped = false;
  const close = () => {
    if (stopped) return;
    stopped = true;
    document.body.style.overflow = '';
    stage.remove();
    document.removeEventListener('keydown', onKey);
    opts.onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  stage.querySelector('.film-x').onclick = close;

  const el = stage.querySelector('#film-stage');
  const fill = stage.querySelector('#film-fill');
  const scene = (html) => { if (!stopped) el.innerHTML = html; };

  const months = d.months || [];
  const scenes = [];
  let replay = false;

  // 1 — who, and how far back it goes
  scenes.push(async () => {
    scene(`<div class="fs">
      <p class="film-kicker">The record of</p>
      <h2 class="film-name">${esc(d.name)}</h2>
      <p class="film-sub mono">@${esc(d.handle)}</p>
    </div>`);
    await wait(2200);

    scene(`<div class="fs">
      <div class="film-big"><span id="cnt">0</span></div>
      <p class="film-sub">days of record${d.since ? ` · since ${esc(mon(d.since.slice(0, 7)))}` : ''}</p>
    </div>`);
    const target = d.days_of_record;
    const cnt = el.querySelector('#cnt');
    if (still()) { cnt.textContent = n(target); await wait(1400); }
    else {
      const t0 = performance.now(), dur = 1700;
      await new Promise((done) => {
        const tick = (t) => {
          if (stopped) return done();
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          cnt.textContent = n(Math.round(target * eased));
          p < 1 ? requestAnimationFrame(tick) : done();
        };
        requestAnimationFrame(tick);
      });
      await wait(900);
    }
  });

  // 2 — the months, built one at a time
  if (months.length > 1) scenes.push(async () => {
    scene(`<div class="fs wide">
      <p class="film-kicker">Month by month</p>
      <div class="bars film-bars" id="fb">${barsHTML(months, still() ? months.length : 0)}</div>
      <p class="film-sub" id="fnow">${esc(mon(months[0].month))}</p>
    </div>`);
    if (still()) { el.querySelector('#fnow').textContent = `${mon(months[0].month)} — ${mon(months.at(-1).month)}`; await wait(1600); return; }

    const bars = [...el.querySelectorAll('#fb i')];
    const peak = Math.max(...months.map((m) => m.count), 1);
    const step = Math.max(14, Math.round(2600 / bars.length));
    for (let i = 0; i < bars.length && !stopped; i++) {
      const m = months[i];
      bars[i].style.height = (m.count ? Math.max(4, Math.round((m.count / peak) * 100)) : 3) + '%';
      el.querySelector('#fnow').textContent = mon(m.month);
      await wait(step);
    }
    await wait(700);
  });

  // 3 — the returns. The reason this film exists.
  if (d.comeback_dates?.length) scenes.push(async () => {
    scene(`<div class="fs wide">
      <p class="film-kicker">Every stretch away ended</p>
      <div class="bars film-bars" id="fb">${barsHTML(months)}</div>
      <p class="film-sub"><span class="film-count" id="cb">0</span> <span id="cbl">comebacks</span></p>
      <p class="film-note" id="cbn">&nbsp;</p>
    </div>`);
    const list = d.comeback_dates;
    if (still()) {
      el.querySelector('#cb').textContent = n(d.comebacks);
      el.querySelector('#cbn').textContent = `longest away: ${n(d.longest_away_days)} days`;
      await wait(1800);
      return;
    }
    for (let i = 0; i < list.length && !stopped; i++) {
      const c = list[i];
      const bar = el.querySelector(`#fb i[data-m="${c.on.slice(0, 7)}"]`);
      if (bar) { bar.classList.add('hit'); }
      el.querySelector('#cb').textContent = n(i + 1);
      el.querySelector('#cbl').textContent = i === 0 ? 'comeback' : 'comebacks';
      el.querySelector('#cbn').textContent = `away ${n(c.away)} days — back on ${day(c.on)}`;
      await wait(620);
    }
    if (d.comebacks > list.length) {
      el.querySelector('#cb').textContent = n(d.comebacks);
      el.querySelector('#cbn').textContent = `and ${n(d.comebacks - list.length)} earlier`;
    }
    await wait(1100);
  });

  // 4 — breadth that arrived one at a time
  if (d.languages?.length) scenes.push(async () => {
    scene(`<div class="fs wide">
      <p class="film-kicker">One at a time</p>
      <div class="film-langs" id="fl"></div>
    </div>`);
    const box = el.querySelector('#fl');
    const list = d.languages.slice(0, 8);
    for (let i = 0; i < list.length && !stopped; i++) {
      const l = list[i];
      const row = document.createElement('div');
      row.className = 'film-lang';
      row.innerHTML = `<b>${esc(l.name)}</b><span>${esc(mon(l.first.slice(0, 7)))}</span>`;
      box.appendChild(row);
      requestAnimationFrame(() => row.classList.add('in'));
      await wait(still() ? 120 : 520);
    }
    await wait(1000);
  });

  // 5 — one line, and then it waits. A film that closes itself takes the
  //     moment away at the exact instant there is something to do with it.
  scenes.push(async () => {
    scene(`<div class="fs">
      <div class="film-close">
        <p class="film-kicker">${esc(d.name)}</p>
        <h2 class="film-last">${esc(n(d.days_of_record))} days,<br>in the order they happened.</h2>
        <div class="film-acts">
          <button class="btn" id="again" type="button">Play again</button>
          <button class="btn ghost" id="share" type="button">Copy link</button>
        </div>
      </div>
    </div>`);

    const url = `${location.origin}/@${d.handle}`;
    el.querySelector('#share').onclick = async (e) => {
      try { await navigator.clipboard.writeText(url); e.target.textContent = 'Copied'; }
      catch { e.target.textContent = url; }
    };
    // Waits here. The person decides when it is over.
    await new Promise((done) => { el.querySelector('#again').onclick = done; });
    replay = true;
  });

  replay = true;
  while (replay && !stopped) {
    replay = false;
    for (let i = 0; i < scenes.length && !stopped; i++) {
      fill.style.width = Math.round(((i + 1) / scenes.length) * 100) + '%';
      await scenes[i]();
    }
  }
  if (!stopped) close();
}
