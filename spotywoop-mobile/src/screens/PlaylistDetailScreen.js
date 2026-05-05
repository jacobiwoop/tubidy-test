import React, { useRef, useState, useMemo } from 'react';
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
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Trash2,
  X,
  Disc
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
    onRemoveDownload,
    enrichTracks,
    enrichedMetadata,
    openActionSheet
  } = usePlayer();

  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Mode sélection multiple ──────────────────────────────────────────────
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const enterSelectMode = (itemId) => {
    triggerHaptic('impactMedium');
    setIsSelecting(true);
    setSelectedIds(new Set([itemId]));
  };

  const toggleSelect = (itemId) => {
    triggerHaptic('selection');
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const exitSelectMode = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    triggerHaptic('impactLight');
    setSelectedIds(new Set(displayTracks.map(t => String(t.id))));
  };

  const deleteSelected = () => {
    triggerHaptic('notificationSuccess');
    selectedIds.forEach(id => {
      const track = downloads.find(d => String(d.id) === id);
      if (track) onRemoveDownload(track);
    });
    exitSelectMode();
  };

  const playSelected = () => {
    const selectedTracks = displayTracks.filter(t => selectedIds.has(String(t.id)));
    if (selectedTracks.length > 0) {
      onPlayTrack(selectedTracks[0], selectedTracks);
      exitSelectMode();
    }
  };

  // ── Données affichées ────────────────────────────────────────────────────
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

  // ── Groupement par album (uniquement pour la page Téléchargements) ────────
  const downloadedAlbums = useMemo(() => {
    if (playlistId !== 'downloads') return [];
    const groups = {};
    downloads.forEach(track => {
      if (track.album?.id) {
        const albumId = String(track.album.id);
        if (!groups[albumId]) {
          groups[albumId] = {
            id: albumId,
            title: track.album.title || 'Album inconnu',
            artist: getArtistNames(track),
            cover: track.album.cover_medium || track.artwork,
            tracks: []
          };
        }
        groups[albumId].tracks.push(track);
      }
    });
    // Seulement les groupes avec 2+ morceaux méritent d'être affichés comme "album"
    return Object.values(groups)
      .filter(g => g.tracks.length >= 2)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [downloads, playlistId]);

  // Les morceaux qui ne sont PAS dans un album groupé (individuels)
  const albumTrackIds = useMemo(() => {
    const ids = new Set();
    downloadedAlbums.forEach(album => album.tracks.forEach(t => ids.add(String(t.id))));
    return ids;
  }, [downloadedAlbums]);

  const individualTracks = useMemo(() => {
    if (playlistId !== 'downloads') return displayTracks;
    return displayTracks.filter(t => !albumTrackIds.has(String(t.id)));
  }, [displayTracks, albumTrackIds, playlistId]);

  const finalTracks = playlistId === 'downloads' ? individualTracks : displayTracks;

  // Enrichissement automatique
  React.useEffect(() => {
    if (displayTracks.length > 0) enrichTracks(displayTracks);
  }, [playlistId]);

  // ── Parallaxe ────────────────────────────────────────────────────────────
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 200], outputRange: [340, 100], extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [150, 200], outputRange: [0, 1], extrapolate: 'clamp',
  });

  // ── Rendu d'un morceau ───────────────────────────────────────────────────
  const renderTrackItem = ({ item, index }) => {
    const isPlaying = currentTrack?.id === item.id;
    const isFavorite = favorites.some(f => f.id === item.id);
    const isDownloaded = downloads.some(d => String(d.id) === String(item.id));
    const isSelected = selectedIds.has(String(item.id));

    return (
      <TouchableOpacity 
        style={[styles.trackRow, isPlaying && styles.playingRow, isSelected && styles.selectedRow]}
        onPress={() => {
          if (isSelecting) { toggleSelect(String(item.id)); return; }
          onPlayTrack(item, finalTracks);
        }}
        onLongPress={() => {
          if (isSelecting) return;
          if (playlistId === 'downloads') {
            enterSelectMode(String(item.id));
          } else {
            openActionSheet(item, 'track', { playlistId });
          }
        }}
        delayLongPress={300}
      >
        {/* Checkbox en mode sélection */}
        {isSelecting ? (
          <View style={styles.checkbox}>
            {isSelected 
              ? <CheckCircle2 size={22} color={theme.colors.accent} fill={theme.colors.accent} />
              : <Circle size={22} color="rgba(255,255,255,0.3)" />
            }
          </View>
        ) : (
          <Text style={styles.trackNumber}>{index + 1}</Text>
        )}

        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            if (isSelecting) return;
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
          {!isSelecting && (
            activeDownloads[item.id] !== undefined ? (
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
            )
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Header de liste (Albums + Actions) ───────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* Boutons d'actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.playFab}
          onPress={() => finalTracks[0] && onPlayTrack(finalTracks[0], finalTracks)}
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

      {/* Section Albums Téléchargés */}
      {downloadedAlbums.length > 0 && (
        <View style={styles.albumsSection}>
          <View style={styles.albumsSectionHeader}>
            <Disc size={14} color={theme.colors.accent} />
            <Text style={styles.albumsSectionTitle}>ALBUMS</Text>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('DownloadedAlbums')}
            >
              <Text style={styles.seeAllText}>Tout voir</Text>
            </TouchableOpacity>
          </View>
          {downloadedAlbums.map(album => (
            <TouchableOpacity
              key={album.id}
              style={styles.albumCard}
              onPress={() => navigation.navigate('AlbumDetail', { 
                albumId: album.id,
                albumTitle: album.title,
                localTracks: album.tracks
              })}
              onLongPress={() => {
                enterSelectMode(null);
                const ids = new Set(album.tracks.map(t => String(t.id)));
                setSelectedIds(ids);
                setIsSelecting(true);
              }}
              delayLongPress={300}
            >
              <Image source={{ uri: album.cover }} style={styles.albumCover} />
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
                <Text style={styles.albumMeta}>{album.artist} • {album.tracks.length} titres</Text>
              </View>
              <ChevronLeft size={18} color="rgba(255,255,255,0.3)" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          ))}

          {individualTracks.length > 0 && (
            <View style={styles.individualHeader}>
              <ListMusic size={14} color={theme.colors.accent} />
              <Text style={styles.albumsSectionTitle}>TITRES INDIVIDUELS</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

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

      <Animated.View style={[styles.stickyHeader, { opacity: stickyHeaderOpacity, zIndex: 5 }]}>
        <Text style={styles.stickyTitle}>{title}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ChevronLeft size={28} color="white" />
      </TouchableOpacity>

      <Animated.FlatList
        data={finalTracks}
        keyExtractor={(item) => String(item.id)}
        extraData={[enrichedMetadata, selectedIds, isSelecting]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        style={{ zIndex: 2 }}
        contentContainerStyle={styles.detailList}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={playlistId === 'downloads' ? (
          <DownloadQueue 
            downloadingItems={downloadingItems} 
            activeDownloads={activeDownloads} 
          />
        ) : (
          <View style={{ height: 100 }} />
        )}
        renderItem={renderTrackItem}
        ListEmptyComponent={() => (
          <View style={styles.emptyDetail}>
            <Text style={styles.emptyText}>Cette liste est vide</Text>
          </View>
        )}
      />

      {/* ── Barre de sélection multiple ─────────────────────────────────── */}
      {isSelecting && (
        <View style={styles.selectionBar}>
          <TouchableOpacity style={styles.selectionBarBtn} onPress={exitSelectMode}>
            <X size={20} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.selectionCount}>
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </Text>

          <TouchableOpacity style={styles.selectionBarBtn} onPress={selectAll}>
            <Text style={styles.selectionBarText}>Tout</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.selectionBarBtn, { marginLeft: 8 }]} onPress={playSelected}>
            <Play size={20} color={theme.colors.accent} />
          </TouchableOpacity>

          {playlistId === 'downloads' && (
            <TouchableOpacity style={[styles.selectionBarBtn, styles.deleteBtn]} onPress={deleteSelected}>
              <Trash2 size={20} color="#ff4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
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
  actionsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, marginTop: -30, zIndex: 10, elevation: 10 },
  playFab: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, marginRight: 20 },
  shuffleBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  
  // Albums section
  albumsSection: { paddingHorizontal: 20, marginBottom: 10 },
  albumsSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  albumsSectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, flex: 1 },
  seeAllBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  seeAllText: { color: theme.colors.accent, fontSize: 11, fontWeight: 'bold' },
  albumCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  albumCover: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#1a1a1a' },
  albumInfo: { flex: 1, marginHorizontal: 14 },
  albumTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 3 },
  albumMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  individualHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 12, gap: 8 },

  // Track row
  trackRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  playingRow: { backgroundColor: 'rgba(29, 185, 84, 0.05)' },
  selectedRow: { backgroundColor: 'rgba(29, 185, 84, 0.1)' },
  checkbox: { width: 25, justifyContent: 'center', alignItems: 'center' },
  trackNumber: { color: 'rgba(255,255,255,0.3)', fontSize: 14, width: 25, textAlign: 'center' },
  trackThumb: { width: 45, height: 45, borderRadius: 6, marginHorizontal: 15, backgroundColor: '#161616' },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  trackArtist: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  trackAction: { padding: 10 },
  emptyDetail: { padding: 60, alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontStyle: 'italic' },
  progressTextSmall: { color: theme.colors.accent, fontSize: 10, fontWeight: 'bold', minWidth: 35, textAlign: 'right' },

  // Barre de sélection
  selectionBar: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8
  },
  selectionBarBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  selectionBarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  selectionCount: { flex: 1, color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  deleteBtn: { backgroundColor: 'rgba(255,68,68,0.15)' },
});
