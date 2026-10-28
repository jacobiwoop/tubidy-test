// Recherches récentes (ce navigateur), les plus récentes d'abord.
import { useSyncExternalStore } from 'react';

const KEY = 'spotywoop.searches.v1';
const MAX = 20;
const listeners = new Set();
let state = load();

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(v)) return v.filter((s) => typeof s === 'string');
  } catch { /* stockage indisponible ou corrompu */ }
  return [];
}

function save(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* navigation privée, quota */ }
  listeners.forEach((l) => l());
}

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

export function pushSearch(term) {
  const t = term.trim();
  if (!t || (state[0] && same(state[0], t))) return;
  save([t, ...state.filter((s) => !same(s, t))].slice(0, MAX));
}

export const removeSearch = (term) => save(state.filter((s) => s !== term));
export const clearSearches = () => save([]);

export function useSearchHistory() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}
