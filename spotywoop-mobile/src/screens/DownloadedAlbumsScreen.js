import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  SectionList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { ChevronLeft, Download, Music, Disc, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { usePlayer } from '../context/PlayerContext';
import { getArtistNames } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 50) / 2;

const TABS = [
  { id: 'all',     label: 'Tout',     Icon: Music  },
  { id: 'albums',  label: 'Albums',   Icon: Disc   },
  { id: 'artists', label: 'Artistes', Icon: User   },
];

export default function DownloadedAlbumsScreen({ navigation }) {
  const { downloads, onPlayTrack, currentTrack, openActionSheet } = usePlayer();
  const [activeTab, setActiveTab] = useState('all');

  // ── Onglet "Tout" ────────────────────────────────────────────────────────
  const allTracks = useMemo(() => [...downloads].sort((a, b) =>
    (a.title || '').localeCompare(b.title || '')
  ), [downloads]);

  // ── Onglet "Albums" ──────────────────────────────────────────────────────
  const albums = useMemo(() => {
    const groups = {};
    downloads.forEach(track => {
      if (track.album?.id) {
        const albumId = String(track.album.id);
        if (!groups[albumId]) {
          groups[albumId] = {
            id: albumId,
            title: track.album.title || 'Album inconnu',
            artist: getArtistNames(track),
            cover: track.album.cover_medium || track.album.cover_big || track.artwork,
            tracks: []
          };
        }
        groups[albumId].tracks.push(track);
      }
    });
    return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title));
  }, [downloads]);

  // ── Onglet "Artistes" ────────────────────────────────────────────────────
  const artists = useMemo(() => {
    const groups = {};
    downloads.forEach(track => {
      const artistId = String(track.artist?.id || track.artist || 'unknown');
      const artistName = track.artist?.name || track.artist || 'Artiste inconnu';
      if (!groups[artistId]) {
        groups[artistId] = {
          id: artistId,
          name: artistName,
          picture: track.artist?.picture_medium || track.artist?.picture_small,
          tracks: []
        };
      }
      groups[artistId].tracks.push(track);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [downloads]);

  // ── Renders ──────────────────────────────────────────────────────────────
  const renderTrack = ({ item, index }) => {
    const isPlaying = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.trackRow, isPlaying && styles.playingRow]}
        onPress={() => { triggerHaptic('impactLight'); onPlayTrack(item, allTracks); }}
        onLongPress={() => openActionSheet(item, 'track')}
        delayLongPress={300}
      >
        <Text style={styles.trackNumber}>{index + 1}</Text>
        <Image source={{ uri: item.album?.cover_medium || item.artwork }} style={styles.trackThumb} />
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{getArtistNames(item)}</Text>
        </View>
        <Download size={14} color={theme.colors.accent} />
      </TouchableOpacity>
    );
  };

  const renderAlbum = ({ item }) => (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => {
        triggerHaptic('impactLight');
        navigation.navigate('AlbumDetail', {
          albumId: item.id,
          albumTitle: item.title,
          localTracks: item.tracks
        });
      }}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.cover }} style={styles.albumCover} />
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.albumArtist} numberOfLines={1}>{item.artist}</Text>
        <View style={styles.trackCountRow}>
          <Download size={10} color={theme.colors.accent} />
          <Text style={styles.trackCountText}>{item.tracks.length} titre{item.tracks.length > 1 ? 's' : ''}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderArtist = ({ item }) => (
    <TouchableOpacity
      style={styles.artistRow}
      onPress={() => {
        triggerHaptic('impactLight');
        navigation.navigate('ArtistDetail', { artistId: item.id });
      }}
      activeOpacity={0.8}
    >
      {item.picture ? (
        <Image source={{ uri: item.picture }} style={styles.artistAvatar} />
      ) : (
        <View style={[styles.artistAvatar, styles.artistAvatarPlaceholder]}>
          <User size={24} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <View style={styles.artistInfo}>
        <Text style={styles.artistName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.artistSub}>{item.tracks.length} titre{item.tracks.length > 1 ? 's' : ''} téléchargé{item.tracks.length > 1 ? 's' : ''}</Text>
      </View>
      <ChevronLeft size={18} color="rgba(255,255,255,0.3)" style={{ transform: [{ rotate: '180deg' }] }} />
    </TouchableOpacity>
  );

  const EmptyState = ({ label }) => (
    <View style={styles.empty}>
      <Download size={48} color="rgba(255,255,255,0.1)" />
      <Text style={styles.emptyText}>Aucun {label} téléchargé</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Téléchargements</Text>
            <Text style={styles.headerSub}>{downloads.length} titre{downloads.length > 1 ? 's' : ''}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => { triggerHaptic('selection'); setActiveTab(tab.id); }}
              >
                <tab.Icon size={14} color={isActive ? theme.colors.accent : 'rgba(255,255,255,0.3)'} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'all' && (
        <FlatList
          data={allTracks}
          keyExtractor={item => String(item.id)}
          renderItem={renderTrack}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState label="titre" />}
        />
      )}

      {activeTab === 'albums' && (
        <FlatList
          data={albums}
          keyExtractor={item => item.id}
          renderItem={renderAlbum}
          numColumns={2}
          columnWrapperStyle={styles.albumRow}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState label="album" />}
        />
      )}

      {activeTab === 'artists' && (
        <FlatList
          data={artists}
          keyExtractor={item => item.id}
          renderItem={renderArtist}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState label="artiste" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 10, gap: 6,
  },
  tabActive: { backgroundColor: 'rgba(29, 185, 84, 0.12)' },
  tabLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: theme.colors.accent, fontWeight: '800' },

  list: { padding: 16, paddingBottom: 120 },

  // Onglet Tout — Tracks
  trackRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
  },
  playingRow: { backgroundColor: 'rgba(29,185,84,0.06)', borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 },
  trackNumber: { color: 'rgba(255,255,255,0.25)', fontSize: 13, width: 20, textAlign: 'center' },
  trackThumb: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#1a1a1a' },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  trackArtist: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },

  // Onglet Albums — Grid
  albumRow: { justifyContent: 'space-between', marginBottom: 14 },
  albumCard: {
    width: CARD_SIZE, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
  },
  albumCover: { width: CARD_SIZE, height: CARD_SIZE, backgroundColor: '#1a1a1a' },
  albumInfo: { padding: 10 },
  albumTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  albumArtist: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 5 },
  trackCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackCountText: { color: theme.colors.accent, fontSize: 10, fontWeight: 'bold' },

  // Onglet Artistes — List
  artistRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  artistAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1a1a1a' },
  artistAvatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  artistInfo: { flex: 1 },
  artistName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  artistSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },

  // Empty
  empty: { flex: 1, marginTop: 80, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 'bold' },
});
