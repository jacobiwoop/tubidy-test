import React, { useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  Animated,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { 
  Heart, 
  Download, 
  Clock, 
  ListMusic, 
  ChevronLeft, 
  Play, 
  Shuffle, 
  Volume2, 
  MoreHorizontal 
} from 'lucide-react-native';
import DownloadQueue from '../components/DownloadQueue';
import { theme } from '../utils/theme';
import { usePlayer } from '../context/PlayerContext';
import { triggerHaptic } from '../utils/haptics';
import { getArtistNames } from '../utils/formatters';

const { width } = Dimensions.get('window');

export default function PlaylistDetailScreen({ navigation, route }) {
  const { playlistId, title, tracks: initialTracks } = route.params;
  const { 
    favorites, 
    recentlyPlayed, 
    downloads, 
    onPlayTrack, 
    onToggleFavorite, 
    currentTrack, 
    loadingTrackId,
    activeDownloads,
    downloadingItems,
    onDownloadBatch,
    enrichTracks,
    enrichedMetadata,
    openActionSheet
  } = usePlayer();

  const scrollY = useRef(new Animated.Value(0)).current;

  // Déterminer quelles données afficher selon le type
  let displayTracks = initialTracks || [];
  let icon = <ListMusic size={64} color="rgba(255,255,255,0.2)" />;
  let colors = ['#222', '#080808'];
  let iconBg = '#333';

  if (playlistId === 'liked') {
    displayTracks = favorites;
    icon = <Heart size={64} color="white" fill="white" />;
    colors = ['#4a0080', '#080808'];
    iconBg = '#6a11cb';
  } else if (playlistId === 'downloads') {
    displayTracks = downloads;
    icon = <Download size={64} color="white" />;
    colors = ['#00d2ff', '#080808'];
    iconBg = '#3a7bd5';
  } else if (playlistId === 'recently') {
    displayTracks = recentlyPlayed;
    icon = <Clock size={64} color="white" />;
    colors = ['#8e2de2', '#080808'];
    iconBg = '#4a00e0';
  }

  // Enrichissement automatique en arrière-plan
  React.useEffect(() => {
    if (displayTracks.length > 0) {
      enrichTracks(displayTracks);
    }
  }, [playlistId]); // On relance si on change de playlist

  // Interpolations parallaxe
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [340, 100],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [150, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderTrackItem = ({ item, index }) => {
    const isPlaying = currentTrack?.id === item.id;
    const isFavorite = favorites.some(f => f.id === item.id);
    const isDownloaded = downloads.some(d => String(d.id) === String(item.id));

    return (
      <TouchableOpacity 
        style={[styles.trackRow, isPlaying && styles.playingRow]}
        onPress={() => onPlayTrack(item, displayTracks)}
        onLongPress={() => openActionSheet(item, 'track', { playlistId })}
        delayLongPress={300}
      >
        <Text style={styles.trackNumber}>{index + 1}</Text>
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            triggerHaptic("impactLight");
            navigation.navigate('ArtistDetail', { artistId: item.artist?.id });
          }}
        >
          <Image 
            source={{ uri: item.album?.cover_medium || item.artwork }} 
            style={styles.trackThumb} 
          />
        </TouchableOpacity>
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist}>{getArtistNames(item, enrichedMetadata)}</Text>
        </View>
        <View style={styles.trackAction}>
          {activeDownloads[item.id] !== undefined ? (
            <Text style={styles.progressTextSmall}>{Math.round(activeDownloads[item.id] * 100)}%</Text>
          ) : isDownloaded ? (
            <Download size={16} color={theme.colors.accent} />
          ) : (
            <TouchableOpacity onPress={() => onToggleFavorite(item)}>
              <Heart 
                size={18} 
                color={isFavorite ? theme.colors.accent : 'rgba(255,255,255,0.2)'} 
                fill={isFavorite ? theme.colors.accent : 'transparent'} 
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View style={[styles.heroContainer, { height: headerHeight, zIndex: 1 }]}>
        <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
        <View style={styles.heroPattern} />

        <Animated.View style={[styles.heroContent, { opacity: headerOpacity }]}>
          <View style={[styles.bigIcon, { backgroundColor: iconBg }]}>
            {icon}
          </View>
          <Text style={styles.heroLabel}>Playlist</Text>
          <Text style={styles.heroTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.heroMeta}>{displayTracks.length} titres • Spotywoop</Text>
        </Animated.View>
      </Animated.View>

      {/* Sticky Header Small */}
      <Animated.View style={[styles.stickyHeader, { opacity: stickyHeaderOpacity, zIndex: 5 }]}>
         <Text style={styles.stickyTitle}>{title}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ChevronLeft size={28} color="white" />
      </TouchableOpacity>

      <Animated.FlatList
        data={displayTracks}
        keyExtractor={(item) => String(item.id)}
        extraData={enrichedMetadata}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        style={{ zIndex: 2 }}
        contentContainerStyle={styles.detailList}
        ListFooterComponent={playlistId === 'downloads' ? (
          <DownloadQueue 
            downloadingItems={downloadingItems} 
            activeDownloads={activeDownloads} 
          />
        ) : (
          <View style={{ height: 100 }} />
        )}
        ListHeaderComponent={() => (
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.playFab}
              onPress={() => displayTracks[0] && onPlayTrack(displayTracks[0], displayTracks)}
            >
              <Play size={24} color="black" fill="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shuffleBtn}>
              <Shuffle size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            {playlistId !== 'downloads' && (
              <TouchableOpacity 
                style={[styles.shuffleBtn, { marginLeft: 15 }]} 
                onPress={() => onDownloadBatch(displayTracks)}
              >
                <Download size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={renderTrackItem}
        ListEmptyComponent={() => (
          <View style={styles.emptyDetail}>
            <Text style={styles.emptyText}>Cette liste est vide</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  heroContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, overflow: 'hidden' },
  heroPattern: { ...StyleSheet.absoluteFillObject, opacity: 0.05, borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#fff' },
  heroContent: { flex: 1, justifyContent: 'flex-end', padding: 20, paddingBottom: 40 },
  bigIcon: { width: 140, height: 140, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  heroLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 5 },
  heroTitle: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  heroMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500', marginTop: 5 },
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, backgroundColor: '#080808', zIndex: 2, justifyContent: 'center', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 40 : 0, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  stickyTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  detailList: { paddingTop: 340, paddingBottom: 150 },
  actionsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    marginTop: -30, 
    zIndex: 10, // S'assure qu'il passe au-dessus du heroContainer
    elevation: 10,
  },
  playFab: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, marginRight: 20 },
  shuffleBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  trackRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  trackNumber: { color: 'rgba(255,255,255,0.3)', fontSize: 14, width: 25, textAlign: 'center' },
  trackThumb: { width: 45, height: 45, borderRadius: 6, marginHorizontal: 15, backgroundColor: '#161616' },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  trackArtist: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  trackAction: { padding: 10 },
  playingRow: { backgroundColor: 'rgba(29, 185, 84, 0.05)' },
  emptyDetail: { padding: 60, alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontStyle: 'italic' },
  progressTextSmall: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
    minWidth: 35,
    textAlign: 'right',
  }
});
