import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform } from 'react-native';
import TrackPlayer, { usePlaybackState, useProgress, State } from 'react-native-track-player';
import { getFavorites, saveFavorite } from '../utils/favorites';
import { getPlaylists } from '../utils/playlists';
import { getDownloadMetadata } from '../utils/downloader';
import { getTrackDownload } from '../services/api';
import { triggerHaptic } from '../utils/haptics';
import { getColors } from 'react-native-image-colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PlayerContext = createContext();

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

export const PlayerProvider = ({ children }) => {
  const playbackState = usePlaybackState();
  const progress = useProgress();
  
  const [currentTrack, setCurrentTrack] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState({});
  const [loadingTrackId, setLoadingTrackId] = useState(null);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [currentQueue, setCurrentQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [currentColors, setCurrentColors] = useState({
    primary: '#1DB954',
    secondary: '#191414',
    background: '#000000'
  });

  const playerPos = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    const setup = async () => {
      try {
        await TrackPlayer.setupPlayer();
      } catch (e) {
        // Player already setup
      }
      loadFavorites();
      loadPlaylists();
      loadDownloads();
    };
    setup();
  }, []);

  useEffect(() => {
    Animated.spring(playerPos, {
      toValue: showFullPlayer ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      damping: 20,
      mass: 0.8,
      stiffness: 100,
    }).start();
  }, [showFullPlayer]);

  useEffect(() => {
    if (currentTrack) {
      updateColors(currentTrack.album?.cover_medium);
    }
  }, [currentTrack]);

  const updateColors = async (uri) => {
    if (!uri) return;
    try {
      const result = await getColors(uri, {
        fallback: '#1DB954',
        cache: true,
        key: uri,
      });

      if (Platform.OS === 'android') {
        setCurrentColors({
          primary: result.vibrant || result.dominant,
          secondary: result.darkVibrant || result.darkMuted,
          background: result.average || '#000'
        });
      } else {
        setCurrentColors({
          primary: result.primary,
          secondary: result.secondary,
          background: result.background
        });
      }
    } catch (e) {
      console.warn("Color extraction failed", e);
    }
  };

  const loadFavorites = async () => {
    const favs = await getFavorites();
    setFavorites(favs || []);
  };

  const loadPlaylists = async () => {
    const pl = await getPlaylists();
    setPlaylists(pl || []);
  };

  const loadDownloads = async () => {
    const dl = await getDownloadMetadata();
    setDownloads(dl || []);
  };

  const handlePlayTrack = async (track, queue = []) => {
    try {
      setLoadingTrackId(track.id);
      
      const downloadData = await getTrackDownload(track.id);
      const finalLink = downloadData?.target?.link || downloadData?.link;

      if (!finalLink) {
        alert("Lien non disponible");
        return;
      }

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: track.id,
        url: finalLink,
        title: track.title,
        artist: track.artist?.name,
        artwork: track.album?.cover_medium,
        duration: track.duration,
      });

      await TrackPlayer.play();
      triggerHaptic("impactMedium");
      setCurrentTrack(track);
      if (queue.length > 0) {
        setCurrentQueue(queue);
        const idx = queue.findIndex(t => t.id === track.id);
        setCurrentQueueIndex(idx !== -1 ? idx : 0);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handleNext = () => {
    if (currentQueue.length > 0 && currentQueueIndex < currentQueue.length - 1) {
      triggerHaptic("selection");
      const nextIndex = currentQueueIndex + 1;
      handlePlayTrack(currentQueue[nextIndex], currentQueue);
    }
  };

  const handlePrevious = () => {
    if (currentQueue.length > 0 && currentQueueIndex > 0) {
      const prevIndex = currentQueueIndex - 1;
      handlePlayTrack(currentQueue[prevIndex], currentQueue);
    }
  };

  const togglePlay = async () => {
    if (playbackState.state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
    triggerHaptic("impactLight");
  };

  const toggleFavorite = async (track) => {
    await saveFavorite(track);
    triggerHaptic("notificationSuccess");
    await loadFavorites();
  };

  const playerStatus = {
    playing: playbackState.state === State.Playing,
    loading: playbackState.state === State.Buffering || playbackState.state === State.Loading,
    duration: progress.duration,
    position: progress.position
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      playerStatus,
      favorites,
      playlists,
      downloads,
      activeDownloads,
      loadingTrackId,
      showFullPlayer,
      setShowFullPlayer,
      playerPos,
      onPlayTrack: handlePlayTrack,
      onTogglePlay: togglePlay,
      onToggleFavorite: toggleFavorite,
      onNext: handleNext,
      onPrevious: handlePrevious,
      loadPlaylists,
      loadFavorites,
      loadDownloads,
      currentQueue,
      currentQueueIndex,
      currentColors,
      setActiveDownloads
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
