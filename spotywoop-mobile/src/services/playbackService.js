import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * ATTENTION : Ce fichier n'est pas utilisé actuellement.
 * Le vrai service enregistré est ./service.js à la racine.
 */
module.exports = async function() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.destroy());
};
