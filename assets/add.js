// The add page. Reached on purpose — never pushed at anyone.
//
// Sharing is a by-product of work, not a chore the product asks for. So there
// is no empty state that nags, no counter urging more, and a page with nothing
// added is a finished page.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const prettyDay = (d) => { const t = new Date(d); return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };

const root = document.getElementById('root');
const show = (html) => { root.innerHTML = html; };
const state = { sb: null, user: null, profile: null, items: [] };

async function boot() {
  const cfg = await (await fetch('/api/config')).json();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    return show(`<div class="state"><p>This part of the site is not switched on yet.</p>
      <a class="btn ghost" href="/" style="margin-top:20px">Back</a></div>`);
  }
  // The SDK comes from a CDN, and a CDN can be blocked, down, or stripped by an
  // extension. Without this guard that is a blank screen and a console error.
  if (!window.supabase?.createClient) {
    return show(`<div class="state"><p>The sign-in library did not load — an extension
      or the network may be blocking it.</p><p class="faint" style="margin-top:10px">
      Reloading usually sorts it.</p>
      <button class="btn ghost" style="margin-top:20px" onclick="location.reload()">Reload</button></div>`);
  }
  state.sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  state.storageBase = `${cfg.supabaseUrl}/storage/v1/object/public/proof-evidence/`;

  const { data } = await state.sb.auth.getSession();
  state.user = data.session?.user || null;
  state.user ? afterSignIn() : signIn();
}

/**
 * A link in the mail, not an OAuth provider.
 *
 * Google sign-in would mean a Google Cloud project, a consent screen and a
 * pair of secrets pasted into Supabase before anyone can sign in at all —
 * forty minutes of setup and a well-known place to get stuck. Email is on by
 * default, needs nothing configured, and for a product whose whole subject is
 * evidence tied to a person, an address is the right identity anyway.
 */
function signIn() {
  show(`
    <div class="hero" style="padding-top:60px">
      <h1 style="font-size:clamp(1.9rem,4.6vw,3rem)">Your page.</h1>
      <p class="lede">Everything you add carries the day it arrived — and that
        date never moves. Put in an email and a link comes back that opens it.</p>
      <form class="field" id="f" novalidate style="margin-top:30px">
        <label for="em">Email</label>
        <div class="wrap"><input id="em" type="email" inputmode="email"
          autocomplete="email" placeholder="you@example.com"></div>
        <button class="btn" type="submit">Send me a link</button>
      </form>
      <p class="note" id="msg"></p>
    </div>`);

  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg');
    const email = document.getElementById('em').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.textContent = 'That address does not look complete.'; return;
    }
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    msg.textContent = 'Sending…';

    const { error } = await state.sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + '/add' },
    });

    if (error) {
      // Supabase rate-limits its own sender, and that is the likely reason.
      msg.textContent = 'That did not send. Try again in a few minutes.';
      btn.disabled = false;
      return;
    }
    show(`
      <div class="hero" style="padding-top:60px">
        <h1 style="font-size:clamp(1.6rem,4vw,2.4rem)">Check your email.</h1>
        <p class="lede">A link is on its way to <span class="mono">${esc(email)}</span>.
          Opening it brings you back here, signed in.</p>
        <p class="note">Nothing arrived after a few minutes? Look in spam, then try again.</p>
      </div>`);
  };
}

async function afterSignIn() {
  const { data } = await state.sb.from('proof_profiles').select('*').eq('user_id', state.user.id).maybeSingle();
  state.profile = data;
  state.profile ? dashboard() : claimHandle();
}

function claimHandle() {
  show(`
    <div class="hero" style="padding-top:56px">
      <h1 style="font-size:clamp(1.7rem,4.2vw,2.6rem)">Pick your handle.</h1>
      <p class="lede">It becomes the address of your page. Lowercase letters, numbers and dashes.</p>
      <form class="field" id="f">
        <label for="h">Handle</label>
        <div class="wrap"><span class="at">@</span><input id="h" required
          autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="your-handle"></div>
        <button class="btn" type="submit">Claim it</button>
      </form>
      <div class="field" style="margin-top:18px">
        <div class="wrap" style="flex:1 1 100%"><input id="gh" placeholder="GitHub handle (optional)"
          autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      </div>
      <p class="note" id="msg">A GitHub handle adds the automatic record. Without one, the page shows what you add.</p>
    </div>`);

  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const msg = document.getElementById('msg');
    const handle = document.getElementById('h').value.trim().toLowerCase();
    const gh = document.getElementById('gh').value.trim().replace(/^@/, '') || null;
    if (!/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}$/.test(handle)) {
      msg.textContent = 'Lowercase letters, numbers and single dashes, 2–39 characters.'; return;
    }
    msg.textContent = 'Claiming…';
    const { error } = await state.sb.from('proof_profiles').insert({
      user_id: state.user.id, handle, github_handle: gh,
      display_name: state.user.user_metadata?.full_name || null,
    });
    if (error) {
      msg.textContent = error.code === '23505' ? 'That handle is taken. Try another.' : 'That did not go through. Try again.';
      return;
    }
    // Straight to the page. Seeing what you already have comes before being
    // asked to add to it — the other order asks for a favour first.
    location.href = `/@${handle}`;
  };
}

