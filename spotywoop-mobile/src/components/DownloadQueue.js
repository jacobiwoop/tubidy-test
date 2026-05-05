import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  FlatList
} from 'react-native';
import { ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../utils/theme';
import { getArtistNames } from '../utils/formatters';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ProgressRing = ({ progress, size = 40, strokeWidth = 3, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Circle */}
        <Circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress Circle */}
        <Circle
          stroke="white"
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
        {children}
      </View>
    </View>
  );
};

export default function DownloadQueue({ downloadingItems, activeDownloads }) {
  const [expandedAlbums, setExpandedAlbums] = useState({});

  const groups = useMemo(() => {
    const albumGroups = {};
    const individualTracks = [];

    Object.keys(downloadingItems).forEach(id => {
      const track = downloadingItems[id];
      const progress = activeDownloads[id] || 0;
      
      if (track.album?.title) {
        if (!albumGroups[track.album.title]) {
          albumGroups[track.album.title] = {
            title: track.album.title,
            artist: getArtistNames(track),
            tracks: [],
            totalProgress: 0,
          };
        }
        albumGroups[track.album.title].tracks.push({ ...track, progress });
      } else {
        individualTracks.push({ ...track, progress });
      }
    });

    // Calculer la moyenne par album
    Object.values(albumGroups).forEach(group => {
      const sum = group.tracks.reduce((acc, t) => acc + t.progress, 0);
      group.avgProgress = sum / group.tracks.length;
    });

    return { albums: Object.values(albumGroups), singles: individualTracks };
  }, [downloadingItems, activeDownloads]);

  if (groups.albums.length === 0 && groups.singles.length === 0) return null;

  const toggleAlbum = (title) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedAlbums(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Loader2 size={16} color={theme.colors.accent} style={styles.spinningIcon} />
        <Text style={styles.headerTitle}>File d'attente</Text>
      </View>

      {/* Albums Groupés */}
      {groups.albums.map(group => (
        <View key={group.title} style={styles.albumGroup}>
          <TouchableOpacity 
            style={styles.albumHeader} 
            onPress={() => toggleAlbum(group.title)}
            activeOpacity={0.7}
          >
            <View style={styles.albumInfo}>
              <Text style={styles.albumName} numberOfLines={1}>{group.title}</Text>
              <Text style={styles.albumArtist}>{group.artist}</Text>
            </View>
            
            <View style={styles.rightSide}>
              <ProgressRing progress={group.avgProgress} size={36}>
                <Text style={styles.counterText}>{group.tracks.length}</Text>
              </ProgressRing>
              {expandedAlbums[group.title] ? <ChevronUp size={20} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={20} color="rgba(255,255,255,0.4)" />}
            </View>
          </TouchableOpacity>

          {expandedAlbums[group.title] && (
            <View style={styles.trackList}>
              {group.tracks.map(track => (
                <View key={track.id} style={styles.trackRow}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${track.progress}%` }]} />
                  </View>
                  <Text style={styles.percentText}>{Math.round(track.progress)}%</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* Titres Individuels */}
      {groups.singles.map(track => (
        <View key={track.id} style={styles.singleTrack}>
          <View style={styles.singleInfo}>
            <Text style={styles.singleTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.singleArtist}>{getArtistNames(track)}</Text>
          </View>
          <View style={styles.singleProgress}>
             <Text style={styles.percentTextSmall}>{Math.round(track.progress)}%</Text>
             <View style={styles.progressBarBgSmall}>
                <View style={[styles.progressBarFill, { width: `${track.progress}%` }]} />
             </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 15,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingLeft: 5,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 10,
  },
  spinningIcon: {
    // On pourrait ajouter une animation de rotation réelle ici
  },
  albumGroup: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  albumInfo: {
    flex: 1,
    marginRight: 10,
  },
  albumName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  counterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  trackList: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  trackTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    flex: 1,
    marginRight: 15,
  },
  progressBarBg: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  percentText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    width: 30,
    textAlign: 'right',
  },
  singleTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    marginBottom: 8,
  },
  singleInfo: {
    flex: 1,
  },
  singleTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  singleArtist: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  singleProgress: {
    alignItems: 'flex-end',
  },
  percentTextSmall: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginBottom: 4,
  },
  progressBarBgSmall: {
    width: 50,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 1,
  },
  svg: {
    position: 'absolute',
  }
});
