import React, { useState } from 'react';
import { StyleSheet, Text, View, StatusBar, TouchableOpacity, Image, Platform, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import audioModule from './src/utils/audioFactory';
import { theme } from './src/utils/theme';
import SearchScreen from './src/screens/SearchScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import ArtistScreen from './src/screens/ArtistScreen';
import { getTrackDownload, BASE_URL } from './src/services/api';
import { Play, Pause, Heart, Home, Search, Library, Plus, ListMusic, CheckCircle, RotateCcw } from 'lucide-react-native';

import { isTrackFavorite, saveFavorite } from './src/utils/favorites';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import { getPlaylists, createPlaylist, addTrackToPlaylist, removeTrackFromPlaylist } from './src/utils/playlists';
import { getDownloadMetadata, startDownload, deleteDownload } from './src/utils/downloader';
import { Modal, ScrollView, TextInput } from 'react-native';
import { PlayerContext } from './src/context/PlayerContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');
const { player, TrackPlayer } = audioModule;
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = React.createRef();

export default function App() {
  const playerStatus = useAudioPlayerStatus(player);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  
  // États de la File d'attente
  const [currentQueue, setCurrentQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  
  // États de Téléchargement
  const [downloads, setDownloads] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState({}); // { trackId: progress }
  
  const [playbackError, setPlaybackError] = useState(false);
  
  const playerPos = React.useRef(new Animated.Value(SCREEN_HEIGHT + 500)).current;

  React.useEffect(() => {
    loadFavoritesList();
    loadPlaylists();
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    const list = await getDownloadMetadata();
    setDownloads(list);
  };

  const loadPlaylists = async () => {
    const list = await getPlaylists();
    setPlaylists(list);
  };

  const loadFavoritesList = async () => {
    const { getFavorites } = require('./src/utils/favorites');
    const favs = await getFavorites();
    setFavorites(favs || []);
    
    // Si on a un morceau en cours, on met à jour son état spécifique
    if (currentTrack) {
      setIsFavorite(favs.some(f => f.id === currentTrack.id));
    }
  };

  const toggleTrackInPlaylist = async (playlistId, track) => {
    if (!track) return;
    const playlist = playlists.find(p => p.id === playlistId);
    const exists = playlist?.tracks?.some(t => t.id === track.id);
    
    if (exists) {
      const { removeTrackFromPlaylist } = require('./src/utils/playlists');
      await removeTrackFromPlaylist(playlistId, track.id);
    } else {
      await addTrackToPlaylist(playlistId, track);
    }
    await loadPlaylists();
    if (playlistId === 'liked') {
      await loadFavoritesList();
    }
  };

  const toggleTrackFavorite = async (track) => {
    const isFav = favorites.some(f => f.id === track.id);
    await saveFavorite(track, !isFav);
    await loadFavoritesList();
    await loadPlaylists(); // Ajout du rafraîchissement global
  };

  const toggleFavorite = async () => {
    if (!currentTrack) return;
    await toggleTrackFavorite(currentTrack);
  };

  React.useEffect(() => {
    if (currentTrack) {
      setIsFavorite(favorites.some(f => f.id === currentTrack.id));
    }
  }, [currentTrack, favorites]);

  React.useEffect(() => {
    Animated.spring(playerPos, {
      toValue: showFullPlayer ? 0 : SCREEN_HEIGHT + 500,
      useNativeDriver: true,
      tension: 40,
      friction: 8
    }).start();
  }, [showFullPlayer]);

  const handlePlayTrack = async (track, queue = []) => {
    setPlaybackError(false);
    setCurrentTrack(track);
    
    // 1. Gérer la file d'attente
    if (queue.length > 1) {
      setCurrentQueue(queue);
      setCurrentQueueIndex(queue.findIndex(t => t.id === track.id));
    } else {
      setCurrentQueue([track]);
      setCurrentQueueIndex(0);
    }
    
    setLoadingTrackId(track.id);
    
    try {
      let finalLink;

      // 2. Vérifier si on a déjà le morceau en local (Offline)
      if (track.localUri) {
        console.log('[App] Mode Hors-ligne : Lecture locale');
        finalLink = track.localUri;
      } else {
        // 3. Sinon, on demande au serveur
        try {
          const downloadData = await getTrackDownload(track.id);
          const link = downloadData?.target?.link || downloadData?.link;
          
          if (!link) throw new Error("No link");
          finalLink = `${BASE_URL}/api/proxy-audio?url=${encodeURIComponent(link)}`;
        } catch (netError) {
          console.log(`[App] Playback Error for ${track.title}:`, netError.message);
          
          // Si c'est une erreur de réseau (pas de réponse du serveur)
          if (!netError.response) {
            console.log('[App] Network unreachable. Skipping...');
          } else {
            console.log(`[App] Server responded with status ${netError.response.status}`);
          }

          if (currentQueue.length > 1 && currentQueueIndex < currentQueue.length - 1) {
            handleNext();
          } else {
            setPlaybackError(true);
            alert("Erreur de lecture : " + netError.message);
          }
          return;
        }
      }

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: track.id,
        url: finalLink,
        title: track.title,
        artist: track.artist?.name,
        artwork: track.album?.cover_medium,
      });
      await TrackPlayer.play();
      // setShowFullPlayer(true); // Désactivé à la demande de l'utilisateur
    } catch (error) {
      console.error('Playback error:', error);
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handleDownload = async (track) => {
    if (!track) return;
    
    // 1. Activer l'état visuel immédiatement
    setActiveDownloads(prev => ({ ...prev, [track.id]: 0 }));

    try {
      // 2. Récupérer les données
      const downloadData = await getTrackDownload(track.id);
      const link = downloadData?.target?.link || downloadData?.link;
      
      if (!link) {
        alert("Impossible de récupérer le lien de téléchargement.");
        setActiveDownloads(prev => {
          const next = { ...prev };
          delete next[track.id];
          return next;
        });
        return;
      }

      // 3. Lancer le téléchargement réel
      await startDownload(track, link, (progress) => {
        setActiveDownloads(prev => ({ ...prev, [track.id]: progress }));
      });

      // 4. Terminé !
      setActiveDownloads(prev => {
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
      loadDownloads();
    } catch (e) {
      console.error('Download error:', e);
      setActiveDownloads(prev => {
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
    }
  };

  const handleNext = () => {
    if (currentQueue.length > 0 && currentQueueIndex < currentQueue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      handlePlayTrack(currentQueue[nextIndex], currentQueue);
    }
  };

  const handlePrevious = () => {
    if (currentQueue.length > 0 && currentQueueIndex > 0) {
      const prevIndex = currentQueueIndex - 1;
      handlePlayTrack(currentQueue[prevIndex], currentQueue);
    }
  };

  const togglePlay = async () => {
    if (playerStatus?.playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const handleViewArtist = (id) => {
    if (!id || !navigationRef.current) return;
    // On navigue dans l'onglet actuel vers le détail de l'artiste
    navigationRef.current.navigate('Home', {
      screen: 'ArtistDetail',
      params: { artistId: id },
    });
  };

  // On considère que le player est prêt si on a un statut
  const isPlayerReady = !!playerStatus;

  return (
    <PlayerContext.Provider value={{ 
      onPlayTrack: handlePlayTrack, 
      loadingTrackId, 
      favorites, 
      onToggleFavorite: toggleTrackFavorite,
      playlists,
      loadPlaylists,
      currentTrack,
      downloads,
      activeDownloads,
      onViewArtist: handleViewArtist
    }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <NavigationContainer ref={navigationRef}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                if (route.name === 'Home') return <Home size={size} color={color} />;
                if (route.name === 'Search') return <Search size={size} color={color} />;
                if (route.name === 'Library') return <Library size={size} color={color} />;
              },
              tabBarActiveTintColor: theme.colors.accent,
              tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
              tabBarStyle: {
                backgroundColor: '#121212',
                borderTopWidth: 0,
                height: 60,
                paddingBottom: 10,
                display: isPlayerReady ? 'flex' : 'flex'
              },
              headerShown: false
            })}
          >
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Search" component={SearchStack} />
            <Tab.Screen name="Library" component={LibraryStack} />
          </Tab.Navigator>
        </NavigationContainer>

        {/* Mini Player */}
        {currentTrack && !showFullPlayer && (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setShowFullPlayer(true)}
            style={styles.miniPlayer}
          >
            {/* Pas de dégradé, on utilise le style de fond du miniPlayer */}
            <Image 
              source={{ uri: currentTrack?.album?.cover_medium || '' }} 
              style={styles.miniCover} 
            />
            <View style={styles.miniInfo}>
              <Text style={styles.miniTitle} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={styles.miniArtist} numberOfLines={1}>{currentTrack.artist?.name}</Text>
            </View>
            <TouchableOpacity onPress={togglePlay} style={styles.miniPlayBtn}>
              {playerStatus?.playing ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Full Player Overlay */}
        <Animated.View 
          pointerEvents={showFullPlayer ? 'auto' : 'none'}
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateY: playerPos }], zIndex: showFullPlayer ? 1000 : -1 }
          ]}
        >
          <PlayerScreen 
            track={currentTrack}
            status={{ ...playerStatus, loadingTrackId }}
            onClose={() => setShowFullPlayer(false)}
            onPlayPause={togglePlay}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onAddToPlaylist={() => setShowPlaylistModal(true)}
            queue={currentQueue}
            queueIndex={currentQueueIndex}
            onSelectFromQueue={(track, idx) => handlePlayTrack(track, currentQueue)}
            onViewArtist={handleViewArtist}
          />
        </Animated.View>

        {/* Modal Ajout Playlist */}
        <Modal
          visible={showPlaylistModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPlaylistModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ajouter à une playlist</Text>
              
              <TouchableOpacity 
                style={styles.createPlaylistBtn}
                onPress={() => {
                  const title = prompt("Nom de la nouvelle playlist :");
                  if (title) handleCreatePlaylist(title);
                }}
              >
                <Plus size={20} color={theme.colors.accent} />
                <Text style={styles.createPlaylistText}>Nouvelle playlist</Text>
              </TouchableOpacity>

              <ScrollView style={styles.playlistList}>
                {playlists.map(playlist => (
                  <TouchableOpacity 
                    key={playlist.id} 
                    style={styles.playlistItem}
                    onPress={() => handleAddToPlaylist(playlist.id)}
                  >
                    <ListMusic size={20} color="#fff" />
                    <Text style={styles.playlistItemText}>{playlist.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity 
                style={styles.closeModalBtn}
                onPress={() => setShowPlaylistModal(false)}
              >
                <Text style={styles.closeModalText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </PlayerContext.Provider>
  );
}

// Stack Navigators définis en dehors pour la stabilité
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
    </Stack.Navigator>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
    </Stack.Navigator>
  );
}

function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="LibraryMain" component={LibraryScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
    </Stack.Navigator>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.primary,
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: -2,
  },
  text: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  miniPlayer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 95 : 80,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  miniCover: {
    width: 45,
    height: 45,
    borderRadius: 8,
  },
  miniInfo: {
    flex: 1,
    marginLeft: 15,
  },
  miniTitle: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  miniArtist: {
    color: theme.colors.secondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  miniPlayBtn: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playlistList: {
    padding: 20,
  },
  createContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    gap: 10,
  },
  playlistInput: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: 'white',
    height: 45,
  },
  createBtn: {
    width: 45,
    height: 45,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  playlistIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  playlistTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistCount: {
    color: theme.colors.secondary,
    fontSize: 12,
  },
});
