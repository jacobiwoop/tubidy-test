import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { ChevronLeft, Download } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { usePlayer } from '../context/PlayerContext';
import { getArtistNames } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 50) / 2;

export default function DownloadedAlbumsScreen({ navigation }) {
  const { downloads } = usePlayer();

  // Groupement par album.id
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

  const renderAlbum = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
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
      <Image source={{ uri: item.cover }} style={styles.cover} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardArtist} numberOfLines={1}>{item.artist}</Text>
        <View style={styles.trackCount}>
          <Download size={10} color={theme.colors.accent} />
          <Text style={styles.trackCountText}>{item.tracks.length} titre{item.tracks.length > 1 ? 's' : ''}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Albums Téléchargés</Text>
            <Text style={styles.headerSub}>{albums.length} album{albums.length > 1 ? 's' : ''}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {albums.length === 0 ? (
        <View style={styles.empty}>
          <Download size={48} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptyText}>Aucun album téléchargé</Text>
          <Text style={styles.emptySubText}>Télécharge un album depuis la page d'un artiste</Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={item => item.id}
          renderItem={renderAlbum}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center'
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  list: { padding: 15, paddingBottom: 120 },
  row: { justifyContent: 'space-between', marginBottom: 15 },
  card: {
    width: CARD_SIZE,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  cover: { width: CARD_SIZE, height: CARD_SIZE, backgroundColor: '#1a1a1a' },
  cardInfo: { padding: 12 },
  cardTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  cardArtist: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 6 },
  trackCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackCountText: { color: theme.colors.accent, fontSize: 10, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }
});
