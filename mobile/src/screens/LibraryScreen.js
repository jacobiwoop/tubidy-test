import React, { useState } from 'react';

import { StyleSheet, Text, View, FlatList, TouchableOpacity, ScrollView, Modal, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { Heart, ListMusic, ChevronRight, Clock, Download, User, Plus, X, ArrowLeft, Volume2 } from 'lucide-react-native';



import { createPlaylist } from '../utils/playlists';

export default function LibraryScreen({ 
  playlists = [], 
  onPlayTrack, 
  loadingTrackId, 
  refreshPlaylists, 
  currentTrackId,
  downloads = [],
  activeDownloads = {}
}) {
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  const likedSongs = playlists.find(p => p.id === 'liked');
  const otherPlaylists = playlists.filter(p => p.id !== 'liked');

  const QuickAction = ({ icon: Icon, title, color }) => (
    <TouchableOpacity style={styles.actionItem}>
      <View style={[styles.actionIcon, { backgroundColor: color || theme.colors.surface }]}>
        <Icon size={22} color="white" />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const PlaylistItem = ({ item, isLiked }) => (
    <TouchableOpacity style={styles.playlistRow} onPress={() => setSelectedPlaylist(item)}>
      <View style={[styles.playlistThumb, isLiked && styles.likedThumb]}>
        {isLiked ? (
          <Heart size={24} color="white" fill="white" />
        ) : (
          <ListMusic size={24} color={theme.colors.secondary} />
        )}
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle}>{item.title}</Text>
        <Text style={styles.playlistCount}>{item.tracks?.length || 0} tracks</Text>
      </View>
      <ChevronRight size={20} color="rgba(255,255,255,0.1)" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Library</Text>
          <TouchableOpacity style={styles.profileBtn}>
             <User size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.grid}>
          <QuickAction icon={Clock} title="Recent" color="#5d5dff" />
          <TouchableOpacity style={styles.actionItem} onPress={() => setShowDownloads(true)}>
            <View style={[styles.actionIcon, { backgroundColor: '#1DB954' }]}>
              <Download size={22} color="white" />
            </View>
            <Text style={styles.actionTitle}>Downloads</Text>
          </TouchableOpacity>
          <QuickAction icon={User} title="Artists" color="#ff9500" />
        </View>

        {/* Liked Songs - Essential Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Essential</Text>
          {likedSongs && <PlaylistItem item={likedSongs} isLiked={true} />}
        </View>

        {/* Playlists Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Playlists</Text>
            <TouchableOpacity onPress={() => setShowCreate(!showCreate)}>
              <Plus size={22} color={showCreate ? theme.colors.accent : 'white'} />
            </TouchableOpacity>
          </View>

          {showCreate && (
            <View style={styles.createBox}>
              <TextInput
                style={styles.createInput}
                placeholder="Playlist name..."
                placeholderTextColor={theme.colors.secondary}
                autoFocus
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TouchableOpacity 
                style={styles.createConfirm}
                onPress={async () => {
                  if (newTitle.trim()) {
                    await createPlaylist(newTitle);
                    setNewTitle('');
                    setShowCreate(false);
                    refreshPlaylists();
                  }
                }}
              >
                <Plus size={20} color="white" />
              </TouchableOpacity>
            </View>
          )}
          
          {otherPlaylists.length > 0 ? (
            otherPlaylists.map(pl => <PlaylistItem key={pl.id} item={pl} />)
          ) : (
            <View style={styles.emptyPlaylists}>
              <Text style={styles.emptyText}>No playlists created yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Vue de détail d'une Playlist (Vue intégrée, pas une Modal) */}
      {selectedPlaylist && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, zIndex: 10 }]}>
          <SafeAreaView style={styles.detailContainer}>
            {/* Header du détail */}
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelectedPlaylist(null)} style={styles.backBtn}>
                <ArrowLeft size={28} color="white" />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle} numberOfLines={1}>
                {selectedPlaylist?.title}
              </Text>
            </View>

            <FlatList
              data={selectedPlaylist?.tracks || []}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              contentContainerStyle={styles.detailList}
              ListHeaderComponent={() => (
                <View style={styles.detailInfoContainer}>
                  <View style={[styles.bigIcon, selectedPlaylist?.id === 'liked' && styles.likedThumb]}>
                    {selectedPlaylist?.id === 'liked' ? (
                      <Heart size={60} color="white" fill="white" />
                    ) : (
                      <ListMusic size={60} color={theme.colors.secondary} />
                    )}
                  </View>
                  <Text style={styles.bigTitle}>{selectedPlaylist?.title}</Text>
                  <Text style={styles.bigCount}>{selectedPlaylist?.tracks?.length || 0} tracks</Text>
                </View>
              )}
              renderItem={({ item }) => {
                const isLoading = loadingTrackId === item.id;
                const isPlaying = currentTrackId === item.id;
                return (
                  <TouchableOpacity 
                    style={[styles.trackRow, isPlaying && styles.playingRow]}
                    onPress={() => onPlayTrack(item, selectedPlaylist.tracks)}
                  >
                    <Image 
                      source={{ uri: item.album?.cover_medium || '' }} 
                      style={styles.trackThumb} 
                    />
                    <View style={styles.trackInfo}>
                      <Text style={[styles.trackTitle, isPlaying && styles.playingText]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.trackArtist}>{item.artist?.name}</Text>
                    </View>
                    {isPlaying && !isLoading && (
                      <Volume2 size={18} color={theme.colors.accent} />
                    )}
                    {isLoading && (
                      <ActivityIndicator size="small" color={theme.colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={styles.emptyDetail}>
                  <Text style={styles.emptyText}>This playlist is empty</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </View>
      )}

      {/* Vue de détail des Téléchargements */}
      {showDownloads && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background, zIndex: 10 }]}>
          <SafeAreaView style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setShowDownloads(false)} style={styles.backBtn}>
                <ArrowLeft size={28} color="white" />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle}>Downloads</Text>
            </View>

            <ScrollView contentContainerStyle={styles.detailList}>
              {/* Téléchargements en cours */}
              {Object.keys(activeDownloads).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>In Progress</Text>
                  {Object.entries(activeDownloads).map(([id, progress]) => (
                    <View key={id} style={styles.downloadProgressRow}>
                       <View style={styles.downloadProgressInfo}>
                          <Text style={styles.trackTitle} numberOfLines={1}>Track #{id}</Text>
                          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                       </View>
                       <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                       </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Téléchargements terminés */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Finished</Text>
                {downloads.length > 0 ? (
                  downloads.map(item => {
                    const isPlaying = currentTrackId === item.id;
                    return (
                      <TouchableOpacity 
                        key={item.id}
                        style={[styles.trackRow, isPlaying && styles.playingRow]}
                        onPress={() => onPlayTrack(item, downloads)}
                      >
                        <Image source={{ uri: item.album?.cover_medium }} style={styles.trackThumb} />
                        <View style={styles.trackInfo}>
                          <Text style={[styles.trackTitle, isPlaying && styles.playingText]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.trackArtist}>{item.artist?.name}</Text>
                        </View>
                        <Download size={16} color={theme.colors.accent} />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyDetail}>
                    <Text style={styles.emptyText}>No downloaded songs yet</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  profileBtn: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 10,
    marginBottom: 30,
  },
  actionItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 10,
    borderRadius: 15,
  },
  playlistThumb: {
    width: 55,
    height: 55,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  likedThumb: {
    backgroundColor: theme.colors.accent,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistCount: {
    color: theme.colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyPlaylists: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
    borderRadius: 15,
  },
  emptyText: {
    color: theme.colors.secondary,
    fontSize: 13,
  },
  // Style creation box
  createBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 10,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  createInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    paddingHorizontal: 10,
  },
  createConfirm: {
    backgroundColor: theme.colors.accent,
    width: 35,
    height: 35,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Styles du détail
  detailContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    marginRight: 15,
  },
  detailHeaderTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  detailList: {
    paddingBottom: 100,
  },
  detailInfoContainer: {
    alignItems: 'center',
    padding: 40,
  },
  bigIcon: {
    width: 150,
    height: 150,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 15,
  },
  bigTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bigCount: {
    color: theme.colors.secondary,
    fontSize: 14,
    marginTop: 5,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 5,
  },
  trackThumb: {
    width: 45,
    height: 45,
    borderRadius: 6,
    marginRight: 15,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  trackArtist: {
    color: theme.colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  playingRow: {
    backgroundColor: 'rgba(29, 185, 84, 0.05)',
  },
  playingText: {
    color: theme.colors.accent,
  },
  emptyDetail: {
    padding: 40,
    alignItems: 'center',
  },
  // Styles Progression
  downloadProgressRow: {
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 15,
    borderRadius: 12,
  },
  downloadProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  }
});
