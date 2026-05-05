import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
  Platform,
  Animated
} from 'react-native';
import axios from 'axios';
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

const LyricsView = ({ track, currentTime, lyricsData }) => {
  const [lyrics, setLyrics] = useState(lyricsData || []);
  const [loading, setLoading] = useState(!lyricsData);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(-1);


  useEffect(() => {
    if (lyricsData && lyricsData.length > 0) {
      setLyrics(lyricsData);
      setLoading(false);
    }
  }, [lyricsData]);

  useEffect(() => {
    if (lyrics.length > 0) {
      const index = lyrics.findLastIndex(l => l.time <= currentTime);
      if (index !== -1 && index !== currentIndex) {
        setCurrentIndex(index);
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.3
        });
      }
    }
  }, [currentTime, lyrics]);

  const renderItem = ({ item, index }) => {
    const isActive = index === currentIndex;
    return (
      <View style={[styles.lineWrapper, isActive && styles.activeLineWrapper]}>
        <Text style={[
          styles.lineText, 
          isActive ? styles.activeLineText : styles.inactiveLineText
        ]}>
          {item.text}
        </Text>
      </View>
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
        onScrollToIndexFailed={() => {}}
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
