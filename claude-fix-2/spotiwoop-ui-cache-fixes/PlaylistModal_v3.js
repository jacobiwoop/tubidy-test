import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Pressable,
  KeyboardAvoidingView,
  Animated,
  Platform
} from 'react-native';
import { Plus, ListMusic, X, FolderPlus } from 'lucide-react-native';
import { theme } from '../utils/theme';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PlaylistModal = ({ 
  visible, 
  onClose, 
  playlists = [], 
  onAddToPlaylist, 
  onCreatePlaylist 
}) => {
  const [newTitle, setNewTitle] = useState('');
  const { panHandlers, animatedStyle } = useSwipeToDismiss({ onDismiss: onClose });

  const handleCreate = () => {
    if (newTitle.trim()) {
      onCreatePlaylist(newTitle);
      setNewTitle('');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <Animated.View style={[styles.content, animatedStyle]} {...panHandlers}>
          {/* Handle pour le style Bottom Sheet */}
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Ajouter à une playlist</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* Création rapide */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <FolderPlus size={20} color={theme.colors.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nom de la nouvelle playlist..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={newTitle}
                onChangeText={setNewTitle}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
            </View>
            <TouchableOpacity 
              style={[styles.createBtn, !newTitle.trim() && styles.createBtnDisabled]} 
              onPress={handleCreate}
              disabled={!newTitle.trim()}
            >
              <Plus size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Liste des playlists */}
          <ScrollView 
            style={styles.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {playlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ListMusic size={48} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>Aucune playlist pour le moment</Text>
              </View>
            ) : (
              playlists.map(pl => (
                <TouchableOpacity 
                  key={pl.id} 
                  style={styles.item} 
                  onPress={() => onAddToPlaylist(pl.id)}
                >
                  <View style={styles.iconContainer}>
                    <ListMusic size={22} color={theme.colors.accent} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{pl.title}</Text>
                    <Text style={styles.itemCount}>{pl.tracks?.length || 0} titres</Text>
                  </View>
                  <Plus size={20} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  content: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SCREEN_HEIGHT * 0.6,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  closeBtn: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnDisabled: {
    opacity: 0.3,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 14,
    marginTop: 10,
    fontWeight: '600',
  }
});

export default PlaylistModal;
