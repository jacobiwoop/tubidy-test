import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, resolveTrack } from '../api';
import { pushRecent } from '../library';
import { offlineUrl } from '../downloads';

const PlayerCtx = createContext(null);
export const usePlayer = () => useContext(PlayerCtx);

const STREAM_TTL = 10 * 60 * 1000; // les liens Audiomack valent ~4 h, ceux de Tubidy moins : on reste prudent
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const sameSong = (a, b) => a.id === b.id || (norm(a.title) === norm(b.title) && norm(a.artist).split(' ')[0] === norm(b.artist).split(' ')[0]);

export function PlayerProvider({ children }) {
  const audio = useMemo(() => new Audio(), []);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [status, setStatus] = useState('idle'); // idle | loading | playing | paused
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [source, setSource] = useState(null); // { provider, format } du lien en cours
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off | all | one
  const [volume, setVolumeState] = useState(() => Number(localStorage.getItem('spotywoop.volume') ?? 1));
  const [context, setContext] = useState(null); // { label, continuous }
  const [toast, setToast] = useState(null);

  // Valeurs lues par les gestionnaires d'événements audio, sans attendre un nouveau rendu.
  const live = useRef({});
  live.current = { queue, index, shuffle, repeat, context };
  const streams = useRef(new Map());
  const loadSeq = useRef(0);
  const extending = useRef(false);
  const toastTimer = useRef(null);

  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const getStream = useCallback(async (track) => {
    // Titre téléchargé : lu depuis le téléphone, sans réseau.
    const local = await offlineUrl(track.id).catch(() => null);
    if (local) return { url: local, provider: 'local', format: 'local', at: Date.now() };
    const hit = streams.current.get(track.id);
    if (hit && Date.now() - hit.at < STREAM_TTL) return hit;
    const res = await resolveTrack(track);
    if (!res?.best?.streamUrl) throw new Error('aucun lien');
    const s = { url: res.best.streamUrl, provider: res.best.provider, format: res.best.format, at: Date.now() };
    streams.current.set(track.id, s);
    return s;
  }, []);

  const prefetch = useCallback((i) => {
    const t = live.current.queue[i];
    if (t) getStream(t).catch(() => {});
  }, [getStream]);

  // load joue l'élément i de q ; un chargement plus récent annule les précédents.
  const load = useCallback(async (i, q = live.current.queue, retried = false) => {
    const track = q[i];
    if (!track) return;
    const seq = ++loadSeq.current;
    setIndex(i);
    setStatus('loading');
    setSource(null);
    setTime(0);
    setLength(track.duration || 0);
    try {
      const s = await getStream(track);
      if (seq !== loadSeq.current) return;
      audio.src = s.url;
      await audio.play();
      if (seq !== loadSeq.current) return;
      setSource(s);
      pushRecent(track);
      prefetch(i + 1);
    } catch (err) {
      if (seq !== loadSeq.current || err?.name === 'AbortError') return;
      streams.current.delete(track.id);
      if (!retried && err?.name !== 'NotAllowedError') return load(i, q, true); // lien expiré : on résout à nouveau une fois
      if (err?.name === 'NotAllowedError') { setStatus('paused'); return; } // lecture auto bloquée : un clic suffira
      notify(`Impossible de lire « ${track.title} », titre suivant.`);
      if (i + 1 < q.length) setTimeout(() => seq === loadSeq.current && load(i + 1, q), 400);
      else setStatus('idle');
    }
  }, [audio, getStream, prefetch, notify]);

  // Radio en fin de file : suggestions à partir du titre en cours, sans doublons.
  const extendWithRadio = useCallback(async () => {
    if (extending.current) return 0;
    const { queue: q, index: i } = live.current;
    const seed = q[i];
    if (!seed) return 0;
    extending.current = true;
    try {
      const r = await api('radio', { seed: 'track', am: seed.amId && !seed.blocked ? seed.amId : undefined, q: `${seed.artist} ${seed.title}`, duration: seed.duration, artist: seed.artist });
      const fresh = (r.tracks || []).filter((t) => !live.current.queue.some((x) => sameSong(x, t)));
      if (!fresh.length) return 0;
      const next = [...live.current.queue, ...fresh.slice(0, 20)];
      live.current.queue = next;
      setQueue(next);
      return fresh.length;
    } catch {
      return 0;
    } finally {
      extending.current = false;
    }
  }, []);

  const next = useCallback(async (auto = false) => {
    const { queue: q, index: i, shuffle: sh, repeat: rp, context: ctx } = live.current;
    if (!q.length) return;
    if (auto && rp === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); return; }
    if (sh && q.length > 1) {
      let j = i;
      while (j === i) j = Math.floor(Math.random() * q.length);
      return load(j);
    }
    if (i + 1 < q.length) return load(i + 1);
    if (rp === 'all') return load(0);
    if (ctx?.continuous && (await extendWithRadio())) return load(i + 1, live.current.queue);
    setStatus('paused');
  }, [audio, load, extendWithRadio]);

  const prev = useCallback(() => {
    const { index: i } = live.current;
    if (audio.currentTime > 3 || i <= 0) { audio.currentTime = 0; return; }
    load(i - 1);
  }, [audio, load]);

  // Événements de l'élément audio.
  useEffect(() => {
    const on = (ev, fn) => { audio.addEventListener(ev, fn); return () => audio.removeEventListener(ev, fn); };
    const offs = [
      on('timeupdate', () => setTime(audio.currentTime)),
      on('durationchange', () => Number.isFinite(audio.duration) && setLength(audio.duration)),
      on('playing', () => setStatus('playing')),
      on('pause', () => setStatus((s) => (s === 'loading' ? s : 'paused'))),
      on('ended', () => next(true)),
      on('error', () => {
        const { queue: q, index: i } = live.current;
        if (q[i] && audio.src) { streams.current.delete(q[i].id); load(i, q, true); }
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [audio, next, load]);

  useEffect(() => {
    audio.volume = volume;
    try { localStorage.setItem('spotywoop.volume', String(volume)); } catch { /* stockage indisponible */ }
  }, [audio, volume]);

  const current = queue[index] || null;

  // Contrôles de l'écran verrouillé et du système (MediaSession).
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: current.title, artist: current.artist, album: current.album || '',
      artwork: current.image ? [{ src: current.image, sizes: '300x300' }] : [],
    });
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => audio.play());
    ms.setActionHandler('pause', () => audio.pause());
    ms.setActionHandler('previoustrack', prev);
    ms.setActionHandler('nexttrack', () => next(false));
    ms.setActionHandler('seekto', (d) => { audio.currentTime = d.seekTime; });
  }, [audio, current, prev, next]);

  const playList = useCallback((tracks, start = 0, ctx = { continuous: true }) => {
    if (!tracks?.length) return;
    const list = tracks.slice();
    live.current.queue = list;
    setQueue(list);
    setContext(ctx);
    load(start, list);
  }, [load]);

  const startRadio = useCallback(async ({ track, artist }) => {
    notify(track ? `Radio de « ${track.title} »…` : `Radio de ${artist}…`);
    try {
      const r = track
        ? await api('radio', { seed: 'track', am: track.amId && !track.blocked ? track.amId : undefined, q: `${track.artist} ${track.title}`, duration: track.duration, artist: track.artist })
        : await api('radio', { seed: 'artist', name: artist });
      const list = (track ? [track] : []).concat((r.tracks || []).filter((t) => !track || !sameSong(t, track)));
      playList(list, 0, { continuous: true, label: track ? `Radio · ${track.title}` : r.title || `Radio · ${artist}` });
    } catch {
      notify('Radio indisponible pour le moment.');
    }
  }, [playList, notify]);

  const insert = useCallback((track, afterCurrent) => {
    const { queue: q, index: i } = live.current;
    if (!q.length) return playList([track], 0);
    const pos = afterCurrent ? i + 1 : q.length;
    const list = [...q.slice(0, pos), track, ...q.slice(pos)];
    live.current.queue = list;
    setQueue(list);
    notify(afterCurrent ? `« ${track.title} » sera joué ensuite.` : `« ${track.title} » ajouté à la file.`);
  }, [playList, notify]);

  const value = {
    audio, // lu image par image par les paroles mot par mot
    queue, index, current, status, time, length, source, shuffle, repeat, volume, context, toast,
    playList,
    playTrack: (track) => playList([track], 0, { continuous: true }),
    playAt: (i) => load(i),
    toggle: () => {
      if (!current) return;
      if (audio.paused) audio.play().catch(() => load(index)); else audio.pause();
    },
    next: () => next(false),
    prev,
    seek: (s) => { audio.currentTime = s; setTime(s); },
    setVolume: (v) => setVolumeState(Math.min(1, Math.max(0, v))),
    toggleShuffle: () => setShuffle((s) => !s),
    cycleRepeat: () => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
    playNext: (t) => insert(t, true),
    addToQueue: (t) => insert(t, false),
    removeAt: (i) => {
      const { queue: q, index: cur } = live.current;
      if (i === cur) return;
      const list = q.filter((_, j) => j !== i);
      live.current.queue = list;
      setQueue(list);
      if (i < cur) setIndex(cur - 1);
    },
    startRadio,
    notify,
  };
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}
