import { registerRootComponent } from 'expo';
import audioModule from './src/utils/audioFactory';
import App from './App';

const { TrackPlayer, isMock } = audioModule;

if (!isMock && TrackPlayer.registerPlaybackService) {
  try {
    const { playbackService } = require('./src/services/playbackService');
    TrackPlayer.registerPlaybackService(() => playbackService);
  } catch (e) {
    console.warn('Playback service registration failed', e);
  }
}

registerRootComponent(App);
