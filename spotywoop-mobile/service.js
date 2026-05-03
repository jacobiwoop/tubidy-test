import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Service de lecture headless (thread séparé, pas d'accès au Context React).
 * 
 * Stratégie : pour play/pause/seek → RNTP directement.
 * Pour next/prev → on skipToNext/Previous sur la queue RNTP.
 * 
 * Notre queue RNTP ne contient qu'UN seul morceau à la fois (reset avant chaque add).
 * Donc skipToNext échouera et déclenchera PlaybackQueueEnded,
 * que PlayerContext intercepte via useTrackPlayerEvents pour appliquer
 * shuffle/repeat et charger la vraie piste suivante.
 * 
 * Pour RemotePrevious, même logique.
 */
module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  
  // next/prev depuis la notif → échoue sur queue vide → PlaybackQueueEnded
  // → PlayerContext._playNext/_playPrev prend le relais avec shuffle/repeat
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try { await TrackPlayer.skipToNext(); } catch (_) {}
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try { await TrackPlayer.skipToPrevious(); } catch (_) {}
  });
};
