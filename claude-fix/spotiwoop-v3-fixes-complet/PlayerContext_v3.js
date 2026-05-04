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

  useEffect(() => { shuffleRef.current  = isShuffle;   }, [isShuffle]);
  useEffect(() => { repeatRef.current   = repeatMode;  }, [repeatMode]);
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
            Capability.SkipToNext, Capability.SkipToPrevious, Capability.Stop,
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
    [Event.PlaybackTrackChanged, Event.RemoteNext, Event.RemotePrevious],
    async (event) => {
      const queue   = queueRef.current;
      const idx     = queueIdxRef.current;
      const shuffle = shuffleRef.current;
      const repeat  = repeatRef.current;

      // Fin naturelle du morceau (RNTP queue épuisée car on ne met qu'1 track)
      if (event.type === Event.PlaybackTrackChanged && event.nextTrack == null) {
        if (repeat === REPEAT_MODE.ONE) {
          await TrackPlayer.seekTo(0);
          await TrackPlayer.play();
          return;
        }
        const isLast = !shuffle && idx >= queue.length - 1;
        if (isLast && repeat === REPEAT_MODE.NONE) {
          // Queue épuisée → recharger Last.fm depuis le dernier morceau joué
          const lastTrack = queue[idx];
          if (lastTrack) fetchRecommendations(lastTrack, true); // autoPlay=true
          return;
        }
        const nextIdx = getNextIndex(queue, idx, shuffle);
        playTrackAtIndex(queue, nextIdx);
        return;
      }

      // Bouton Suivant (notif ou app)
      if (event.type === Event.RemoteNext) {
        if (repeat === REPEAT_MODE.ONE) {
          await TrackPlayer.seekTo(0);
          await TrackPlayer.play();
          return;
        }
        const nextIdx = getNextIndex(queue, idx, shuffle);
        playTrackAtIndex(queue, nextIdx);
        return;
      }

      // Bouton Précédent (notif ou app)
      if (event.type === Event.RemotePrevious) {
        const prevIdx = getPrevIndex(queue, idx, shuffle);
        playTrackAtIndex(queue, prevIdx);
        return;
      }
    }
  );

  // ─── Ref sur handlePlayTrack pour éviter les stale closures dans les events ─
  const handlePlayTrackRef = useRef(null);

  // ─── Joue un morceau de la queue par index (interne) ──────────────────────
  const playTrackAtIndex = useCallback((queue, index) => {
    if (!queue || !queue[index]) return;
    // On passe par la ref pour toujours avoir la dernière version de handlePlayTrack
    handlePlayTrackRef.current?.(queue[index], queue, index);
  }, []);

  // ─── Cache de prefetch (liens pré-résolus pour les 3 prochains morceaux) ───
  const prefetchCache = useRef(new Map());
  const PREFETCH_TTL  = 10 * 60 * 1000; // 10 min

  const getPrefetched = (trackId) => {
    const entry = prefetchCache.current.get(String(trackId));
    if (!entry) return null;
    if (Date.now() - entry.resolvedAt > PREFETCH_TTL) {
      prefetchCache.current.delete(String(trackId));
      return null;
    }
    return entry.link;
  };

  const prefetchNext = useCallback(async (queue, currentIdx, count = 3) => {
    const toFetch = queue.slice(currentIdx + 1, currentIdx + 1 + count);
    for (const track of toFetch) {
      if (!track || getPrefetched(track.id)) continue;
      (async () => {
        try {
          let link = null;
          if (String(track.id).startsWith('lfm-') || String(track.id).startsWith('cho-')) {
            const q = `${track.title} ${track.artist?.name || track.artist}`;
            const res = await axios.get(`${BASE_URL}/search/play`, { params: { q } });
            link = res.data?.link || null;
          } else {
            const dl = await getTrackDownload(track.id);
            link = dl?.target?.link || dl?.link || null;
          }
          if (link) {
            prefetchCache.current.set(String(track.id), { link, resolvedAt: Date.now() });
            console.log(`[prefetch] ✓ ${track.title}`);
          }
        } catch (_) {}
      })();
    }
  }, []);

  // ─── Lecture principale ────────────────────────────────────────────────────
  const handlePlayTrack = async (track, queue = [], forceIndex = null) => {
    try {
      if (!track) return false;
      triggerHaptic('impactMedium');

      // ── Arrêt immédiat ──────────────────────────────────────────────────────
      // Le reset est fait APRÈS le check offline (voir plus bas) pour ne pas
      // couper le son si on ne peut finalement pas jouer le morceau demandé.

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

      // ─── Vérification Connectivité & Local ─────────────────────────────────
      const isDownloaded = downloads.some(d => String(d.id) === String(track.id));
      let isOffline = false;

      // On ne fait le check réseau que si le morceau n'est pas déjà téléchargé
      if (!isDownloaded) {
        try {
          await axios.get(`${BASE_URL}/health`, { timeout: 1500 });
        } catch (e) {
          isOffline = true;
        }
      }

      // Si hors-ligne et non téléchargé → cherche le prochain dispo localement
      // FIX : on remet la musique précédente si on ne peut pas jouer (pas de reset inutile)
      if (isOffline && !isDownloaded) {
        console.log(`[Offline] Skip: ${track.title}`);
        // Rollback optimistic : remettre l'état précédent
        setCurrentTrack(currentTrackRef.current);
        setLoadingTrackId(null);
        const q = queueRef.current;
        if (q && q.length > 1) {
          const currentIndex = q.findIndex(t => String(t.id) === String(track.id));
          for (let i = 1; i < q.length; i++) {
            const nextIdx = (currentIndex + i) % q.length;
            const nextTrack = q[nextIdx];
            if (downloads.some(d => String(d.id) === String(nextTrack.id))) {
              return handlePlayTrackRef.current?.(nextTrack, q, nextIdx);
            }
          }
        }
        alert('Mode Hors-ligne : Seuls vos téléchargements sont disponibles.');
        return false;
      }

      // ── Arrêt de la lecture précédente ─────────────────────────────────────
      // FIX : reset ici (après le check offline) pour ne pas couper le son
      // si le check offline échoue et qu'on ne peut finalement pas jouer.
      await TrackPlayer.reset();

      // ── Résolution du lien (Local ou Réseau) ────────────────────────────────
      let finalTrack = track;
      let finalLink  = null;

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
      // Pas de reset() ici — il a déjà été fait au début de la fonction
      await TrackPlayer.add({
        id:       String(finalTrack.id),
        url:      finalLink,
        title:    finalTrack.title,
        artist:   finalTrack.artist?.name || finalTrack.artist,
        artwork:  finalTrack.album?.cover_big || finalTrack.album?.cover_medium || finalTrack.thumbnail || finalTrack.artwork,
        duration: finalTrack.duration,
      });
      await TrackPlayer.play();
      
      // Enregistrement dans l'ADN musical
      StatsService.recordTrackPlay(finalTrack).then(() => refreshDNA());

      // Prefetch des 3 prochains liens en arrière-plan
      prefetchNext(queueRef.current, queueIdxRef.current);

      return true;
    } catch (err) {
      console.error('handlePlayTrack error:', err);
      return false;
    } finally {
      setLoadingTrackId(null);
    }
  };

  // Mise à jour de la ref après chaque render pour que playTrackAtIndex
  // ait toujours la dernière version de handlePlayTrack (évite stale closure)
  handlePlayTrackRef.current = handlePlayTrack;

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
  // Stratégie : Chosic en premier → fallback Deezer radio si Chosic échoue
  const fetchRecommendations = async (track, autoPlay = false) => {
    let tracks = null;

    // ── Tentative Chosic ────────────────────────────────────────────────────
    try {
      console.log(`[Radio] Chosic → ${track.title}`);
      const res = await axios.get(`${BASE_URL}/chosic/recommend`, {
        params: { artist: track.artist?.name || track.artist, track: track.title },
        timeout: 8000,
      });
      if (res.data?.track?.length > 0) {
        tracks = res.data.track;
        console.log(`[Radio] Chosic OK — ${tracks.length} suggestions`);
      }
    } catch (err) {
      console.warn(`[Radio] Chosic échoué: ${err.message}`);
    }

    // ── Fallback : Deezer radio ─────────────────────────────────────────────
    // Avantage : IDs natifs Deezer → résolution directe, pas de pipeline lfm-/cho-
    if (!tracks && track.id && !String(track.id).startsWith('lfm-') && !String(track.id).startsWith('cho-')) {
      try {
        console.log(`[Radio] Fallback Deezer radio → ${track.title}`);
        const res = await getTrackRadio(track.id);
        if (res?.data?.length > 0) {
          tracks = res.data.slice(0, 10);
          console.log(`[Radio] Deezer radio OK — ${tracks.length} suggestions`);
        }
      } catch (err) {
        console.warn(`[Radio] Deezer radio échoué: ${err.message}`);
      }
    }

    if (!tracks || tracks.length === 0) {
      console.warn('[Radio] Aucune suggestion disponible.');
      return;
    }

    setSuggestions(tracks);

    const newQueue = [track, ...tracks];
    setCurrentQueue(newQueue);
    queueRef.current    = newQueue;
    setCurrentQueueIndex(0);
    queueIdxRef.current = 0;

    // Prefetch immédiat des 3 premiers de la nouvelle liste
    prefetchNext(newQueue, 0);

    // Si appelé en fin de queue → lancer automatiquement la 1ère suggestion
    if (autoPlay && newQueue[1]) {
      playTrackAtIndex(newQueue, 1);
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
