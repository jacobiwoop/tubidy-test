import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import Modal from 'react-native-modal';
import { X, Trash2, Heart, GripVertical, MoreVertical } from 'lucide-react-native';
import { theme } from '../utils/theme';
import { triggerHaptic } from '../utils/haptics';
import { MenuView } from '@react-native-menu/menu';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const QueueModal = ({ 
  isVisible, 
  onClose, 
  queue, 
  currentTrack,
  radioSource,
  onPlayTrackAt, 
  onRemoveTrackAt, 
  onClearQueue,
  currentQueueIndex,
  suggestions = [],
  favorites = [],
  onToggleFavorite
}) => {
  const renderTrackItem = ({ item, index }) => {
    const isPlaying = currentQueueIndex === index;
    const isSuggestion = item.isSuggestion;
    const isFavorite = favorites.some(f => f.id === item.id);
    const coverUri = item.album?.cover_medium || item.album?.cover_small || item.cover_url;

    return (
      <MenuView
        key={isSuggestion ? `sugg-${index}` : `track-${index}`}
        onPressAction={({ nativeEvent }) => {
          if (nativeEvent.event === 'play') onPlayTrackAt(index);
          if (nativeEvent.event === 'favorite') onToggleFavorite(item);
          if (nativeEvent.event === 'remove' && !isSuggestion) onRemoveTrackAt(index);
        }}
        actions={[
          { id: 'play', title: 'Lire maintenant', image: 'play' },
          { id: 'favorite', title: isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris', image: isFavorite ? 'heart.fill' : 'heart' },
          ...(!isSuggestion ? [{ id: 'remove', title: 'Retirer de la file', image: 'trash', attributes: { destructive: true } }] : []),
        ]}
        shouldOpenOnLongPress={true}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          style={[styles.trackItem, isPlaying && styles.playingItem]}
          onPress={() => {
            triggerHaptic("impactLight");
            onPlayTrackAt(index);
          }}
        >
          {!isSuggestion && <GripVertical size={20} color={theme.colors.secondary} style={{ marginRight: 8, opacity: 0.3 }} />}
          
          <View style={styles.trackContent}>
            <Image source={{ uri: coverUri }} style={styles.cover} />
            <View style={styles.info}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.title, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.isSuggestion && (
                  <View style={styles.suggestionBadge}>
                    <Text style={styles.suggestionBadgeText}>✨</Text>
                  </View>
                )}
              </View>
              <Text style={styles.artist} numberOfLines={1}>
                {item.artist?.name || item.artist}
              </Text>
            </View>
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => {
              triggerHaptic("notificationSuccess");
              onToggleFavorite(item);
            }}>
              <Heart 
                size={18} 
                color={isFavorite ? theme.colors.accent : theme.colors.secondary} 
                fill={isFavorite ? theme.colors.accent : 'transparent'} 
                style={{ marginRight: 10, opacity: isFavorite ? 1 : 0.5 }} 
              />
            </TouchableOpacity>
            <MoreVertical size={18} color={theme.colors.secondary} style={{ opacity: 0.3 }} />
          </View>
        </TouchableOpacity>
      </MenuView>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.7}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver
      hideModalContentWhileAnimating
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Queue</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onClearQueue} style={styles.iconBtn}>
              <Trash2 size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { marginLeft: 15 }]}>
              <X size={26} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={queue}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={(props) => renderTrackItem(props)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <>
              {/* Musique source de la radio */}
              {radioSource && (
                <View style={styles.radioSourceContainer}>
                  <Text style={styles.radioSourceLabel}>🎙 Radio basée sur</Text>
                  <View style={styles.radioSourceTrack}>
                    <Image
                      source={{ uri: radioSource.album?.cover_medium || radioSource.thumbnail || '' }}
                      style={styles.radioSourceCover}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.radioSourceTitle} numberOfLines={1}>
                        {radioSource.title}
                      </Text>
                      <Text style={styles.radioSourceArtist} numberOfLines={1}>
                        {radioSource.artist?.name || radioSource.artist}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              <Text style={styles.sectionTitle}>À suivre</Text>
            </>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>La file d'attente est vide</Text>
            </View>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0A0A0A',
    height: SCREEN_HEIGHT * 0.8,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginVertical: 15,
    paddingHorizontal: 25,
    opacity: 0.6,
  },
  listContent: {
    paddingBottom: 40,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 10,
    borderRadius: 12,
  },
  playingItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  trackContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#1a1a1a',
  },
  info: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  artist: {
    color: theme.colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: theme.colors.secondary,
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.5,
  },
  suggestionsSection: {
    marginTop: 20,
  },
  radioSourceContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    backgroundColor: 'rgba(29,185,84,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(29,185,84,0.2)',
  },
  radioSourceLabel: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    opacity: 0.8,
  },
  radioSourceTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioSourceCover: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  radioSourceTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  radioSourceArtist: {
    color: theme.colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  suggestionBadge: {
    backgroundColor: 'rgba(29,185,84,0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
  },
  suggestionBadgeText: {
    color: theme.colors.accent,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default QueueModal;
