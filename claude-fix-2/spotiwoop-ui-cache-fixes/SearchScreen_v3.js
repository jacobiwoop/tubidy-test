import React, { useState, useRef, useCallback } from 'react';
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
import { Search, Heart, Volume2, Clock, X } from 'lucide-react-native';

import { theme } from '../utils/theme';
import { searchMusic } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import TrackSkeleton from '../components/TrackSkeleton';
import { MenuView } from '@react-native-menu/menu';
import { triggerHaptic } from '../utils/haptics';

// Cache en mémoire : Map<query, { results, cachedAt }>
// TTL 5 min — les résultats Deezer ne changent pas souvent
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export default function SearchScreen({ navigation }) {
  const { onPlayTrack, loadingTrackId, favorites, onToggleFavorite, onViewArtist, currentTrack } = usePlayer();

  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [history, setHistory]   = useState([]); // historique des recherches

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q) return;
    setLoading(true);

    // Vérifier le cache
    const cached = searchCache.get(q);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      setResults(cached.results);
      setLoading(false);
      addToHistory(q);
      return;
    }

    try {
      const data = await searchMusic(q);
      const found = data.data || [];
      setResults(found);
      // Mettre en cache
      searchCache.set(q, { results: found, cachedAt: Date.now() });
      addToHistory(q);
    } catch (error) {
      alert('Search failed. Check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const addToHistory = (q) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h !== q);
      return [q, ...filtered].slice(0, 6); // garder les 6 dernières
    });
  };

  const clearHistory = () => setHistory([]);

  const renderTrack = ({ item }) => {
    const isLoading = loadingTrackId === item.id;
    const isPlaying = currentTrack?.id === item.id;
    
    return (
      <MenuView
        onPressAction={({ nativeEvent }) => {
          if (nativeEvent.event === 'play') onPlayTrack(item, []);
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
            onPlayTrack(item, []);
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
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <X size={18} color={theme.colors.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Historique — affiché quand pas de résultats */}
      {!loading && results.length === 0 && history.length > 0 && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recherches récentes</Text>
            <TouchableOpacity onPress={clearHistory}>
              <Text style={styles.historyClear}>Effacer</Text>
            </TouchableOpacity>
          </View>
          {history.map((h, i) => (
            <TouchableOpacity
              key={i}
              style={styles.historyItem}
              onPress={() => { setQuery(h); handleSearch(h); }}
            >
              <Clock size={14} color={theme.colors.secondary} style={{ marginRight: 10 }} />
              <Text style={styles.historyText}>{h}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
            query && !loading ? <Text style={styles.emptyText}>No results found</Text> : null
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
  },
  historyContainer: {
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  historyClear: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  historyText: {
    color: theme.colors.secondary,
    fontSize: 15,
  },
});
