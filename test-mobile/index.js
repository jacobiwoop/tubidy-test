import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import TrackPlayer, { usePlaybackState, State } from 'react-native-track-player';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

const TEST_TRACK = {
  id: '1',
  url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  title: 'Test Audio',
  artist: 'ExpoWoop Tester',
};

function App() {
  const playbackState = usePlaybackState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.add([TEST_TRACK]);
        setIsReady(true);
      } catch (e) {
        console.log('Setup error:', e);
      }
    }
    setup();
  }, []);

  const togglePlayback = async () => {
    const currentPath = playbackState.state;
    if (currentPath === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const isPlaying = playbackState.state === State.Playing;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ExpoWoop Test Player</Text>
      <Text style={styles.status}>
        Status: {playbackState.state || 'Initializing...'}
      </Text>

      {!isReady ? (
        <ActivityIndicator size="large" color="#1DB954" />
      ) : (
        <TouchableOpacity style={styles.button} onPress={togglePlayback}>
          <Text style={styles.buttonText}>
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.footer}>
        Test du module natif react-native-track-player
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    color: '#1DB954',
    fontSize: 16,
    marginBottom: 40,
    textTransform: 'uppercase',
  },
  button: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 50,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    color: '#666',
    fontSize: 12,
    position: 'absolute',
    bottom: 40,
  }
});

// OBLIGATOIRE — doit être avant registerRootComponent
TrackPlayer.registerPlaybackService(() => require('./service'));
registerRootComponent(App);
