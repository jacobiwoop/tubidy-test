import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Modal, TextInput, ScrollView, Dimensions, Platform
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Search, Library, Plus, ListMusic } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import HomeScreen    from './screens/HomeScreen';
import SearchScreen  from './screens/SearchScreen';
import PlayerScreen  from './screens/PlayerScreen';
import ArtistScreen  from './screens/ArtistScreen';
import ArtistReleasesScreen from './screens/ArtistReleasesScreen';
import DownloadedAlbumsScreen from './screens/DownloadedAlbumsScreen';
import AlbumScreen from './screens/AlbumScreen';
import PlaylistDetailScreen from './screens/PlaylistDetailScreen';
import LibraryScreen from './screens/LibraryScreen';
import MiniPlayer    from './components/MiniPlayer';
import QueueModal    from './components/QueueModal';
import PlaylistModal from './components/PlaylistModal';
import ActionSheet from './components/ActionSheet';

import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { theme } from './utils/theme';
import { addTrackToPlaylist, createPlaylist } from './utils/playlists';
import { startDownload, isTrackDownloaded } from './utils/downloader';
import { getTrackDownload } from './services/api';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const navigationRef = createNavigationContainerRef();

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
    onStop, 
    loadingTrackId, 
    currentColors, 
    onToggleFavorite, 
    favorites,
    playlists,
    loadPlaylists,
    downloads,
    onRemoveDownload,
    onDownload,
    activeDownloads,
    onNext,
    onPrevious,
    isShuffle,
    repeatMode,
    toggleShuffle,
    cycleRepeatMode,
    currentQueue,
    currentQueueIndex,
    radioSource,
    suggestions,
    onPlayTrack,
    removeFromQueue
  } = usePlayer();

  const onViewArtist = (artistId) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('ArtistDetail', { artistId });
      closeFullPlayer();
    }
  };

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
      <NavigationContainer theme={navTheme} ref={navigationRef}>
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
            onStop={onStop}
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
              onDownload={() => onDownload(currentTrack)}
              onRemoveDownload={onRemoveDownload}
              downloads={downloads}
              activeDownloads={activeDownloads}
              onViewArtist={onViewArtist}
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
          currentQueueIndex={currentQueueIndex}
          currentTrack={currentTrack}
          radioSource={radioSource}
          suggestions={suggestions}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onPlayTrackAt={async (index, item) => {
            if (index === -1 && item) {
              const success = await onPlayTrack(item);
              if (success) setIsQueueVisible(false);
              return;
            }
            const success = await onPlayTrack(currentQueue[index], currentQueue, index);
            if (success) setIsQueueVisible(false);
          }}
          onRemoveTrackAt={removeFromQueue}
          onClearQueue={() => {}}
        />

        {/* Modal Playlist */}
        <PlaylistModal
          visible={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          playlists={playlists}
          onAddToPlaylist={handleAddToPlaylist}
          onCreatePlaylist={handleCreatePlaylist}
        />

        <ActionSheet />
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
      <Stack.Screen name="ArtistReleases" component={ArtistReleasesScreen} />
      <Stack.Screen name="AlbumDetail" component={AlbumScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="DownloadedAlbums" component={DownloadedAlbumsScreen} />
    </Stack.Navigator>
  );
}
function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain"   component={SearchScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
      <Stack.Screen name="ArtistReleases" component={ArtistReleasesScreen} />
      <Stack.Screen name="AlbumDetail" component={AlbumScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="DownloadedAlbums" component={DownloadedAlbumsScreen} />
    </Stack.Navigator>
  );
}
function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LibraryMain"  component={LibraryScreen} />
      <Stack.Screen name="ArtistDetail" component={ArtistScreen} />
      <Stack.Screen name="ArtistReleases" component={ArtistReleasesScreen} />
      <Stack.Screen name="AlbumDetail" component={AlbumScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="DownloadedAlbums" component={DownloadedAlbumsScreen} />
    </Stack.Navigator>
  );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PlayerProvider>
          <MainApp />
        </PlayerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fullPlayerContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 1000 },
});
