import { createAudioPlayer } from 'expo-audio';

// Instance globale du lecteur pour expo-audio
// On initialise avec une URL vide
const player = createAudioPlayer('');

/**
 * Interface de compatibilité pour garder le fonctionnement actuel
 * tout en utilisant le nouveau moteur expo-audio.
 */
const audioModule = {
  player, // On expose l'objet player pour useAudioPlayerStatus
  
  TrackPlayer: {
    setupPlayer: async () => {
      // expo-audio gère sa propre initialisation native
      return true;
    },
    updateOptions: async () => {},
    reset: async () => {
      player.pause();
    },
    add: async (track) => {
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
