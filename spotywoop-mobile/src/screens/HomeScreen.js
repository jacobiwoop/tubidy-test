import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Play, Heart, Disc, Music, Volume2 } from 'lucide-react-native';
import { theme } from '../utils/theme';
import { checkHealth, BASE_URL, getChosicRecommendations } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import StatsService from '../services/StatsService';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { 
    favorites, playlists, onPlayTrack, onViewArtist, 
    currentTrack, loadingTrackId, musicDNA 
  } = usePlayer();
  const [serverStatus, setServerStatus] = useState('checking');
  const [debugLogs, setDebugLogs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recSource, setRecSource] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [topArtists, setTopArtists] = useState([]);
  const [genreMix, setGenreMix] = useState([]);
  const [genreMixTitle, setGenreMixTitle] = useState('');

  const GENRES = [
    { id: 'hip-hop', name: 'Hip-Hop', color: '#FF416C' },
    { id: 'r-n-b', name: 'R&B', color: '#8E2DE2' },
    { id: 'afrobeat', name: 'Afrobeat', color: '#F7971E' },
    { id: 'deep-house', name: 'Deep House', color: '#00c6ff' },
    { id: 'chill', name: 'Chill', color: '#11998e' },
    { id: 'anime', name: 'Anime', color: '#ff00cc' },
    { id: 'dancehall', name: 'Dancehall', color: '#f8ff00' },
    { id: 'jazz', name: 'Jazz', color: '#3a7bd5' },
    { id: 'rock', name: 'Rock', color: '#f44336' },
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

  useEffect(() => {
    const fetchRecs = async () => {
      if (serverStatus !== 'online') return;
      setLoadingRecs(true);
      try {
        const smartSeeds = await StatsService.getSmartSeeds();
        
        // 1. Calculer les artistes du moment
        if (musicDNA) {
          setTopArtists(Object.entries(musicDNA.topArtists)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(e => e[0]));
        }

        // 2. Recommandations principales
        let seedParams = { artist: 'The Weeknd', track: 'Blinding Lights' }; 
        if (selectedGenre) {
          seedParams = { genre: selectedGenre.id };
          setRecSource(selectedGenre.name);
        } else if (smartSeeds.topArtists.length > 0 || smartSeeds.topGenres.length > 0) {
          const topArtist = smartSeeds.topArtists[0];
          const topGenre = smartSeeds.topGenres[0];
          setRecSource(topGenre ? `Spécial ${topGenre}` : `Inspiré par ${topArtist}`);
          seedParams = { artist: topArtist, genre: topGenre, track: smartSeeds.lastTrack?.title };
        } else if (favorites && favorites.length > 0) {
          const seeds = favorites.slice(-3);
          setRecSource(seeds[seeds.length - 1].artist?.name || 'vos favoris');
          seedParams = { artist: seeds[seeds.length - 1].artist?.name, track: seeds[seeds.length - 1].title };
        }

        const mainData = await getChosicRecommendations(seedParams);
        if (mainData && mainData.track) setRecommendations(mainData.track);

        // 3. Créer un Mix Genre secondaire
        if (smartSeeds.topGenres.length > 1 && !selectedGenre) {
          const secondGenre = smartSeeds.topGenres[1];
          setGenreMixTitle(`Mix ${secondGenre}`);
          const mixData = await getChosicRecommendations({ genre: secondGenre, limit: 10 });
          if (mixData && mixData.track) setGenreMix(mixData.track);
        } else {
          setGenreMixTitle("Vibe Afrobeat");
          const mixData = await getChosicRecommendations({ genre: 'afrobeat', limit: 10 });
          if (mixData && mixData.track) setGenreMix(mixData.track);
        }

      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoadingRecs(false);
      }
    };

    if (serverStatus === 'online') {
      fetchRecs();
    }
  }, [serverStatus, favorites.length, selectedGenre, musicDNA]);
  
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
          {GENRES.map(genre => {
            const isActive = selectedGenre?.id === genre.id;
            return (
              <TouchableOpacity 
                key={genre.id} 
                style={[styles.genreChip, isActive && { backgroundColor: genre.color, borderColor: genre.color }]}
                onPress={() => setSelectedGenre(isActive ? null : genre)}
              >
                <View style={[styles.genreDot, { backgroundColor: isActive ? '#fff' : genre.color }]} />
                <Text style={[styles.genreText, isActive && { color: '#000' }]}>{genre.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <LinearGradient 
            colors={['rgba(29, 185, 84, 0.4)', 'transparent']} 
            style={styles.heroGradient} 
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>DAILY MIX</Text>
            <Text style={styles.heroTitle}>Ton mix du jour</Text>
            <Text style={styles.heroSub}>Basé sur tes écoutes récentes</Text>
            <TouchableOpacity style={styles.playAllBtn} onPress={() => recommendations[0] && onPlayTrack(recommendations[0], recommendations)}>
              <Play size={20} color="black" fill="black" />
              <Text style={styles.playAllText}>Tout lire</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Grid (Accès rapide aux favoris) */}
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
                    source={{ uri: item.tracks?.[0]?.album?.cover_big || item.tracks?.[0]?.album?.cover_medium || 'https://via.placeholder.com/150' }} 
                    style={styles.quickThumb} 
                  />
                )}
              </View>
              <Text style={styles.quickTitle} numberOfLines={1}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section: Récemment écoutés */}
        {musicDNA?.history?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récemment écoutés</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {musicDNA.history.slice(0, 8).map((track, i) => (
                <TouchableOpacity key={`${track.id}-${i}`} style={styles.recentItem} onPress={() => onPlayTrack(track)}>
                   <Image 
                     source={{ uri: track.artwork || 'https://via.placeholder.com/150' }} 
                     style={styles.recentThumb} 
                   />
                   <Text style={styles.recentTitle} numberOfLines={1}>{track.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Section: Spécialement pour toi (Recommandations Principales) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spécialement pour toi</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Library')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.recSource}>{recSource ? `Inspiré par ${recSource}` : 'Tes découvertes'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {loadingRecs && recommendations.length === 0 ? (
              [1, 2, 3].map(i => (
                <View key={i} style={styles.trackCard}>
                  <View style={[styles.cardImageContainer, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                  </View>
                </View>
              ))
            ) : (
              recommendations.slice(0, 10).map((track) => {
                const isPlaying = currentTrack?.id === track.id;
                return (
                  <TouchableOpacity 
                    key={track.id} 
                    style={styles.trackCard}
                    onPress={() => onPlayTrack(track, recommendations)}
                  >
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: track.album?.cover_big || track.album?.cover_medium }} style={styles.cardImage} />
                      {isPlaying && (
                        <View style={styles.playingOverlay}>
                          <Volume2 size={24} color="white" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardTitle, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>{track.title}</Text>
                    <Text style={styles.cardArtist} numberOfLines={1}>{track.artist?.name}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Section: Tes Artistes */}
        {topArtists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tes artistes du moment</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {topArtists.map((artist, i) => (
                <TouchableOpacity key={i} style={styles.artistCircleItem}>
                   <View style={styles.artistCircle}>
                      <Text style={styles.artistInitial}>{artist.charAt(0)}</Text>
                   </View>
                   <Text style={styles.artistName} numberOfLines={1}>{artist}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Section: Mix Genre Surprise */}
        {genreMix.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{genreMixTitle}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {genreMix.map((track, i) => (
                <TouchableOpacity 
                  key={track.id} 
                  style={styles.genreMixCard}
                  onPress={() => onPlayTrack(track, genreMix)}
                >
                  <Image source={{ uri: track.album?.cover_big || track.album?.cover_medium }} style={styles.genreMixImage} />
                  <View style={styles.genreMixInfo}>
                     <Text style={styles.cardTitle} numberOfLines={1}>{track.title}</Text>
                     <Text style={styles.cardArtist} numberOfLines={1}>{track.artist?.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>
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

  heroContainer: {
    marginHorizontal: 20,
    height: 180,
    borderRadius: 24,
    backgroundColor: '#111',
    overflow: 'hidden',
    marginBottom: 30,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  heroLabel: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 20,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    alignSelf: 'flex-start',
    gap: 8,
  },
  playAllText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
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
  recSource: {
    color: theme.colors.secondary,
    fontSize: 13,
    marginBottom: 15,
    marginTop: -10,
  },
  recentItem: {
    width: 100,
    marginRight: 15,
  },
  recentThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  recentTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  artistCircleItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 80,
  },
  artistCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  artistInitial: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  artistName: {
    color: 'white',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  genreMixCard: {
    width: 160,
    marginRight: 15,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  genreMixImage: {
    width: '100%',
    aspectRatio: 1,
  },
  genreMixInfo: {
    padding: 10,
  },
  trackCard: {
    width: 150,
    marginRight: 15,
  },
  cardImageContainer: {
    width: 150,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29, 185, 84, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardArtist: {
    color: theme.colors.secondary,
    fontSize: 12,
  },
});
