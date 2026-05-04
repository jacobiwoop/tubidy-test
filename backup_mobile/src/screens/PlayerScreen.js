import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  PanResponder,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Slider from "@react-native-community/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  MoreHorizontal,
  Heart,
  ListMusic,
  Shuffle,
  Repeat,
  ListPlus,
  Download,
  RotateCcw,
} from "lucide-react-native";

import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../utils/theme";
import { useAudioPlayerStatus } from "expo-audio";
import audioModule from "../utils/audioFactory";
import { isTrackFavorite, saveFavorite } from "../utils/favorites";

const { width } = Dimensions.get("window");
const { player } = audioModule;

const formatTime = (ms) => {
  if (!ms || isNaN(ms)) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export default function PlayerScreen({
  track,
  status: propStatus, // On peut recevoir le status en prop ou l'utiliser localement
  isFavorite,
  onToggleFavorite,
  onPlayPause,
  onNext,
  onPrevious,
  onDownload,
  activeDownloads = {},
  downloads = [],
  playbackError,
  onRetry,
  onClose,
  onAddToPlaylist,
  onViewArtist,
}) {
  const playerStatus = useAudioPlayerStatus(player);
  const [isSliding, setIsSliding] = useState(false);
  const [slideValue, setSlideValue] = useState(0);

  // Position et Durée calculées en MS pour l'interface
  const duration =
    (playerStatus?.duration ? playerStatus.duration * 1000 : 0) ||
    (player.duration ? player.duration * 1000 : 0) ||
    (track?.duration ? track.duration * 1000 : 0);

  const [currentPosition, setCurrentPosition] = useState(0);
  const position = isSliding ? slideValue : currentPosition;

  const isPlaying = playerStatus?.playing;
  const isDownloaded = downloads.some((d) => d.id === track?.id);
  const isLoading =
    playerStatus?.loading || track?.id === propStatus?.loadingTrackId;

  // Debug pour comprendre pourquoi les compteurs sont à 0
  useEffect(() => {
    if (isPlaying) {
      console.log(
        `[Player] ${track?.title} - Status Dur: ${playerStatus?.duration}, Player Dur: ${player?.duration}, Track Dur: ${track?.duration}`,
      );
    }
  }, [isPlaying, playerStatus?.duration, track?.id]);

  // Synchronisation de la position en temps réel
  useEffect(() => {
    let interval;
    if (isPlaying && !isSliding) {
      interval = setInterval(() => {
        const time = player.currentTime; // En secondes chez expo-audio
        if (time !== undefined && time !== null) {
          setCurrentPosition(time * 1000); // Conversion en ms
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isSliding]);

  // Si on vient de charger une nouvelle track, on remet la position à 0
  useEffect(() => {
    setCurrentPosition(0);
  }, [track?.id]);

  const albumScale = useRef(new Animated.Value(isPlaying ? 1 : 0.8)).current;
  const pan = useRef(new Animated.Value(0)).current;

  // Gestion du geste "Drag to close"
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // On ne s'active que si on glisse vers le bas et pas sur le slider
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // On ne permet que de descendre
        if (gestureState.dy > 0) {
          pan.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          // Fermeture si on a glissé assez loin ou assez vite
          onClose();
          // Reset après un délai pour la prochaine ouverture
          setTimeout(() => pan.setValue(0), 300);
        } else {
          // Sinon on remonte avec un effet ressort
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  // État local pour le coeur (pour une réactivité instantanée)
  const [localIsFavorite, setLocalIsFavorite] = useState(isFavorite);
  useEffect(() => {
    setLocalIsFavorite(isFavorite);
  }, [isFavorite]);

  useEffect(() => {
    Animated.spring(albumScale, {
      toValue: isPlaying ? 1 : 0.8,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [isPlaying]);

  const handleToggleFavorite = () => {
    setLocalIsFavorite(!localIsFavorite);
    onToggleFavorite();
  };

  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: None, 1: All, 2: One

  const handleSlidingStart = () => {
    setIsSliding(true);
  };

  const handleSlidingComplete = async (value) => {
    await player.seekTo(value / 1000); // Conversion en secondes pour expo-audio
    setIsSliding(false);
    setCurrentPosition(value);
  };

  if (!track) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: pan }] }]}
      {...panResponder.panHandlers}
    >
      {/* Immersive Background Blur */}
      <View style={styles.background}>
        <Image
          source={{
            uri: track?.album?.cover_big || track?.album?.cover_medium || "",
          }}
          style={styles.backgroundImage}
          blurRadius={90}
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <ChevronDown size={32} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NOW PLAYING</Text>
          <TouchableOpacity>
            <MoreHorizontal size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Album Art */}
        <View style={styles.artContainer}>
          <Animated.Image
            source={{
              uri: track?.album?.cover_big || track?.album?.cover_medium || "",
            }}
            style={[styles.albumArt, { transform: [{ scale: albumScale }] }]}
          />
        </View>

        {/* Track Info */}
        <View style={styles.infoContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {track.title}
            </Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                onViewArtist(track.artist?.id);
              }}
              style={{ alignSelf: "flex-start" }}
            >
              <Text style={styles.artist}>{track.artist?.name}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.rightActions}>
            <TouchableOpacity
              onPress={onDownload}
              style={styles.actionCircle}
              activeOpacity={0.6}
            >
              {activeDownloads[track?.id] !== undefined ? (
                <View style={styles.downloadProgress}>
                  <Text style={styles.progressText}>
                    {Math.round(activeDownloads[track.id] * 100)}%
                  </Text>
                </View>
              ) : (
                <Download
                  size={24}
                  color={
                    isDownloaded ? theme.colors.accent : theme.colors.primary
                  }
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAddToPlaylist}
              style={styles.actionCircle}
              activeOpacity={0.6}
            >
              <ListPlus size={24} color={theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={styles.actionCircle}
              activeOpacity={0.6}
            >
              <Heart
                size={26}
                color={
                  localIsFavorite ? theme.colors.accent : theme.colors.primary
                }
                fill={localIsFavorite ? theme.colors.accent : "transparent"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar (Slider) */}
        <View style={styles.progressContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration}
            value={position}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor="rgba(255,255,255,0.1)"
            thumbTintColor={theme.colors.primary}
            onSlidingStart={handleSlidingStart}
            onValueChange={setSlideValue}
            onSlidingComplete={handleSlidingComplete}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)}>
            <Shuffle
              size={24}
              color={isShuffle ? theme.colors.accent : theme.colors.primary}
              opacity={isShuffle ? 1 : 0.5}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={onPrevious}>
            <SkipBack
              size={36}
              color={theme.colors.primary}
              fill={theme.colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={playbackError ? onRetry : onPlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.background} />
            ) : playbackError ? (
              <RotateCcw size={40} color={theme.colors.background} />
            ) : isPlaying ? (
              <Pause
                size={40}
                color={theme.colors.background}
                fill={theme.colors.background}
              />
            ) : (
              <Play
                size={40}
                color={theme.colors.background}
                fill={theme.colors.background}
                style={{ marginLeft: 5 }}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onNext}>
            <SkipForward
              size={36}
              color={theme.colors.primary}
              fill={theme.colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRepeatMode((repeatMode + 1) % 3)}
            style={styles.repeatBtn}
          >
            <Repeat
              size={24}
              color={
                repeatMode > 0 ? theme.colors.accent : theme.colors.primary
              }
              opacity={repeatMode > 0 ? 1 : 0.5}
            />
            {repeatMode === 2 && (
              <View style={styles.repeatBadge}>
                <Text style={styles.repeatBadgeText}>1</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity>
            <ListMusic size={24} color={theme.colors.secondary} />
          </TouchableOpacity>
          <Text style={styles.footerText}>Playing from Search</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
    opacity: 0.65,
    transform: [{ scale: 1.4 }],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 0,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    opacity: 0.6,
  },
  artContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    paddingHorizontal: 40,
  },
  albumArt: {
    width: width - 80,
    height: width - 80,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  infoContainer: {
    paddingHorizontal: 30,
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: "900",
    maxWidth: width - 100,
  },
  artist: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  rightActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  downloadProgress: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: {
    color: theme.colors.accent,
    fontSize: 8,
    fontWeight: "bold",
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -5,
    paddingHorizontal: 10,
  },
  timeText: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: "bold",
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 30,
    paddingHorizontal: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatBtn: {
    position: "relative",
  },
  repeatBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: theme.colors.accent,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatBadgeText: {
    color: "black",
    fontSize: 8,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    marginTop: "auto",
    marginBottom: 20,
    opacity: 0.5,
  },
  footerText: {
    color: theme.colors.secondary,
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  downloadingBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  downloadingText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});
