import React, { useState } from 'react';
import { StyleSheet, Text, View, StatusBar, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useSetupTrackPlayer } from './src/hooks/useSetupTrackPlayer';
import { theme } from './src/utils/theme';
import SearchScreen from './src/screens/SearchScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import { getTrackDownload } from './src/services/api';

export default function App() {
  const isPlayerReady = useSetupTrackPlayer();
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);

  const handlePlayTrack = async (track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    
    console.log('Playing track:', track.title);
    
    try {
      const downloadData = await getTrackDownload(track.id);
      if (downloadData?.target?.link) {
        const link = downloadData.target.link;
        // Proxy audio via backend to avoid CORS and handle redirects
        const finalLink = `http://10.45.54.54:3000/api/proxy-audio?url=${encodeURIComponent(link)}`;

        console.log('Final stream link:', finalLink);

        const audioModule = require('./src/utils/audioFactory').default;
        const { TrackPlayer } = audioModule;
        
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: track.id.toString(),
          url: finalLink,
          title: track.title,
          artist: track.artist?.name,
          artwork: track.album?.cover_medium,
        });
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error('Failed to get download link:', error);
    }
  };

  const togglePlay = async () => {
    const audioModule = require('./src/utils/audioFactory').default;
    const { TrackPlayer } = audioModule;
    
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!isPlayerReady) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.text}>Initializing Audio Engine...</Text>
      </View>
    );
  }

  if (showFullPlayer && currentTrack) {
    return (
      <PlayerScreen 
        track={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onClose={() => setShowFullPlayer(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>SPOTYWOOP</Text>
        <Text style={styles.subtitle}>Native Edition</Text>
      </View>

      <SearchScreen onPlayTrack={handlePlayTrack} />

      {currentTrack && (
        <TouchableOpacity 
          style={styles.miniPlayer}
          onPress={() => setShowFullPlayer(true)}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri: currentTrack.album?.cover_medium }} 
            style={styles.miniCover} 
          />
          <View style={styles.miniInfo}>
            <Text style={styles.miniTitle} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.miniArtist}>{currentTrack.artist?.name}</Text>
          </View>
          <TouchableOpacity onPress={togglePlay} style={styles.miniPlayBtn}>
             <Text style={{color: 'white', fontSize: 24}}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </SafeAreaView>
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
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
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
  }
});
