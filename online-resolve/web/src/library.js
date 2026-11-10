// Bibliothèque locale (ce navigateur) : titres aimés, écoutes récentes et playlists.
import { useSyncExternalStore } from 'react';

const KEY = 'spotywoop.library.v1';
const listeners = new Set();
let state = load();

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && Array.isArray(v.liked) && Array.isArray(v.recent)) return { playlists: [], ...v };
  } catch { /* stockage indisponible ou corrompu */ }
  return { liked: [], recent: [], playlists: [] };
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

export function createPlaylist(name) {
  const playlist = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: name.trim(), tracks: [] };
  save({ ...state, playlists: [playlist, ...state.playlists] });
  return playlist;
}

export const deletePlaylist = (id) => save({ ...state, playlists: state.playlists.filter((p) => p.id !== id) });

const editPlaylist = (id, edit) => save({ ...state, playlists: state.playlists.map((p) => (p.id === id ? edit(p) : p)) });

export function addToPlaylist(id, track) {
  editPlaylist(id, (p) => (p.tracks.some((t) => t.id === track.id) ? p : { ...p, tracks: [...p.tracks, slim(track)] }));
}

export function removeFromPlaylist(id, trackId) {
  editPlaylist(id, (p) => ({ ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }));
}

export function useLibrary() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}

export const isLiked = (lib, id) => lib.liked.some((t) => t.id === id);
