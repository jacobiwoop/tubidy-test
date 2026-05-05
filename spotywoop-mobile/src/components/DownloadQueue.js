import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  Animated
} from 'react-native';
import { ChevronDown, ChevronUp, Loader2, Music, Disc } from 'lucide-react-native';
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
        <Circle
          stroke="rgba(255,255,255,0.05)"
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={theme.colors.accent}
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
      
      // On groupe par album.id (plus fiable que le titre)
      if (track.album?.id) {
        const albumId = String(track.album.id);
        if (!albumGroups[albumId]) {
          albumGroups[albumId] = {
            id: albumId,
            title: track.album.title || 'Album inconnu',
            artist: getArtistNames(track),
            tracks: [],
          };
        }
        albumGroups[albumId].tracks.push({ ...track, progress });
      } else {
        individualTracks.push({ ...track, progress });
      }
    });

    // Calculer la moyenne et trier
    Object.values(albumGroups).forEach(group => {
      const sum = group.tracks.reduce((acc, t) => acc + t.progress, 0);
      group.avgProgress = sum / group.tracks.length;
      group.tracks.sort((a, b) => (a.title > b.title ? 1 : -1));
    });

    return { 
      albums: Object.values(albumGroups), 
      singles: individualTracks 
    };
  }, [downloadingItems, activeDownloads]);

  if (groups.albums.length === 0 && groups.singles.length === 0) return null;

  const toggleAlbum = (albumId) => {
    if (Platform.OS === 'ios' || (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental)) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedAlbums(prev => ({ ...prev, [albumId]: !prev[albumId] }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainHeader}>
        <Loader2 size={16} color={theme.colors.accent} style={styles.spinningIcon} />
        <Text style={styles.mainHeaderTitle}>Flux de téléchargement</Text>
      </View>

      {/* SECTION : ALBUMS */}
      {groups.albums.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Disc size={14} color={theme.colors.accent} />
            <Text style={styles.sectionLabel}>ALBUMS EN COURS</Text>
          </View>
          
          {groups.albums.map(group => {
            const isExpanded = expandedAlbums[group.id];
            return (
              <View key={group.id} style={styles.albumCard}>
                <TouchableOpacity 
                  style={styles.albumHeader} 
                  onPress={() => toggleAlbum(group.id)}
                  activeOpacity={0.8}
                >
                  <ProgressRing progress={group.avgProgress} size={42} strokeWidth={3}>
                    <Text style={styles.counterText}>{group.tracks.length}</Text>
                  </ProgressRing>
                  
                  <View style={styles.albumInfo}>
                    <Text style={styles.albumName} numberOfLines={1}>{group.title}</Text>
                    <Text style={styles.albumArtist} numberOfLines={1}>{group.artist}</Text>
                    <View style={styles.globalProgressBg}>
                        <View style={[styles.globalProgressFill, { width: `${group.avgProgress}%` }]} />
                    </View>
                  </View>
                  
                  <View style={styles.expandIcon}>
                    {isExpanded ? <ChevronUp size={20} color={theme.colors.accent} /> : <ChevronDown size={20} color="rgba(255,255,255,0.2)" />}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {group.tracks.map(track => (
                      <View key={track.id} style={styles.subTrackRow}>
                        <View style={styles.subTrackHeader}>
                            <Text style={styles.subTrackTitle} numberOfLines={1}>{track.title}</Text>
                            <Text style={styles.subTrackPercent}>{Math.round(track.progress)}%</Text>
                        </View>
                        <View style={styles.subProgressBg}>
                          <View style={[styles.subProgressFill, { width: `${track.progress}%` }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* SECTION : TITRES INDIVIDUELS */}
      {groups.singles.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Music size={14} color={theme.colors.accent} />
            <Text style={styles.sectionLabel}>TITRES INDIVIDUELS</Text>
          </View>
          
          {groups.singles.map(track => (
            <View key={track.id} style={styles.singleTrackCard}>
              <View style={styles.singleInfo}>
                <Text style={styles.singleTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.singleArtist} numberOfLines={1}>{getArtistNames(track)}</Text>
              </View>
              <View style={styles.singleRight}>
                <Text style={styles.singlePercent}>{Math.round(track.progress)}%</Text>
                <View style={styles.singleProgressBg}>
                  <View style={[styles.singleProgressFill, { width: `${track.progress}%` }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 15,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    paddingLeft: 5,
  },
  mainHeaderTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginLeft: 10,
    opacity: 0.9,
  },
  spinningIcon: {
    opacity: 0.8,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 5,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: 8,
  },
  albumCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  albumInfo: {
    flex: 1,
    marginHorizontal: 15,
  },
  albumName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 8,
  },
  globalProgressBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  globalProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  expandIcon: {
    padding: 5,
  },
  counterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  expandedContent: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  subTrackRow: {
    paddingVertical: 12,
  },
  subTrackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subTrackTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    flex: 1,
    marginRight: 10,
  },
  subTrackPercent: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
  },
  subProgressBg: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 1,
    width: '100%',
  },
  subProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
  },
  singleTrackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  singleInfo: {
    flex: 1,
  },
  singleTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  singleArtist: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  singleRight: {
    alignItems: 'flex-end',
    width: 60,
  },
  singlePercent: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  singleProgressBg: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 1.5,
  },
  singleProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 1.5,
  },
  svg: {
    position: 'absolute',
  }
});
