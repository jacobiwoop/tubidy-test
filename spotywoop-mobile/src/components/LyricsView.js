import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
  Platform,
  Animated,
  TouchableOpacity,
  AppState
} from 'react-native';
import axios from 'axios';
import TrackPlayer from 'react-native-track-player';
import { theme } from '../utils/theme';
import { BASE_URL } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Petit composant interne pour les pointillés animés
const LyricsSkeleton = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const SkeletonLine = ({ width }) => (
    <Animated.View style={[styles.skeletonLine, { width, opacity }]} />
  );

  return (
    <View style={styles.skeletonContainer}>
      <SkeletonLine width="80%" />
      <SkeletonLine width="60%" />
      <SkeletonLine width="90%" />
      <SkeletonLine width="70%" />
      <SkeletonLine width="50%" />
    </View>
  );
};

const LyricsView = ({ track, currentTime, lyricsData, onSeek }) => {
  const [lyrics, setLyrics] = useState(lyricsData || []);
  const [loading, setLoading] = useState(!lyricsData);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const lyricsRef = useRef(lyrics);

  // Garder lyricsRef à jour pour les callbacks sans re-render
  useEffect(() => {
    lyricsRef.current = lyrics;
  }, [lyrics]);

  useEffect(() => {
    if (lyricsData && lyricsData.length > 0) {
      setLyrics(lyricsData);
      setLoading(false);
    }
  }, [lyricsData]);

  // ─── Fonction centrale de synchro ─────────────────────────────────────────
  // Calcule et applique le bon index selon une position donnée (en secondes)
  const syncToPosition = useCallback((position) => {
    const currentLyrics = lyricsRef.current;
    if (!currentLyrics || currentLyrics.length === 0) return;

    const index = currentLyrics.findLastIndex(l => l.time <= position);
    if (index !== -1) {
      setCurrentIndex(index);
      // Petit délai pour laisser le temps au FlatList d'être prêt
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.3
        });
      }, 100);
    }
  }, []);

  // ─── Synchro continue via prop currentTime (useProgress du player) ────────
  useEffect(() => {
    syncToPosition(currentTime);
  }, [currentTime, lyrics]);

  // ─── Synchro au mount et au retour dans l'app (AppState) ─────────────────
  // Interroge TrackPlayer.getProgress() directement pour avoir la vraie position
  const resyncNow = useCallback(async () => {
    try {
      const { position } = await TrackPlayer.getProgress();
      syncToPosition(position);
    } catch (e) {
      // Player pas encore prêt, on ignore
    }
  }, [syncToPosition]);

  // Au mount du composant (ouverture du player)
  useEffect(() => {
    resyncNow();
  }, [lyrics]); // Re-sync aussi quand les lyrics chargent

  // Au retour dans l'app depuis l'arrière-plan
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        resyncNow();
      }
    });
    return () => subscription.remove();
  }, [resyncNow]);

  // ─── Seek au clic sur une ligne ───────────────────────────────────────────
  const handleLineTap = useCallback(async (item, index) => {
    try {
      await TrackPlayer.seekTo(item.time);
      setCurrentIndex(index);
      if (onSeek) onSeek(item.time);
    } catch (e) {
      console.warn('[LyricsView] Seek failed:', e.message);
    }
  }, [onSeek]);

  const renderItem = ({ item, index }) => {
    const isActive = index === currentIndex;
    return (
      <TouchableOpacity
        style={[styles.lineWrapper, isActive && styles.activeLineWrapper]}
        onPress={() => handleLineTap(item, index)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.lineText,
          isActive ? styles.activeLineText : styles.inactiveLineText
        ]}>
          {item.text}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading && (!lyrics || lyrics.length === 0)) return <LyricsSkeleton />;

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={lyrics}
        keyExtractor={(item, index) => `lyric-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        onScrollToIndexFailed={(info) => {
          // Retry après que le layout soit prêt
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.3
            });
          }, 300);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    marginVertical: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  listContent: {
    paddingTop: 50,
    paddingBottom: SCREEN_HEIGHT * 0.4,
  },
  lineWrapper: {
    marginVertical: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeLineWrapper: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  lineText: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  activeLineText: {
    color: '#fff',
    opacity: 1,
  },
  inactiveLineText: {
    color: '#fff',
    opacity: 0.3,
  },
  errorText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

export default LyricsView;
