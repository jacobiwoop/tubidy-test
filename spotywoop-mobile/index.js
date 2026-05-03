import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './src/App';

// Enregistrement du service de lecture audio pour RNTP
// Indispensable pour le fonctionnement en arrière-plan
TrackPlayer.registerPlaybackService(() => require('./service'));

registerRootComponent(App);
