import TrackPlayer, { 
  Capability, 
  AppKilledPlaybackBehavior 
} from 'react-native-track-player';

const audioModule = {
  // Cette instance n'est plus utilisée par RNTP mais on garde l'objet pour la compatibilité
  player: null, 
  
  TrackPlayer: {
    setupPlayer: async () => {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
            Capability.Stop,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
        });
        return true;
      } catch (e) {
        // Souvent déjà initialisé
        return true;
      }
    },
    
    reset: async () => {
      await TrackPlayer.reset();
    },
    
    add: async (track) => {
      await TrackPlayer.add({
        id: track.id,
        url: track.url,
        title: track.title,
        artist: track.artist?.name || track.artist,
        artwork: track.artwork || track.album?.cover_medium,
        album: track.album?.title,
      });
    },
    
    play: async () => await TrackPlayer.play(),
    pause: async () => await TrackPlayer.pause(),
    seekTo: async (seconds) => await TrackPlayer.seekTo(seconds),
  },
  engine: 'react-native-track-player',
};

export default audioModule;
