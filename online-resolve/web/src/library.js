// Bibliothèque locale (ce navigateur) : titres aimés et écoutes récentes.
import { useSyncExternalStore } from 'react';

const KEY = 'spotywoop.library.v1';
const listeners = new Set();
let state = load();

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && Array.isArray(v.liked) && Array.isArray(v.recent)) return v;
  } catch { /* stockage indisponible ou corrompu */ }
  return { liked: [], recent: [] };
}

function save(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* navigation privée, quota */ }
  listeners.forEach((l) => l());
}

// Le rang et l'évolution n'ont de sens que dans le classement d'origine.
const slim = (track) => {
  const { rank: _rank, change: _change, ...rest } = track;
  return rest;
};

export function toggleLike(track) {
  const liked = state.liked.some((t) => t.id === track.id)
    ? state.liked.filter((t) => t.id !== track.id)
    : [slim(track), ...state.liked];
  save({ ...state, liked });
}

export function pushRecent(track) {
  save({ ...state, recent: [slim(track), ...state.recent.filter((t) => t.id !== track.id)].slice(0, 60) });
}

export function useLibrary() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}

export const isLiked = (lib, id) => lib.liked.some((t) => t.id === id);
