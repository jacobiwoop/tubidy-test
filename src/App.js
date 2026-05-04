import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Modal, TextInput, ScrollView, Dimensions, Platform
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Search, Library, Plus, ListMusic } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import HomeScreen    from './screens/HomeScreen';
import SearchScreen  from './screens/SearchScreen';
import PlayerScreen  from './screens/PlayerScreen';
import ArtistScreen  from './screens/ArtistScreen';
import LibraryScreen from './screens/LibraryScreen';
import MiniPlayer    from './components/MiniPlayer';
import QueueModal    from './components/QueueModal';

import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { theme } from './utils/theme';
import { addTrackToPlaylist, createPlaylist } from './utils/playlists';
import { startDownload } from './utils/downloader';
import { getTrackDownload } from './services/api';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0a0a0a',
    card: '#121212',
    text: '#ffffff',
    border: 'transparent',
    primary: theme.colors.accent,
  },
};

const MainApp = () => {
  const {
    currentTrack,
    playerStatus,
    onTogglePlay,
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
    onPlayTrack,
    currentQueue,
    // Modes de lecture
    isShuffle,
    repeatMode,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayer();

  // ─── États locaux (pas dans le Context → pas de re-render global) ──────────
  const [showFullPlayer,   setShowFullPlayer]   = useState(false);
  const [isQueueVisible,   setIsQueueVisible]   = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistTitle,  setNewPlaylistTitle]  = useState('');

  // ─── Animation grand player (Reanimated, thread UI) ───────────────────────
  const translateY = useSharedValue(SCREEN_HEIGHT);

  const openFullPlayer = () => {
    setShowFullPlayer(true);
    translateY.value = withSpring(0, { damping: 20, stiffness: 120, mass: 0.5 });
  };
  const closeFullPlayer = () => {
    translateY.value = withSpring(SCREEN_HEIGHT, { damping: 20, stiffness: 120, mass: 0.5 });
    setTimeout(() => setShowFullPlayer(false), 300);
  };

  const animatedPlayerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // ─── Téléchargement ────────────────────────────────────────────────────────
  const handleDownload = async (track) => {
    try {
      setActiveDownloads(prev => ({ ...prev, [track.id]: 0 }));
      const dl   = await getTrackDownload(track.id);
      const link = dl?.target?.link || dl?.link;
      if (!link) { alert('Lien non disponible'); return; }
      await startDownload(track, link, (progress) => {
        setActiveDownloads(prev => ({ ...prev, [track.id]: progress }));
      });
    } catch (e) {
      console.error(e);
    } finally {
      setActiveDownloads(prev => { const n = { ...prev }; delete n[track.id]; return n; });
    }
  };

  // ─── Playlists ─────────────────────────────────────────────────────────────
  const handleCreatePlaylist = async (title) => { await createPlaylist(title); await loadPlaylists(); };
  const handleAddToPlaylist  = async (id) => {
    if (currentTrack) {
      await addTrackToPlaylist(id, currentTrack);
      await loadPlaylists();
      setShowPlaylistModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              if (route.name === 'Home')    return <Home    size={size} color={color} />;
              if (route.name === 'Search')  return <Search  size={size} color={color} />;
              if (route.name === 'Library') return <Library size={size} color={color} />;
            },
            tabBarActiveTintColor:   theme.colors.accent,
            tabBarInactiveTintColor: theme.colors.secondary,
            tabBarStyle: { backgroundColor: '#121212', borderTopWidth: 0, height: 60, paddingBottom: 8 },
            headerShown: false,
          })}
        >
          <Tab.Screen name="Home"    component={HomeStack} />
          <Tab.Screen name="Search"  component={SearchStack} />
          <Tab.Screen name="Library" component={LibraryStack} />
        </Tab.Navigator>

        {/* Mini Player */}
        {currentTrack && !showFullPlayer && (
          <MiniPlayer
            currentTrack={currentTrack}
            playerStatus={playerStatus}
            onTogglePlay={onTogglePlay}
            onOpenFullPlayer={openFullPlayer}
            loadingTrackId={loadingTrackId}
            colors={currentColors}
            onOpenQueue={() => setIsQueueVisible(true)}
          />
        )}

        {/* Grand Player */}
        {showFullPlayer && (
          <Animated.View
            pointerEvents="auto"
            style={[styles.fullPlayerContainer, animatedPlayerStyle]}
          >
            <PlayerScreen
              track={currentTrack}
              status={{ ...playerStatus, loadingTrackId }}
              onClose={closeFullPlayer}
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
              // Modes de lecture
              isShuffle={isShuffle}
              repeatMode={repeatMode}
              onToggleShuffle={toggleShuffle}
              onCycleRepeat={cycleRepeatMode}
            />
          </Animated.View>
        )}

        {/* Queue Modal */}
        <QueueModal
          isVisible={isQueueVisible}
          onClose={() => setIsQueueVisible(false)}
          queue={currentQueue}
          currentTrack={currentTrack}
          suggestions={suggestions}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onPlayTrackAt={async (index, isSuggestion) => {
            const success = isSuggestion
              ? await onPlayTrack(suggestions[index])
              : await onPlayTrack(currentQueue[index], currentQueue, index);
            if (success) setIsQueueVisible(false);
          }}
          onRemoveTrackAt={() => {}}
          onClearQueue={() => {}}
        />

        {/* Modal Playlist */}
        <Modal
          visible={showPlaylistModal}
          transparent
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
                  onPress={() => { if (newPlaylistTitle.trim()) { handleCreatePlaylist(newPlaylistTitle); setNewPlaylistTitle(''); } }}
                >
                  <Plus size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.playlistList}>
                {playlists.map(pl => (
                  <TouchableOpacity key={pl.id} style={styles.playlistItem} onPress={() => handleAddToPlaylist(pl.id)}>
                    <View style={styles.playlistIcon}><ListMusic size={24} color={theme.colors.accent} /></View>
                    <View>
                      <Text style={styles.playlistTitle}>{pl.title}</Text>
                      <Text style={styles.playlistCount}>{pl.tracks?.length || 0} titres</Text>
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
    </View>
  );
};

// ─── Stacks ─────────────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain"    component={HomeScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
    </Stack.Navigator>
  );
}
function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain"   component={SearchScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
    </Stack.Navigator>
  );
}
function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LibraryMain"  component={LibraryScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayerProvider>
        <MainApp />
      </PlayerProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fullPlayerContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 1000 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '80%' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  createContainer: { flexDirection: 'row', marginBottom: 20 },
  playlistInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, color: '#fff', marginRight: 10 },
  createBtn: { backgroundColor: theme.colors.accent, width: 50, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  playlistList: { marginBottom: 20 },
  playlistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  playlistIcon: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  playlistTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  playlistCount: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  closeModalBtn: { padding: 15, alignItems: 'center' },
  closeModalText: { color: theme.colors.accent, fontSize: 16, fontWeight: 'bold' },
});
