import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// --- Moteur de secours (Expo AV) pour Expo Go ---
let expoSound = null;

const ExpoAVMock = {
  setupPlayer: async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  },
  updateOptions: async () => {},
  registerPlaybackService: () => {},
  add: async (track) => {
    if (expoSound) {
      await expoSound.unloadAsync();
    }
    const { sound } = await Audio.Sound.createAsync(
      { uri: track.url },
      { shouldPlay: true }
    );
    expoSound = sound;
  },
  reset: async () => {
    if (expoSound) {
      await expoSound.unloadAsync();
      expoSound = null;
    }
  },
  play: async () => {
    if (expoSound) await expoSound.playAsync();
  },
  pause: async () => {
    if (expoSound) await expoSound.pauseAsync();
  },
  skipToNext: async () => {},
  skipToPrevious: async () => {},
};

// --- Logique de sélection du moteur ---
let audioModule = {
  TrackPlayer: ExpoAVMock,
  Capability: {},
  AppKilledPlaybackBehavior: {},
  isMock: true,
  engine: 'expo-av'
};

if (Platform.OS !== 'web') {
  try {
    const TrackPlayer = require('react-native-track-player').default || require('react-native-track-player');
    const { Capability, AppKilledPlaybackBehavior } = require('react-native-track-player');

    if (Capability && Capability.Play) {
      audioModule = {
        TrackPlayer,
        Capability,
        AppKilledPlaybackBehavior,
        isMock: false,
        engine: 'track-player'
      };
    }
  } catch (e) {
    console.log('[AudioFactory] Using Expo-AV fallback for sound support in Expo Go');
  }
}

export default audioModule;
