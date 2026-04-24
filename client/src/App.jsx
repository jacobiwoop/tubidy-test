import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import HomeScreen from "./screens/Home";
import SearchScreen from "./screens/Search";
import ArtistScreen from "./screens/ArtistScreen";
import AlbumScreen from "./screens/AlbumScreen";
import LibraryScreen from "./screens/Library";
import PlayerScreen from "./screens/Player";
import GenreView from "./screens/GenreView";
import Sidebar from "./components/Sidebar";
import QueueSidebar from "./components/QueueSidebar";
import AddToPlaylistModal from "./components/AddToPlaylistModal";
import { getDownloadedTracks } from "./utils/offlineDb";
import { getVibrantColorFromImage } from "./utils/vibrant-color";

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [activeArtistId, setActiveArtistId] = useState(null);
  const [activeAlbumId, setActiveAlbumId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [vibrantColor, setVibrantColor] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  // Global Axios Configuration for timeouts (Spotiwoop scraping and YTMusic can take time)
  axios.defaults.timeout = 60000;

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [activeGenre, setActiveGenre] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Queue State
  const [queue, setQueue] = useState([]);
  const [originalQueue, setOriginalQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // "off", "all", "one"

  const [likedTrackIds, setLikedTrackIds] = useState(new Set());
  const [playlists, setPlaylists] = useState([]);
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const [volume, setVolume] = useState(1);

  // Modal States
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const audioRef = useRef(null);
  const activeTrackIdRef = useRef(null); // tracks dernière demande de lecture
  const abortControllerRef = useRef(null); // permet d'annuler la requête axios en cours

  /**
   * Automatise la génération d'une file d'attente (Radio) à partir d'un morceau.
   * Utilise l'API Radio de Deezer avec fallback sur les artistes similaires.
   */
  const getSmartRadio = async (seedTrack) => {
    try {
      console.log(`[smart-radio] Requesting radio for track: ${seedTrack.id}`);
      const radioRes = await axios.get(
        `/api/deezer/track/${seedTrack.id}/radio`,
      );

      const tracks = radioRes.data.data || radioRes.data;
      if (Array.isArray(tracks) && tracks.length > 0) {
        console.log(
          `[smart-radio] Found ${tracks.length} tracks via Deezer Radio`,
        );
        return tracks.filter(
          (t) => t.id?.toString() !== seedTrack.id?.toString(),
        );
      }

      console.warn(
        `[smart-radio] No direct radio found. Trying similar artists fallback...`,
      );
      if (seedTrack.artist?.id) {
        const relatedRes = await axios.get(
          `/api/deezer/artist/${seedTrack.artist.id}/related?limit=5`,
        );
        const similarArtists = relatedRes.data.data || relatedRes.data || [];

        if (similarArtists.length > 0) {
          console.log(
            `[smart-radio] Found ${similarArtists.length} similar artists. Fetching top tracks from ${similarArtists[0].name}...`,
          );
          const topTracksRes = await axios.get(
            `/api/deezer/artist/${similarArtists[0].id}/top?limit=40`,
          );
          const topTracks = topTracksRes.data.data || topTracksRes.data || [];
          return topTracks.filter(
            (t) => t.id?.toString() !== seedTrack.id?.toString(),
          );
        }
      }
      return [];
    } catch (err) {
      console.error("[smart-radio] Failed", err);
      return [];
    }
  };

  const handlePlayTrack = async (track, context = null) => {
    if (!track) return;

    // Reset abort signal pour la nouvelle requête
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    // Si on joue dans un contexte (playlist/album), on charge toute la liste
    if (context && context.tracks) {
      setOriginalQueue(context.tracks);
      setQueue(context.tracks);
      const index = context.tracks.findIndex((t) => t.id === track.id);
      loadTrackContent(track, index >= 0 ? index : 0);
    } else {
      // Cas : Jouer un morceau seul -> Lancer la Radio intelligente (comme Monochrome)
      setOriginalQueue([track]);
      setQueue([track]);
      loadTrackContent(track, 0);

      // Récupérer la radio en arrière-plan (non-bloquant)
      getSmartRadio(track).then((radioTracks) => {
        if (radioTracks.length > 0) {
          const fullQueue = [track, ...radioTracks];
          setOriginalQueue(fullQueue);
          setQueue(fullQueue);
        }
      });
    }
  };

  // Fetch initial data (Likes and Playlists)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [likesRes, playlistsRes] = await Promise.all([
          axios.get("/api/me/library"),
          axios.get("/api/playlists"),
        ]);
        setLikedTrackIds(new Set(likesRes.data.map((t) => t.id.toString())));
        setPlaylists(playlistsRes.data);
      } catch (err) {
        console.error("Failed to fetch initial data", err);
      }
    };
    fetchInitialData();

    // Push initial state to history for back button support
    window.history.replaceState({ activeTab: "home" }, "");
  }, []);

  // Handle Back Button (Popstate)
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state) {
        const {
          activeTab,
          activeArtistId,
          activeAlbumId,
          activePlaylist,
          activeGenre,
          showFullPlayer,
          isQueueVisible,
        } = event.state;

        // Restore all navigation states
        setActiveTab(activeTab || "home");
        setActiveArtistId(activeArtistId || null);
        setActiveAlbumId(activeAlbumId || null);
        setActivePlaylist(activePlaylist || null);
        setActiveGenre(activeGenre || null);
        setShowFullPlayer(showFullPlayer || false);
        setIsQueueVisible(isQueueVisible || false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync Audio Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Centralized Navigation Helper
  const navigate = (updates) => {
    const nextState = {
      activeTab:
        updates.activeTab !== undefined ? updates.activeTab : activeTab,
      activeArtistId:
        updates.activeArtistId !== undefined
          ? updates.activeArtistId
          : activeArtistId,
      activeAlbumId:
        updates.activeAlbumId !== undefined
          ? updates.activeAlbumId
          : activeAlbumId,
      activePlaylist:
        updates.activePlaylist !== undefined
          ? updates.activePlaylist
          : activePlaylist,
      activeGenre:
        updates.activeGenre !== undefined ? updates.activeGenre : activeGenre,
      showFullPlayer:
        updates.showFullPlayer !== undefined
          ? updates.showFullPlayer
          : showFullPlayer,
      isQueueVisible:
        updates.isQueueVisible !== undefined
          ? updates.isQueueVisible
          : isQueueVisible,
    };

    // Only actual navigation changes should push state
    window.history.pushState(nextState, "");

    // Apply updates locally
    if (updates.activeTab !== undefined) setActiveTab(updates.activeTab);
    if (updates.activeArtistId !== undefined)
      setActiveArtistId(updates.activeArtistId);
    if (updates.activeAlbumId !== undefined)
      setActiveAlbumId(updates.activeAlbumId);
    if (updates.activePlaylist !== undefined)
      setActivePlaylist(updates.activePlaylist);
    if (updates.activeGenre !== undefined) setActiveGenre(updates.activeGenre);
    if (updates.showFullPlayer !== undefined)
      setShowFullPlayer(updates.showFullPlayer);
    if (updates.isQueueVisible !== undefined)
      setIsQueueVisible(updates.isQueueVisible);
  };

  const handlePlayFromQueue = (index) => {
    if (index >= 0 && index < queue.length) {
      loadTrackContent(queue[index], index);
    }
  };

  const removeFromQueue = (index) => {
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    setQueue(newQueue);
    setOriginalQueue(newQueue);

    // Si on a supprimé le morceau en cours, passer au suivant
    if (index === currentIndex) {
      if (newQueue.length > index) {
        loadTrackContent(newQueue[index], index);
      } else if (newQueue.length > 0) {
        loadTrackContent(newQueue[0], 0);
      } else {
        setIsPlaying(false);
      }
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const clearQueue = () => {
    if (currentTrack) {
      setQueue([currentTrack]);
      setOriginalQueue([currentTrack]);
      setCurrentIndex(0);
    } else {
      setQueue([]);
      setOriginalQueue([]);
      setCurrentIndex(-1);
    }
  };

  const toggleLike = async (track) => {
    const trackId = track.id.toString();
    const isLiked = likedTrackIds.has(trackId);

    try {
      if (isLiked) {
        await axios.delete(`/api/me/library/like/${trackId}`);
        const newLiked = new Set(likedTrackIds);
        newLiked.delete(trackId);
        setLikedTrackIds(newLiked);
      } else {
        await axios.post("/api/me/library/like", track);
        const newLiked = new Set(likedTrackIds);
        newLiked.add(trackId);
        setLikedTrackIds(newLiked);
      }
    } catch (err) {
      console.error("Failed to toggle like", err);
    }
  };

  // Sync isPlaying with audio element
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((e) => console.log("Auto-play blocked", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Media Session API Integration (Lock screen controls)
  useEffect(() => {
    if (currentTrack && "mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist?.name || currentTrack.artist,
        album: currentTrack.album?.title || "Spotiwoop Mix",
        artwork: [
          {
            src:
              currentTrack.album?.cover_medium ||
              currentTrack.cover_url ||
              "https://e-cdns-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg",
            sizes: "96x96",
            type: "image/jpeg",
          },
          {
            src:
              currentTrack.album?.cover_medium ||
              currentTrack.cover_url ||
              "https://e-cdns-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg",
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });

      // Handlers for native controls
      navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler("pause", () =>
        setIsPlaying(false),
      );
      navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
      navigator.mediaSession.setActionHandler("nexttrack", playNext);

      // Seek handlers
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        handleSeek(
          Math.max(
            audioRef.current.currentTime - (details.seekOffset || 10),
            0,
          ),
        );
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        handleSeek(
          Math.min(
            audioRef.current.currentTime + (details.seekOffset || 10),
            audioRef.current.duration,
          ),
        );
      });
    }
  }, [currentTrack]);

  // Update Media Session Playback State
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  // Helper function to extract a single track's full audio stream
  const loadTrackContent = async (track, newIndex = currentIndex) => {
    const trackId = track.id.toString();
    activeTrackIdRef.current = trackId; // marquer ce morceau comme "actif"

    // Afficher le morceau tout de suite dans l'UI (sans jouer)
    setCurrentTrack({ ...track, preview: null, isFull: false });
    setIsPlaying(false);
    setIsLoadingTrack(true);
    setCurrentTime(0);
    setCurrentIndex(newIndex);

    // Vider la source audio immédiatement pour couper le son précédent
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
    }

    // Annuler la requête axios précédente s'il y en a une en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Créer un nouveau contrôleur pour la requête courante
    abortControllerRef.current = new AbortController();

    // --- MODE HORS LIGNE (SMART SKIP) ---
    if (!navigator.onLine) {
      console.log(`[player-offline] Checking local db for ${trackId}...`);
      try {
        const localTracks = await getDownloadedTracks();
        const cachedTrack = localTracks.find(
          (t) => t.id?.toString() === trackId,
        );

        if (cachedTrack && cachedTrack.preview) {
          console.log(`[player-offline] Found in cache!`);
          if (activeTrackIdRef.current !== trackId) return;
          setCurrentTrack({ ...cachedTrack, isFull: true });
          setIsPlaying(true);
          setIsLoadingTrack(false);
          return;
        }
      } catch (err) {
        console.error("Offline DB error", err);
      }

      console.warn(`[player-offline] Not cached. Skipping ${trackId}...`);
      if (activeTrackIdRef.current === trackId) {
        if (newIndex < queue.length - 1) {
          loadTrackContent(queue[newIndex + 1], newIndex + 1);
        } else {
          setIsLoadingTrack(false);
        }
      }
      return;
    }
    // ------------------------------------

    // Récupérer le lien complet Spotiwoop avant de jouer
    try {
      console.log(`[player] Fetching full stream for ${trackId}...`);
      const res = await axios.get(`/api/deezer/track/${trackId}/download`, {
        signal: abortControllerRef.current.signal,
      });

      // Si un autre morceau a été demandé entre temps, on abandonne
      if (activeTrackIdRef.current !== trackId) return;

      if (res.data?.target?.link) {
        const rawLink = res.data.target.link;
        // Si c'est un lien Tubidy, on passe par le proxy.
        // Note: encodeURIComponent est nécessaire car rawLink contient des ? et des =
        const finalLink = rawLink.includes("d2mefast.net")
          ? `/api/proxy-audio?url=${encodeURIComponent(rawLink)}`
          : rawLink;

        console.log(`[player] Full stream ready: ${finalLink}`);
        setCurrentTrack((prev) => {
          if (prev?.id?.toString() === trackId) {
            return { ...prev, preview: finalLink, isFull: true };
          }
          return prev;
        });
        setIsPlaying(true);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log(`[player] Request canceled for ${trackId}`);
      } else if (activeTrackIdRef.current === trackId) {
        console.error("Failed to fetch full track link", err);
      }
    } finally {
      if (activeTrackIdRef.current === trackId) {
        setIsLoadingTrack(false);
      }
    }
  };

  const playNext = () => {
    if (queue.length === 0) return;

    // Repeat One logic
    if (repeatMode === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    if (currentIndex < queue.length - 1) {
      loadTrackContent(queue[currentIndex + 1], currentIndex + 1);
    } else if (repeatMode === "all") {
      loadTrackContent(queue[0], 0); // loop back
    } else {
      setIsPlaying(false); // End of queue
    }
  };

  const playPrevious = () => {
    if (queue.length === 0) return;
    if (currentTime > 3 || currentIndex === 0) {
      // restart track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      // Go back 1 track
      loadTrackContent(queue[currentIndex - 1], currentIndex - 1);
    }
  };

  const toggleShuffle = (e) => {
    if (e) e.stopPropagation();
    if (!isShuffle) {
      setIsShuffle(true);
      if (queue.length > 0 && currentTrack) {
        // Keep current track first, shuffle rest
        const otherTracks = originalQueue.filter(
          (t) => t.id !== currentTrack.id,
        );
        for (let i = otherTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
        }
        setQueue([currentTrack, ...otherTracks]);
        setCurrentIndex(0);
      }
    } else {
      setIsShuffle(false);
      setQueue(originalQueue);
      if (currentTrack) {
        const newIndex = originalQueue.findIndex(
          (t) => t.id === currentTrack.id,
        );
        setCurrentIndex(newIndex);
      }
    }
  };

  const toggleRepeat = (e) => {
    if (e) e.stopPropagation();
    if (repeatMode === "off") setRepeatMode("all");
    else if (repeatMode === "all") setRepeatMode("one");
    else setRepeatMode("off");
  };

  const handleAddToPlaylist = async (playlistId, track) => {
    try {
      await axios.post(`/api/playlists/${playlistId}/tracks`, track);
      alert("Added to playlist!");
    } catch (err) {
      console.error("Failed to add to playlist", err);
      alert("Error adding to playlist.");
    }
  };

  const openAddToPlaylistModal = (track) => {
    setTrackToAdd(track);
    setShowAddToPlaylistModal(true);
  };

  const handleCreatePlaylist = async (e) => {
    if (e) e.preventDefault();
    if (newPlaylistName && newPlaylistName.trim() !== "") {
      try {
        const res = await axios.post("/api/playlists", {
          name: newPlaylistName.trim(),
        });
        setPlaylists([...playlists, res.data]);
        setIsCreatingPlaylist(false);
        setNewPlaylistName("");
      } catch (err) {
        console.error("Failed to create playlist", err);
        alert("Erreur lors de la création de la playlist.");
      }
    }
  };

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (isLoadingTrack) return; // bloquer pendant le chargement Spotiwoop
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const navigateToArtist = (artistId) => {
    navigate({
      activeTab: "artist",
      activeArtistId: artistId,
      activeAlbumId: null,
      activeGenre: null,
    });
  };

  const navigateToAlbum = (albumId) => {
    navigate({
      activeTab: "album",
      activeAlbumId: albumId,
      activeArtistId: null,
      activeGenre: null,
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomeScreen
            onPlayTrack={handlePlayTrack}
            onNavigateToArtist={navigateToArtist}
            onNavigateToAlbum={navigateToAlbum}
          />
        );
      case "search":
        return (
          <SearchScreen
            query={searchQuery}
            setQuery={setSearchQuery}
            onPlayTrack={handlePlayTrack}
            onSelectGenre={(genre) =>
              navigate({ activeTab: "search", activeGenre: genre })
            }
            onNavigateToArtist={navigateToArtist}
            onNavigateToAlbum={navigateToAlbum}
          />
        );
      case "artist":
        return (
          <ArtistScreen
            artistId={activeArtistId}
            onPlayTrack={handlePlayTrack}
            onNavigateToArtist={navigateToArtist}
            onNavigateToAlbum={navigateToAlbum}
            likedTrackIds={likedTrackIds}
          />
        );
      case "album":
        return (
          <AlbumScreen
            albumId={activeAlbumId}
            onPlayTrack={handlePlayTrack}
            onNavigateToArtist={navigateToArtist}
            navigateToAlbum={navigateToAlbum}
            likedTrackIds={likedTrackIds}
          />
        );
      case "library":
        return (
          <LibraryScreen
            onPlayTrack={handlePlayTrack}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            openCreatePlaylistModal={() => setIsCreatingPlaylist(true)}
            activePlaylist={activePlaylist}
            setActivePlaylist={(p) => {
              navigate({ activeTab: "library", activePlaylist: p });
              setIsSelectionMode(false);
            }}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            onNavigateToArtist={navigateToArtist}
            onNavigateToAlbum={navigateToAlbum}
          />
        );
      default:
        return (
          <HomeScreen
            onPlayTrack={handlePlayTrack}
            onNavigateToArtist={navigateToArtist}
            onNavigateToAlbum={navigateToAlbum}
          />
        );
    }
  };

  return (
    <div className="bg-background text-primary font-sans min-h-screen selection:bg-white selection:text-black transition-colors duration-500 relative overflow-hidden flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          navigate({
            activeTab: tab,
            activeArtistId: null,
            activeAlbumId: null,
            activeGenre: null,
            activePlaylist: null,
          });
          setIsSidebarOpen(false);
          setIsSearchVisible(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:ml-72 transition-all duration-500 relative h-screen overflow-y-auto no-scrollbar">
        {/* Ambient background light */}
        <div
          className="fixed top-0 left-0 w-full h-[600px] opacity-20 pointer-events-none transition-all duration-1000 blur-[120px]"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${vibrantColor || "transparent"} 0%, transparent 70%)`,
          }}
        />

        {/* Fixed Top Section (Header + Mobile Search) */}
        <div className="sticky top-0 z-[45] w-full glass-effect">
          {/* Top AppBar */}
          <header className="flex justify-between items-center px-6 py-4 w-full">
            <div className="flex items-center gap-2 md:gap-5 flex-1">
              <button
                className="p-2 -ml-2 md:hidden transition-all active:scale-75"
                onClick={() => setIsSidebarOpen(true)}
              >
                <span className="material-symbols-outlined text-primary text-3xl">
                  menu
                </span>
              </button>
              <h1 className="font-headline text-2xl font-black tracking-tighter uppercase italic md:hidden truncate max-w-[180px] transition-all">
                {activeTab === "home" ? "Spotiwoop" : activeTab}
              </h1>

              {/* Desktop Navigation Arrows (Monochrome Style) */}
              <div className="hidden md:flex items-center gap-3 mr-4">
                <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors">
                  <span className="material-symbols-outlined text-xl">
                    chevron_left
                  </span>
                </button>
                <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors">
                  <span className="material-symbols-outlined text-xl">
                    chevron_right
                  </span>
                </button>
              </div>

              {/* Desktop Search Bar (Pill shape) */}
              <div className="hidden md:flex relative w-[400px]">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search for tracks, artists, albums..."
                  className="w-full bg-[#1A1A1A] text-sm py-3 pl-12 pr-10 rounded-full border border-white/5 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  value={searchQuery}
                  onFocus={() => navigate({ activeTab: "search" })}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim().length > 0)
                      navigate({ activeTab: "search" });
                  }}
                />
                {searchQuery && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                    onClick={() => {
                      setSearchQuery("");
                      navigate({ activeTab: "home" });
                    }}
                  >
                    <span className="material-symbols-outlined text-lg">
                      close
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Mobile Search Toggle */}
              <button
                className="p-2 md:hidden transition-all active:scale-75 text-primary"
                onClick={() => setIsSearchVisible(!isSearchVisible)}
              >
                <span className="material-symbols-outlined text-2xl">
                  {isSearchVisible ? "close" : "search"}
                </span>
              </button>

              <span className="material-symbols-outlined text-primary text-xl opacity-60 hover:opacity-100 transition-opacity clickable hidden md:block">
                help_outline
              </span>
              <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 clickable">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRogVdKoRnL9eXji2r65cXf8amitFG0mGjp-nzL8HgNGdAJcMidAlyCWHKRfnluU88XmE4vu80oF9G5EIg6A5nnM-4PqZQvMOd-j2tnUipBK_Pk0svmKGhnxc4iDtJgokLHrEFR94rATG2FyE_IHO5OYWwBhNACiO1hgiOAdvhBLiCIzGcZult4LsA7pDTX2mOTe6KsHB5Rhn4wAfd5COQ4rMAeTwKpRVL-t_LNPh1YLDERa4ia6G3mYGtLsMC6wW-MJV5TGMk6UA"
                  alt="Avatar"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
            </div>
          </header>

          {/* Mobile Search Bar (Appears below header) */}
          <div
            className={`md:hidden px-4 overflow-hidden transition-all duration-300 ease-in-out ${isSearchVisible ? "max-h-20 pb-4 opacity-100" : "max-h-0 pb-0 opacity-0"}`}
          >
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Search music..."
                className="w-full bg-white/5 text-sm py-3 pl-11 pr-10 rounded-xl border border-white/10 focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-xl"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length > 0)
                    navigate({ activeTab: "search" });
                }}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
                  onClick={() => {
                    setSearchQuery("");
                    navigate({ activeTab: "home" });
                  }}
                >
                  <span className="material-symbols-outlined text-lg">
                    close
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="px-4 md:px-12 pb-40 mt-8 max-w-7xl">
          {activeTab === "home" && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar mb-10">
              {["All", "Music", "Podcasts"].map((filter, i) => (
                <span
                  key={filter}
                  className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-widest cursor-pointer transition-all duration-300 border ${i === 0 ? "bg-primary text-background border-primary" : "bg-transparent text-secondary border-white/10 hover:border-white/30 hover:text-primary"}`}
                >
                  {filter}
                </span>
              ))}
            </div>
          )}
          {renderContent()}
          {activeGenre && (
            <GenreView
              genre={activeGenre}
              onClose={() => setActiveGenre(null)}
              onPlayTrack={handlePlayTrack}
            />
          )}
        </main>

        {/* Global Audio Element */}
        <audio
          ref={audioRef}
          src={currentTrack?.preview}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={playNext}
        />

        {/* Mini Player - Only shown when a track is selected */}
        {/* Player Bar (Desktop/Mobile Mini Player) */}
        {!showFullPlayer && currentTrack && (
          <div
            className="fixed bottom-6 left-3 right-3 md:left-[304px] md:right-8 z-[100] transition-all duration-500"
            onClick={(e) => {
              // Only open full player if clicking background on mobile
              if (
                window.innerWidth < 768 &&
                !e.target.closest("button") &&
                !e.target.closest("input")
              ) {
                navigate({ showFullPlayer: true });
              }
            }}
          >
            <div
              className="glass-effect rounded-2xl md:rounded-3xl px-4 md:px-6 py-3 md:py-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10 relative overflow-hidden group cursor-pointer"
              onClick={() => navigate({ showFullPlayer: true })}
            >
              {/* Dynamic Glow Background */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none transition-colors duration-1000"
                style={{ backgroundColor: vibrantColor || "var(--primary)" }}
              />

              {/* Progress Line (Top-only on mobile, integrated on desktop) */}
              <div className="md:hidden absolute top-0 left-0 w-full h-[2px] bg-white/5">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(currentTime / duration) * 100 || 0}%`,
                    boxShadow: vibrantColor
                      ? `0 0 12px ${vibrantColor}`
                      : "none",
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-4 md:gap-8 relative z-10">
                {/* 1. LEFT: Track Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0 md:flex-initial md:w-[30%]">
                  <div
                    className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl cursor-pointer group/cover"
                    onClick={() => navigate({ showFullPlayer: true })}
                  >
                    <img
                      src={
                        currentTrack.album?.cover_medium ||
                        currentTrack.cover_url
                      }
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-110"
                      alt=""
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="material-symbols-outlined text-white text-xl">
                        expand_less
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm md:text-base font-black text-white truncate tracking-tight">
                        {currentTrack.title}
                      </span>
                      <span className="hidden md:inline px-1 py-0.5 rounded text-[8px] font-black bg-white/10 text-secondary border border-white/5 uppercase">
                        HD
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-70">
                      <span
                        className="text-[11px] md:text-xs text-secondary truncate hover:text-white transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentTrack.artist?.id)
                            navigateToArtist(currentTrack.artist.id);
                        }}
                      >
                        {currentTrack.artist?.name || currentTrack.artist}
                      </span>
                      <span className="text-[10px] text-white/20 hidden md:inline">
                        •
                      </span>
                      <span className="text-[10px] text-secondary truncate hidden md:inline opacity-60">
                        {currentTrack.album?.title || "Single"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. CENTER: Main Controls (Desktop only for full layout) */}
                <div className="hidden md:flex flex-col items-center flex-1 max-w-xl px-4">
                  <div className="flex items-center gap-6 mb-2">
                    <button
                      className={`material-symbols-outlined text-xl transition-all ${isShuffle ? "text-primary scale-110" : "text-secondary hover:text-white"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShuffle(e);
                      }}
                    >
                      shuffle
                    </button>
                    <button
                      className="material-symbols-outlined text-2xl text-secondary hover:text-white transition-all active:scale-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPrevious();
                      }}
                    >
                      skip_previous
                    </button>
                    <button
                      className="relative w-11 h-11 rounded-full accent-monochrome flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all mx-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                    >
                      {isLoadingTrack && (
                        <div className="absolute inset-[-4px] border-2 border-white/20 border-t-accent-monochrome rounded-full animate-spin" />
                      )}
                      <span
                        className={`material-symbols-outlined text-3xl fill-icon ${isLoadingTrack ? "animate-spin" : ""}`}
                      >
                        {isLoadingTrack
                          ? "sync"
                          : isPlaying
                            ? "pause"
                            : "play_arrow"}
                      </span>
                    </button>
                    <button
                      className="material-symbols-outlined text-2xl text-secondary hover:text-white transition-all active:scale-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        playNext();
                      }}
                    >
                      skip_next
                    </button>
                    <button
                      className={`material-symbols-outlined text-xl transition-all ${repeatMode !== "off" ? "text-primary scale-110" : "text-secondary hover:text-white"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRepeat(e);
                      }}
                    >
                      {repeatMode === "one" ? "repeat_one" : "repeat"}
                    </button>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="w-full flex items-center gap-3">
                    <span className="text-[10px] font-black text-secondary w-8 text-right tabular-nums">
                      {Math.floor(currentTime / 60)}:
                      {Math.floor(currentTime % 60)
                        .toString()
                        .padStart(2, "0")}
                    </span>
                    <div className="flex-1 relative h-6 flex items-center group/progress">
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSeek(parseFloat(e.target.value));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                      />
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-150"
                          style={{
                            width: `${(currentTime / duration) * 100 || 0}%`,
                          }}
                        />
                      </div>
                      <div
                        className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity z-10 pointer-events-none"
                        style={{
                          left: `calc(${(currentTime / duration) * 100 || 0}% - 5px)`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-secondary w-8 tabular-nums">
                      {Math.floor(duration / 60)}:
                      {Math.floor(duration % 60)
                        .toString()
                        .padStart(2, "0")}
                    </span>
                  </div>
                </div>

                {/* 3. RIGHT: Utilities & Mobile Controls */}
                <div className="flex items-center justify-end gap-2 md:gap-5 flex-shrink-0 md:w-[30%]">
                  {/* Desktop Only Icons */}
                  <div className="hidden lg:flex items-center gap-4 text-secondary">
                    <span
                      className={`material-symbols-outlined text-xl cursor-pointer hover:text-primary transition-all ${likedTrackIds.has(currentTrack.id?.toString()) ? "text-primary fill-icon" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(currentTrack);
                      }}
                    >
                      favorite
                    </span>
                    <span
                      className="material-symbols-outlined text-xl cursor-pointer hover:text-primary transition-all active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddToPlaylistModal(currentTrack);
                      }}
                    >
                      playlist_add
                    </span>
                    <span
                      className="material-symbols-outlined text-xl cursor-pointer hover:text-primary transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      mic
                    </span>
                    <span
                      className="material-symbols-outlined text-xl cursor-pointer hover:text-primary transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      download
                    </span>
                  </div>

                  {/* Volume Control (Desktop Only) */}
                  <div className="hidden md:flex items-center gap-2 group/volume w-28 lg:w-32">
                    <span className="material-symbols-outlined text-xl text-secondary">
                      {volume === 0
                        ? "volume_off"
                        : volume < 0.5
                          ? "volume_down"
                          : "volume_up"}
                    </span>
                    <div className="flex-1 relative h-4 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleVolumeChange(e);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary hover:bg-white/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Queue Toggle (All platforms) */}
                  <button
                    className={`material-symbols-outlined text-2xl transition-all ${isQueueVisible ? "text-primary rotate-12" : "text-secondary hover:text-white"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate({ isQueueVisible: !isQueueVisible });
                    }}
                  >
                    queue_music
                  </button>

                  {/* Mobile Compact Controls */}
                  <div className="md:hidden flex items-center gap-3">
                    <button
                      className="relative w-10 h-10 flex items-center justify-center text-accent-monochrome active:scale-90 transition-all"
                      onClick={togglePlay}
                    >
                      {isLoadingTrack && (
                        <div className="absolute inset-[-4px] border-2 border-white/20 border-t-accent-monochrome rounded-full animate-spin" />
                      )}
                      <span
                        className={`material-symbols-outlined text-4xl ${isLoadingTrack ? "animate-spin" : ""}`}
                      >
                        {isLoadingTrack
                          ? "sync"
                          : isPlaying
                            ? "pause_circle"
                            : "play_circle"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Queue Sidebar */}
        <QueueSidebar
          isOpen={isQueueVisible}
          onClose={() => navigate({ isQueueVisible: false })}
          queue={queue}
          currentTrack={currentTrack}
          onPlayTrackAt={handlePlayFromQueue}
          onRemoveTrackAt={removeFromQueue}
          onClearQueue={clearQueue}
        />

        {/* Full Player Overlay */}
        {showFullPlayer && currentTrack && (
          <PlayerScreen
            track={currentTrack}
            isPlaying={isPlaying}
            isLiked={likedTrackIds.has(currentTrack.id?.toString())}
            playlists={playlists}
            isLoadingTrack={isLoadingTrack}
            currentTime={currentTime}
            duration={duration}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            onTogglePlay={togglePlay}
            onToggleLike={() => toggleLike(currentTrack)}
            onAddToPlaylist={handleAddToPlaylist}
            onSeek={handleSeek}
            onClose={() => navigate({ showFullPlayer: false })}
            onNext={playNext}
            onPrev={playPrevious}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
            onOpenPlaylistModal={() => openAddToPlaylistModal(currentTrack)}
            onNavigateToArtist={navigateToArtist}
            hasNext={currentIndex < queue.length - 1 || repeatMode === "all"}
            hasPrev={
              currentIndex > 0 || currentTime > 3 || repeatMode === "all"
            }
            onOpenQueue={() => navigate({ isQueueVisible: true })}
          />
        )}

        {/* Add To Playlist Modal */}
        {showAddToPlaylistModal && trackToAdd && (
          <AddToPlaylistModal
            track={trackToAdd}
            playlists={playlists}
            isLiked={likedTrackIds.has(trackToAdd.id?.toString())}
            onClose={() => setShowAddToPlaylistModal(false)}
            onToggleLike={toggleLike}
            onAddToPlaylist={handleAddToPlaylist}
            onCreatePlaylist={() => setIsCreatingPlaylist(true)}
          />
        )}

        {/* Create Playlist Modal (Global) */}
        {isCreatingPlaylist && (
          <div
            className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
            onClick={() => setIsCreatingPlaylist(false)}
          >
            <div
              className="bg-[#282828] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-headline text-xl font-bold mb-6 text-center text-white">
                Name your playlist
              </h2>
              <form onSubmit={handleCreatePlaylist}>
                <div className="relative mb-8">
                  <input
                    type="text"
                    autoFocus
                    placeholder="My awesome playlist"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="w-full bg-surface-container-high/50 text-white font-headline text-lg px-4 py-4 rounded-xl outline-none focus:ring-2 focus:ring-primary border border-white/5 transition-all"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsCreatingPlaylist(false)}
                    className="flex-1 py-3 font-semibold text-on-surface-variant hover:text-white transition-colors tracking-wide"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newPlaylistName.trim()}
                    className="flex-1 bg-primary text-on-primary py-3 rounded-full font-bold active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 tracking-wide"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
