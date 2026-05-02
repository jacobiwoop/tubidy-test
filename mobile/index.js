import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';

// Enregistrement du service de lecture audio pour RNTP
TrackPlayer.registerPlaybackService(() => require('./service'));

registerRootComponent(App);
