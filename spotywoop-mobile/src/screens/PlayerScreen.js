import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Image, TouchableOpacity,
  Dimensions, Platform, StatusBar, PanResponder, ActivityIndicator, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronDown, MoreHorizontal, Heart, ListMusic,
  Shuffle, Repeat, ListPlus, Download, RotateCcw, Mic2
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../utils/theme';
import TrackPlayer, { usePlaybackState, useProgress, State } from 'react-native-track-player';
import { REPEAT_MODE } from '../context/PlayerContext';
import LyricsView from '../components/LyricsView';
import axios from 'axios';
import { BASE_URL } from '../services/api';

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
  const isDownloaded = downloads.some(d => d.id === track?.id);
  const isLoading    = playbackState.state === State.Buffering
    || playbackState.state === State.Loading
    || (track?.id === propStatus?.loadingTrackId);

  useEffect(() => { setSlideValue(0); }, [track?.id]);
  
  // ─── Récupération des paroles ─────────────────────────────────────────────
  useEffect(() => {
    const fetchLyrics = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/lyrics`, {
          params: {
            artist: track.artist?.name || track.artist,
            title: track.title,
            album: track.album?.title || '',
            duration: track.duration
          }
        });
        if (res.data?.synced) {
          const lines = res.data.synced.split('\n');
          const parsed = lines.map(line => {
            const match = /\[(\d+):(\d+\.\d+)\]/.exec(line);
            if (match) {
              return { time: parseInt(match[1]) * 60 + parseFloat(match[2]), text: line.replace(/\[.*\]/, '').trim() };
            }
            return null;
          }).filter(Boolean);
          setLyrics(parsed);
        } else {
          setLyrics([]);
        }
      } catch (e) {
        setLyrics([]);
      }
    };
    if (track?.id) fetchLyrics();
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
  const pan        = useRef(new Animated.Value(0)).current;

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
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => { if (g.dy > 0) pan.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 150 || g.vy > 0.5) {
          onClose();
          setTimeout(() => pan.setValue(0), 300);
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }).start();
        }
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
  const repeatColor   = repeatMode > REPEAT_MODE.NONE ? theme.colors.accent : theme.colors.primary;
  const repeatOpacity = repeatMode > REPEAT_MODE.NONE ? 1 : 0.5;

  if (!track) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: pan }] }]}
      {...panResponder.panHandlers}
    >
      {/* Background immersif */}
      <View style={styles.background}>
        <Image
          source={{ uri: track?.album?.cover_big || track?.album?.cover_medium || '' }}
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
            <LyricsView track={track} currentTime={progress.position} />
          ) : (
            <Animated.Image
              source={{ uri: track?.album?.cover_big || track?.album?.cover_medium || '' }}
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
                onPress={() => { onClose(); onViewArtist?.(track.artist?.id); }}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={styles.artist}>{track.artist?.name}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rightActions}>
              {/* Téléchargement */}
              <TouchableOpacity onPress={onDownload} style={styles.actionCircle} activeOpacity={0.6}>
                {activeDownloads[track?.id] !== undefined ? (
                  <Text style={styles.progressText}>{Math.round(activeDownloads[track.id] * 100)}%</Text>
                ) : (
                  <Download size={24} color={isDownloaded ? theme.colors.accent : theme.colors.primary} />
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
              {repeatMode === REPEAT_MODE.ONE && (
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
              source={{ uri: track?.album?.cover_medium || '' }} 
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
            {isShuffle ? '🔀 Aléatoire' : repeatMode === REPEAT_MODE.ONE ? '🔂 Répéter 1' : repeatMode === REPEAT_MODE.ALL ? '🔁 Répéter tout' : 'En ordre'}
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
  },
  background: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
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
