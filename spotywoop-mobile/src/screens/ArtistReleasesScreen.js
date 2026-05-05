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
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import { theme } from '../utils/theme';
import * as api from '../services/api';
import { triggerHaptic } from '../utils/haptics';
import { getCache, saveCache } from '../utils/cache';

const { width } = Dimensions.get('window');

const FILTERS = [
  { id: 'Albums', label: 'Albums', type: 'album' },
  { id: 'Singles et EP', label: 'Singles et EP', type: 'single' },
  { id: 'Compilations', label: 'Compilations', type: 'compilation' },
  { id: 'Collaborations', label: 'Collaborations', type: 'collab' },
];

export default function ArtistReleasesScreen({ navigation, route }) {
  const { artistId, initialFilter, artistName } = route.params;
  const [loading, setLoading] = useState(true);
  const [allReleases, setAllReleases] = useState([]);
  const [activeFilter, setActiveFilter] = useState(initialFilter || 'Albums');

  useEffect(() => {
    loadAllReleases();
  }, []);

  const loadAllReleases = async () => {
    const cacheKey = `releases_${artistId}`;

    // 1. D'abord le cache
    const cached = await getCache(cacheKey);
    if (cached) {
      setAllReleases(cached);
      setLoading(false);
    }

    // 2. Fetch en background
    try {
      const albumsData = await api.getArtistAlbums(artistId);
      const data = albumsData.data || [];
      setAllReleases(data);
      saveCache(cacheKey, data);
    } catch (error) {
      console.error('Failed to load releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = allReleases.filter(item => {
    if (activeFilter === 'Albums') return item.record_type === 'album';
    if (activeFilter === 'Singles et EP') return item.record_type === 'single' || item.record_type === 'ep';
    if (activeFilter === 'Compilations') return item.record_type === 'compile';
    return true; // Fallback
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sorties</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {activeFilter !== 'Albums' && (
             <TouchableOpacity style={styles.clearFilter} onPress={() => { triggerHaptic("impactLight"); setActiveFilter('Albums'); }}>
                <X size={18} color="white" />
             </TouchableOpacity>
          )}
          {FILTERS.map(filter => (
            <TouchableOpacity 
              key={filter.id} 
              style={[styles.chip, activeFilter === filter.id && styles.activeChip]}
              onPress={() => { triggerHaptic("impactLight"); setActiveFilter(filter.id); }}
            >
              <Text style={[styles.chipText, activeFilter === filter.id && styles.activeChipText]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{activeFilter}</Text>
        {filteredData.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.releaseRow}
            onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, albumTitle: item.title })}
          >
            <Image source={{ uri: item.cover_medium }} style={styles.releaseCover} />
            <View style={styles.releaseInfo}>
              <Text style={styles.releaseTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.releaseYear}>{new Date(item.release_date).getFullYear()}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 60,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingVertical: 15,
  },
  filterScroll: {
    paddingHorizontal: 15,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#282828',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  activeChip: {
    backgroundColor: '#1DB954',
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#000',
  },
  clearFilter: {
    backgroundColor: '#282828',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
  },
  releaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  releaseCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  releaseInfo: {
    flex: 1,
  },
  releaseTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  releaseYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 4,
  }
});
