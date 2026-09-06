// The waiting list.
//
// The browser posts here; this function writes with the service key. That key
// is server-only and never reaches the page, so the table has no public write
// path — which is why proof_signups carries no RLS policy at all.
//
// What is stored is an address and the day it arrived. No handle, no name,
// nothing tying the address to whose record was on screen.

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Supabase changed key formats. The new sb_publishable_… and sb_secret_… keys
 * go in `apikey` and are REJECTED in an Authorization Bearer header, while the
 * legacy eyJ… JWTs were conventionally sent in both. Sending both unconditionally
 * — which is what this did — works with a legacy key and fails with a new one.
 */
export const supabaseAuth = (key) => key.startsWith('eyJ')
  ? { apikey: key, Authorization: `Bearer ${key}` }
  : { apikey: key };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const url = process.env.PROOF_SUPABASE_URL;
  const key = process.env.PROOF_SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'not_open' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const source = String(body.source || '').slice(0, 40) || null;

  if (!EMAIL.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'bad_email' });
  }

  try {
    const r = await fetch(`${url}/rest/v1/proof_signups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...supabaseAuth(key),
        Prefer: 'return=minimal',   // never merge-duplicates on a plain insert
      },
      body: JSON.stringify({ email, source }),
    });

    // Asking twice is not an error to the person asking.
    if (r.ok || r.status === 409) return res.status(200).json({ ok: true });

    return res.status(502).json({ error: 'upstream' });
  } catch {
    return res.status(502).json({ error: 'upstream' });
  }
}
