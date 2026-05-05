import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, Play, Shuffle, Download, Heart, Disc, ListMusic, Volume2 } from 'lucide-react-native';
import { theme } from '../utils/theme';
import * as api from '../services/api';
import { usePlayer } from '../context/PlayerContext';

const { width } = Dimensions.get('window');

// Cache artiste en mémoire — TTL 10 min
// Évite de refaire 4 appels réseau à chaque fois qu'on navigue vers un artiste
const artistCache = new Map();
const ARTIST_CACHE_TTL = 10 * 60 * 1000;

export default function ArtistScreen({ navigation, route }) {
  const { artistId } = route.params;
  const { onPlayTrack, currentTrack, loadingTrackId, favorites, onToggleFavorite } = usePlayer();
  const onBack = () => navigation.goBack();
  const [loading, setLoading] = useState(true);
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    loadArtistData();
  }, [artistId]);

  const loadArtistData = async () => {
    // Vérifier le cache d'abord
    const cached = artistCache.get(String(artistId));
    if (cached && Date.now() - cached.cachedAt < ARTIST_CACHE_TTL) {
      setArtist(cached.artist);
      setTopTracks(cached.topTracks);
      setAlbums(cached.albums);
      setRelated(cached.related);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [artistData, tracksData, albumsData, relatedData] = await Promise.all([
        api.getArtist(artistId),
        api.getArtistTopTracks(artistId),
        api.getArtistAlbums(artistId),
        api.getRelatedArtists(artistId)
      ]);

      const parsed = {
        artist:    artistData,
        topTracks: tracksData.data  || [],
        albums:    albumsData.data  || [],
        related:   relatedData.data || [],
        cachedAt:  Date.now(),
      };

      // Mettre en cache
      artistCache.set(String(artistId), parsed);

      setArtist(parsed.artist);
      setTopTracks(parsed.topTracks);
      setAlbums(parsed.albums);
      setRelated(parsed.related);
    } catch (error) {
      console.error('Failed to load artist data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Artist Header */}
        <View style={styles.header}>
          <Image 
            source={{ uri: artist?.picture_xl || artist?.picture_big }} 
            style={styles.bannerImage} 
            blurRadius={20}
          />
          <LinearGradient
            colors={['transparent', '#0a0a0a']}
            style={styles.headerGradient}
          />
          
          <SafeAreaView style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <ChevronLeft color="white" size={28} />
            </TouchableOpacity>

            <View style={styles.artistInfo}>
              <Image 
                source={{ uri: artist?.picture_medium }} 
                style={styles.artistAvatar} 
              />
              <Text style={styles.artistName}>{artist?.name}</Text>
              <Text style={styles.artistStats}>
                {parseInt(artist?.nb_fan).toLocaleString()} fans • {artist?.nb_album} albums
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.playButton}
                onPress={() => topTracks[0] && onPlayTrack(topTracks[0], topTracks)}
              >
                <Play size={24} color="black" fill="black" />
                <Text style={styles.playButtonText}>Play Mix</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.iconButton}>
                <Shuffle size={20} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.iconButton}>
                <Heart size={20} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Top Tracks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Tracks</Text>
          {topTracks.slice(0, 5).map((track, index) => {
            const isLoading = loadingTrackId === track.id;
            const isPlaying = currentTrack?.id === track.id;
            return (
              <TouchableOpacity 
                key={track.id} 
                style={[styles.trackRow, isPlaying && styles.playingRow]}
                onPress={() => onPlayTrack(track, topTracks)}
              >
                <Text style={styles.trackNumber}>{index + 1}</Text>
                <View style={styles.trackThumbContainer}>
                  <Image 
                    source={{ uri: track.album?.cover_small }} 
                    style={styles.trackThumb} 
                  />
                </View>
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackTitle, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.trackMeta}>{track.rank?.toLocaleString()} plays</Text>
                </View>
                
                <View style={styles.trackAction}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                  ) : isPlaying ? (
                    <Volume2 size={18} color={theme.colors.accent} />
                  ) : (
                    <TouchableOpacity onPress={() => onToggleFavorite(track)}>
                      <Heart 
                        size={18} 
                        color={favorites?.some(f => f.id === track.id) ? theme.colors.accent : theme.colors.secondary}
                        fill={favorites?.some(f => f.id === track.id) ? theme.colors.accent : 'transparent'}
                        opacity={favorites?.some(f => f.id === track.id) ? 1 : 0.4}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Albums Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discography</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {albums.map(album => (
              <TouchableOpacity key={album.id} style={styles.albumCard}>
                <Image source={{ uri: album.cover_medium }} style={styles.albumCover} />
                <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
                <Text style={styles.albumYear}>{new Date(album.release_date).getFullYear()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Similar Artists */}
        <View style={[styles.section, { marginBottom: 160 }]}>
          <Text style={styles.sectionTitle}>Fans also like</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {related.map(item => (
              <TouchableOpacity key={item.id} style={styles.relatedCard}>
                <Image source={{ uri: item.picture_medium }} style={styles.relatedAvatar} />
                <Text style={styles.relatedName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: 420,
    width: '100%',
    position: 'relative',
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistInfo: {
    alignItems: 'center',
    marginBottom: 25,
  },
  artistAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 15,
  },
  artistName: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  artistStats: {
    color: theme.colors.secondary,
    fontSize: 14,
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  playButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 10,
  },
  playButtonText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  section: {
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 10,
    borderRadius: 12,
  },
  trackNumber: {
    color: theme.colors.secondary,
    fontSize: 14,
    width: 25,
    textAlign: 'center',
  },
  trackThumb: {
    width: 45,
    height: 45,
    borderRadius: 6,
    marginHorizontal: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  trackMeta: {
    color: theme.colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  albumCard: {
    width: 140,
    marginRight: 15,
  },
  albumCover: {
    width: 140,
    height: 140,
    borderRadius: 10,
    marginBottom: 8,
  },
  albumTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  albumYear: {
    color: theme.colors.secondary,
    fontSize: 12,
  },
  relatedCard: {
    width: 110,
    marginRight: 15,
    alignItems: 'center',
  },
  relatedAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  relatedName: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
  },
  trackThumbContainer: {
    position: 'relative',
    width: 45,
    height: 45,
    marginHorizontal: 12,
  },
  trackLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingRow: {
    backgroundColor: 'rgba(29, 185, 84, 0.08)',
    borderColor: 'rgba(29, 185, 84, 0.2)',
  },
  trackAction: {
    padding: 10,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
