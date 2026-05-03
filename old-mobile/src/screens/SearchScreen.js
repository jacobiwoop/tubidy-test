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
import { Search, Heart } from 'lucide-react-native';

import { theme } from '../utils/theme';
import { searchMusic } from '../services/api';
import { usePlayer } from '../context/PlayerContext';

export default function SearchScreen({ navigation }) {
  const { onPlayTrack, loadingTrackId, favorites, onToggleFavorite, onViewArtist } = usePlayer();

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
    return (
      <TouchableOpacity 
        style={[styles.trackCard, isLoading && { opacity: 0.7 }]}
        onPress={() => onPlayTrack(item)}
        disabled={!!loadingTrackId}
      >
        <Image 
          source={{ uri: item?.album?.cover_medium || '' }} 
          style={styles.cover} 
        />
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ArtistDetail', { artistId: item.artist?.id })}
            style={styles.artistBtn}
          >
            <Text style={styles.trackArtist}>{item.artist?.name}</Text>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.accent} />
        ) : (
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite(item);
            }}
            style={styles.favoriteBtn}
          >
            <Heart 
              size={20} 
              color={favorites?.some(f => f.id === item.id) ? theme.colors.accent : theme.colors.secondary} 
              fill={favorites?.some(f => f.id === item.id) ? theme.colors.accent : 'transparent'} 
              opacity={favorites?.some(f => f.id === item.id) ? 1 : 0.4}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
        <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
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
    </View>
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
  emptyText: {
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: 40,
  }
});
