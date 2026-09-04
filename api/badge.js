// The README badge.
//
// This is the distribution loop native to GitHub: someone puts the badge in
// their profile README, and it sits in front of exactly the audience the
// product is for, advertised by the person it belongs to.
//
// It obeys the same rules as the page — counts, no score, nothing ranked, and
// nothing compared to anyone else. A badge that graded people would be the one
// thing this product must never ship.

import { computeProof, HANDLE_RE } from './proof.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Rubik is not on a GitHub reader's machine, and camo serves this as a flat
// image with no webfont, so the stack has to be fonts that are actually there.
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

// Rough text metrics, because the card has to fit content it cannot measure.
// Uppercase runs wider than mixed case, and the labels carry letter-spacing —
// leaving both out is what clipped "ACTIVE WEEKS" off the right edge.
const width = (s, size) => s.length * size * 0.58;
const labelWidth = (s) => s.length * (10.5 * 0.66 + 0.7);

function card(cells, note) {
  const PAD = 16, GAP = 26, H = 72;
  let x = PAD;
  const parts = cells.map((c) => {
    const w = Math.max(width(c.n, 19), labelWidth(c.label));
    const el = `
    <text x="${Math.round(x)}" y="29" font-size="19" font-weight="600" fill="#7DD8A8">${esc(c.n)}</text>
    <text x="${Math.round(x)}" y="46" font-size="10.5" letter-spacing="0.7" fill="#8B93A0">${esc(c.label.toUpperCase())}</text>`;
    x += w + GAP;
    return el;
  }).join('');

  const w = Math.max(x - GAP + PAD, width(note, 10) + 2 * PAD);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${H}"
  viewBox="0 0 ${Math.round(w)} ${H}" role="img" aria-label="${esc(note)}">
  <title>${esc(note)}</title>
  <rect width="100%" height="100%" rx="10" fill="#0A0A0A" stroke="#232323"/>
  <g font-family="${FONT}">${parts}
    <text x="${PAD}" y="62" font-size="10" fill="#5E646C">${esc(note)}</text>
  </g>
</svg>`;
}

function plain(text) {
  const w = Math.round(width(text, 12) + 32);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="34" viewBox="0 0 ${w} 34" role="img" aria-label="${esc(text)}">
  <rect width="100%" height="100%" rx="8" fill="#0A0A0A" stroke="#232323"/>
  <text x="16" y="22" font-family="${FONT}" font-size="12" fill="#8B93A0">${esc(text)}</text>
</svg>`;
}

function send(res, svg, seconds) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  // GitHub proxies this through camo, which caches on its own terms. A short
  // max-age keeps a stale card from outliving the day it describes.
  res.setHeader('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}`);
  res.status(200).send(svg);
}

export default async function handler(req, res) {
  const handle = String(req.query?.u || '').trim().replace(/^@/, '').replace(/\.svg$/, '');
  if (!HANDLE_RE.test(handle)) return send(res, plain('TRUST Proof'), 3600);

  try {
    const d = await computeProof(handle, process.env.GITHUB_TOKEN || '');
    const n = (x) => Number(x).toLocaleString('en-US');
    const one = (c, s, p) => `${c} ${c === 1 ? s : p}`;

    const cells = [{ n: n(d.days_of_record), label: 'days of record' }];
    if (d.comebacks != null) {
      cells.push({ n: n(d.comebacks), label: d.comebacks === 1 ? 'comeback' : 'comebacks' });
      cells.push({ n: n(d.active_weeks), label: 'active weeks' });
    } else if (d.languages.length) {
      cells.push({ n: n(d.languages.length), label: 'languages' });
    }

    const note = d.comebacks != null
      ? `${one(d.comebacks, 'return', 'returns')} after 14+ days away · trust-proof`
      : 'the record, counted over time · trust-proof';

    // An hour is long enough to stay cheap, short enough that a page stays true.
    send(res, card(cells, note), 3600);
  } catch (err) {
    // A badge must never render as a broken image in someone's profile.
    send(res, plain(err.status === 404 ? 'TRUST Proof' : 'TRUST Proof · back shortly'), 300);
  }
}