async function dashboard() {
  const { data } = await state.sb.from('proof_evidence')
    .select('*').eq('user_id', state.user.id).order('added_at', { ascending: false });
  state.items = data || [];

  const url = `${location.origin}/@${state.profile.handle}`;
  document.getElementById('mypage').textContent = 'View my page';
  document.getElementById('mypage').href = `/@${state.profile.handle}`;

  const rows = state.items.map((it) => `
    <div><b>${esc(it.note)}</b>
      <span class="when">${esc(prettyDay(it.added_at))}</span>
      <button class="lnk" data-del="${esc(it.id)}" type="button">remove</button></div>`).join('');

  show(`
    <div style="padding:34px 0 6px">
      <h1 style="font-size:clamp(1.6rem,4vw,2.2rem)">@${esc(state.profile.handle)}</h1>
      <p class="faint mono" style="margin-top:8px">${esc(url)}</p>
      <a class="btn" href="/@${esc(state.profile.handle)}" style="margin-top:18px">See my page</a>
    </div>

    <section style="border-top:1px solid var(--line);padding:32px 0">
      <div class="eyebrow">Add something</div>
      <form id="add">
        <div class="field" style="margin-top:4px">
          <div class="wrap" style="flex:1 1 100%"><input id="note" maxlength="240" required
            placeholder="One line — what it was"></div>
        </div>
        <div class="field" style="margin-top:10px">
          <div class="wrap" style="flex:1 1 260px"><input id="link" type="url" placeholder="https://… (optional)"></div>
          <label class="btn ghost" for="img" style="cursor:pointer">Add a photo
            <input id="img" type="file" accept="image/*" hidden></label>
          <button class="btn" type="submit">Add it</button>
        </div>
        <p class="note" id="msg">It lands on today's date. That is the whole point — it cannot be placed in the past.</p>
      </form>
    </section>

    ${state.items.length ? `<section style="border-top:1px solid var(--line);padding:30px 0">
      <div class="eyebrow">${state.items.length} on your page</div>
      <div class="tl">${rows}</div></section>` : ''}

    <div class="foot">
      <button class="lnk danger" id="wipe" type="button">Remove everything and close my page</button>
    </div>`);

  document.getElementById('add').onsubmit = addItem;
  root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => removeItem(b.dataset.del); });
  document.getElementById('wipe').onclick = wipe;
}

async function addItem(e) {
  e.preventDefault();
  const msg = document.getElementById('msg');
  const note = document.getElementById('note').value.trim();
  const link = document.getElementById('link').value.trim() || null;
  const file = document.getElementById('img').files[0];
  if (!note) return;

  msg.textContent = 'Adding…';
  let image_path = null;

  if (file) {
    if (file.size > 8 * 1024 * 1024) { msg.textContent = 'That image is over 8MB. A smaller one will do.'; return; }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${state.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await state.sb.storage.from('proof-evidence').upload(path, file, { contentType: file.type });
    // An image that would not upload must not cost the note that came with it.
    if (!error) image_path = path;
  }

  const { error } = await state.sb.from('proof_evidence').insert({ user_id: state.user.id, note, link_url: link, image_path });
  if (error) { msg.textContent = 'That did not go through. Try again.'; return; }
  await dashboard();
  // Something happened, and it happened somewhere. Say where.
  const m = document.getElementById('msg');
  if (m) m.innerHTML = `Added, dated today. <a href="/@${esc(state.profile.handle)}">See it on your page</a>.`;
}

async function removeItem(id) {
  await state.sb.from('proof_evidence').delete().eq('id', id);
  dashboard();
}

async function wipe() {
  if (!confirm('This removes your page and everything on it. It cannot be undone.')) return;

  // Storage first — the rows carry the only pointers to these files, so once
  // the rows are gone the images would have nothing naming them. Iron rule #4:
  // this path touches proof_evidence · proof_profiles · the proof-evidence bucket.
  const paths = state.items.map((i) => i.image_path).filter(Boolean);
  if (paths.length) await state.sb.storage.from('proof-evidence').remove(paths);

  const { error } = await state.sb.rpc('proof_delete_everything');
  if (error) { alert('That did not go through. Nothing was removed.'); return; }
  await state.sb.auth.signOut();
  location.href = '/';
}

boot().catch(() => show(`<div class="state"><p>This page did not come up.</p>
  <button class="btn ghost" style="margin-top:20px" onclick="location.reload()">Reload</button></div>`));
