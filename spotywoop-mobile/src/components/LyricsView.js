import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Platform
} from 'react-native';
import axios from 'axios';
import { theme } from '../utils/theme';
import { BASE_URL } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LyricsView = ({ track, currentTime, lyricsData }) => {
  const [lyrics, setLyrics] = useState(lyricsData || []);
  const [loading, setLoading] = useState(!lyricsData);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // 1. Récupération des paroles (uniquement si non fournies)
  useEffect(() => {
    if (lyricsData && lyricsData.length > 0) {
      setLyrics(lyricsData);
      setLoading(false);
      return;
    }

    const fetchLyrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await axios.get(`${BASE_URL}/lyrics`, {
          params: {
            artist: track.artist?.name || track.artist,
            title: track.title,
            album: track.album?.title || '',
            duration: track.duration
          }
        });

        if (res.data && res.data.synced) {
          const parsed = parseLRC(res.data.synced);
          setLyrics(parsed);
        } else if (res.data && res.data.plain) {
          // Si pas de synchro, on affiche juste le texte
          setLyrics([{ time: 0, text: res.data.plain }]);
        } else {
          setError('Pas de paroles trouvées');
        }
      } catch (err) {
        console.error('[LyricsView] Error fetching lyrics:', err.message);
        setError('Impossible de charger les paroles');
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [track.id, lyricsData]);

  // 2. Synchronisation avec la musique
  useEffect(() => {
    if (lyrics.length > 0) {
      // On cherche la ligne qui correspond au temps actuel
      const index = lyrics.findLastIndex(l => l.time <= currentTime);
      if (index !== -1 && index !== currentIndex) {
        setCurrentIndex(index);
        // Défilement auto
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.3 // Garde la ligne active au premier tiers de l'écran
        });
      }
    }
  }, [currentTime, lyrics]);

  // Parser simple pour le format LRC
  const parseLRC = (lrc) => {
    const lines = lrc.split('\n');
    const result = [];
    const timeRegex = /\[(\d+):(\d+\.\d+)\]/;
    
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        const time = minutes * 60 + seconds;
        const text = line.replace(timeRegex, '').trim();
        if (text) {
          result.push({ time, text });
        }
      }
    });
    return result;
  };

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

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </View>
  );

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
        onScrollToIndexFailed={() => {}} // Évite les crashs si l'index n'est pas encore rendu
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
  listContent: {
    paddingTop: 50,
    paddingBottom: SCREEN_HEIGHT * 0.4,
  },
  lineWrapper: {
    marginVertical: 12,
  },
  lineText: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 32,
  },
  activeLineText: {
    color: '#fff',
    opacity: 1,
  },
  inactiveLineText: {
    color: '#fff',
    opacity: 0.25,
  },
  errorText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

export default LyricsView;
