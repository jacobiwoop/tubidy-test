import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  Dimensions,
  Platform,
  InteractionManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, Play, Heart, MoreHorizontal, Clock, Volume2, Download } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../utils/theme';
import * as api from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import { triggerHaptic } from '../utils/haptics';
import { getCache, saveCache } from '../utils/cache';
import AlbumDownloadModal from '../components/AlbumDownloadModal';
import { getArtistNames } from '../utils/formatters';

const { width } = Dimensions.get('window');

export default function AlbumScreen({ navigation, route }) {
  const { albumId, albumTitle, localTracks } = route.params;
  const { 
    onPlayTrack, 
    currentTrack, 
    favorites, 
    onToggleFavorite, 
    onDownloadBatch, 
    activeDownloads, 
    downloads,
    followedAlbums,
    onToggleFollowAlbum,
    enrichTracks,
    enrichedMetadata,
    openActionSheet
  } = usePlayer();
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadAlbumData();
    });
    return () => task.cancel();
  }, [albumId]);

  const loadAlbumData = async () => {
    // ── Mode hors-ligne : on a des morceaux locaux, pas besoin du réseau ──
    if (localTracks && localTracks.length > 0) {
      const firstTrack = localTracks[0];
      const syntheticAlbum = {
        id: albumId,
        title: albumTitle || firstTrack.album?.title || 'Album',
        cover_medium: firstTrack.album?.cover_medium || firstTrack.artwork,
        cover_xl:     firstTrack.album?.cover_xl     || firstTrack.album?.cover_medium || firstTrack.artwork,
        cover_small:  firstTrack.album?.cover_small  || firstTrack.artwork,
        artist:       firstTrack.artist,
        nb_tracks:    localTracks.length,
        release_date: firstTrack.album?.release_date,
        isLocalOnly: true,
      };
      setAlbum(syntheticAlbum);
      setTracks(localTracks);
      setLoading(false);
      return; // ← On s'arrête là, pas de réseau
    }

    const cacheKey = `album_${albumId}`;
    
    // 1. Cache
    const cached = await getCache(cacheKey);
    if (cached) {
      setAlbum(cached.album);
      setTracks(cached.tracks);
      setLoading(false);
    }

    // 2. Network (seulement si pas de localTracks)
    try {
      const albumData = await api.getAlbum(albumId);
      
      const enrichedTracks = (albumData.tracks?.data || []).map(t => ({
        ...t,
        album: {
          id: albumData.id,
          title: albumData.title,
          cover_medium: albumData.cover_medium,
          cover_small: albumData.cover_small,
          cover_xl: albumData.cover_xl,
        }
      }));

      const freshData = {
        album: albumData,
        tracks: enrichedTracks
      };
      
      setAlbum(freshData.album);
      setTracks(freshData.tracks);
      enrichTracks(freshData.tracks);
      saveCache(cacheKey, freshData);
    } catch (error) {
      console.error('Failed to load album data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFollowed = followedAlbums.some(a => String(a.id) === String(album?.id));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <LinearGradient
          colors={['#2a2a2a', '#0A0A0A']}
          style={styles.headerBackground}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="white" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Image source={{ uri: album?.cover_big }} style={styles.albumCover} />
            <Text style={styles.title}>{album?.title}</Text>
            <View style={styles.metaRow}>
              <Image source={{ uri: album?.artist?.picture_small }} style={styles.artistAvatar} />
              <Text style={styles.artistName}>{album?.artist?.name}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.metaText}>{new Date(album?.release_date).getFullYear()}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <View style={styles.leftActions}>
              <TouchableOpacity onPress={() => onToggleFollowAlbum(album)} style={styles.iconBtn}>
                <Heart 
                  size={24} 
                  color={isFollowed ? theme.colors.accent : "rgba(255,255,255,0.5)"} 
                  fill={isFollowed ? theme.colors.accent : "transparent"} 
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowDownloadModal(true)}>
                {(() => {
                  const albumTracksInDl = tracks.filter(t => activeDownloads[t.id] !== undefined);
                  const isDownloading = albumTracksInDl.length > 0;
                  
                  let progress = 0;
                  if (isDownloading) {
                    const total = albumTracksInDl.reduce((acc, t) => acc + (activeDownloads[t.id] || 0), 0);
                    progress = total / albumTracksInDl.length;
                  } else {
                    const downloadedCount = tracks.filter(t => downloads.some(d => String(d.id) === String(t.id))).length;
                    progress = (downloadedCount / (tracks.length || 1)) * 100;
                  }

                  const size = 44;
                  const strokeWidth = 3;
                  const radius = (size - strokeWidth) / 2;
                  const circumference = radius * 2 * Math.PI;
                  const strokeDashoffset = circumference - (progress / 100) * circumference;

                  return (
                    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
                       <Svg width={size} height={size} style={{ position: 'absolute' }}>
                          <Circle
                            stroke="rgba(255,255,255,0.1)"
                            fill="transparent"
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            strokeWidth={strokeWidth}
                          />
                          <Circle
                            stroke={isDownloading ? theme.colors.accent : "white"}
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
                       {isDownloading ? (
                         <Text style={{ color: theme.colors.accent, fontSize: 10, fontWeight: 'bold' }}>
                           {Math.round(progress)}%
                         </Text>
                       ) : (
                         <Download size={20} color={progress === 100 ? theme.colors.accent : "rgba(255,255,255,0.5)"} />
                       )}
                    </View>
                  );
                })()}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <MoreHorizontal size={24} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
                style={styles.playBtn}
                onPress={() => onPlayTrack(tracks[0], tracks)}
            >
              <Play size={28} color="black" fill="black" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Tracks List */}
        <View style={styles.tracksSection}>
          {tracks.map((track, index) => {
            const isPlaying = currentTrack?.id === track.id;
            const isFavorite = favorites.some(f => f.id === track.id);
            const isDownloaded = downloads.some(d => String(d.id) === String(track.id));
            return (
              <TouchableOpacity 
                key={track.id} 
                style={styles.trackRow}
                onPress={() => {
                  triggerHaptic("impactLight");
                  onPlayTrack(track, tracks);
                }}
                onLongPress={() => openActionSheet(track, 'track')}
                delayLongPress={300}
              >
                <View style={styles.trackMain}>
                  <Text style={[styles.trackIndex, isPlaying && { color: theme.colors.accent }]}>
                    {isPlaying ? <Volume2 size={16} color={theme.colors.accent} /> : index + 1}
                  </Text>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      triggerHaptic("impactLight");
                      navigation.push('ArtistDetail', { artistId: track.artist?.id || album?.artist?.id });
                    }}
                  >
                    <Image source={{ uri: track.album?.cover_small || album?.cover_small }} style={styles.trackThumbSmall} />
                  </TouchableOpacity>
                  <View style={styles.trackInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.trackTitle, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>
                        {track.title}
                      </Text>
                      {isDownloaded && (
                        <Download size={12} color={theme.colors.accent} style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    <Text style={styles.trackArtist}>{getArtistNames(track, enrichedMetadata)}</Text>
                  </View>
                </View>
                <View style={styles.trackActionsRight}>
                  {activeDownloads[track.id] !== undefined ? (
                    <Text style={styles.progressTextSmall}>{Math.round(activeDownloads[track.id] * 100)}%</Text>
                  ) : isDownloaded ? (
                    <Download size={16} color={theme.colors.accent} />
                  ) : (
                    <TouchableOpacity onPress={() => onToggleFavorite(track)} style={styles.heartBtn}>
                      <Heart 
                        size={18} 
                        color={isFavorite ? theme.colors.accent : 'rgba(255,255,255,0.2)'} 
                        fill={isFavorite ? theme.colors.accent : 'transparent'} 
                      />
                    </TouchableOpacity>
                  )}
                  <MoreHorizontal size={20} color="rgba(255,255,255,0.3)" style={{ marginLeft: 10 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{tracks.length} titres • {Math.round(album?.duration / 60)} minutes</Text>
          <Text style={styles.copyright}>© {new Date(album?.release_date).getFullYear()} {album?.label || 'Deezer Music'}</Text>
        </View>
      </ScrollView>

      <AlbumDownloadModal 
        visible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        album={album}
        tracks={tracks}
        downloads={downloads}
        onConfirm={(selectedTracks) => onDownloadBatch(selectedTracks)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerBackground: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  backBtn: {
    marginBottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
  },
  albumCover: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 25,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  artistAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  artistName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  metaDivider: {
    color: 'rgba(255,255,255,0.4)',
    marginHorizontal: 8,
  },
  metaText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 20,
  },
  iconBtn: {
    padding: 5,
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  tracksSection: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  trackMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackIndex: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    width: 30,
  },
  trackThumbSmall: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginHorizontal: 10,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 0,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 2,
  },
  heartBtn: {
    padding: 10,
    marginRight: 10,
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
    opacity: 0.5,
  },
  footerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  copyright: {
    color: '#fff',
    fontSize: 10,
    marginTop: 5,
  },
  trackActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTextSmall: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
    minWidth: 35,
    textAlign: 'right',
  }
});
