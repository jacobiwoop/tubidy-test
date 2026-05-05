import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Heart, Volume2, Clock, X, Play, MoreHorizontal, Download } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

import { theme } from '../utils/theme';
import { searchMusic, getSearchSuggestions } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import TrackSkeleton from '../components/TrackSkeleton';
import { triggerHaptic } from '../utils/haptics';
import { getArtistNames } from '../utils/formatters';

const { width } = Dimensions.get('window');

// Catégories de genres Premium
const GENRES = [
  { id: '1', title: 'Hits', image: require('../../assets/genres/hit.webp') },
  { id: '2', title: 'Nouveautés', image: require('../../assets/genres/nouveaute.webp') },
  { id: '3', title: 'Rap RnB', image: require('../../assets/genres/rap-rnb.webp') },
  { id: '4', title: 'Artistes', image: require('../../assets/genres/artist.webp') },
  { id: '5', title: 'Electro', image: require('../../assets/genres/electro-dance.webp') },
  { id: '6', title: 'Pop Rock', image: require('../../assets/genres/pop-rock.webp') },
  { id: '7', title: 'Chill', image: require('../../assets/genres/chill.webp') },
  { id: '8', title: 'Disco Jazz', image: require('../../assets/genres/disco.webp') },
  { id: '11', title: 'Good Vibes', image: require('../../assets/genres/good-vibes.webp') },
  { id: '12', title: 'Humour', image: require('../../assets/genres/humour.webp') },
];

