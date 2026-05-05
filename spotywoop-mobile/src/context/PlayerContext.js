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
import { getDownloadMetadata, deleteDownload, isTrackDownloaded, startDownload } from '../utils/downloader';
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

      // Fin naturelle du morceau (Transition automatique)
      if ((event.type === Event.PlaybackTrackChanged && event.nextTrack == null) || event.type === Event.PlaybackQueueEnded) {
        // Mode 0: Désactivation -> S'arrête juste après l'élément en cours
        if (repeat === REPEAT_MODE.STOP_CURRENT) {
          await TrackPlayer.pause();
          return;
        }

        const isLast = !shuffle && idx >= queue.length - 1;

        if (isLast) {
          if (repeat === REPEAT_MODE.LOOP_ALL) {
            // Mode 1: Boucle -> Reprend au début
            playFn(queue[0], queue, 0);
          } else if (repeat === REPEAT_MODE.PLAY_ALL_ONCE) {
            // Mode 2: Tout lire une fois -> S'arrête à la fin de la liste
            await TrackPlayer.pause();
          }
          return;
        }

        // Cas normal ou Aléatoire
        const nextIdx = getNextIndex(queue, idx, shuffle);
        playFn(queue[nextIdx], queue, nextIdx);
        return;
      }

      // Bouton Suivant (Skip manuel)
      if (event.type === Event.RemoteNext) {
        const isLast = !shuffle && idx >= queue.length - 1;
        
        if (isLast) {
          if (repeat === REPEAT_MODE.LOOP_ALL) {
            playFn(queue[0], queue, 0);
          } else {
            // On s'arrête si on est au dernier et pas en boucle
            await TrackPlayer.pause();
          }
        } else {
          const nextIdx = getNextIndex(queue, idx, shuffle);
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
    if (!track) return false;
    
    addToHistory(track);

    try {
      triggerHaptic('impactMedium');

      // ── Optimistic update immédiat ──────────────────────────────────────────
      setCurrentTrack(track);
      currentTrackRef.current = track;
      setLoadingTrackId(track.id);

      // Détermination de la queue "Milieu"
      let newQueue = (queue && queue.length > 0) ? queue : [track];
      
      // Si la queue est vide ou ne contient que le titre (contexte Isolé)
      // On fetch immédiatement des suggestions pour créer un milieu
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
          }
        } catch (e) {
          console.warn('[Queue] Failed to auto-fill milieu (Chosic):', e.message);
        }
      }

      const newIdx = forceIndex !== null
        ? forceIndex
        : Math.max(0, newQueue.findIndex(t => t.id === track.id));

      setCurrentQueue(newQueue);
      queueRef.current    = newQueue;
      setCurrentQueueIndex(newIdx);
      queueIdxRef.current = newIdx;

      // On définit toujours la source de la radio
      setRadioSource(track);
      
      // On met à jour l'état suggestions global pour l'UI
      setSuggestions(newQueue.filter(t => t.isSuggestion));

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

      // Enrichissement des métadonnées (Récupération des contributeurs complets)
      if (!isOffline && (!track.contributors || track.contributors.length === 0)) {
        try {
          const fullData = await getTrack(track.id);
          if (fullData && fullData.contributors) {
            finalTrack = { ...track, ...fullData };
            setCurrentTrack(finalTrack);
            currentTrackRef.current = finalTrack;
          }
        } catch (e) {
          console.warn(`[Metadata] Failed to enrich ${track.title}:`, e.message);
        }
      }

      // On vérifie d'abord le cache du prefetch
      const cached = prefetchCache.current[track.id];
      if (cached && cached.expires > Date.now()) {
        finalLink = cached.link;
        console.log(`[Cache] Hit for: ${track.title}`);
      }

      // Priorité absolue au fichier local si téléchargé (physiquement présent)
      const physicallyExists = await isTrackDownloaded(track);
      if (physicallyExists) {
        const albumFolder = track.album?.title ? `${track.album.title.replace(/[#%&{}\\<>*?/$!'":@+`|=]/g, '_')}/` : '';
        const DOWNLOAD_DIR = `file://${FileSystem.documentDirectory}downloads/${albumFolder}`;
        finalLink = `${DOWNLOAD_DIR}${track.id}.mp3`;
        console.log(`[Local] Playing from physical storage: ${track.title}`);
        
        // On cherche aussi l'artwork local s'il existe
        const localTrack = downloads.find(d => String(d.id) === String(track.id));
        if (localTrack) {
          finalTrack = { ...localTrack, localUri: finalLink };
        } else {
          finalTrack = { ...track, localUri: finalLink };
        }
      } else if (isDownloaded) {
        // Si les métadonnées disent "téléchargé" mais que le fichier a disparu
        console.warn(`[Local] Metadata found but file missing for: ${track.title}`);
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
        artist:   getArtistNames(finalTrack),
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

    const isLast = !shuffle && idx >= queue.length - 1;

    if (isLast) {
      if (repeat === REPEAT_MODE.LOOP_ALL) {
        handlePlayTrack(queue[0], queue, 0);
      } else {
        // Stop ou ne rien faire si on est au dernier et pas en boucle
        TrackPlayer.pause();
      }
    } else {
      const nextIdx = getNextIndex(queue, idx, shuffle);
      handlePlayTrack(queue[nextIdx], queue, nextIdx);
    }
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
      setRadioSource(null);
      setLoadingTrackId(null);
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
    try {
      console.log(`[Radio] Fetching suggestions for: ${track.title}`);
      let tracks = [];
      
      // Essai Chosic avec timeout 8s
      try {
        const res = await axios.get(`${BASE_URL}/chosic/recommend`, {
          params: { artist: track.artist?.name || track.artist, track: track.title },
          timeout: 8000
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
      const newQueue = [...currentQueue];
      // On insère juste après l'index actuel
      const insertIdx = currentQueueIndex + 1;
      newQueue.splice(insertIdx, 0, track);
      
      setCurrentQueue(newQueue);
      queueRef.current = newQueue;
      
      // On ajoute aussi au TrackPlayer physique
      await TrackPlayer.add(track, insertIdx);
      triggerHaptic('notificationSuccess');
      closeActionSheet();
    } catch (e) {
      console.error('[Queue] playNext error:', e);
    }
  }, [currentQueue, currentQueueIndex]);

  const addToQueue = useCallback(async (track) => {
    try {
      const newQueue = [...currentQueue, track];
      setCurrentQueue(newQueue);
      queueRef.current = newQueue;
      
      // On ajoute à la fin du TrackPlayer physique
      await TrackPlayer.add(track);
      triggerHaptic('notificationSuccess');
      closeActionSheet();
    } catch (e) {
      console.error('[Queue] addToQueue error:', e);
    }
  }, [currentQueue]);

  const removeFromQueue = useCallback(async (index) => {
    try {
      if (index === currentQueueIndex) {
        triggerHaptic('notificationError');
        return;
      }

      const newQueue = [...currentQueue];
      newQueue.splice(index, 1);

      setCurrentQueue(newQueue);
      queueRef.current = newQueue;

      await TrackPlayer.remove(index);
      triggerHaptic('impactLight');
    } catch (e) {
      console.error('[Queue] removeFromQueue error:', e);
    }
  }, [currentQueue, currentQueueIndex]);

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
        for (const track of tracks) {
          try {
            // On appelle directement la logique de download du contexte
            if (activeDownloads[track.id] !== undefined) continue;
            const exists = await isTrackDownloaded(track);
            if (exists) continue;

            setActiveDownloads(prev => ({ ...prev, [track.id]: 0 }));
            setDownloadingItems(prev => ({ ...prev, [track.id]: track }));
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
