import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Heart, Volume2 } from 'lucide-react-native';

import { theme } from '../utils/theme';
import { searchMusic } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import TrackSkeleton from '../components/TrackSkeleton';
import { MenuView } from '@react-native-menu/menu';
import { triggerHaptic } from '../utils/haptics';

export default function SearchScreen({ navigation }) {
  const { onPlayTrack, loadingTrackId, favorites, onToggleFavorite, onViewArtist, currentTrack } = usePlayer();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchMusic(query);
      setResults(data.data || []); // Deezer search results are in .data
    } catch (error) {
      alert('Search failed. Check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const renderTrack = ({ item }) => {
    const isLoading = loadingTrackId === item.id;
    const isPlaying = currentTrack?.id === item.id;
    
    return (
      <MenuView
        onPressAction={({ nativeEvent }) => {
          if (nativeEvent.event === 'play') onPlayTrack(item, results);
          if (nativeEvent.event === 'favorite') onToggleFavorite(item);
          if (nativeEvent.event === 'artist') navigation.navigate('ArtistDetail', { artistId: item.artist?.id });
        }}
        actions={[
          { id: 'play', title: 'Lire maintenant', image: 'play' },
          { id: 'favorite', title: favorites?.some(f => f.id === item.id) ? 'Retirer des favoris' : 'Ajouter aux favoris', image: 'heart' },
          { id: 'artist', title: 'Voir l\'artiste', image: 'person' },
        ]}
        shouldOpenOnLongPress={true}
      >
        <TouchableOpacity 
          style={[styles.trackCard, isPlaying && styles.playingCard]}
          onPress={() => {
            triggerHaptic("impactLight");
            onPlayTrack(item, results);
          }}
        >
          <View style={styles.coverContainer}>
            <Image 
              source={{ uri: item?.album?.cover_medium || '' }} 
              style={styles.cover} 
            />
          </View>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>{item.title}</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('ArtistDetail', { artistId: item.artist?.id })}
              style={styles.artistBtn}
            >
              <Text style={styles.trackArtist}>{item.artist?.name}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.favoriteBtn}>
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : isPlaying ? (
              <Volume2 size={20} color={theme.colors.accent} />
            ) : (
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item);
                }}
              >
                <Heart 
                  size={20} 
                  color={favorites?.some(f => f.id === item.id) ? theme.colors.accent : theme.colors.secondary} 
                  fill={favorites?.some(f => f.id === item.id) ? theme.colors.accent : 'transparent'} 
                  opacity={favorites?.some(f => f.id === item.id) ? 1 : 0.4}
                />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </MenuView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.searchContainer}>
        <Search size={20} color={theme.colors.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search tracks, artists..."
          placeholderTextColor={theme.colors.secondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View style={{ padding: 10 }}>
          {[1, 2, 3, 4, 5, 6].map(i => <TrackSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderTrack}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query ? <Text style={styles.emptyText}>No results found</Text> : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginTop: 20,
    marginBottom: 20,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 180,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  cover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackArtist: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artistBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingRight: 10,
  },
  favoriteBtn: {
    padding: 10,
  },
  coverContainer: {
    position: 'relative',
    width: 50,
    height: 50,
    marginRight: 15,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  playingCard: {
    backgroundColor: 'rgba(29, 185, 84, 0.05)',
    borderColor: 'rgba(29, 185, 84, 0.2)',
  },
  emptyText: {
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: 40,
  }
});
