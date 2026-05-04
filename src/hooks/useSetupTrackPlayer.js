import { useEffect, useState } from 'react';
import audioModule from '../utils/audioFactory';

export const useSetupTrackPlayer = () => {
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    const { TrackPlayer, Capability, AppKilledPlaybackBehavior, isMock } = audioModule;

    if (isMock) {
      setPlayerReady(true);
      return;
    }

    const setup = async () => {
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
            Capability.Stop,
            Capability.SeekTo,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
        });
        setPlayerReady(true);
      } catch (e) {
        console.warn('TrackPlayer Setup Failed:', e.message);
        setPlayerReady(true);
      }
    };

    setup();
  }, []);

  return playerReady;
};
