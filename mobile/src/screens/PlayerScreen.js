import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  SafeAreaView 
} from 'react-native';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ChevronDown, 
  MoreHorizontal, 
  Heart, 
  ListMusic 
} from 'lucide-react-native';
import { theme } from '../utils/theme';

const { width } = Dimensions.get('window');

export default function PlayerScreen({ track, isPlaying, onTogglePlay, onClose }) {
  if (!track) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Immersive Background Blur (Simulated with opacity) */}
      <View style={styles.background}>
        <Image 
          source={{ uri: track.album?.cover_big || track.album?.cover_medium }} 
          style={styles.backgroundImage} 
          blurRadius={50}
        />
        <View style={styles.overlay} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <ChevronDown size={32} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOW PLAYING</Text>
        <TouchableOpacity>
          <MoreHorizontal size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Album Art */}
      <View style={styles.artContainer}>
        <Image 
          source={{ uri: track.album?.cover_big || track.album?.cover_medium }} 
          style={styles.albumArt} 
        />
      </View>

      {/* Track Info */}
      <View style={styles.infoContainer}>
        <View>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.artist}>{track.artist?.name}</Text>
        </View>
        <TouchableOpacity>
          <Heart size={28} color={theme.colors.primary} opacity={0.5} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar (Mock) */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '35%' }]} />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>1:24</Text>
          <Text style={styles.timeText}>3:45</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity>
          <SkipBack size={36} color={theme.colors.primary} fill={theme.colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.playButton}
          onPress={onTogglePlay}
        >
          {isPlaying ? (
            <Pause size={40} color={theme.colors.background} fill={theme.colors.background} />
          ) : (
            <Play size={40} color={theme.colors.background} fill={theme.colors.background} style={{ marginLeft: 5 }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity>
          <SkipForward size={36} color={theme.colors.primary} fill={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity>
          <ListMusic size={24} color={theme.colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.footerText}>Playing from Search</Text>
        <View style={{ width: 24 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    opacity: 0.6,
  },
  artContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingHorizontal: 40,
  },
  albumArt: {
    width: width - 80,
    height: width - 80,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  infoContainer: {
    paddingHorizontal: 30,
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: '900',
    maxWidth: width - 100,
  },
  artist: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressContainer: {
    paddingHorizontal: 30,
    marginTop: 30,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'between',
    marginTop: 10,
  },
  timeText: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 40,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 'auto',
    marginBottom: 20,
    opacity: 0.5,
  },
  footerText: {
    color: theme.colors.secondary,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
