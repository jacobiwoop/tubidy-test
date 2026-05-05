import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Modal, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  Dimensions 
} from 'react-native';
import { X, Download, Trash2, CheckCircle2 } from 'lucide-react-native';
import { theme } from '../utils/theme';
import { triggerHaptic } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

export default function AlbumDownloadModal({ visible, onClose, album, tracks, downloads, onConfirm }) {
  const [selectedTracks, setSelectedTracks] = useState([]);

  React.useEffect(() => {
    if (visible && tracks) {
      // On ne sélectionne par défaut que ceux qui ne sont PAS encore téléchargés
      const toDownload = tracks.filter(t => !downloads.some(d => String(d.id) === String(t.id)));
      setSelectedTracks(toDownload);
    }
  }, [visible, tracks, downloads]);

  const removeTrack = (trackId) => {
    triggerHaptic('impactLight');
    setSelectedTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const handleDownload = () => {
    if (selectedTracks.length > 0) {
      onConfirm(selectedTracks);
      onClose();
    }
  };

  const renderItem = ({ item }) => {
    const isDownloaded = downloads.some(d => String(d.id) === String(item.id));
    const isSelected = selectedTracks.some(t => t.id === item.id);

    return (
      <View style={[styles.trackRow, isDownloaded && styles.downloadedRow]}>
        <Image source={{ uri: item.album?.cover_small || album?.cover_small }} style={styles.thumb} />
        <View style={styles.info}>
          <Text style={[styles.title, isDownloaded && styles.downloadedText]} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.artist}>{item.artist?.name}</Text>
        </View>
        
        {isDownloaded ? (
          <View style={styles.statusBadge}>
            <CheckCircle2 size={20} color={theme.colors.accent} />
          </View>
        ) : isSelected ? (
          <TouchableOpacity onPress={() => removeTrack(item.id)} style={styles.removeBtn}>
            <X size={20} color="#ff4444" />
          </TouchableOpacity>
        ) : (
          <View style={styles.statusBadge}>
            <Text style={styles.excludedText}>Exclu</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Téléchargement sélectif</Text>
              <Text style={styles.headerSub}>
                {selectedTracks.length} à télécharger • {tracks.length - selectedTracks.length} ignorés
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Album Info Summary */}
          <View style={styles.albumSummary}>
            <Image source={{ uri: album?.cover_medium }} style={styles.albumArt} />
            <View style={styles.albumText}>
              <Text style={styles.albumName} numberOfLines={1}>{album?.title}</Text>
              <Text style={styles.albumArtist}>{album?.artist?.name}</Text>
            </View>
          </View>

          {/* List */}
          <FlatList
            data={tracks}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Aucun titre trouvé</Text>
              </View>
            )}
          />

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.downloadBtn, selectedTracks.length === 0 && styles.disabledBtn]}
              onPress={handleDownload}
              disabled={selectedTracks.length === 0}
            >
              <Download size={20} color="black" style={{ marginRight: 10 }} />
              <Text style={styles.downloadText}>
                {selectedTracks.length > 0 ? `Télécharger (${selectedTracks.length})` : 'Album complet'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.8,
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
    fontSize: 20,
    fontWeight: '900',
  },
  headerSub: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  albumText: {
    marginLeft: 15,
    flex: 1,
  },
  albumName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  artist: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  removeBtn: {
    padding: 8,
  },
  downloadedRow: {
    opacity: 0.6,
  },
  downloadedText: {
    color: theme.colors.accent,
  },
  excludedText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusBadge: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 25,
    backgroundColor: '#161616',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  downloadBtn: {
    backgroundColor: theme.colors.accent,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  downloadText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  empty: {
    padding: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    fontStyle: 'italic',
  }
});
