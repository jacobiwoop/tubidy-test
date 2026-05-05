import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Image, TouchableOpacity,
  Dimensions, Platform, StatusBar, PanResponder, ActivityIndicator, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import TrackPlayer, {
  usePlaybackState,
  useProgress,
  State
} from 'react-native-track-player';
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronDown, MoreHorizontal, Heart, ListMusic,
  Shuffle, Repeat, ListPlus, Download, RotateCcw, Mic2, Trash2
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { BASE_URL, searchMusic } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../utils/theme';
import { REPEAT_MODE } from '../context/PlayerContext';
import LyricsView from '../components/LyricsView';

const { width } = Dimensions.get('window');

const formatTime = (ms) => {
  if (!ms || isNaN(ms)) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const PlayerScreen = ({
  track,
  status: propStatus,
  isFavorite,
  onToggleFavorite,
  onPlayPause,
  onNext,
  onPrevious,
  onDownload,
  onRemoveDownload,
  activeDownloads = {},
  downloads = [],
  playbackError,
  onRetry,
  onClose,
  onAddToPlaylist,
  onViewArtist,
  colors,
  onOpenQueue,
  // Modes de lecture (viennent du Context via App.js)
  isShuffle,
  repeatMode,
  onToggleShuffle,
  onCycleRepeat,
}) => {
  const playbackState = usePlaybackState();
  const progress      = useProgress();

  const [isSliding, setIsSliding]   = useState(false);
  const [slideValue, setSlideValue] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState([]);
  const [currentLyric, setCurrentLyric] = useState('');

  const lyricOpacity = useRef(new Animated.Value(1)).current;
  const lyricTranslateY = useRef(new Animated.Value(0)).current;

  const duration = (progress.duration ? progress.duration * 1000 : 0)
    || (track?.duration ? track.duration * 1000 : 0);
  const position = isSliding ? slideValue : (progress.position * 1000);

  const isPlaying    = playbackState.state === State.Playing;
  const isDownloaded = downloads.some(d => String(d.id) === String(track?.id));
  const isLoading    = playbackState.state === State.Buffering
    || playbackState.state === State.Loading
    || (track?.id === propStatus?.loadingTrackId);

  useEffect(() => { setSlideValue(0); }, [track?.id]);
  
  // ─── Récupération des paroles avec Cache Dual-Layer ───────────────────────
  useEffect(() => {
    const fetchLyrics = async () => {
      if (!track?.id) return;
      
      const cacheKey = `lyrics_${track.id}`;
      
      try {
        // 1. Vérifier le cache local (AsyncStorage)
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setLyrics(JSON.parse(cached));
          return;
        }

        // 2. Récupérer du serveur (qui a son propre cache DB)
        const res = await axios.get(`${BASE_URL}/lyrics`, {
          params: { 
            id: track.id,
            artist: track.artist?.name || track.artist,
            title: track.title,
            album: track.album?.title || track.album,
            duration: track.duration
          }
        });

        if (res.data?.synced) {
          const lines = res.data.synced.split('\n');
          const parsed = lines.map(line => {
            const match = /\[(\d+):(\d+\.\d+)\]/.exec(line);
            if (match) {
              return { 
                time: parseInt(match[1]) * 60 + parseFloat(match[2]), 
                text: line.replace(/\[.*\]/, '').trim() 
              };
            }
            return null;
          }).filter(Boolean);
          
          if (parsed.length > 0) {
            setLyrics(parsed);
            await AsyncStorage.setItem(cacheKey, JSON.stringify(parsed));
          } else {
            setLyrics([]);
          }
        } else {
          setLyrics([]);
        }
      } catch (e) {
        console.error('[Lyrics] Error:', e.message);
        setLyrics([]);
      }
    };

    fetchLyrics();
  }, [track?.id]);

  // ─── Synchro paroles (mini zone) ──────────────────────────────────────────
  useEffect(() => {
    if (lyrics.length > 0) {
      const line = lyrics.findLast(l => l.time <= progress.position);
      if (line && line.text !== currentLyric) {
        setCurrentLyric(line.text);
        
        // Animation de swipe vers le haut
        lyricOpacity.setValue(0);
        lyricTranslateY.setValue(10);
        Animated.parallel([
          Animated.spring(lyricOpacity, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
          Animated.spring(lyricTranslateY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
        ]).start();
      }
    } else {
      setCurrentLyric('');
    }
  }, [progress.position, lyrics]);

  const albumScale = useRef(new Animated.Value(isPlaying ? 1 : 0.85)).current;
  const pan     = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // ─── Animation album art (play/pause) ──────────────────────────────────────
  useEffect(() => {
    Animated.spring(albumScale, {
      toValue: isPlaying ? 1 : 0.85,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [isPlaying]);

  // ─── Drag to close ─────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dx) < Math.abs(g.dy),
      onPanResponderGrant: () => {
        pan.setOffset(pan._value);
        pan.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          pan.setValue(g.dy);
          // Fade progressif à partir de 80px de glissement
          const newOpacity = 1 - Math.max(0, Math.min(0.7, (g.dy - 80) / 280));
          opacity.setValue(newOpacity);
        }
      },
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        if (g.dy > 120 || g.vy > 0.8) {
          // Fermeture fluide
          Animated.parallel([
            Animated.timing(pan,     { toValue: 800, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration: 200, useNativeDriver: true }),
          ]).start(() => {
            onClose();
            pan.setValue(0);
            opacity.setValue(1);
          });
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(pan,     { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }),
            Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 60, friction: 12 }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        Animated.parallel([
          Animated.spring(pan,     { toValue: 0, useNativeDriver: true }),
          Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  // ─── Favoris (optimistic local) ────────────────────────────────────────────
  const [localIsFavorite, setLocalIsFavorite] = useState(isFavorite);
  useEffect(() => { setLocalIsFavorite(isFavorite); }, [isFavorite]);

  const handleToggleFavorite = () => {
    setLocalIsFavorite(v => !v);
    onToggleFavorite();
  };

  const handleSlidingComplete = async (value) => {
    await TrackPlayer.seekTo(value / 1000);
    setIsSliding(false);
  };

  // ─── Icône repeat ──────────────────────────────────────────────────────────
  const repeatColor   = repeatMode !== REPEAT_MODE.STOP_CURRENT ? theme.colors.accent : theme.colors.primary;
  const repeatOpacity = repeatMode !== REPEAT_MODE.STOP_CURRENT ? 1 : 0.5;

  if (!track) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: pan }], opacity }]}
      {...panResponder.panHandlers}
    >
      {/* Background immersif */}
      <View style={styles.background}>
        <Image
          source={{ uri: track?.artwork || track?.album?.cover_big || track?.album?.cover_medium || '' }}
          style={styles.backgroundImage}
          blurRadius={60}
        />
        <View style={[styles.overlay, {
          backgroundColor: colors?.secondary ? `${colors.secondary}99` : 'rgba(0,0,0,0.7)'
        }]} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <ChevronDown size={32} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NOW PLAYING</Text>
          <TouchableOpacity>
            <MoreHorizontal size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Pochette ou Paroles */}
        <View style={[styles.artContainer, showLyrics && { flex: 1, paddingHorizontal: 0 }]}>
          {showLyrics ? (
            <LyricsView track={track} currentTime={progress.position} lyricsData={lyrics} />
          ) : (
            <Animated.Image
              source={{ uri: track?.artwork || track?.album?.cover_big || track?.album?.cover_medium || '' }}
              style={[styles.albumArt, { transform: [{ scale: albumScale }] }]}
            />
          )}
        </View>

        {/* Infos + actions (Masqué si paroles plein écran) */}
        {!showLyrics && (
          <View style={styles.infoContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
              <TouchableOpacity
                onPress={async () => {
                  let artistId = track.artist?.id || track.artist_id;

                  // Fallback : artiste sans ID (recommandations, radio...)
                  // → on cherche via Deezer pour obtenir l'ID
                  if (!artistId && track.artist?.name) {
                    try {
                      console.log('[PlayerScreen] Missing ID, searching for artist:', track.artist.name);
                      const results = await searchMusic(track.artist.name + ' ' + track.title);
                      artistId = results?.data?.[0]?.artist?.id;
                      console.log('[PlayerScreen] Found artistId via search:', artistId);
                    } catch (e) {
                      console.warn('[PlayerScreen] Artist lookup failed:', e.message);
                    }
                  }

                  onClose();
                  if (artistId) {
                    onViewArtist?.(artistId);
                  } else {
                    console.warn('[PlayerScreen] No artistId found even after search');
                  }
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={styles.artist}>{track.artist?.name}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rightActions}>
              {/* Téléchargement / Suppression */}
              <TouchableOpacity 
                onPress={isDownloaded ? () => onRemoveDownload(track.id) : onDownload} 
                style={[styles.actionCircle, activeDownloads[track?.id] !== undefined && { opacity: 0.5 }]} 
                activeOpacity={0.6}
                disabled={activeDownloads[track?.id] !== undefined}
              >
                {activeDownloads[track?.id] !== undefined ? (
                  <Text style={styles.progressText}>{Math.round(activeDownloads[track.id] * 100)}%</Text>
                ) : isDownloaded ? (
                  <Trash2 size={24} color={theme.colors.accent} />
                ) : (
                  <Download size={24} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              {/* Playlist */}
              <TouchableOpacity onPress={onAddToPlaylist} style={styles.actionCircle} activeOpacity={0.6}>
                <ListPlus size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              {/* Favori */}
              <TouchableOpacity onPress={handleToggleFavorite} style={styles.actionCircle} activeOpacity={0.6}>
                <Heart
                  size={26}
                  color={localIsFavorite ? theme.colors.accent : theme.colors.primary}
                  fill={localIsFavorite ? theme.colors.accent : 'transparent'}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Mini Paroles (Uniquement si pas en mode plein écran) */}
        {!showLyrics && (
          <Animated.View style={[
            styles.miniLyricsContainer,
            { opacity: lyricOpacity, transform: [{ translateY: lyricTranslateY }] }
          ]}>
            <Text style={styles.miniLyricsText} numberOfLines={2}>{currentLyric}</Text>
          </Animated.View>
        )}
        
        {/* Barre de progression (Masqué si paroles plein écran) */}
        {!showLyrics && (
          <View style={styles.progressContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration}
              value={position}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor="rgba(255,255,255,0.1)"
              thumbTintColor={theme.colors.primary}
              onSlidingStart={() => setIsSliding(true)}
              onValueChange={setSlideValue}
              onSlidingComplete={handleSlidingComplete}
            />
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        )}

        {/* Contrôles principaux (Masqué si paroles plein écran) */}
        {!showLyrics && (
          <View style={styles.controlsContainer}>
            {/* Shuffle */}
            <TouchableOpacity onPress={onToggleShuffle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Shuffle
                size={24}
                color={isShuffle ? theme.colors.accent : theme.colors.primary}
                opacity={isShuffle ? 1 : 0.5}
              />
            </TouchableOpacity>

            {/* Précédent */}
            <TouchableOpacity onPress={onPrevious}>
              <SkipBack size={36} color={theme.colors.primary} fill={theme.colors.primary} />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              style={styles.playButton}
              onPress={playbackError ? onRetry : onPlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color={theme.colors.background} />
              ) : playbackError ? (
                <RotateCcw size={40} color={theme.colors.background} />
              ) : isPlaying ? (
                <Pause size={40} color={theme.colors.background} fill={theme.colors.background} />
              ) : (
                <Play size={40} color={theme.colors.background} fill={theme.colors.background} style={{ marginLeft: 5 }} />
              )}
            </TouchableOpacity>

            {/* Suivant */}
            <TouchableOpacity onPress={onNext}>
              <SkipForward size={36} color={theme.colors.primary} fill={theme.colors.primary} />
            </TouchableOpacity>

            {/* Repeat */}
            <TouchableOpacity
              onPress={onCycleRepeat}
              style={styles.repeatBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Repeat size={24} color={repeatColor} opacity={repeatOpacity} />
              {repeatMode === REPEAT_MODE.STOP_CURRENT && (
                <View style={styles.repeatBadge}>
                  <Text style={styles.repeatBadgeText}>1</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* BARRE COMPACTE POUR LES PAROLES */}
        {showLyrics && (
          <View style={styles.compactControlBar}>
            <Image 
              source={{ uri: track?.artwork || track?.album?.cover_medium || '' }} 
              style={styles.compactCover} 
            />
            <View style={styles.compactInfo}>
              <Text style={styles.compactTitle} numberOfLines={1}>{track.title}</Text>
              <Text style={styles.compactArtist} numberOfLines={1}>{track.artist?.name}</Text>
            </View>
            <TouchableOpacity 
              style={styles.compactPlayBtn} 
              onPress={onPlayPause}
            >
              {isPlaying ? <Pause size={28} color="#fff" /> : <Play size={28} color="#fff" />}
            </TouchableOpacity>

            {/* Barre de progression discrète en bas */}
            <View style={styles.compactProgressBarContainer}>
              <View style={[styles.compactProgressBar, { width: `${(progress.position / progress.duration) * 100}%` }]} />
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onOpenQueue}>
            <ListMusic size={24} color={theme.colors.secondary} />
          </TouchableOpacity>
          <Text style={styles.footerText}>
            {`${isShuffle ? 'Aléatoire' : ''}${isShuffle ? ' • ' : ''}${
              repeatMode === REPEAT_MODE.LOOP_ALL ? 'Tout en boucle' : 
              repeatMode === REPEAT_MODE.PLAY_ALL_ONCE ? 'Tout une fois' : 
              'Arrêt après titre'
            }`}
          </Text>
          <TouchableOpacity onPress={() => setShowLyrics(!showLyrics)}>
            <Mic2 size={24} color={showLyrics ? theme.colors.accent : theme.colors.secondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    overflow: 'hidden', // FIX : empêche le contenu de déborder pendant le swipe
    borderTopLeftRadius: 16,  // FIX : coins arrondis en haut pour l'effet sheet
    borderTopRightRadius: 16,
  },
  background: { ...StyleSheet.absoluteFillObject, zIndex: -1, overflow: 'hidden' },
  backgroundImage: { width: '100%', height: '100%', opacity: 0.65, transform: [{ scale: 1.4 }] },
  overlay: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 0,
  },
  headerTitle: {
    flex: 1, textAlign: 'center', color: theme.colors.primary,
    fontSize: 10, fontWeight: '900', letterSpacing: 2, opacity: 0.6,
  },
  artContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingHorizontal: 40 },
  albumArt: {
    width: width - 80, height: width - 80, borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 30,
  },
  infoContainer: {
    paddingHorizontal: 30, marginTop: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { color: theme.colors.primary, fontSize: 24, fontWeight: '900', maxWidth: width - 160 },
  artist: {
    color: theme.colors.secondary, fontSize: 16, fontWeight: '600',
    marginTop: 4, textTransform: 'uppercase', letterSpacing: 1,
  },
  rightActions: { flexDirection: 'row', gap: 8 },
  actionCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  progressText: { color: theme.colors.accent, fontSize: 8, fontWeight: 'bold' },
  miniLyricsContainer: {
    paddingHorizontal: 30,
    marginTop: 10,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniLyricsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  progressContainer: { paddingHorizontal: 20, marginTop: 15 },
  slider: { width: '100%', height: 40 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -5, paddingHorizontal: 10 },
  timeText: { color: theme.colors.secondary, fontSize: 12, fontWeight: 'bold' },
  controlsContainer: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    marginTop: 30, paddingHorizontal: 20,
  },
  playButton: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  repeatBtn: { position: 'relative' },
  repeatBadge: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: theme.colors.accent,
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  repeatBadgeText: { color: 'black', fontSize: 8, fontWeight: 'bold' },
  compactControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  compactCover: {
    width: 45,
    height: 45,
    borderRadius: 8,
  },
  compactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  compactTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  compactArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  compactPlayBtn: {
    padding: 8,
  },
  compactProgressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  compactProgressBar: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 30, marginTop: 'auto', marginBottom: 20, opacity: 0.6,
  },
  footerText: {
    color: theme.colors.secondary, fontSize: 10,
    fontWeight: 'bold', letterSpacing: 1,
  },
});

export default React.memo(PlayerScreen);
