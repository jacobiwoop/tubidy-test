export function duration(sec) {
  if (!sec || sec < 0) return '';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

export function totalDuration(tracks) {
  const s = tracks.reduce((a, t) => a + (t.duration || 0), 0);
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

const nf = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
export const compact = (n) => (n ? nf.format(n) : '');
export const full = (n) => (n ? new Intl.NumberFormat('fr-FR').format(n) : '');

export function date(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Réf de page → chemin : "sp:abc" → "/album/sp%3Aabc".
export const pagePath = (kind, ref) => `/${kind}/${encodeURIComponent(ref)}`;
export const artistPath = (ref, name) => pagePath('artist', ref || `name:${name}`);

// Drapeau emoji d'un code pays ISO à deux lettres (« NG » → 🇳🇬) ; vide si le code est invalide.
export function flag(code) {
  if (!/^[A-Za-z]{2}$/.test(code || '')) return '';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
