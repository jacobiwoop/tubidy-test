import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import TrackPlayer, {
  usePlaybackState,
  State,
  Capability,
  Event,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { getFavorites, saveFavorite } from '../utils/favorites';
import { getPlaylists } from '../utils/playlists';
import { getDownloadMetadata, deleteDownload } from '../utils/downloader';
import { getTrackDownload, getTrackRadio, BASE_URL } from '../services/api';
import { triggerHaptic } from '../utils/haptics';
import StatsService from '../services/StatsService';
import axios from 'axios';

// ─── Modes de lecture ────────────────────────────────────────────────────────
export const REPEAT_MODE = {
  NONE: 0, // pas de repeat
  ALL: 1,  // toute la liste en boucle
  ONE: 2,  // morceau en cours en boucle
};

export const PlayerContext = createContext();
export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
};

export const PlayerProvider = ({ children }) => {
  const playbackState = usePlaybackState();

  const [currentTrack, setCurrentTrack]       = useState(null);
  const [favorites, setFavorites]             = useState([]);
  const [playlists, setPlaylists]             = useState([]);
  const [downloads, setDownloads]             = useState([]);
  const [activeDownloads, setActiveDownloads] = useState({});
  const [loadingTrackId, setLoadingTrackId]   = useState(null);
  const [currentQueue, setCurrentQueue]       = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [suggestions, setSuggestions]         = useState([]);
  const [musicDNA, setMusicDNA]               = useState(null);

  // Musique source de la radio (celle choisie par l'user depuis la recherche)
  // Affichée en haut du QueueModal, réinitialisée à chaque choix manuel
  const [radioSource, setRadioSource]         = useState(null);

  // Modes de lecture (exposés à l'UI)
  const [isShuffle, setIsShuffle]   = useState(false);
  const [repeatMode, setRepeatMode] = useState(REPEAT_MODE.ALL);

  // Refs pour les callbacks headless / event listeners (évite les stale closures)
  const shuffleRef    = useRef(false);
  const repeatRef     = useRef(REPEAT_MODE.ALL);
  const queueRef      = useRef([]);
  const queueIdxRef   = useRef(0);
  const currentTrackRef = useRef(null);
  const handlePlayTrackRef = useRef(null);

  useEffect(() => { shuffleRef.current  = isShuffle;   }, [isShuffle]);
  useEffect(() => { repeatRef.current   = repeatMode;  }, [repeatMode]);
  
  // Cache pour le prefetch (évite de re-résoudre les liens)
  const prefetchCache = useRef({}); 
  
  useEffect(() => { queueRef.current    = currentQueue; }, [currentQueue]);
  useEffect(() => { queueIdxRef.current = currentQueueIndex; }, [currentQueueIndex]);

  // ─── Setup RNTP ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play, Capability.Pause,
            Capability.SkipToNext, Capability.SkipToPrevious,
            Capability.Stop, Capability.SeekTo,
          ],
          compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
          notificationCapabilities: [
            Capability.Play, Capability.Pause,
            Capability.SkipToNext, Capability.SkipToPrevious,
            Capability.Stop,
          ],
        });
      } catch (_) { /* déjà initialisé */ }
      loadFavorites();
      loadPlaylists();
      loadDownloads();
      refreshDNA();
    })();
  }, []);

  const refreshDNA = async () => {
    const dna = await StatsService.getDNA();
    setMusicDNA(dna);
  };

  // ─── Calcul index suivant / précédent ──────────────────────────────────────
  const getNextIndex = (queue, idx, shuffle) => {
    if (queue.length <= 1) return 0;
    if (shuffle) {
      let next;
      do { next = Math.floor(Math.random() * queue.length); }
      while (next === idx);
      return next;
    }
    return (idx + 1) % queue.length;
  };

  const getPrevIndex = (queue, idx, shuffle) => {
    if (queue.length <= 1) return 0;
    if (shuffle) {
      let prev;
      do { prev = Math.floor(Math.random() * queue.length); }
      while (prev === idx);
      return prev;
    }
    return (idx - 1 + queue.length) % queue.length;
  };

  // ─── Fin de morceau / boutons notif → applique les règles ─────────────────
  useTrackPlayerEvents(
    [Event.PlaybackTrackChanged, Event.RemoteNext, Event.RemotePrevious, Event.PlaybackQueueEnded],
    async (event) => {
      const queue   = queueRef.current;
      const idx     = queueIdxRef.current;
      const shuffle = shuffleRef.current;
      const repeat  = repeatRef.current;
      const playFn  = handlePlayTrackRef.current; // Utilise la ref pour éviter les stale closures

      if (!playFn) return;

      // Fin naturelle du morceau
      if ((event.type === Event.PlaybackTrackChanged && event.nextTrack == null) || event.type === Event.PlaybackQueueEnded) {
        if (repeat === REPEAT_MODE.ONE) {
          await TrackPlayer.seekTo(0);
          await TrackPlayer.play();
          return;
        }
        
        const isLast = !shuffle && idx >= queue.length - 1;
        // Si c'est le dernier et qu'on est pas en repeat ONE, on fetch la suite
        if (isLast) {
          const lastTrack = queue[idx];
          if (lastTrack) fetchRecommendations(lastTrack, true);
          return;
        }

        const nextIdx = getNextIndex(queue, idx, shuffle);
        playFn(queue[nextIdx], queue, nextIdx);
        return;
      }

      // Bouton Suivant
      if (event.type === Event.RemoteNext) {
        if (repeat === REPEAT_MODE.ONE) {
          await TrackPlayer.seekTo(0);
          await TrackPlayer.play();
          return;
        }
        const nextIdx = getNextIndex(queue, idx, shuffle);
        const isLast = !shuffle && idx >= queue.length - 1;
        
        if (isLast) {
          const lastTrack = queue[idx];
          if (lastTrack) fetchRecommendations(lastTrack, true);
        } else {
          playFn(queue[nextIdx], queue, nextIdx);
        }
        return;
      }

      // Bouton Précédent
      if (event.type === Event.RemotePrevious) {
        const prevIdx = getPrevIndex(queue, idx, shuffle);
        playTrackAtIndex(queue, prevIdx);
        return;
      }
    }
  );

  // ─── Joue un morceau de la queue par index (interne) ──────────────────────
  const prefetchNext = useCallback(async (queue, currentIndex) => {
    if (!queue || queue.length === 0) return;
    // On prefetch les 3 suivants
    for (let i = 1; i <= 3; i++) {
      const nextIdx = (currentIndex + i) % queue.length;
      const nextTrack = queue[nextIdx];
      if (!nextTrack || prefetchCache.current[nextTrack.id]) continue;

      // Si c'est déjà téléchargé, pas besoin de prefetch
      if (downloads.some(d => String(d.id) === String(nextTrack.id))) continue;

      // Résolution silencieuse du lien
      (async () => {
        try {
          let link = null;
          if (String(nextTrack.id).startsWith('lfm-') || String(nextTrack.id).startsWith('cho-')) {
            const q = `${nextTrack.title} ${nextTrack.artist?.name || nextTrack.artist}`;
            const res = await axios.get(`${BASE_URL}/search/play`, { params: { q } });
            link = res.data.link;
          } else {
            const res = await getTrackDownload(nextTrack.id);
            link = res?.target?.link || res?.link;
          }
          if (link) {
            prefetchCache.current[nextTrack.id] = { link, expires: Date.now() + 600000 }; // 10 min
          }
        } catch (e) {
          console.log(`[Prefetch] Failed for ${nextTrack.title}`);
        }
      })();
    }
  }, [downloads]);

  const playTrackAtIndex = useCallback((queue, index) => {
    if (!queue || !queue[index]) return;
    handlePlayTrack(queue[index], queue, index);
  }, []);

  // ─── Lecture principale ────────────────────────────────────────────────────
  const handlePlayTrack = async (track, queue = [], forceIndex = null) => {
    try {
      if (!track) return false;
      triggerHaptic('impactMedium');

      // ── Optimistic update immédiat ──────────────────────────────────────────
      // Pochette + titre changent tout de suite. Le spinner n'apparaît que
      // sur le bouton play, pas sur toute l'UI.
      setCurrentTrack(track);
      currentTrackRef.current = track;
      setLoadingTrackId(track.id);

      // Queue + index aussi immédiatement (next/prev correct dès le clic)
      const newQueue = (queue && queue.length > 0) ? queue : [track];
      const newIdx   = forceIndex !== null
        ? forceIndex
        : Math.max(0, newQueue.findIndex(t => t.id === track.id));
      setCurrentQueue(newQueue);
      queueRef.current    = newQueue;
      setCurrentQueueIndex(newIdx);
      queueIdxRef.current = newIdx;

      // Choix manuel depuis la recherche (queue vide) → nouveau point de départ radio
      if (!queue || queue.length === 0) {
        setRadioSource(track);
        fetchRecommendations(track); // charge la liste une seule fois
      }

      // ─── Mise à jour de la ref pour les events headless ───────────────────
      handlePlayTrackRef.current = handlePlayTrack;

      // ─── Vérification Connectivité & Local ─────────────────────────────────
      const isDownloaded = downloads.some(d => String(d.id) === String(track.id));
      let isOffline = false;
      try {
        await axios.get(`${BASE_URL}/health`, { timeout: 1500 });
      } catch (e) {
        isOffline = true;
      }

      // Si Hors-ligne et non téléchargé -> on cherche le prochain téléchargé
      if (isOffline && !isDownloaded) {
        console.log(`[Offline] Skip: ${track.title}`);
        const q = queueRef.current;
        if (q && q.length > 1) {
          const currentIndex = q.findIndex(t => String(t.id) === String(track.id));
          for (let i = 1; i < q.length; i++) {
            const nextIdx = (currentIndex + i) % q.length;
            const nextTrack = q[nextIdx];
            if (downloads.some(d => String(d.id) === String(nextTrack.id))) {
              return handlePlayTrack(nextTrack, q, nextIdx);
            }
          }
        }
        alert('Mode Hors-ligne : Seuls vos téléchargements sont disponibles.');
        return false;
      }

      // ─── Reset immédiat APRES le check offline ──────────────────────────
      await TrackPlayer.reset();

      // ── Résolution du lien (Local ou Réseau) ────────────────────────────────
      let finalTrack = track;
      let finalLink  = null;

      // On vérifie d'abord le cache du prefetch
      const cached = prefetchCache.current[track.id];
      if (cached && cached.expires > Date.now()) {
        finalLink = cached.link;
        console.log(`[Cache] Hit for: ${track.title}`);
      }

      // Priorité au fichier local si téléchargé
      if (isDownloaded) {
        const localTrack = downloads.find(d => String(d.id) === String(track.id));
        if (localTrack) {
          finalTrack = { ...localTrack }; // Contient le localUri et l'artwork local
          finalLink = localTrack.localUri;
          console.log(`[Local] Playing from storage: ${track.title}`);
        }
      }

      if (!finalLink && (String(track.id).startsWith('lfm-') || String(track.id).startsWith('cho-'))) {
        const q = `${track.title} ${track.artist?.name || track.artist}`;
        const res = await axios.get(`${BASE_URL}/search/play`, { params: { q } });
        if (res.data?.link) {
          finalLink  = res.data.link;
          finalTrack = { ...track, title: res.data.title || track.title };
          if (finalTrack.title !== track.title) {
            setCurrentTrack(finalTrack);
            currentTrackRef.current = finalTrack;
          }
        } else {
          alert('Impossible de trouver ce morceau sur les serveurs.');
          return false;
        }
      }

      if (!finalLink) {
        const dl  = await getTrackDownload(finalTrack.id);
        finalLink = dl?.target?.link || dl?.link;
      }

      if (!finalLink) { alert('Lien non disponible'); return false; }

      // ── Lancement RNTP ─────────────────────────────────────────────────────
      await TrackPlayer.add({
        id:       String(finalTrack.id),
        url:      finalLink,
        title:    finalTrack.title,
        artist:   finalTrack.artist?.name || finalTrack.artist,
        artwork:  finalTrack.artwork || finalTrack.album?.cover_big || finalTrack.album?.cover_medium || finalTrack.thumbnail,
        duration: finalTrack.duration,
      });
      await TrackPlayer.play();
      
      // Prefetch les suivants pour une lecture instantanée plus tard
      prefetchNext(newQueue, newIdx);

      // Enregistrement dans l'ADN musical
      StatsService.recordTrackPlay(finalTrack).then(() => refreshDNA());

      // fetchRecommendations n'est PAS appelé ici.
      // Il est appelé uniquement quand on est au dernier morceau de la queue
      // (dans le handler PlaybackTrackChanged) pour éviter des requêtes inutiles.
      return true;
    } catch (err) {
      console.error('handlePlayTrack error:', err);
      return false;
    } finally {
      setLoadingTrackId(null);
    }
  };

  // ─── Next / Prev depuis l'UI (boutons PlayerScreen) ───────────────────────
  const handleNext = useCallback(() => {
    const queue   = queueRef.current;
    const idx     = queueIdxRef.current;
    const shuffle = shuffleRef.current;
    const repeat  = repeatRef.current;

    if (!queue.length) return;
    triggerHaptic('selection');

    if (repeat === REPEAT_MODE.ONE) {
      TrackPlayer.seekTo(0).then(() => TrackPlayer.play());
      return;
    }
    const nextIdx = getNextIndex(queue, idx, shuffle);
    playTrackAtIndex(queue, nextIdx);
  }, []);

  const handlePrevious = useCallback(() => {
    const queue   = queueRef.current;
    const idx     = queueIdxRef.current;
    const shuffle = shuffleRef.current;

    if (!queue.length) return;
    triggerHaptic('selection');
    const prevIdx = getPrevIndex(queue, idx, shuffle);
    playTrackAtIndex(queue, prevIdx);
  }, []);

  // ─── Shuffle / Repeat toggles ──────────────────────────────────────────────
  const toggleShuffle = useCallback(() => {
    triggerHaptic('selection');
    setIsShuffle(prev => !prev);
  }, []);

  const cycleRepeatMode = useCallback(() => {
    triggerHaptic('selection');
    setRepeatMode(prev => (prev + 1) % 3);
  }, []);

  // ─── Play/Pause ────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    if (playbackState.state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
    triggerHaptic('impactLight');
  };

  // ─── Favoris (optimistic update) ──────────────────────────────────────────
  const toggleFavorite = useCallback(async (track) => {
    const isAlreadyFav = favorites.some(f => f.id === track.id);
    setFavorites(prev =>
      isAlreadyFav ? prev.filter(f => f.id !== track.id) : [...prev, track]
    );
    triggerHaptic('notificationSuccess');
    // Persistance en arrière-plan
    saveFavorite(track).then(() => {
      loadFavorites();
      loadPlaylists();
      // On enregistre l'action dans l'ADN (plus de poids qu'une simple écoute)
      StatsService.recordTrackLike(track, !isAlreadyFav).then(() => refreshDNA());
    });
  }, [favorites]);

  // ─── Recommendations ───────────────────────────────────────────────────────
  // Appelé uniquement :
  //   1. Au choix manuel d'une musique (autoPlay = false, le morceau joue déjà)
  //   2. Quand la queue est épuisée (autoPlay = true, relancer sur sugg1)
  //
  // Comportement normal :
  //   DNA → sugg1 → sugg2 → ... → sugg10 (fin)
  //   → fetchRecommendations(sugg10, true) → [sugg10, nouvelles_sugg...]
  //   → joue nouvelles_sugg[0] automatiquement → continue
  const fetchRecommendations = async (track, autoPlay = false) => {
    try {
      console.log(`[Radio] Fetching suggestions for: ${track.title}`);
      let tracks = [];
      
      // Essai Chosic avec timeout 8s
      try {
        const res = await axios.get(`${BASE_URL}/chosic/recommend`, {
          params: { artist: track.artist?.name || track.artist, track: track.title },
          timeout: 8000
        });
        tracks = res.data?.track || [];
      } catch (e) {
        console.warn('[Radio] Chosic failed, trying Deezer fallback...');
        // Fallback sur Deezer Radio native
        const res = await getTrackRadio(track.id);
        tracks = res || [];
      }

      if (!tracks || tracks.length === 0) return;

      setSuggestions(tracks);

      const newQueue = [track, ...tracks];
      setCurrentQueue(newQueue);
      queueRef.current    = newQueue;
      setCurrentQueueIndex(0);
      queueIdxRef.current = 0;

      // Prefetch les nouveaux venus
      prefetchNext(newQueue, 0);

      // Si appelé en fin de queue → lancer automatiquement la 1ère suggestion
      if (autoPlay && newQueue[1]) {
        handlePlayTrack(newQueue[1], newQueue, 1);
      }
    } catch (err) {
      console.error('[Radio] Recommendation error:', err.message);
    }
  };

  // ─── Loaders ───────────────────────────────────────────────────────────────
  const loadFavorites = async () => { setFavorites((await getFavorites()) || []); };
  const loadPlaylists = async () => { setPlaylists((await getPlaylists()) || []); };
  const loadDownloads = async () => { setDownloads((await getDownloadMetadata()) || []); };

  const playerStatus = React.useMemo(() => ({
    playing: playbackState.state === State.Playing,
    loading: playbackState.state === State.Buffering || playbackState.state === State.Loading,
  }), [playbackState.state]);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      playerStatus,
      favorites,
      playlists,
      downloads,
      activeDownloads,
      loadingTrackId,
      onPlayTrack:      handlePlayTrack,
      onTogglePlay:     togglePlay,
      onToggleFavorite: toggleFavorite,
      onNext:           handleNext,
      onPrevious:       handlePrevious,
      loadPlaylists,
      loadFavorites,
      loadDownloads,
      currentQueue,
      currentQueueIndex,
      suggestions,
      radioSource,
      musicDNA,
      setActiveDownloads,
      refreshDNA,
      // Modes de lecture
      isShuffle,
      repeatMode,
      toggleShuffle,
      cycleRepeatMode,
      onRemoveDownload: async (id) => {
        await deleteDownload(id);
        loadDownloads();
        triggerHaptic('notificationSuccess');
      },
      // Couleurs statiques (image-colors désactivé)
      currentColors: { primary: '#1DB954', secondary: '#111', background: '#000' },
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
