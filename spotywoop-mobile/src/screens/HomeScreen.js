import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Play, Heart, Disc, Music, Volume2 } from 'lucide-react-native';
import { theme } from '../utils/theme';
import { checkHealth, BASE_URL } from '../services/api';
import { usePlayer } from '../context/PlayerContext';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { favorites, playlists, onPlayTrack, onViewArtist, currentTrack, loadingTrackId } = usePlayer();
  const [serverStatus, setServerStatus] = useState('checking');
  const [debugLogs, setDebugLogs] = useState([]);

  const GENRES = [
    { id: 'hip_hop', name: 'Hip-Hop', color: '#FF416C' },
    { id: 'rnb', name: 'R&B / Soul', color: '#4facfe' },
    { id: 'pop', name: 'Pop', color: '#00f2fe' },
    { id: 'dance_electronic', name: 'Electronic', color: '#f093fb' },
    { id: 'indierock', name: 'Rock', color: '#fccb90' },
    { id: 'jazz', name: 'Jazz', color: '#84fab0' },
  ];

  useEffect(() => {
    const isRender = BASE_URL.includes('onrender.com');
    let attempts = 0;
    const maxAttempts = isRender ? 15 : 1;

    const check = async () => {
      setServerStatus('checking');
      const addLog = (msg) => setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
      
      while (attempts < maxAttempts) {
        attempts++;
        try {
          const data = await checkHealth();
          if (data) {
            setServerStatus('online');
            return;
          }
        } catch (e) {
          if (isRender && attempts < maxAttempts) {
            setServerStatus('waiting');
            await new Promise(resolve => setTimeout(resolve, 4000));
          } else { break; }
        }
      }
      setServerStatus('offline');
    };
    check();
  }, []);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const quickActions = [
    { id: 'liked', title: 'Titres likés', tracks: favorites, isLiked: true },
    ...playlists.filter(p => p.id !== 'liked').slice(0, 3)
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient colors={['rgba(29, 185, 84, 0.15)', 'transparent']} style={styles.aura} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.subGreeting}>Découvre de nouvelles pépites</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileBtn}
            onPress={() => Alert.alert('Statut', `Serveur: ${serverStatus.toUpperCase()}\n${BASE_URL}`)}
          >
            <View style={[styles.statusDot, { backgroundColor: serverStatus === 'online' ? '#1DB954' : '#ff4444' }]} />
            <Image source={{ uri: 'https://avatar.iran.liara.run/public/33' }} style={styles.avatar} />
          </TouchableOpacity>
        </View>

        {/* Genres Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
          {GENRES.map(genre => (
            <TouchableOpacity key={genre.id} style={styles.genreChip}>
              <View style={[styles.genreDot, { backgroundColor: genre.color }]} />
              <Text style={styles.genreText}>{genre.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hero Section */}
        <TouchableOpacity style={styles.heroCard} activeOpacity={0.9}>
          <Image 
            source={{ uri: 'https://picsum.photos/seed/music/800/400' }} 
            style={styles.heroImage} 
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.heroOverlay}>
            <View style={styles.heroBadge}>
              <Music size={12} color="#000" />
              <Text style={styles.heroBadgeText}>À LA UNE</Text>
            </View>
            <Text style={styles.heroTitle}>Top Hits 2026</Text>
            <Text style={styles.heroSubtitle}>Les morceaux les plus écoutés en ce moment</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Grid (Titres Likés + Playlists) */}
        <View style={styles.quickGrid}>
          {quickActions.map((item, index) => (
            <TouchableOpacity 
              key={item.id || index} 
              style={styles.quickCard}
              onPress={() => item.tracks?.[0] && onPlayTrack(item.tracks[0], item.tracks)}
            >
              <View style={styles.quickThumbContainer}>
                {item.isLiked ? (
                  <LinearGradient colors={['#450af5', '#c4efd9']} style={styles.likedGradient}>
                    <Heart size={20} color="white" fill="white" />
                  </LinearGradient>
                ) : (
                  <Image 
                    source={{ uri: item.tracks?.[0]?.album?.cover_medium || 'https://via.placeholder.com/150' }} 
                    style={styles.quickThumb} 
                  />
                )}
              </View>
              <Text style={styles.quickTitle} numberOfLines={1}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: Recommandations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spécialement pour toi</Text>
            <TouchableOpacity><Text style={styles.seeAll}>Voir tout</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {favorites.slice(0, 6).map((track, i) => {
              const isPlaying = currentTrack?.id === track.id;
              return (
                <TouchableOpacity 
                  key={track.id} 
                  style={styles.albumCard} 
                  onPress={() => onPlayTrack(track, favorites)}
                >
                  <View style={styles.albumCoverContainer}>
                    <Image source={{ uri: track.album?.cover_medium }} style={[styles.albumCover, isPlaying && styles.activeAlbumCover]} />
                    {isPlaying && (
                      <View style={styles.loaderOverlay}>
                         <Volume2 size={24} color={theme.colors.accent} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.albumTitle, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.albumArtist} numberOfLines={1}>{track.artist?.name}</Text>
                </TouchableOpacity>
              );
            })}
            {favorites.length === 0 && [1, 2, 3].map(i => (
              <View key={i} style={styles.albumCard}>
                <View style={[styles.albumCover, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                  <Disc size={40} color="#333" />
                </View>
                <Text style={styles.albumTitle}>Mix Découverte {i}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  aura: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  scrollContent: { paddingBottom: 150 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 25,
  },
  greeting: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subGreeting: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  statusDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0a0a0a',
    zIndex: 10,
  },

  genreScroll: {
    paddingLeft: 20,
    marginBottom: 25,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  genreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  genreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  heroCard: {
    marginHorizontal: 20,
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'flex-end',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    gap: 4,
  },
  heroBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 35,
  },
  quickCard: {
    width: '48.5%',
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickThumbContainer: { width: 56, height: 56, backgroundColor: '#1a1a1a' },
  quickThumb: { width: '100%', height: '100%' },
  likedGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  quickTitle: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 10, flex: 1 },

  section: { marginBottom: 35, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  seeAll: { color: theme.colors.accent, fontSize: 14, fontWeight: '700' },
  horizontalScroll: { marginLeft: -20, paddingLeft: 20 },
  albumCard: { marginRight: 16, width: 140 },
  albumCoverContainer: { position: 'relative', width: 140, height: 140, marginBottom: 10 },
  albumCover: { width: 140, height: 140, borderRadius: 16 },
  activeAlbumCover: { borderColor: theme.colors.accent, borderWidth: 2 },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  albumTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  albumArtist: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
});
