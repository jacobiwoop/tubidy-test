import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  Animated,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { 
  ChevronLeft, 
  Play, 
  Heart, 
  MoreHorizontal, 
  Share2,
  ChevronRight,
  Download
} from 'lucide-react-native';
import { theme } from '../utils/theme';
import { getArtistNames } from '../utils/formatters';
import * as api from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import { triggerHaptic } from '../utils/haptics';
import { getCache, saveCache } from '../utils/cache';

const { width } = Dimensions.get('window');

export default function ArtistScreen({ navigation, route }) {
  const { artistId } = route.params;
  const { 
    onPlayTrack, 
    currentTrack, 
    favorites, 
    onToggleFavorite,
    followedArtists,
    onToggleFollowArtist,
    downloads,
    enrichTracks,
    enrichedMetadata
  } = usePlayer();
  
  const [loading, setLoading] = useState(true);
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [related, setRelated] = useState([]);
  const [showMoreTracks, setShowMoreTracks] = useState(false);

  // Animation de scroll
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadArtistData();
  }, [artistId]);

  const loadArtistData = async () => {
    const cacheKey = `artist_${artistId}`;
    
    // 1. Essayer de charger le cache d'abord
    const cached = await getCache(cacheKey);
    if (cached) {
      setArtist(cached.artist);
      setTopTracks(cached.topTracks);
      setAlbums(cached.albums);
      setRelated(cached.related);
      setLoading(false); // On enlève le loader tout de suite !
    }

    // 2. Refresh en tâche de fond (ou premier chargement si pas de cache)
    try {
    // Promise.allSettled : même si une requête échoue, les autres continuent
    const [artistRes, tracksRes, albumsRes, relatedRes] = await Promise.allSettled([
      api.getArtist(artistId),
      api.getArtistTopTracks(artistId),
      api.getArtistAlbums(artistId),
      api.getRelatedArtists(artistId)
    ]);

    const freshData = {
      artist:    artistRes.status   === 'fulfilled' ? artistRes.value          : cached?.artist    || null,
      topTracks: tracksRes.status   === 'fulfilled' ? (tracksRes.value.data  || []) : cached?.topTracks || [],
      albums:    albumsRes.status   === 'fulfilled' ? (albumsRes.value.data  || []) : cached?.albums    || [],
      related:   relatedRes.status  === 'fulfilled' ? (relatedRes.value.data || []) : cached?.related   || [],
    };

    setArtist(freshData.artist);
    setTopTracks(freshData.topTracks);
    setAlbums(freshData.albums);
    setRelated(freshData.related);

    // Sauvegarder pour la prochaine fois
    saveCache(cacheKey, freshData);
    enrichTracks(freshData.topTracks);
  } catch (error) {
    console.error('Failed to load artist data:', error);
  } finally {
    setLoading(false);
  }
  };

  // Séparation Albums / Singles
  const albumsOnly = useMemo(() => albums.filter(a => a.record_type === 'album'), [albums]);
  const singlesOnly = useMemo(() => albums.filter(a => a.record_type === 'single' || a.record_type === 'ep'), [albums]);

  const isFollowed = followedArtists.some(a => String(a.id) === String(artist?.id));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // Animations parallaxe
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 1],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [250, 300],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderTrackItem = (track, index) => {
    const isPlaying = currentTrack?.id === track.id;
    const isFavorite = favorites.some(f => f.id === track.id);
    return (
      <TouchableOpacity 
        key={track.id} 
        style={[styles.trackRow, isPlaying && styles.playingRow]}
        onPress={() => {
          triggerHaptic("impactLight");
          onPlayTrack(track, topTracks);
        }}
      >
        <Text style={styles.trackIndex}>{index + 1}</Text>
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            triggerHaptic("impactLight");
            navigation.push('ArtistDetail', { artistId: track.artist?.id });
          }}
        >
          <Image source={{ uri: track.album?.cover_small }} style={styles.trackCover} />
        </TouchableOpacity>
        <View style={styles.trackInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.trackTitle, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>
              {track.title}
            </Text>
            {downloads.some(d => String(d.id) === String(track.id)) && (
              <Download size={12} color={theme.colors.accent} style={{ marginLeft: 6 }} />
            )}
          </View>
          <Text style={styles.trackRank}>{getArtistNames(track, enrichedMetadata)} • {track.rank?.toLocaleString()} ÉCOUTES</Text>
        </View>
        <TouchableOpacity onPress={() => onToggleFavorite(track)} style={styles.heartBtn}>
           <Heart 
            size={18} 
            color={isFavorite ? theme.colors.accent : 'rgba(255,255,255,0.2)'} 
            fill={isFavorite ? theme.colors.accent : 'transparent'} 
           />
        </TouchableOpacity>
        <MoreHorizontal size={18} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
    );
  };

  const renderCarousel = (title, data, type) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <TouchableOpacity 
            style={styles.seeAllContainer}
            onPress={() => navigation.navigate('ArtistReleases', { artistId, initialFilter: type, artistName: artist?.name })}
          >
            <Text style={styles.seeAll}>TOUT AFFICHER</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalGrid}>
          {data.map(item => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.albumItem}
              onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, albumTitle: item.title })}
            >
              <Image source={{ uri: item.cover_medium }} style={styles.albumItemCover} />
              <Text style={styles.albumItemTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.albumItemYear}>{new Date(item.release_date).getFullYear()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <Animated.View style={[styles.heroContainer, { transform: [{ translateY: headerTranslate }, { scale: imageScale }] }]}>
        <Image source={{ uri: artist?.picture_xl }} style={styles.heroImage} />
        <LinearGradient colors={['rgba(10,10,10,0.1)', 'rgba(10,10,10,0.6)', '#0A0A0A']} style={styles.heroGradient} />
      </Animated.View>

      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <Text style={styles.floatingTitle}>{artist?.name}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ChevronLeft size={28} color="white" />
      </TouchableOpacity>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroSpacer} />

        <View style={styles.infoSection}>
          <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>Artiste Vérifié</Text></View>
          <Text style={styles.artistName}>{artist?.name}</Text>
          <Text style={styles.fanCount}>{parseInt(artist?.nb_fan).toLocaleString()} AUDITEURS MENSUELS</Text>

          <View style={styles.mainActions}>
            <TouchableOpacity style={styles.playFab} onPress={() => onPlayTrack(topTracks[0], topTracks)}>
              <Play size={24} color="black" fill="black" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.followBtn, isFollowed && styles.followBtnActive]}
              onPress={() => onToggleFollowArtist(artist)}
            >
              <Text style={styles.followBtnText}>{isFollowed ? 'ABONNÉ' : "S'ABONNER"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCircle}><Share2 size={20} color="white" /></TouchableOpacity>
          </View>
        </View>

        {/* Popular Tracks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TITRES POPULAIRES</Text>
          {topTracks.slice(0, showMoreTracks ? 10 : 5).map((track, index) => renderTrackItem(track, index))}
          
          {!showMoreTracks && topTracks.length > 5 && (
            <TouchableOpacity style={styles.showMoreBtn} onPress={() => { triggerHaptic("impactLight"); setShowMoreTracks(true); }}>
              <Text style={styles.showMoreText}>Afficher plus</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Albums Carousel */}
        {renderCarousel("ALBUMS", albumsOnly, "Albums")}

        {/* Singles Carousel */}
        {renderCarousel("ÉPISODES ET SINGLES", singlesOnly, "Singles et EP")}

        {/* Similar Artists */}
        <View style={[styles.section, { marginBottom: 150 }]}>
          <Text style={styles.sectionTitle}>LES FANS AIMENT AUSSI</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalGrid}>
            {related.map(item => (
              <TouchableOpacity key={item.id} style={styles.relatedItem} onPress={() => navigation.push('ArtistDetail', { artistId: item.id })}>
                <Image source={{ uri: item.picture_medium }} style={styles.relatedImg} />
                <Text style={styles.relatedName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  loadingContainer: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  heroContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 440, zIndex: 0 },
  heroImage: { width: '100%', height: '100%', objectFit: 'cover' },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100, backgroundColor: '#0A0A0A', zIndex: 10,
    justifyContent: 'center', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 40 : 20,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  floatingTitle: { color: '#fff', fontSize: 16, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' },
  backBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 25, left: 20, zIndex: 15,
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center'
  },
  scrollContent: { flexGrow: 1 },
  heroSpacer: { height: 320 },
  infoSection: { paddingHorizontal: 20, paddingBottom: 30 },
  verifiedBadge: { backgroundColor: '#1DB954', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  verifiedText: { color: 'black', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
  artistName: { color: '#fff', fontSize: 48, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: -2, lineHeight: 52 },
  fanCount: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 'bold', marginTop: 10, letterSpacing: 1.5 },
  mainActions: { flexDirection: 'row', alignItems: 'center', marginTop: 25, gap: 15 },
  playFab: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
  followBtn: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  followBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: theme.colors.accent },
  followBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  actionCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  section: { marginTop: 40, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: 2 },
  seeAll: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingVertical: 8 },
  trackIndex: { color: 'rgba(255,255,255,0.3)', fontSize: 14, width: 25, textAlign: 'center' },
  trackCover: { width: 40, height: 40, borderRadius: 4, marginHorizontal: 15 },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  trackRank: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2, fontWeight: 'bold' },
  heartBtn: { padding: 10 },
  playingRow: { backgroundColor: 'rgba(29, 185, 84, 0.05)', borderRadius: 12, marginHorizontal: -10, paddingHorizontal: 10 },
  showMoreBtn: { paddingVertical: 15, alignItems: 'center', marginTop: 5 },
  showMoreText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 'bold' },
  horizontalGrid: { marginHorizontal: -20, paddingHorizontal: 20 },
  albumItem: { width: 140, marginRight: 15 },
  albumItemCover: { width: 140, height: 140, borderRadius: 12, marginBottom: 10 },
  albumItemTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  albumItemYear: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  relatedItem: { width: 120, marginRight: 15, alignItems: 'center' },
  relatedImg: { width: 110, height: 110, borderRadius: 55, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  relatedName: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' }
});
