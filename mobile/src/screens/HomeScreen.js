import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Heart, Disc, Music } from 'lucide-react-native';
import { theme } from '../utils/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ favorites = [], playlists = [], onPlayTrack }) {
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // On prend les 4 premiers éléments, en évitant les doublons
  const quickActions = [
    { id: 'liked', title: 'Liked Songs', tracks: favorites, isLiked: true },
    ...playlists.filter(p => p.id !== 'liked').slice(0, 3)
  ];

  return (
    <View style={styles.container}>
      {/* Aura de fond style Monochrome */}
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'transparent']}
        style={styles.aura}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.greeting}>{getGreeting()}</Text>

          {/* Grille de raccourcis rapides */}
          <View style={styles.quickGrid}>
            {quickActions.map((item, index) => (
              <TouchableOpacity 
                key={item.id || index} 
                style={styles.quickCard}
                onPress={() => item.tracks?.[0] && onPlayTrack(item.tracks[0], item.tracks)}
              >
                <View style={styles.quickThumbContainer}>
                  {item.isLiked ? (
                    <LinearGradient colors={['#450af5', '#c4efd9']} style={styles.likedGradient}>
                      <Heart size={20} color="white" fill="white" />
                    </LinearGradient>
                  ) : (
                    <Image 
                      source={{ uri: item.tracks?.[0]?.album?.cover_medium || 'https://via.placeholder.com/150' }} 
                      style={styles.quickThumb} 
                    />
                  )}
                </View>
                <Text style={styles.quickTitle} numberOfLines={2}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Section: Made For You */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Made For You</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {favorites.slice(0, 5).map((track, i) => (
                <TouchableOpacity key={track.id} style={styles.albumCard} onPress={() => onPlayTrack(track)}>
                  <Image source={{ uri: track.album?.cover_medium }} style={styles.albumCover} />
                  <Text style={styles.albumTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.albumArtist} numberOfLines={1}>{track.artist?.name}</Text>
                </TouchableOpacity>
              ))}
              {/* Fallback si pas de favoris */}
              {favorites.length === 0 && [1, 2, 3].map(i => (
                <View key={i} style={styles.albumCard}>
                  <View style={[styles.albumCover, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                    <Disc size={40} color="#333" />
                  </View>
                  <Text style={styles.albumTitle}>Discovery Mix {i}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Section: Trending Now */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
               {[1,2,3].map(i => (
                 <TouchableOpacity key={i} style={styles.trendingCard}>
                    <Image 
                      source={{ uri: `https://picsum.photos/seed/${i + 10}/400/250` }} 
                      style={styles.trendingImage} 
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.trendingOverlay}
                    >
                      <Text style={styles.trendingTag}>TRENDING</Text>
                      <Text style={styles.trendingTitle}>Global Top Hits {i}</Text>
                    </LinearGradient>
                 </TouchableOpacity>
               ))}
            </ScrollView>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  aura: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 150,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f5f5f5',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  quickCard: {
    width: '48.5%',
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickThumbContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#1a1a1a',
  },
  quickThumb: {
    width: '100%',
    height: '100%',
  },
  likedGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTitle: {
    color: '#f5f5f5',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
    paddingRight: 5,
  },
  section: {
    marginBottom: 35,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f5f5f5',
    letterSpacing: -0.5,
    marginBottom: 15,
  },
  seeAll: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  albumCard: {
    marginRight: 16,
    width: 140,
  },
  albumCover: {
    width: 140,
    height: 140,
    borderRadius: 8,
    marginBottom: 10,
  },
  albumTitle: {
    color: '#f5f5f5',
    fontSize: 14,
    fontWeight: '700',
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  trendingCard: {
    width: 280,
    height: 160,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    height: '60%',
    justifyContent: 'flex-end',
  },
  trendingTag: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  trendingTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  }
});
