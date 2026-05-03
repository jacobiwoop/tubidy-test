import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { Play, Pause } from 'lucide-react-native';

const MiniPlayer = ({ currentTrack, playerStatus, onTogglePlay, onOpenFullPlayer }) => {
  if (!currentTrack) return null;

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={onOpenFullPlayer}
      style={styles.miniPlayer}
    >
      <Image 
        source={{ uri: currentTrack?.album?.cover_medium || '' }} 
        style={styles.miniCover} 
      />
      <View style={styles.miniInfo}>
        <Text style={styles.miniTitle} numberOfLines={1}>{currentTrack.title}</Text>
        <Text style={styles.miniArtist} numberOfLines={1}>{currentTrack.artist?.name}</Text>
      </View>
      <View style={styles.miniPlayBtn}>
        {playerStatus?.loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <TouchableOpacity onPress={onTogglePlay}>
            {playerStatus?.playing ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  miniPlayer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 65,
    left: 10,
    right: 10,
    backgroundColor: '#1c1c1e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    zIndex: 99,
  },
  miniCover: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 12,
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
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  miniPlayBtn: {
    padding: 10,
  },
});

export default MiniPlayer;
