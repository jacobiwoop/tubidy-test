import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import TrackPlayer, {
  usePlaybackState,
  State,
  Capability,
  Event,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { getArtistNames } from '../utils/formatters';
import { getFavorites, saveFavorite } from '../utils/favorites';
import { getPlaylists, removeTrackFromPlaylist } from '../utils/playlists';
import { getDownloadMetadata, deleteDownload, isTrackDownloaded, startDownload, getTrackPath } from '../utils/downloader';
import { getTrackDownload, getTrackRadio, getTrack, BASE_URL } from '../services/api';
import { triggerHaptic } from '../utils/haptics';
import StatsService from '../services/StatsService';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// ─── Modes de lecture ────────────────────────────────────────────────────────
export const REPEAT_MODE = {
  STOP_CURRENT: 0, // S'arrête juste après l'élément en cours
  LOOP_ALL: 1,     // Parcourt toute la liste et reprend en boucle
  PLAY_ALL_ONCE: 2 // Parcourt la liste une fois et s'arrête
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
  const [recentlyPlayed, setRecentlyPlayed]   = useState([]);
  const [activeDownloads, setActiveDownloads] = useState({});
  const [loadingTrackId, setLoadingTrackId]   = useState(null);
  const [currentQueue, setCurrentQueue]       = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [suggestions, setSuggestions]         = useState([]);
  const [musicDNA, setMusicDNA]               = useState(null);
  const [followedAlbums, setFollowedAlbums]   = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [downloadingItems, setDownloadingItems] = useState({}); // { trackId: trackObj }
  const [enrichedMetadata, setEnrichedMetadata] = useState({}); // { trackId: fullTrackData }
  const [refreshingChosicCookie, setRefreshingChosicCookie] = useState(false);

  // ─── Chargement initial & Persistance ──────────────────────────────────────
  useEffect(() => {
    const initHistory = async () => {
      try {
        const history = await AsyncStorage.getItem('@spotiwoop_history');
        if (history) setRecentlyPlayed(JSON.parse(history));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    };
    initHistory();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@spotiwoop_history', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  useEffect(() => {
    const initAlbums = async () => {
      const saved = await AsyncStorage.getItem('@spotiwoop_followed_albums');
      if (saved) setFollowedAlbums(JSON.parse(saved));
    };
    initAlbums();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@spotiwoop_followed_albums', JSON.stringify(followedAlbums));
  }, [followedAlbums]);

  const toggleFollowAlbum = (album) => {
    if (!album) return;
    triggerHaptic('impactLight');
    setFollowedAlbums(prev => {
      const isFollowed = prev.some(a => String(a.id) === String(album.id));
      if (isFollowed) {
        return prev.filter(a => String(a.id) !== String(album.id));
      } else {
        return [album, ...prev];
      }
    });
  };

  useEffect(() => {
    const initArtists = async () => {
      const saved = await AsyncStorage.getItem('@spotiwoop_followed_artists');
      if (saved) setFollowedArtists(JSON.parse(saved));
    };
    initArtists();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@spotiwoop_followed_artists', JSON.stringify(followedArtists));
  }, [followedArtists]);

  const toggleFollowArtist = (artist) => {
    if (!artist) return;
    triggerHaptic('impactLight');
    setFollowedArtists(prev => {
      const isFollowed = prev.some(a => String(a.id) === String(artist.id));
      if (isFollowed) {
        return prev.filter(a => String(a.id) !== String(artist.id));
      } else {
        return [{ id: artist.id, name: artist.name, picture_medium: artist.picture_medium }, ...prev];
      }
    });
  };

  const addToHistory = useCallback((track) => {
    if (!track) return;
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const updated = [track, ...filtered];
      return updated.slice(0, 50);
    });
  }, []);

  // Musique source de la radio (celle choisie par l'user depuis la recherche)
  // Affichée en haut du QueueModal, réinitialisée à chaque choix manuel
  const [radioSource, setRadioSource]         = useState(null);

  // Modes de lecture (exposés à l'UI)
  const [isShuffle, setIsShuffle]   = useState(true);
  const [repeatMode, setRepeatMode] = useState(REPEAT_MODE.LOOP_ALL);

  // Refs pour les callbacks headless / event listeners (évite les stale closures)
  const shuffleRef    = useRef(true);
  const repeatRef     = useRef(REPEAT_MODE.LOOP_ALL);
  const queueRef      = useRef([]);
  const queueIdxRef   = useRef(0);
  const currentTrackRef = useRef(null);
  const nativeQueueRefreshingRef = useRef(false);
  const resolvedTrackByLogicalIndexRef = useRef({});
  const lastRecordedPlaybackRef = useRef(null);

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
        await TrackPlayer.setupPlayer({
          minBuffer: 50,
          maxBuffer: 120,
          playBuffer: 10,
          backBuffer: 30,
        });
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

  const getTrackCacheKey = useCallback((track) => String(track?.id || ''), []);

  const toPlayerTrack = useCallback((track, url, logicalIndex) => ({
    id: `${String(track.id)}:${logicalIndex}`,
    url,
    title: track.title,
    artist: getArtistNames(track),
    artwork: track.artwork || track.album?.cover_big || track.album?.cover_medium || track.thumbnail,
    duration: track.duration,
    artist_id: track.artist?.id || track.artist_id,
    album_id: track.album?.id,
    sourceId: String(track.id),
    logicalIndex,
  }), []);

  const resolvePlayableTrack = useCallback(async (track, logicalIndex, options = {}) => {
    if (!track) return null;

    let finalTrack = track;
    let finalLink = null;
    const cacheKey = getTrackCacheKey(track);
    const isDownloaded = downloads.some(d => String(d.id) === String(track.id));

    if (options.enrichMetadata && (!track.contributors || track.contributors.length === 0)) {
      try {
        const fullData = await getTrack(track.id);
        if (fullData && fullData.contributors) {
          finalTrack = { ...track, ...fullData };
        }
      } catch (e) {
        console.warn(`[Metadata] Failed to enrich ${track.title}:`, e.message);
      }
    }

    const cached = prefetchCache.current[cacheKey];
    if (cached && cached.expires > Date.now()) {
      finalLink = cached.link;
    }

    const physicallyExists = await isTrackDownloaded(finalTrack);
    if (physicallyExists) {
      finalLink = getTrackPath(finalTrack);
      const updatedDownloads = await getDownloadMetadata();
      const localTrack = updatedDownloads.find(d => String(d.id) === String(finalTrack.id));

      if (localTrack) {
        finalTrack = { ...localTrack, localUri: finalLink };
        if (downloads.find(d => String(d.id) === String(finalTrack.id))?.localUri !== localTrack.localUri) {
          setDownloads(updatedDownloads);
        }
      } else {
        finalTrack = { ...finalTrack, localUri: finalLink };
      }
    } else if (isDownloaded) {
      console.warn(`[Local] Metadata found but file missing for: ${finalTrack.title}`);
    }

    if (!finalLink && (String(finalTrack.id).startsWith('lfm-') || String(finalTrack.id).startsWith('cho-'))) {
      const q = `${finalTrack.title} ${finalTrack.artist?.name || finalTrack.artist}`;
      const res = await axios.get(`${BASE_URL}/search/play`, { params: { q } });
      if (res.data?.link) {
        finalLink = res.data.link;
        finalTrack = { ...finalTrack, title: res.data.title || finalTrack.title };
      }
    }

    if (!finalLink) {
      const dl = await getTrackDownload(finalTrack.id);
      finalLink = dl?.target?.link || dl?.link;
    }

    if (!finalLink) return null;

    prefetchCache.current[cacheKey] = { link: finalLink, expires: Date.now() + 600000 };
    resolvedTrackByLogicalIndexRef.current[logicalIndex] = finalTrack;

    return {
      logicalIndex,
      finalTrack,
      playerTrack: toPlayerTrack(finalTrack, finalLink, logicalIndex),
    };
  }, [downloads, getTrackCacheKey, toPlayerTrack]);

  const getUpcomingIndexes = useCallback((queue, currentIndex, count = 3) => {
    if (!queue || queue.length <= 1 || repeatRef.current === REPEAT_MODE.STOP_CURRENT) return [];

    if (shuffleRef.current) {
      const pool = queue
        .map((_, index) => index)
        .filter(index => index !== currentIndex);
      const picks = [];

      while (pool.length > 0 && picks.length < count) {
        const poolIndex = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(poolIndex, 1)[0]);
      }

      return picks;
    }

    const indexes = [];
    for (let step = 1; step <= count; step++) {
      let nextIndex = currentIndex + step;

      if (nextIndex >= queue.length) {
        if (repeatRef.current === REPEAT_MODE.LOOP_ALL) {
          nextIndex = nextIndex % queue.length;
        } else {
          break;
        }
      }

      indexes.push(nextIndex);
    }

    return indexes;
  }, []);

  const recordActivePlayback = useCallback((track, logicalIndex) => {
    if (!track) return;
    const playbackKey = `${String(track.id)}:${logicalIndex}`;
    if (lastRecordedPlaybackRef.current === playbackKey) return;
    lastRecordedPlaybackRef.current = playbackKey;

    addToHistory(track);
    StatsService.recordTrackPlay(track).then(() => refreshDNA());
  }, [addToHistory]);

  const ensureNativeUpcomingQueue = useCallback(async (queue, logicalIndex) => {
    if (nativeQueueRefreshingRef.current || !queue || !queue[logicalIndex]) return;
    nativeQueueRefreshingRef.current = true;

    try {
      const upcomingIndexes = getUpcomingIndexes(queue, logicalIndex, 3);
      const upcomingTracks = [];

      for (const upcomingIndex of upcomingIndexes) {
        try {
          const playable = await resolvePlayableTrack(queue[upcomingIndex], upcomingIndex);
          if (playable?.playerTrack) upcomingTracks.push(playable.playerTrack);
        } catch (e) {
          console.log(`[NativeQueue] Failed to prepare ${queue[upcomingIndex]?.title}: ${e.message}`);
        }
      }

      await TrackPlayer.removeUpcomingTracks();
      if (upcomingTracks.length > 0) {
        await TrackPlayer.add(upcomingTracks);
      }

    } catch (e) {
      console.warn('[NativeQueue] ensure upcoming failed:', e.message);
    } finally {
      nativeQueueRefreshingRef.current = false;
    }
  }, [getUpcomingIndexes, resolvePlayableTrack]);

  const loadNativeQueueFrom = useCallback(async (queue, logicalIndex, options = {}) => {
    const current = queue?.[logicalIndex];
    if (!current) return null;

    resolvedTrackByLogicalIndexRef.current = {};
    const currentPlayable = await resolvePlayableTrack(current, logicalIndex, { enrichMetadata: true });
    if (!currentPlayable?.playerTrack) return null;

    const upcomingIndexes = getUpcomingIndexes(queue, logicalIndex, 3);
    const playerTracks = [currentPlayable.playerTrack];

    for (const upcomingIndex of upcomingIndexes) {
      try {
        const playable = await resolvePlayableTrack(queue[upcomingIndex], upcomingIndex);
        if (playable?.playerTrack) playerTracks.push(playable.playerTrack);
      } catch (e) {
        console.log(`[NativeQueue] Failed to preload ${queue[upcomingIndex]?.title}: ${e.message}`);
      }
    }

    await TrackPlayer.reset();
    await TrackPlayer.add(playerTracks);

    setCurrentTrack(currentPlayable.finalTrack);
    currentTrackRef.current = currentPlayable.finalTrack;
    setCurrentQueueIndex(logicalIndex);
    queueIdxRef.current = logicalIndex;

    if (options.autoPlay !== false) {
      await TrackPlayer.play();
    }

    recordActivePlayback(currentPlayable.finalTrack, logicalIndex);
    return currentPlayable.finalTrack;
  }, [getUpcomingIndexes, recordActivePlayback, resolvePlayableTrack]);

  const playLogicalIndex = useCallback(async (logicalIndex, options = {}) => {
    const queue = queueRef.current;
    if (!queue || !queue[logicalIndex]) return false;

    try {
      const nativeQueue = await TrackPlayer.getQueue();
      const nativeIndex = nativeQueue.findIndex(track => Number(track.logicalIndex) === logicalIndex);
      if (nativeIndex >= 0 && !options.forceReload) {
        await TrackPlayer.skip(nativeIndex);
        if (options.autoPlay !== false) await TrackPlayer.play();
        return true;
      }

      const activeTrack = await loadNativeQueueFrom(queue, logicalIndex, options);
      return Boolean(activeTrack);
    } catch (e) {
      console.error('[NativeQueue] play index error:', e.message);
      return false;
    }
  }, [loadNativeQueueFrom]);

  useTrackPlayerEvents(
    [Event.PlaybackActiveTrackChanged, Event.PlaybackQueueEnded],
    async (event) => {
      if (event.type === Event.PlaybackActiveTrackChanged) {
        const logicalIndex = Number(event.track?.logicalIndex);
        const queue = queueRef.current;

        if (!Number.isFinite(logicalIndex) || !queue?.[logicalIndex]) return;

        const activeTrack = resolvedTrackByLogicalIndexRef.current[logicalIndex] || queue[logicalIndex];
        setCurrentTrack(activeTrack);
        currentTrackRef.current = activeTrack;
        setCurrentQueueIndex(logicalIndex);
        queueIdxRef.current = logicalIndex;
        recordActivePlayback(activeTrack, logicalIndex);
        ensureNativeUpcomingQueue(queue, logicalIndex);
        return;
      }

      if (event.type === Event.PlaybackQueueEnded) {
        const queue = queueRef.current;
        const idx = queueIdxRef.current;

        if (!queue.length || repeatRef.current !== REPEAT_MODE.LOOP_ALL) {
          await TrackPlayer.pause();
          return;
        }

        const nextIndex = getNextIndex(queue, idx, shuffleRef.current);
        playLogicalIndex(nextIndex, { preserveRadioSource: true });
      }
    }
  );

  // ─── Lecture principale ────────────────────────────────────────────────────
  const handlePlayTrack = async (track, queue = [], forceIndex = null, options = {}) => {
    if (!track) return false;
    const preserveRadioSource = Boolean(options.preserveRadioSource);

    try {
      triggerHaptic('impactMedium');

      setCurrentTrack(track);
      currentTrackRef.current = track;
      setLoadingTrackId(track.id);

      let newQueue = (queue && queue.length > 0) ? queue : [track];
      const hasProvidedQueue = Array.isArray(queue) && queue.length > 1;
      let generatedRadioQueue = false;

      if (!queue || queue.length <= 1) {
        try {
          const res = await axios.get(`${BASE_URL}/chosic/recommend`, {
            params: {
              artist: track.artist?.name || track.artist,
              track: track.title,
              limit: 15
            }
          });
          if (res.data && res.data.track) {
            const suggs = res.data.track.slice(0, 15).map(t => ({ ...t, isSuggestion: true }));
            newQueue = [track, ...suggs];
            generatedRadioQueue = suggs.length > 0;
          }
        } catch (e) {
          console.warn('[Queue] Failed to auto-fill milieu (Chosic):', e.message);
        }
      }

      const hasRadioSuggestions = newQueue.some(t => t.isSuggestion);
      const isRadioSeedPlayback = !preserveRadioSource && !hasProvidedQueue && generatedRadioQueue;
      const isListPlayback = !preserveRadioSource && hasProvidedQueue && !hasRadioSuggestions;

      const newIdx = forceIndex !== null
        ? forceIndex
        : Math.max(0, newQueue.findIndex(t => String(t.id) === String(track.id)));

      setCurrentQueue(newQueue);
      queueRef.current = newQueue;
      setCurrentQueueIndex(newIdx);
      queueIdxRef.current = newIdx;

      if (isRadioSeedPlayback) {
        setRadioSource(track);
      } else if (isListPlayback) {
        setRadioSource(null);
      }

      setSuggestions(hasRadioSuggestions ? newQueue.filter(t => t.isSuggestion) : []);
      lastRecordedPlaybackRef.current = null;
      const activeTrack = await loadNativeQueueFrom(newQueue, newIdx);
      if (!activeTrack) {
        alert('Lien non disponible');
        return false;
      }

      return true;
    } catch (err) {
      console.error('handlePlayTrack error:', err);
      return false;
    } finally {
      setLoadingTrackId(null);
    }
  };

  // ─── Next / Prev depuis l'UI (boutons PlayerScreen) ───────────────────────
  const handleNext = useCallback(async () => {
    const queue = queueRef.current;
    const idx = queueIdxRef.current;

    if (!queue.length) return;
    triggerHaptic('selection');

    try {
      await TrackPlayer.skipToNext();
      return;
    } catch (_) {}

    const isLast = !shuffleRef.current && idx >= queue.length - 1;
    if (isLast && repeatRef.current !== REPEAT_MODE.LOOP_ALL) {
      await TrackPlayer.pause();
      return;
    }

    const nextIdx = isLast ? 0 : getNextIndex(queue, idx, shuffleRef.current);
    playLogicalIndex(nextIdx, { preserveRadioSource: true });
  }, [getNextIndex, playLogicalIndex]);

  const handlePrevious = useCallback(async () => {
    const queue = queueRef.current;
    const idx = queueIdxRef.current;

    if (!queue.length) return;
    triggerHaptic('selection');

    try {
      await TrackPlayer.skipToPrevious();
      return;
    } catch (_) {}

    const prevIdx = getPrevIndex(queue, idx, shuffleRef.current);
    playLogicalIndex(prevIdx, { preserveRadioSource: true });
  }, [getPrevIndex, playLogicalIndex]);

  // ─── Shuffle / Repeat toggles ──────────────────────────────────────────────
  const toggleShuffle = useCallback(() => {
    triggerHaptic('selection');
    const nextShuffle = !shuffleRef.current;
    shuffleRef.current = nextShuffle;
    setIsShuffle(nextShuffle);
    ensureNativeUpcomingQueue(queueRef.current, queueIdxRef.current);
  }, [ensureNativeUpcomingQueue]);

  const cycleRepeatMode = useCallback(() => {
    triggerHaptic('selection');
    const nextRepeat = (repeatRef.current + 1) % 3;
    repeatRef.current = nextRepeat;
    setRepeatMode(nextRepeat);
    ensureNativeUpcomingQueue(queueRef.current, queueIdxRef.current);
  }, [ensureNativeUpcomingQueue]);

  // ─── Play/Pause & Stop ───────────────────────────────────────────────────
  const togglePlay = async () => {
    if (playbackState.state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
    triggerHaptic('impactLight');
  };

  const stopPlayer = async () => {
    try {
      await TrackPlayer.reset();
      setCurrentTrack(null);
      setCurrentQueue([]);
      setCurrentQueueIndex(0);
      setRadioSource(null);
      setLoadingTrackId(null);
      queueRef.current = [];
      queueIdxRef.current = 0;
      resolvedTrackByLogicalIndexRef.current = {};
      lastRecordedPlaybackRef.current = null;
      triggerHaptic('notificationSuccess');
    } catch (e) {
      console.error('stopPlayer error:', e);
    }
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
  const fetchRecommendations = async (track, autoPlay = false, skipQueueUpdate = false) => {
    let statusPoll = null;
    try {
      console.log(`[Radio] Fetching suggestions for: ${track.title}`);
      let tracks = [];
      setRefreshingChosicCookie(false);
      
      // Essai Chosic avec timeout 8s
      try {
        statusPoll = setInterval(async () => {
          try {
            const status = await axios.get(`${BASE_URL}/chosic/status`, { timeout: 3000 });
            setRefreshingChosicCookie(Boolean(status.data?.refreshingCookie));
          } catch (_) {}
        }, 1500);

        const res = await axios.get(`${BASE_URL}/chosic/recommend`, {
          params: { artist: track.artist?.name || track.artist, track: track.title },
          timeout: 240000
        });
        tracks = (res.data?.track || []).map(t => ({ ...t, isSuggestion: true }));
      } catch (e) {
        console.warn('[Radio] Chosic failed, trying Deezer fallback...');
        try {
          const res = await getTrackRadio(track.id);
          // Deezer renvoie souvent { data: [...] }
          const rawTracks = Array.isArray(res) ? res : (res?.data || []);
          tracks = rawTracks.map(t => ({ ...t, isSuggestion: true }));
        } catch (err) {
          console.error('[Radio] Deezer fallback also failed:', err);
          tracks = [];
        }
      }

      if (!tracks || tracks.length === 0) return;

      setSuggestions(tracks);

      // Si on ne veut pas écraser la queue (ex: clic depuis recherche), on s'arrête là
      if (skipQueueUpdate) return;

      const newQueue = [track, ...tracks];
      setCurrentQueue(newQueue);
      queueRef.current    = newQueue;
      setCurrentQueueIndex(0);
      queueIdxRef.current = 0;

      ensureNativeUpcomingQueue(newQueue, 0);

      // Si appelé en fin de queue → lancer automatiquement la 1ère suggestion
      if (autoPlay && newQueue[1]) {
        handlePlayTrack(newQueue[1], newQueue, 1, { preserveRadioSource: true });
      }
    } catch (err) {
      console.error('[Radio] Recommendation error:', err.message);
    } finally {
      if (statusPoll) clearInterval(statusPoll);
      setRefreshingChosicCookie(false);
    }
  };

  // ─── ActionSheet Global State ──────────────────────────────────────────────
  const [actionSheet, setActionSheet] = useState({
    visible: false,
    data: null,
    type: 'track', // 'track', 'album', 'artist', 'playlist'
    context: null  // { playlistId: '...' }
  });

  const openActionSheet = useCallback((data, type = 'track', context = null) => {
    triggerHaptic('impactLight');
    setActionSheet({ visible: true, data, type, context });
  }, []);

  const closeActionSheet = useCallback(() => {
    setActionSheet(prev => ({ ...prev, visible: false }));
  }, []);

  const onRemoveFromPlaylist = useCallback(async (trackId, playlistId) => {
    try {
      await removeTrackFromPlaylist(playlistId, trackId);
      await loadPlaylists(); // Recharger les playlists
      triggerHaptic('notificationSuccess');
    } catch (e) {
      console.error('[Playlist] removal error:', e);
    }
  }, []);

  // ─── Gestion avancée de la File d'attente ──────────────────────────────────
  const playNext = useCallback(async (track) => {
    try {
      const baseQueue = queueRef.current.length ? queueRef.current : currentQueue;
      if (!baseQueue.length) {
        await handlePlayTrack(track);
        closeActionSheet();
        return;
      }

      const activeIndex = queueIdxRef.current;
      const newQueue = [...baseQueue];
      const insertIdx = activeIndex + 1;
      newQueue.splice(insertIdx, 0, track);
      
      setCurrentQueue(newQueue);
      queueRef.current = newQueue;
      await ensureNativeUpcomingQueue(newQueue, activeIndex);
      triggerHaptic('notificationSuccess');
      closeActionSheet();
    } catch (e) {
      console.error('[Queue] playNext error:', e);
    }
  }, [currentQueue, ensureNativeUpcomingQueue]);

  const addToQueue = useCallback(async (track) => {
    try {
      const baseQueue = queueRef.current.length ? queueRef.current : currentQueue;
      if (!baseQueue.length) {
        await handlePlayTrack(track);
        closeActionSheet();
        return;
      }

      const activeIndex = queueIdxRef.current;
      const newQueue = [...baseQueue, track];
      setCurrentQueue(newQueue);
      queueRef.current = newQueue;
      await ensureNativeUpcomingQueue(newQueue, activeIndex);
      triggerHaptic('notificationSuccess');
      closeActionSheet();
    } catch (e) {
      console.error('[Queue] addToQueue error:', e);
    }
  }, [currentQueue, ensureNativeUpcomingQueue]);

  const removeFromQueue = useCallback(async (index) => {
    try {
      const activeIndex = queueIdxRef.current;
      const baseQueue = queueRef.current.length ? queueRef.current : currentQueue;

      if (index === activeIndex) {
        triggerHaptic('notificationError');
        return;
      }

      const newQueue = [...baseQueue];
      newQueue.splice(index, 1);
      const nextActiveIndex = index < activeIndex ? Math.max(0, activeIndex - 1) : activeIndex;

      setCurrentQueue(newQueue);
      queueRef.current = newQueue;
      setCurrentQueueIndex(nextActiveIndex);
      queueIdxRef.current = nextActiveIndex;
      await ensureNativeUpcomingQueue(newQueue, nextActiveIndex);
      triggerHaptic('impactLight');
    } catch (e) {
      console.error('[Queue] removeFromQueue error:', e);
    }
  }, [currentQueue, ensureNativeUpcomingQueue]);

  // ─── Loaders ───────────────────────────────────────────────────────────────
  const loadFavorites = async () => { setFavorites((await getFavorites()) || []); };
  const loadPlaylists = async () => { setPlaylists((await getPlaylists()) || []); };
  const loadDownloads = async () => { setDownloads((await getDownloadMetadata()) || []); };

  const playerStatus = React.useMemo(() => ({
    playing: playbackState.state === State.Playing,
    loading: playbackState.state === State.Buffering || playbackState.state === State.Loading,
  }), [playbackState.state]);

  // ─── Enrichissement des Métadonnées ─────────────────────────────────────────
  const enrichTracks = useCallback(async (tracks) => {
    if (!tracks || !Array.isArray(tracks)) return;
    
    // On traite tous les morceaux qui ne sont pas encore en cache HD
    const tracksToProcess = tracks.filter(t => 
      t && t.id && !enrichedMetadata[String(t.id)]
    );

    if (tracksToProcess.length === 0) return;

    // --- Vague 1 : Les 3 premiers en simultané (Ultra-rapide pour le haut de liste) ---
    const firstWave = tracksToProcess.slice(0, 3);
    const remaining = tracksToProcess.slice(3);

    const enrichTrackInternal = async (track) => {
      try {
        const fullData = await getTrack(track.id);
        if (fullData && fullData.contributors) {
          const trackIdStr = String(track.id);
          setEnrichedMetadata(prev => ({ ...prev, [trackIdStr]: fullData }));
        }
      } catch (e) {}
    };

    // On lance la première vague immédiatement
    Promise.all(firstWave.map(t => enrichTrackInternal(t)));

    // --- Vague 2 : Le reste en séquence pour ne pas saturer ---
    for (let i = 0; i < remaining.length; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 200));
        await enrichTrackInternal(remaining[i]);
      } catch (e) {}
    }
  }, [enrichedMetadata]);

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      playerStatus,
      favorites,
      playlists,
      downloads,
      recentlyPlayed,
      activeDownloads,
      loadingTrackId,
      onPlayTrack:      handlePlayTrack,
      onTogglePlay:     togglePlay,
      onStop:           stopPlayer,
      onToggleFavorite: toggleFavorite,
      onNext:           handleNext,
      onPrevious:       handlePrevious,
      loadPlaylists,
      loadFavorites,
      loadDownloads,
      currentQueue,
      currentQueueIndex,
      suggestions,
      refreshingChosicCookie,
      radioSource,
      musicDNA,
      setActiveDownloads,
      refreshDNA,
      // Modes de lecture
      isShuffle,
      repeatMode,
      toggleShuffle,
      cycleRepeatMode,
      followedAlbums,
      onToggleFollowAlbum: toggleFollowAlbum,
      followedArtists,
      onToggleFollowArtist: toggleFollowArtist,
      downloadingItems,
      enrichedMetadata,
      enrichTracks,
      onRemoveDownload: async (track) => {
        await deleteDownload(track);
        loadDownloads();
        triggerHaptic('notificationSuccess');
      },
      onDownload: async (track) => {
        if (activeDownloads[track.id] !== undefined) return;
        const exists = await isTrackDownloaded(track);
        if (exists) {
          loadDownloads();
          return;
        }
        try {
          setActiveDownloads(prev => ({ ...prev, [track.id]: 0 }));
          setDownloadingItems(prev => ({ ...prev, [track.id]: track }));
          const dl = await getTrackDownload(track.id);
          const link = dl?.target?.link || dl?.link;
          if (!link) return;
          await startDownload(track, link, (progress) => {
            setActiveDownloads(prev => ({ ...prev, [track.id]: progress }));
          });
          loadDownloads();
        } catch (e) {
          console.error('Download failed', e);
        } finally {
          setActiveDownloads(prev => { const n = { ...prev }; delete n[track.id]; return n; });
          setDownloadingItems(prev => { const n = { ...prev }; delete n[track.id]; return n; });
        }
      },
      onDownloadBatch: async (tracks) => {
        if (!tracks || tracks.length === 0) return;
        triggerHaptic('notificationSuccess');

        // Filtrer les morceaux déjà téléchargés ou en cours
        const toDownload = [];
        for (const track of tracks) {
          if (activeDownloads[track.id] !== undefined) continue;
          const exists = await isTrackDownloaded(track);
          if (!exists) toDownload.push(track);
        }

        if (toDownload.length === 0) return;

        // ✅ Pré-inscrire TOUS les morceaux dans le flux AVANT de commencer
        // → L'UI voit tout d'un coup
        const initialItems = {};
        const initialProgress = {};
        toDownload.forEach(track => {
          initialItems[track.id] = track;
          initialProgress[track.id] = 0;
        });
        setDownloadingItems(prev => ({ ...prev, ...initialItems }));
        setActiveDownloads(prev => ({ ...prev, ...initialProgress }));

        // Téléchargement séquentiel
        for (const track of toDownload) {
          try {
            const dl = await getTrackDownload(track.id);
            const link = dl?.target?.link || dl?.link;
            if (link) {
              await startDownload(track, link, (progress) => {
                setActiveDownloads(prev => ({ ...prev, [track.id]: progress }));
              });
            }
          } catch (e) {
            console.error('Batch item failed', e);
          } finally {
            // Retirer uniquement ce morceau une fois terminé
            setActiveDownloads(prev => { const n = { ...prev }; delete n[track.id]; return n; });
            setDownloadingItems(prev => { const n = { ...prev }; delete n[track.id]; return n; });
            loadDownloads();
          }
        }
      },
      // Couleurs statiques (image-colors désactivé)
      currentColors: { primary: '#1DB954', secondary: '#111', background: '#000' },

      // ActionSheet & Queue management
      actionSheet,
      openActionSheet,
      closeActionSheet,
      playNext,
      addToQueue,
      removeFromQueue,
      onRemoveFromPlaylist
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
