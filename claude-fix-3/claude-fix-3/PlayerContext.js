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
import { getDownloadMetadata } from '../utils/downloader';
import { getTrackDownload, BASE_URL } from '../services/api';
import { triggerHaptic } from '../utils/haptics';
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

  // Musique source de la radio (celle choisie par l'user depuis la recherche)
  // Affichée en haut du QueueModal, réinitialisée à chaque choix manuel
  const [radioSource, setRadioSource]         = useState(null);

  // Modes de lecture (exposés à l'UI)
  const [isShuffle, setIsShuffle]   = useState(false);
  const [repeatMode, setRepeatMode] = useState(REPEAT_MODE.NONE);

  // Refs pour les callbacks headless / event listeners (évite les stale closures)
  const shuffleRef    = useRef(false);
  const repeatRef     = useRef(REPEAT_MODE.NONE);
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
    })();
  }, []);

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

  // ─── Joue un morceau de la queue par index (interne) ──────────────────────
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

      // ── Résolution du lien (appel réseau) ──────────────────────────────────
      let finalTrack = track;
      let finalLink  = null;

      if (String(track.id).startsWith('lfm-')) {
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
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id:       String(finalTrack.id),
        url:      finalLink,
        title:    finalTrack.title,
        artist:   finalTrack.artist?.name || finalTrack.artist,
        artwork:  finalTrack.album?.cover_medium || finalTrack.thumbnail,
        duration: finalTrack.duration,
      });
      await TrackPlayer.play();

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
      const res = await axios.get(`${BASE_URL}/recommend`, {
        params: { artist: track.artist?.name || track.artist, track: track.title },
      });
      const tracks = res.data?.track;
      if (!tracks || tracks.length === 0) return;

      setSuggestions(tracks);

      const newQueue = [track, ...tracks];
      setCurrentQueue(newQueue);
      queueRef.current    = newQueue;
      setCurrentQueueIndex(0);
      queueIdxRef.current = 0;

      // Si appelé en fin de queue → lancer automatiquement la 1ère suggestion
      if (autoPlay && newQueue[1]) {
        playTrackAtIndex(newQueue, 1);
      }
    } catch (_) {}
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
      setActiveDownloads,
      // Modes de lecture
      isShuffle,
      repeatMode,
      toggleShuffle,
      cycleRepeatMode,
      // Couleurs statiques (image-colors désactivé)
      currentColors: { primary: '#1DB954', secondary: '#111', background: '#000' },
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
