import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView,
  Dimensions,
  Platform,
  SafeAreaView
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Search, Library, Plus, ListMusic } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate
} from 'react-native-reanimated';

import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import PlayerScreen from './screens/PlayerScreen';
import ArtistScreen from './screens/ArtistScreen';
import LibraryScreen from './screens/LibraryScreen';

import MiniPlayer from './components/MiniPlayer';
import QueueModal from './components/QueueModal';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { theme } from './utils/theme';
import { addTrackToPlaylist, createPlaylist } from './utils/playlists';
import { startDownload } from './utils/downloader';
import { getTrackDownload } from './services/api';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MainApp = () => {
  const { 
    currentTrack, 
    playerStatus, 
    onTogglePlay, 
    showFullPlayer, 
    setShowFullPlayer, 
    favorites,
    onToggleFavorite,
    playlists,
    loadPlaylists,
    onNext,
    onPrevious,
    downloads,
    activeDownloads,
    setActiveDownloads,
    loadingTrackId,
    currentColors,
    suggestions,
    isQueueVisible,
    setIsQueueVisible,
    onPlayTrack,
    currentQueue
  } = usePlayer();

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  // Reanimated shared value for player position
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    translateY.value = withSpring(showFullPlayer ? 0 : SCREEN_HEIGHT, {
      damping: 20,
      stiffness: 100,
      mass: 0.5,
    });
  }, [showFullPlayer]);

  const animatedPlayerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: interpolate(translateY.value, [SCREEN_HEIGHT, 0], [0, 1]),
    };
  });

  const handleCreatePlaylist = async (title) => {
    await createPlaylist(title);
    await loadPlaylists();
  };

  const handleAddToPlaylist = async (playlistId) => {
    if (currentTrack) {
      await addTrackToPlaylist(playlistId, currentTrack);
      await loadPlaylists();
      setShowPlaylistModal(false);
    }
  };

  const handleDownload = async (track) => {
    try {
      setActiveDownloads(prev => ({ ...prev, [track.id]: 0 }));
      const downloadData = await getTrackDownload(track.id);
      const link = downloadData?.target?.link || downloadData?.link;
      
      if (!link) {
        alert("Lien non disponible");
        return;
      }

      await startDownload(track, link, (progress) => {
        setActiveDownloads(prev => ({ ...prev, [track.id]: progress }));
      });
    } catch (e) {
      console.error(e);
    } finally {
      setActiveDownloads(prev => {
        const next = { ...prev };
        delete next[track.id];
        return next;
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              if (route.name === 'Home') return <Home size={size} color={color} />;
              if (route.name === 'Search') return <Search size={size} color={color} />;
              if (route.name === 'Library') return <Library size={size} color={color} />;
            },
            tabBarActiveTintColor: theme.colors.accent,
            tabBarInactiveTintColor: theme.colors.secondary,
            tabBarStyle: {
              backgroundColor: '#121212',
              borderTopWidth: 0,
              height: 60,
              paddingBottom: 8,
            },
            headerShown: false,
          })}
        >
          <Tab.Screen name="Home" component={HomeStack} />
          <Tab.Screen name="Search" component={SearchStack} />
          <Tab.Screen name="Library" component={LibraryStack} />
        </Tab.Navigator>

        {!showFullPlayer && (
          <MiniPlayer 
            currentTrack={currentTrack}
            playerStatus={playerStatus}
            onTogglePlay={onTogglePlay}
            onOpenFullPlayer={() => setShowFullPlayer(true)}
            loadingTrackId={loadingTrackId}
            colors={currentColors}
            onOpenQueue={() => setIsQueueVisible(true)}
          />
        )}

        <Animated.View 
          pointerEvents={showFullPlayer ? 'auto' : 'none'}
          style={[
            styles.fullPlayerContainer,
            animatedPlayerStyle,
            { zIndex: showFullPlayer ? 1000 : -1 }
          ]}
        >
          <PlayerScreen 
            track={currentTrack}
            status={{ ...playerStatus, loadingTrackId }}
            onClose={() => setShowFullPlayer(false)}
            onPlayPause={onTogglePlay}
            onNext={onNext}
            onPrevious={onPrevious}
            isFavorite={favorites.some(f => f.id === currentTrack?.id)}
            onToggleFavorite={() => onToggleFavorite(currentTrack)}
            onAddToPlaylist={() => setShowPlaylistModal(true)}
            onDownload={() => handleDownload(currentTrack)}
            downloads={downloads}
            activeDownloads={activeDownloads}
            colors={currentColors}
            onOpenQueue={() => setIsQueueVisible(true)}
          />
        </Animated.View>

        <QueueModal 
          isVisible={isQueueVisible}
          onClose={() => setIsQueueVisible(false)}
          queue={currentQueue}
          currentTrack={currentTrack}
          suggestions={suggestions}
          onPlayTrackAt={async (index, isSuggestion) => {
            let success = false;
            if (isSuggestion) {
              success = await onPlayTrack(suggestions[index]);
            } else {
              success = await onPlayTrack(currentQueue[index]);
            }
            if (success) setIsQueueVisible(false);
          }}
          onRemoveTrackAt={(index) => {}}
          onClearQueue={() => {}}
        />

        <Modal
          visible={showPlaylistModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPlaylistModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ajouter à une playlist</Text>
              <View style={styles.createContainer}>
                <TextInput 
                  style={styles.playlistInput}
                  placeholder="Nouvelle playlist..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={newPlaylistTitle}
                  onChangeText={setNewPlaylistTitle}
                />
                <TouchableOpacity 
                  style={styles.createBtn}
                  onPress={() => {
                    if (newPlaylistTitle.trim()) {
                      handleCreatePlaylist(newPlaylistTitle);
                      setNewPlaylistTitle('');
                    }
                  }}
                >
                  <Plus size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.playlistList}>
                {playlists.map(playlist => (
                  <TouchableOpacity 
                    key={playlist.id} 
                    style={styles.playlistItem}
                    onPress={() => handleAddToPlaylist(playlist.id)}
                  >
                    <View style={styles.playlistIcon}>
                      <ListMusic size={24} color={theme.colors.accent} />
                    </View>
                    <View>
                      <Text style={styles.playlistTitle}>{playlist.title}</Text>
                      <Text style={styles.playlistCount}>{playlist.tracks?.length || 0} titres</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowPlaylistModal(false)}>
                <Text style={styles.closeModalText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </NavigationContainer>
    </SafeAreaView>
  );
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
    </Stack.Navigator>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
    </Stack.Navigator>
  );
}

function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LibraryMain" component={LibraryScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <MainApp />
    </PlayerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullPlayerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  createContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  playlistInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    marginRight: 10,
  },
  createBtn: {
    backgroundColor: theme.colors.accent,
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistList: {
    marginBottom: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  playlistIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  playlistTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  closeModalBtn: {
    padding: 15,
    alignItems: 'center',
  },
  closeModalText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
