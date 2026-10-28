// Paroles du titre en cours, partagées entre la barre du lecteur (ligne en cours) et le grand lecteur.
// Le serveur est interrogé dès qu'un titre démarre, grand lecteur ouvert ou non ; le composant <am-lyrics>
// du grand lecteur peut ensuite y déposer mieux (voir Lyrics.jsx).
import { useEffect, useSyncExternalStore } from 'react';
import { streamLyrics } from '../api';
import { offlineLyrics } from '../downloads';

// { id, status: 'searching' | 'found' | 'none', rich, source, level, from: 'server' | 'browser' }
let state = { id: null, status: 'none' };
const listeners = new Set();

function set(next) {
  state = next;
  listeners.forEach((l) => l());
}

// Modifie les paroles du titre id, si c'est toujours le titre en cours.
export function updateLyrics(id, patch) {
  if (state.id === id) set({ ...state, ...patch });
}

export const getLyrics = () => state;

export function useLyrics() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}

// 0 mot par mot, 1 ligne par ligne, 2 texte seul (même règle que le composant).
export function tier(lines) {
  const word = lines.some((l) => l.text.some((s) => s.text.trim() && (s.timestamp > 0 || s.endtime > 0))
    && (l.isWordSynced ?? (l.text.length > 1 && !l.text.every((s) => s.lineSynced))));
  if (word) return 0;
  return lines.some((l) => l.timestamp > 0 || l.endtime > 0) ? 1 : 2;
}

// Lignes de notre API ({ t, text }) au format du composant, quand le serveur n'a pas envoyé de détail.
function toRich(res) {
  if (res.rich?.length) return res.rich;
  return res.lines.filter((l) => l.text).map((l) => {
    const end = res.synced ? (res.lines.find((n) => n.t > l.t)?.t ?? l.t + 5000) : 0;
    const t = res.synced ? l.t : 0;
    return {
      text: [{ text: l.text, part: false, timestamp: t, endtime: end, lineSynced: res.synced }],
      background: false, backgroundText: [], oppositeTurn: false, timestamp: t, endtime: end, isWordSynced: false,
    };
  });
}

// À monter une fois : suit le titre en cours et reçoit les versions du serveur, chacune meilleure que la
// précédente. Une version du composant déjà affichée n'est remplacée que par mieux.
export function useServerLyrics(current) {
  useEffect(() => {
    if (!current) {
      set({ id: null, status: 'none' });
      return undefined;
    }
    const { id } = current;
    set({ id, status: 'searching' });
    const ctrl = new AbortController();
    const apply = (res) => {
      if (!res.lines?.length) return;
      const rich = toRich(res);
      const level = tier(rich);
      const cur = getLyrics();
      if (cur.from === 'browser' && cur.level <= level) return;
      updateLyrics(id, { status: 'found', rich, source: res.source, songwriters: res.songwriters, level, from: 'server' });
    };
    // Sans réseau : les paroles enregistrées avec le titre téléchargé, s'il l'est.
    const fromDownload = () => offlineLyrics(id).then((res) => {
      if (res) apply(res);
      if (getLyrics().status === 'searching') updateLyrics(id, { status: 'none', serverDone: true });
    }).catch(() => updateLyrics(id, { status: 'none', serverDone: true }));
    if (!navigator.onLine) {
      fromDownload();
      return undefined;
    }
    streamLyrics({
      artist: current.artist, title: current.title, album: current.album,
      duration: current.duration ? Math.round(current.duration) : undefined,
      spotify: id?.startsWith('sp:') ? id.slice(3) : undefined,
    }, apply, ctrl.signal)
      .then(() => { if (getLyrics().status === 'searching') updateLyrics(id, { status: 'none', serverDone: true }); })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        if (getLyrics().status === 'searching') fromDownload();
      });
    return () => ctrl.abort();
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
