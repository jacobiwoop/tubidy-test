import { createAudioPlayer } from 'expo-audio';

// Instance globale du lecteur pour expo-audio
// On initialise avec une URL vide
const player = createAudioPlayer('');

// Configuration du lecteur pour l'arrière-plan et l'écran de verrouillage
player.staysActiveInBackground = true;
player.showNowPlayingNotification = true;
// On s'assure que le volume est à 1 par défaut
player.volume = 1;

/**
 * Interface de compatibilité pour garder le fonctionnement actuel
 * tout en utilisant le nouveau moteur expo-audio.
 */
const audioModule = {
  player, // On expose l'objet player pour useAudioPlayerStatus
  
  TrackPlayer: {
    setupPlayer: async () => {
      return true;
    },
    updateOptions: async () => {},
    reset: async () => {
      player.pause();
    },
    add: async (track) => {
      // On met à jour les métadonnées pour l'écran de verrouillage
      player.metadata = {
        title: track.title,
        artist: track.artist?.name || track.artist || 'Unknown Artist',
        album: track.album?.title || 'Spotywoop',
        artwork: track.artwork || track.album?.cover_medium,
      };

      // On remplace la source actuelle par le nouveau lien
      player.replace(track.url);
    },
    play: async () => {
      player.play();
    },
    pause: async () => {
      player.pause();
    },
    seekTo: async (seconds) => {
      player.seekTo(seconds * 1000); // expo-audio utilise les millisecondes
    }
  },
  engine: 'expo-audio',
  isMock: false
};

export default audioModule;