const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export default function SearchScreen({ navigation }) {
  const { 
    onPlayTrack, 
    loadingTrackId, 
    favorites, 
    onToggleFavorite, 
    currentTrack, 
    downloads,
    enrichTracks,
    enrichedMetadata,
    openActionSheet
  } = usePlayer();

  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [history, setHistory]   = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [suggestions, setSuggestions] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Animation pour l'entrée des éléments
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Effet pour l'auto-complétion (Suggestions)
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const sugs = await getSearchSuggestions(query);
      setSuggestions(sugs);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [results, loading]);

  const abortControllerRef = useRef(null);

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    // Annuler la requête précédente si elle est encore en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setIsTyping(false);
    setSuggestions([]);

    const cached = searchCache.get(q);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      setResults(cached.results);
      setLoading(false);
      addToHistory(q);
      return;
    }

    try {
      const data = await searchMusic(q, { signal: abortControllerRef.current.signal });
      const found = data.data || [];
      setResults(found);
      searchCache.set(q, { results: found, cachedAt: Date.now() });
      addToHistory(q);
      
      // Lancement de l'enrichissement en arrière-plan
      enrichTracks(found);
    } catch (error) {
      if (error.name === 'AbortError' || axios.isCancel(error)) {
        console.log('Search aborted');
      } else {
        console.error(error);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const addToHistory = (q) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h !== q);
      return [q, ...filtered].slice(0, 5);
    });
  };

  const renderFilterPill = (title) => (
    <TouchableOpacity 
      style={[styles.filterPill, activeFilter === title && styles.filterPillActive]}
      onPress={() => {
        triggerHaptic("impactLight");
        setActiveFilter(title);
      }}
    >
      <Text style={[styles.filterText, activeFilter === title && styles.filterTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderGenreCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.genreCard}
      onPress={() => {
        triggerHaptic("impactLight");
        setQuery(item.title);
        handleSearch(item.title);
      }}
    >
      <Image source={item.image} style={styles.genreImage} />
      <Text style={styles.genreTitle} numberOfLines={2}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderTrack = ({ item, index }) => {
    const isLoading = loadingTrackId === item.id;
    const isPlaying = currentTrack?.id === item.id;
    const isFavorite = favorites.some(f => f.id === item.id);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity 
            style={[styles.trackCard, isPlaying && styles.playingCard]}
            onPress={() => {
              triggerHaptic("impactLight");
              onPlayTrack(item);
            }}
            onLongPress={() => openActionSheet(item, 'track')}
            delayLongPress={300}
          >
            <TouchableOpacity 
              style={styles.coverContainer}
              onPress={(e) => {
                e.stopPropagation();
                triggerHaptic("impactLight");
                navigation.navigate('ArtistDetail', { artistId: item.artist?.id });
              }}
            >
              <Image source={{ uri: item?.album?.cover_medium }} style={styles.cover} />
              {isPlaying && (
                <View style={styles.playingOverlay}>
                  <Volume2 size={20} color={theme.colors.accent} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.trackInfo}>
              <View style={styles.titleRow}>
                <Text style={[styles.trackTitle, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {downloads.some(d => String(d.id) === String(item.id)) && (
                  <Download size={12} color={theme.colors.accent} style={{ marginLeft: 6 }} />
                )}
              </View>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {getArtistNames(item, enrichedMetadata)}
              </Text>
            </View>

            <View style={styles.trackActions}>
              <TouchableOpacity onPress={() => onToggleFavorite(item)} style={styles.actionBtn}>
                <Heart 
                  size={20} 
                  color={isFavorite ? theme.colors.accent : 'rgba(255,255,255,0.2)'} 
                  fill={isFavorite ? theme.colors.accent : 'transparent'} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => openActionSheet(item, 'track')}
              >
                <MoreHorizontal size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Premium */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recherche</Text>
      </View>

      {/* Search Bar stylized */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={styles.input}
            placeholder="Artistes, titres, albums..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            onChangeText={(text) => {
              setQuery(text);
              if (text.trim().length > 0) {
                setIsTyping(true);
                setResults([]); // On vide les résultats pour laisser place aux suggestions
              } else {
                setIsTyping(false);
                setSuggestions([]);
              }
            }}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => {
                triggerHaptic("impactLight");
                setQuery('');
                setResults([]);
                setSuggestions([]);
                setIsTyping(false);
              }}
            >
              <X size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
 
      {/* Suggestions View */}
      {isTyping && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((s, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.suggestionItem}
              onPress={() => {
                triggerHaptic("impactLight");
                setQuery(s);
                handleSearch(s);
              }}
            >
              <Search size={18} color="rgba(255,255,255,0.2)" style={{ marginRight: 15 }} />
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Discovery View (Categories) */}
      {!query && !loading && results.length === 0 && suggestions.length === 0 && (
        <ScrollView style={styles.discoveryContent} showsVerticalScrollIndicator={false}>
          {history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recherches récentes</Text>
                <TouchableOpacity onPress={() => setHistory([])}>
                  <Text style={styles.clearText}>Effacer</Text>
                </TouchableOpacity>
              </View>
              {history.map((h, i) => (
                <TouchableOpacity key={i} style={styles.historyItem} onPress={() => { setQuery(h); handleSearch(h); }}>
                  <Clock size={16} color="rgba(255,255,255,0.3)" style={{ marginRight: 12 }} />
                  <Text style={styles.historyText}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parcourir tout</Text>
            <View style={styles.genresGrid}>
              {GENRES.map(genre => (
                <View key={genre.id}>
                  {renderGenreCard({ item: genre })}
                </View>
              ))}
            </View>
          </View>
          <View style={{ height: 150 }} />
        </ScrollView>
      )}

      {/* Results View */}
      {(query || results.length > 0) && (
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {['All', 'Tracks', 'Artists', 'Albums', 'Playlists'].map(f => (
              <View key={f}>
                {renderFilterPill(f)}
              </View>
            ))}
          </ScrollView>

          {loading ? (
            <View style={{ paddingHorizontal: 20 }}>
              {[1, 2, 3, 4, 5, 6].map(i => <TrackSkeleton key={i} />)}
            </View>
          ) : (
            <FlatList
              data={results}
              renderItem={renderTrack}
              keyExtractor={(item) => item.id.toString()}
              extraData={enrichedMetadata} // Force le re-rendu quand le cache change
              contentContainerStyle={styles.resultsList}
              ListEmptyComponent={
                query ? <Text style={styles.emptyText}>Aucun résultat pour "{query}"</Text> : null
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginVertical: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discoveryContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  clearText: {
    color: theme.colors.accent,
    fontSize: 14,
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genreCard: {
    width: (width - 46) / 2,
    aspectRatio: 2.2,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: '#161616',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  genreImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  genreTitle: {
    position: 'absolute',
    top: '50%',
    left: '33%',
    transform: [{ translateY: -10 }],
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    width: '60%',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  filterRow: {
    paddingHorizontal: 20,
    marginBottom: 15,
    maxHeight: 40,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  filterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#000',
  },
  resultsList: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  coverContainer: {
    position: 'relative',
    marginRight: 15,
  },
  cover: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 10,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  playingCard: {
    backgroundColor: 'rgba(29, 185, 84, 0.03)',
    borderRadius: 12,
    marginHorizontal: -10,
    paddingHorizontal: 10,
  },
  suggestionsContainer: {
    paddingHorizontal: 20,
    marginTop: -5,
    marginBottom: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  }
});
