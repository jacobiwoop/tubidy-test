// Appels à l'API du même site (/api/…). Les réponses de catalogue sont gardées en mémoire quelques minutes.
const memo = new Map();
const TTL = 5 * 60 * 1000;

export async function api(route, params = {}, { signal, fresh = false } = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const url = `/api/${route}${qs.toString() ? `?${qs}` : ''}`;
  const hit = memo.get(url);
  if (!fresh && hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await fetch(url, { signal });
  let data = null;
  try { data = await res.json(); } catch { /* corps vide ou non JSON */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Erreur ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (route !== 'resolve') memo.set(url, { at: Date.now(), data });
  return data;
}

// Lien de lecture d'un titre : direct par identifiant Audiomack quand on l'a, sinon course sur « artistes titre » + durée.
export function resolveTrack(track, signal) {
  return api('resolve', {
    q: `${track.artist} ${track.title}`.trim(),
    duration: track.duration || undefined,
    artist: track.artist || undefined, // les invités départagent deux versions de même durée
    am: track.amId && !track.blocked ? track.amId : undefined,
    loose: track.id?.startsWith('yt:') ? 1 : undefined, // durée de la vidéo, pas du morceau
  }, { signal, fresh: true });
}

// Paroles en flux (/api/lyrics?stream=1) : le serveur envoie une version JSON par ligne, chacune meilleure
// que la précédente ; onResult est appelé pour chacune. Rejette si rien n'est trouvé.
export async function streamLyrics(params, onResult, signal) {
  const qs = new URLSearchParams(Object.entries({ ...params, stream: 1 }).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const res = await fetch(`/api/lyrics?${qs}`, { signal });
  if (!res.ok || !res.body) throw new Error(`Erreur ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    buf += decoder.decode(value || new Uint8Array(), { stream: !done });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onResult(JSON.parse(line));
    }
    if (done) break;
  }
  if (buf.trim()) onResult(JSON.parse(buf));
}
