import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  Pressable, 
  Image,
  ScrollView,
  Platform
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate,
  runOnJS
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { 
  Play, 
  Plus, 
  User, 
  Disc, 
  Download, 
  Share, 
  Trash2, 
  X,
  ListMusic
} from 'lucide-react-native';
import { theme } from '../utils/theme';
import { usePlayer } from '../context/PlayerContext';
import { getArtistNames } from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ActionSheet() {
  const navigation = useNavigation();
  const { 
    actionSheet, 
    closeActionSheet, 
    playNext, 
    addToQueue, 
    onToggleFavorite, 
    favorites,
    onDownload,
    onRemoveDownload,
    onRemoveFromPlaylist,
    downloads,
  } = usePlayer();

  const { visible, data, type } = actionSheet;
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const panY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      panY.value = 0;
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 25, stiffness: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 250 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    }
  }, [visible]);

  const onGestureEvent = (event) => {
    'worklet';
    if (event.nativeEvent.translationY > 0) {
      panY.value = event.nativeEvent.translationY;
    }
  };

  const onHandlerStateChange = (event) => {
    'worklet';
    if (event.nativeEvent.state === 5) { // END
      if (event.nativeEvent.translationY > 100 || event.nativeEvent.velocityY > 500) {
        runOnJS(closeActionSheet)();
      } else {
        panY.value = withSpring(0);
      }
    }
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * interpolate(panY.value, [0, SCREEN_HEIGHT * 0.5], [1, 0], 'clamp'),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + panY.value }],
  }));

  if (!data && !visible) return null;

  const handleAction = (action, params = null) => {
    triggerHaptic('impactLight');
    action(params || data);
    closeActionSheet();
  };

  const handleNavigate = (screen, params) => {
    triggerHaptic('impactLight');
    closeActionSheet();
    navigation.navigate(screen, params);
  };

  const isDownloaded = data ? downloads.some(d => String(d.id) === String(data.id)) : false;

  const renderHeader = () => {
    const title = data?.title || data?.name || 'Inconnu';
    const subtitle = type === 'track' ? getArtistNames(data) : (type === 'album' ? data.artist?.name : '');
    const image = data?.album?.cover_medium || data?.cover_medium || data?.picture_medium;

    return (
      <View style={styles.header}>
        <Image source={{ uri: image }} style={styles.headerImage} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
    );
  };

  const renderTrackActions = () => {
    const playlistId = actionSheet.context?.playlistId;

    return (
      <>
        <ActionButton 
          icon={<Play size={20} color="#fff" />} 
          label="Lire ensuite" 
          onPress={() => handleAction(playNext)} 
        />
        <ActionButton 
          icon={<ListMusic size={20} color="#fff" />} 
          label="Ajouter à la file d'attente" 
          onPress={() => handleAction(addToQueue)} 
        />
        <ActionButton 
          icon={<Plus size={20} color="#fff" />} 
          label="Ajouter à une playlist" 
          onPress={() => {
              closeActionSheet();
          }} 
        />
        <View style={styles.separator} />
        <ActionButton 
          icon={<User size={20} color="#fff" />} 
          label="Voir l'artiste" 
          onPress={() => handleNavigate('ArtistDetail', { artistId: data.artist?.id })} 
        />
        <ActionButton 
          icon={<Disc size={20} color="#fff" />} 
          label="Voir l'album" 
          onPress={() => handleNavigate('AlbumDetail', { albumId: data.album?.id })} 
        />
        <View style={styles.separator} />
        {playlistId && playlistId !== 'liked' && playlistId !== 'downloads' && (
          <>
            <ActionButton 
              icon={<Trash2 size={20} color={theme.colors.error || '#ff4444'} />} 
              label="Supprimer de cette playlist" 
              onPress={() => {
                handleAction(() => onRemoveFromPlaylist(data.id, playlistId));
              }} 
            />
            <View style={styles.separator} />
          </>
        )}
        <ActionButton 
          icon={isDownloaded ? <Trash2 size={20} color={theme.colors.error || '#ff4444'} /> : <Download size={20} color="#fff" />} 
          label={isDownloaded ? "Supprimer le téléchargement" : "Télécharger"} 
          onPress={() => handleAction(isDownloaded ? onRemoveDownload : onDownload)} 
        />
        <ActionButton 
          icon={<Share size={20} color="#fff" />} 
          label="Partager" 
          onPress={() => {
              closeActionSheet();
          }} 
        />
      </>
    );
  };

  const renderAlbumActions = () => (
    <>
      <ActionButton 
        icon={<Play size={20} color="#fff" />} 
        label="Lire l'album" 
        onPress={() => {
            closeActionSheet();
        }} 
      />
      <ActionButton 
        icon={<ListMusic size={20} color="#fff" />} 
        label="Ajouter à la file d'attente" 
        onPress={() => handleAction(addToQueue)} 
      />
      <View style={styles.separator} />
      <ActionButton 
        icon={<User size={20} color="#fff" />} 
        label="Voir l'artiste" 
        onPress={() => handleNavigate('ArtistDetail', { artistId: data.artist?.id })} 
      />
      <ActionButton 
        icon={<Download size={20} color="#fff" />} 
        label="Télécharger tout l'album" 
        onPress={() => closeActionSheet()} 
      />
      <ActionButton 
        icon={<Share size={20} color="#fff" />} 
        label="Partager l'album" 
        onPress={() => closeActionSheet()} 
      />
    </>
  );

  const renderArtistActions = () => (
    <>
      <ActionButton 
        icon={<User size={20} color="#fff" />} 
        label="Voir le profil" 
        onPress={() => handleNavigate('ArtistDetail', { artistId: data.id })} 
      />
      <ActionButton 
        icon={<Plus size={20} color="#fff" />} 
        label="Suivre l'artiste" 
        onPress={() => closeActionSheet()} 
      />
      <ActionButton 
        icon={<ListMusic size={20} color="#fff" />} 
        label="Lancer la Radio de l'artiste" 
        onPress={() => closeActionSheet()} 
      />
      <ActionButton 
        icon={<Share size={20} color="#fff" />} 
        label="Partager l'artiste" 
        onPress={() => closeActionSheet()} 
      />
    </>
  );

  const renderPlaylistActions = () => (
    <>
      <ActionButton 
        icon={<Play size={20} color="#fff" />} 
        label="Lire la playlist" 
        onPress={() => closeActionSheet()} 
      />
      <ActionButton 
        icon={<Share size={20} color="#fff" />} 
        label="Partager la playlist" 
        onPress={() => closeActionSheet()} 
      />
      <View style={styles.separator} />
      <ActionButton 
        icon={<Trash2 size={20} color={theme.colors.error || '#ff4444'} />} 
        label="Supprimer la playlist" 
        onPress={() => closeActionSheet()} 
      />
    </>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeActionSheet} />
      </Animated.View>

      <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.indicator} />
          
          {renderHeader()}
          
          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {type === 'track' && renderTrackActions()}
            {type === 'album' && renderAlbumActions()}
            {type === 'artist' && renderArtistActions()}
            {type === 'playlist' && renderPlaylistActions()}
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

function ActionButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.option} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.optionIcon}>{icon}</View>
      <Text style={styles.optionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#161616',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 15,
    maxHeight: SCREEN_HEIGHT * 0.75,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  indicator: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#222',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  optionsScroll: {
    paddingTop: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  optionIcon: {
    width: 30,
    alignItems: 'center',
  },
  optionLabel: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 25,
    marginVertical: 10,
  }
});
