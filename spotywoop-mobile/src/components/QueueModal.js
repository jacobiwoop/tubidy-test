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
  onPlayTrackAt, 
  onRemoveTrackAt, 
  onClearQueue,
  suggestions = [],
  favorites = [],
  onToggleFavorite
}) => {
  const renderTrackItem = ({ item, index, isSuggestion = false }) => {
    const isPlaying = currentTrack?.id === item.id && !isSuggestion;
    const isFavorite = favorites.some(f => f.id === item.id);
    const coverUri = item.album?.cover_medium || item.album?.cover_small || item.cover_url;

    return (
      <MenuView
        key={isSuggestion ? `sugg-${index}` : `track-${index}`}
        onPressAction={({ nativeEvent }) => {
          if (nativeEvent.event === 'play') onPlayTrackAt(index, isSuggestion);
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
            onPlayTrackAt(index, isSuggestion);
          }}
        >
          {!isSuggestion && <GripVertical size={20} color={theme.colors.secondary} style={{ marginRight: 8, opacity: 0.3 }} />}
          
          <View style={styles.trackContent}>
            <Image source={{ uri: coverUri }} style={styles.cover} />
            <View style={styles.info}>
              <Text style={[styles.title, isPlaying && { color: theme.colors.accent }]} numberOfLines={1}>
                {item.title}
              </Text>
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
            <Text style={styles.sectionTitle}>Up Next</Text>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Queue is empty</Text>
            </View>
          )}
          ListFooterComponent={() => suggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.sectionTitle}>Suggestions for you</Text>
              {suggestions.map((item, index) => renderTrackItem({ item, index, isSuggestion: true }))}
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
  }
});

export default QueueModal;
