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

  useEffect(() => {
    const isRender = BASE_URL.includes('onrender.com');
    let attempts = 0;
    const maxAttempts = isRender ? 15 : 1; // On insiste beaucoup pour Render (free tier cold start)

    const check = async () => {
      setServerStatus('checking');
      const addLog = (msg) => setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
      
      while (attempts < maxAttempts) {
        attempts++;
        try {
          addLog(`Connexion à ${BASE_URL}... (Essai ${attempts})`);
          const data = await checkHealth();
          
          if (data) {
            setServerStatus('online');
            addLog(`Succès ! Le serveur a répondu : ${JSON.stringify(data)}`);
            return;
          }
        } catch (e) {
          const errorMsg = e.response ? `Erreur ${e.response.status}` : e.message;
          addLog(`Échec : ${errorMsg}`);
          
          if (isRender && attempts < maxAttempts) {
            setServerStatus('waiting');
            // On attend 4 secondes avant de réessayer pour laisser Render démarrer
            await new Promise(resolve => setTimeout(resolve, 4000));
          } else {
            break;
          }
        }
      }
      setServerStatus('offline');
      addLog(`Serveur injoignable après ${attempts} tentatives.`);
    };
    check();
  }, []);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // On prend les 4 premiers éléments, en évitant les doublons
  const quickActions = [
    { id: 'liked', title: 'Liked Songs', tracks: favorites, isLiked: true },
    ...playlists.filter(p => p.id !== 'liked').slice(0, 3)
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Aura de fond style Monochrome */}
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'transparent']}
        style={styles.aura}
      />

      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.titleRow}>
            <Text style={styles.appTitle}>Spotywoop</Text>
            <TouchableOpacity 
              style={styles.statusContainer}
              onPress={() => Alert.alert(
                'Détails de Connexion', 
                `URL: ${BASE_URL}\nStatut: ${serverStatus.toUpperCase()}\n\nHistorique récent :\n${debugLogs.join('\n')}`
              )}
            >
              {(serverStatus === 'checking' || serverStatus === 'waiting') ? (
                <ActivityIndicator size="small" color={theme.colors.accent} style={{ transform: [{ scale: 0.7 }] }} />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: serverStatus === 'online' ? '#1DB954' : serverStatus === 'offline' ? '#ff4444' : '#ffbb33' }]} />
              )}
              <Text style={styles.statusText}>{serverStatus === 'waiting' ? 'RETRYING...' : serverStatus.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.avatarContainer}>
              <Text style={styles.avatarText}>S</Text>
            </TouchableOpacity>
            <View style={styles.filterContainer}>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: '#1DB954' }]}>
                <Text style={[styles.filterText, { color: '#000' }]}>Tout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.filterText}>Musique</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <Text style={styles.filterText}>Podcasts</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Grille de raccourcis rapides */}
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
                <Text style={styles.quickTitle} numberOfLines={2}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Section: Made For You */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Made For You</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {favorites.slice(0, 5).map((track, i) => {
                const isLoading = loadingTrackId === track.id;
                const isPlaying = currentTrack?.id === track.id;
                
                return (
                  <TouchableOpacity 
                    key={track.id} 
                    style={[styles.albumCard, isPlaying && { opacity: 0.8 }]} 
                    onPress={() => onPlayTrack(track, favorites)}
                  >
                    <View style={styles.albumCoverContainer}>
                      <Image source={{ uri: track.album?.cover_medium }} style={[styles.albumCover, isPlaying && styles.activeAlbumCover]} />
                      {isLoading && (
                        <View style={styles.loaderOverlay}>
                          <ActivityIndicator size="small" color={theme.colors.accent} />
                        </View>
                      )}
                      {isPlaying && !isLoading && (
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
              {/* Fallback si pas de favoris */}
              {favorites.length === 0 && [1, 2, 3].map(i => (
                <View key={i} style={styles.albumCard}>
                  <View style={[styles.albumCover, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                    <Disc size={40} color="#333" />
                  </View>
                  <Text style={styles.albumTitle}>Discovery Mix {i}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Section: Trending Now */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
               {[1,2,3].map(i => (
                 <TouchableOpacity key={i} style={styles.trendingCard}>
                    <Image 
                      source={{ uri: `https://picsum.photos/seed/${i + 10}/400/250` }} 
                      style={styles.trendingImage} 
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.trendingOverlay}
                    >
                      <Text style={styles.trendingTag}>TRENDING</Text>
                      <Text style={styles.trendingTitle}>Global Top Hits {i}</Text>
                    </LinearGradient>
                 </TouchableOpacity>
               ))}
             </ScrollView>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  aura: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 150,
  },
  appTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F06292', // Rose Spotify
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f5f5f5',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  quickCard: {
    width: '48.5%',
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickThumbContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#1a1a1a',
  },
  quickThumb: {
    width: '100%',
    height: '100%',
  },
  likedGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTitle: {
    color: '#f5f5f5',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
    paddingRight: 5,
  },
  section: {
    marginBottom: 35,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f5f5f5',
    letterSpacing: -0.5,
    marginBottom: 15,
  },
  seeAll: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  albumCard: {
    marginRight: 16,
    width: 140,
  },
  albumCover: {
    width: 140,
    height: 140,
    borderRadius: 8,
    marginBottom: 10,
  },
  albumTitle: {
    color: '#f5f5f5',
    fontSize: 14,
    fontWeight: '700',
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  trendingCard: {
    width: 280,
    height: 160,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    height: '60%',
    justifyContent: 'flex-end',
  },
  trendingTag: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  trendingTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  dnaGrid: {
    gap: 12,
  },
  dnaCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dnaHeader: {
    color: '#f5f5f5',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  dnaText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  albumCoverContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    marginBottom: 10,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  activeAlbumCover: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
  }
});
