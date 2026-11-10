// Titres téléchargés pour l'écoute hors ligne, dans IndexedDB (le son, la pochette et les paroles).
//
// Audiomack et Tubidy ne laissent pas une page lire leurs fichiers : on passe par notre relais
// (relay/worker.js), dont /api/resolve?download=1 donne un lien signé valable 15 minutes.
import { useSyncExternalStore } from 'react';
import { api } from './api';

const DB = 'spotywoop';
const STORE = 'downloads';
const listeners = new Set();
// items : métadonnées sans le son (id → { track, size, type, savedAt }) ; progress : id → 0..1 pendant un téléchargement.
let state = { ready: false, items: new Map(), progress: new Map(), errors: new Map() };
const urls = new Map(); // id → adresse blob: déjà créée

function emit(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let dbPromise;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

// Charge la liste au démarrage (sans lire les fichiers audio en mémoire plus que nécessaire).
async function init() {
  try {
    const all = await tx('readonly', (s) => s.getAll());
    const items = new Map();
    for (const r of all) items.set(r.id, { track: r.track, size: r.size, type: r.type, savedAt: r.savedAt, hasLyrics: !!r.lyrics });
    emit({ ready: true, items });
  } catch {
    emit({ ready: true }); // IndexedDB indisponible (navigation privée…) : pas de téléchargements
  }
}
if (typeof indexedDB !== 'undefined') init();

export function useDownloads() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}

export const isDownloaded = (id) => state.items.has(id);

// Adresse jouable d'un titre téléchargé, ou null.
export async function offlineUrl(id) {
  if (!state.items.has(id)) return null;
  if (urls.has(id)) return urls.get(id);
  const r = await tx('readonly', (s) => s.get(id));
  if (!r?.blob) return null;
  const u = URL.createObjectURL(r.blob);
  urls.set(id, u);
  return u;
}

// Paroles enregistrées avec le titre (réponse de /api/lyrics), ou null.
export async function offlineLyrics(id) {
  if (!state.items.has(id)) return null;
  const r = await tx('readonly', (s) => s.get(id));
  return r?.lyrics || null;
}

async function fetchWithProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`relais : HTTP ${res.status}`);
  const total = Number(res.headers.get('Content-Length')) || 0;
  const type = res.headers.get('Content-Type') || 'audio/mpeg';
  if (!res.body || !total) return new Blob([await res.arrayBuffer()], { type });
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress(got / total);
  }
  return new Blob(chunks, { type });
}

// Demande au navigateur de ne pas effacer nos données quand l'espace manque (accordé ou non selon le navigateur).
let persistAsked = false;
function askPersist() {
  if (persistAsked || !navigator.storage?.persist) return;
  persistAsked = true;
  navigator.storage.persist().catch(() => {});
}

export async function download(track) {
  if (state.items.has(track.id) || state.progress.has(track.id)) return;
  askPersist();
  const progress = new Map(state.progress).set(track.id, 0);
  const errors = new Map(state.errors);
  errors.delete(track.id);
  emit({ progress, errors });
  try {
    const res = await api('resolve', {
      q: `${track.artist} ${track.title}`.trim(),
      duration: track.duration || undefined,
      artist: track.artist || undefined,
      am: track.amId && !track.blocked ? track.amId : undefined,
      loose: track.id?.startsWith('yt:') ? 1 : undefined,
      download: 1,
    }, { fresh: true });
    if (!res?.downloadUrl) throw new Error('téléchargement indisponible pour ce titre');
    const blob = await fetchWithProgress(res.downloadUrl, (p) => emit({ progress: new Map(state.progress).set(track.id, p) }));
    // Pochette et paroles : un plus, jamais bloquant.
    const [cover, lyrics] = await Promise.all([
      track.image ? fetch(track.image).then((r) => (r.ok ? r.blob() : null)).catch(() => null) : null,
      api('lyrics', { artist: track.artist, title: track.title, album: track.album, duration: track.duration ? Math.round(track.duration) : undefined }).catch(() => null),
    ]);
    const record = { id: track.id, track, blob, type: blob.type, size: blob.size, cover, lyrics, savedAt: Date.now(), provider: res.best?.provider, format: res.best?.format };
    await tx('readwrite', (s) => s.put(record));
    const items = new Map(state.items).set(track.id, { track, size: blob.size, type: blob.type, savedAt: record.savedAt, hasLyrics: !!lyrics });
    const done = new Map(state.progress);
    done.delete(track.id);
    emit({ items, progress: done });
  } catch (err) {
    const done = new Map(state.progress);
    done.delete(track.id);
    emit({ progress: done, errors: new Map(state.errors).set(track.id, err.message || String(err)) });
    throw err;
  }
}

export async function removeDownload(id) {
  await tx('readwrite', (s) => s.delete(id));
  if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
  const items = new Map(state.items);
  items.delete(id);
  emit({ items });
}

export async function clearDownloads() {
  await tx('readwrite', (s) => s.clear());
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls.clear();
  emit({ items: new Map() });
}

// Espace utilisé par nos titres et espace que le navigateur nous accorde (estimation).
export async function storageInfo() {
  const used = [...state.items.values()].reduce((n, i) => n + (i.size || 0), 0);
  let quota = null;
  let persisted = null;
  try {
    quota = (await navigator.storage?.estimate?.())?.quota ?? null;
    persisted = (await navigator.storage?.persisted?.()) ?? null;
  } catch { /* non pris en charge */ }
  return { used, quota, persisted };
}
