// Relais audio (Cloudflare Worker), pour deux cas qu'une page web en https ne peut pas faire seule :
// - enregistrer un fichier pour l'écoute hors ligne quand la source n'a pas d'en-tête CORS (Audiomack) ;
// - lire un lien en http (Kuwo, QQ, Waptrick), que le navigateur bloque sur une page en https.
//
// Il ne relaie que les liens signés par notre API (/api/resolve) : u (lien source), e (expiration,
// secondes Unix), s = HMAC-SHA256(RELAY_SECRET, u + "\n" + e) en hexadécimal. Sinon ce serait un proxy ouvert.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type, Content-Range',
};

function fail(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function signature(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Comparaison en temps constant, pour ne rien laisser deviner de la signature attendue.
function same(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Headers': 'Range', 'Access-Control-Max-Age': '86400' } });
    }
    if (request.method !== 'GET') return fail(405, 'méthode GET attendue');
    const params = new URL(request.url).searchParams;
    const u = params.get('u') || '';
    const e = Number(params.get('e'));
    const s = params.get('s') || '';
    if (!/^https?:\/\//.test(u) || !Number.isFinite(e)) return fail(400, 'lien incomplet');
    if (e * 1000 < Date.now()) return fail(403, 'lien expiré');
    if (!env.RELAY_SECRET || !same(s, await signature(env.RELAY_SECRET, `${u}\n${e}`))) return fail(403, 'signature invalide');

    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' };
    const range = request.headers.get('Range');
    if (range) headers.Range = range;
    let upstream;
    try {
      upstream = await fetch(u, { headers, redirect: 'follow' });
    } catch (err) {
      return fail(502, `source injoignable : ${err}`);
    }
    if (!upstream.ok) return fail(502, `source : HTTP ${upstream.status}`);

    const out = new Headers(cors);
    for (const h of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    // QQ annonce ses .m4a en « application/x-www-form-urlencoded », que certains navigateurs refusent de lire.
    if (!(out.get('Content-Type') || '').startsWith('audio/')) {
      const ext = new URL(u).pathname.split('.').pop().toLowerCase();
      const type = { m4a: 'audio/mp4', mp3: 'audio/mpeg', ogg: 'audio/ogg', flac: 'audio/flac' }[ext];
      if (type) out.set('Content-Type', type);
    }
    out.set('Cache-Control', 'private, no-store');
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
