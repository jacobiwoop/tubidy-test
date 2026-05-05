import React, { useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Platform,
  Animated,
  PanResponder,
  Dimensions
} from 'react-native';
import { Play, Pause, ListMusic } from 'lucide-react-native';
import { useProgress } from 'react-native-track-player';
import { triggerHaptic } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MiniPlayer = ({ 
  currentTrack, 
  playerStatus, 
  onTogglePlay, 
  onOpenFullPlayer, 
  loadingTrackId, 
  colors, 
  onOpenQueue,
  onStop 
}) => {
  const progress = useProgress();
  const translateX = useRef(new Animated.Value(0)).current;
  
  // PanResponder pour le swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // On ne s'active que si le mouvement horizontal est significatif
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 120 || Math.abs(gestureState.vx) > 0.5) {
          // Dismiss
          const targetX = gestureState.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH;
          triggerHaptic("notificationSuccess");
          Animated.timing(translateX, {
            toValue: targetX,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (onStop) onStop();
            translateX.setValue(0); // Reset pour la prochaine fois
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    })
  ).current;

  if (!currentTrack) return null;

  const isLoading = loadingTrackId === currentTrack.id || playerStatus?.loading;
  const progressPercent = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;

  return (
    <Animated.View 
      {...panResponder.panHandlers}
      style={[
        styles.miniPlayerContainer,
        { transform: [{ translateX }] }
      ]}
    >
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => {
          triggerHaptic("impactLight");
          onOpenFullPlayer();
        }}
        style={styles.miniPlayer}
      >
        <Image 
          source={{ uri: currentTrack?.artwork || currentTrack?.album?.cover_medium || '' }} 
          style={styles.miniCover} 
        />
        <View style={styles.miniInfo}>
          <Text style={styles.miniTitle} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.miniArtist} numberOfLines={1}>{currentTrack.artist?.name}</Text>
        </View>
        <View style={styles.miniPlayBtn}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <TouchableOpacity onPress={() => {
              triggerHaptic("impactLight");
              onTogglePlay();
            }}>
              {playerStatus?.playing ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            triggerHaptic("selection");
            onOpenQueue();
          }} 
          style={styles.miniQueueBtn}
        >
          <ListMusic size={22} color={colors?.primary || "#fff"} />
        </TouchableOpacity>

        {/* Barre de progression en bas */}
        <View style={styles.miniProgressBarContainer}>
          <View style={[styles.miniProgressBar, { width: `${progressPercent}%` }]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  miniPlayerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 65,
    left: 10,
    right: 10,
    zIndex: 999,
  },
  miniPlayer: {
    backgroundColor: '#111111',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  miniCover: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#222',
  },
  miniInfo: {
    flex: 1,
  },
  miniTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  miniArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 1,
  },
  miniPlayBtn: {
    padding: 10,
  },
  miniQueueBtn: {
    padding: 10,
    marginLeft: -5,
  },
  miniProgressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  miniProgressBar: {
    height: '100%',
    backgroundColor: '#1DB954', // Spotify Green
  },
});

export default MiniPlayer;
