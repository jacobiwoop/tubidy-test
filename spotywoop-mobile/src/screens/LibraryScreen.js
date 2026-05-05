import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  StatusBar,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../utils/theme';
import { 
  Heart, 
  ListMusic, 
  Download, 
  Plus, 
  Volume2, 
  Clock,
  FolderPlus
} from 'lucide-react-native';

import { createPlaylist } from '../utils/playlists';
import { usePlayer } from '../context/PlayerContext';
import { triggerHaptic } from '../utils/haptics';

const { width } = Dimensions.get('window');

export default function LibraryScreen({ navigation }) {
  const { 
    favorites,
    playlists, 
    loadPlaylists: refreshPlaylists, 
    downloads,
    recentlyPlayed,
    followedAlbums,
    followedArtists
  } = usePlayer();
  
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const likedSongs = playlists.find(p => p.id === 'liked') || { id: 'liked', title: 'Liked Songs', tracks: favorites };
  const downloadsPlaylist = {
    id: 'downloads',
    title: 'Téléchargements',
    tracks: downloads,
  };
  const recentlyPlayedPlaylist = {
    id: 'recently',
    title: 'Écoutés récemment',
    tracks: recentlyPlayed,
  };
  const otherPlaylists = playlists.filter(p => p.id !== 'liked');

  const PlaylistCard = ({ item, isLiked, isDownloads, isRecently }) => (
    <TouchableOpacity 
      style={styles.playlistCard} 
      onPress={() => {
        triggerHaptic("impactLight");
        navigation.navigate('PlaylistDetail', { 
          playlistId: item.id, 
          title: item.title,
          tracks: item.tracks 
        });
      }}
    >
      <View style={styles.cardThumbContainer}>
        {isLiked ? (
          <LinearGradient colors={['#450af5', '#c4efd9']} style={styles.cardThumb}>
             <Heart size={32} color="white" fill="white" />
          </LinearGradient>
        ) : isDownloads ? (
          <LinearGradient colors={['#00d2ff', '#3a7bd5']} style={styles.cardThumb}>
             <Download size={32} color="white" />
          </LinearGradient>
        ) : isRecently ? (
          <LinearGradient colors={['#8e2de2', '#4a00e0']} style={styles.cardThumb}>
             <Clock size={32} color="white" />
          </LinearGradient>
        ) : (
          <View style={styles.cardThumb}>
             <ListMusic size={32} color="rgba(255,255,255,0.2)" />
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardCount}>{item.tracks?.length || 0} titres</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.mainHeader}>
            <Text style={styles.mainTitle}>Bibliothèque</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(!showCreate)}>
              <Plus size={24} color="white" />
            </TouchableOpacity>
          </View>

          {showCreate && (
            <View style={styles.createBox}>
              <FolderPlus size={20} color={theme.colors.accent} />
              <TextInput
                style={styles.createInput}
                placeholder="Nouvelle playlist..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={async () => {
                   if (newTitle.trim()) {
                     await createPlaylist(newTitle);
                     setNewTitle('');
                     setShowCreate(false);
                     refreshPlaylists();
                   }
                }}
              />
            </View>
          )}

          <View style={styles.grid}>
            <PlaylistCard item={likedSongs} isLiked={true} />
            <PlaylistCard item={downloadsPlaylist} isDownloads={true} />
            <PlaylistCard item={recentlyPlayedPlaylist} isRecently={true} />
            {otherPlaylists.map(pl => <PlaylistCard key={pl.id} item={pl} />)}
            
            {/* Albums Suivis */}
            {followedAlbums.map(album => (
              <TouchableOpacity 
                key={album.id} 
                style={styles.playlistCard} 
                onPress={() => {
                  triggerHaptic("impactLight");
                  navigation.navigate('Album', { albumId: album.id, albumTitle: album.title });
                }}
              >
                <View style={styles.cardThumbContainer}>
                  <Image source={{ uri: album.cover_medium }} style={styles.cardThumb} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{album.title}</Text>
                  <Text style={styles.cardCount}>Album • {album.artist?.name}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Artistes Suivis */}
            {followedArtists.map(artist => (
              <TouchableOpacity 
                key={artist.id} 
                style={styles.playlistCard} 
                onPress={() => {
                  triggerHaptic("impactLight");
                  navigation.navigate('Artist', { artistId: artist.id });
                }}
              >
                <View style={[styles.cardThumbContainer, { borderRadius: (width - 55) / 4 }]}>
                  <Image source={{ uri: artist.picture_medium }} style={styles.cardThumb} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { textAlign: 'center' }]} numberOfLines={1}>{artist.name}</Text>
                  <Text style={[styles.cardCount, { textAlign: 'center' }]}>Artiste</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 25,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  playlistCard: {
    width: (width - 55) / 2,
    marginBottom: 20,
  },
  cardThumbContainer: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#161616',
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardThumb: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    paddingHorizontal: 2,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cardCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  createBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    padding: 12,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  createInput: {
    flex: 1,
    color: '#fff',
    marginLeft: 12,
    fontSize: 15,
  }
});
