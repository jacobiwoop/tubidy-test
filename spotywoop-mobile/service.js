import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Service de lecture headless (thread séparé, pas d'accès au Context React).
 * 
 * Stratégie : play/pause/seek/next/prev restent délégués à RNTP.
 * PlayerContext maintient une petite queue native avec le morceau courant et
 * les prochains titres déjà résolus pour laisser ExoPlayer préparer l'audio.
 */
module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try { await TrackPlayer.skipToNext(); } catch (_) {}
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try { await TrackPlayer.skipToPrevious(); } catch (_) {}
  });
};
