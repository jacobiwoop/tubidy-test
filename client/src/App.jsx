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

  // Modal States
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const audioRef = useRef(null);
  const activeTrackIdRef = useRef(null); // tracks dernière demande de lecture
  const abortControllerRef = useRef(null); // permet d'annuler la requête axios en cours

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
  }, []);

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

  // Legacy single track play (ex: from Home or Search)
  const handlePlayTrack = (track) => {
    setQueue([track]);
    setOriginalQueue([track]);
    loadTrackContent(track, 0);
  };

  // New Context Play (from Playlists or Library)
  const handlePlayContext = (track, contextTracks) => {
    setOriginalQueue(contextTracks);

    if (isShuffle) {
      // Create shuffled queue but put clicked track first
      const otherTracks = contextTracks.filter((t) => t.id !== track.id);
      for (let i = otherTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
      }
      const newQueue = [track, ...otherTracks];
      setQueue(newQueue);
      loadTrackContent(track, 0);
    } else {
      setQueue(contextTracks);
      const index = contextTracks.findIndex((t) => t.id === track.id);
      loadTrackContent(track, index);
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

  const toggleShuffle = () => {
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

  const toggleRepeat = () => {
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

  const navigateToArtist = (artistId) => {
    setActiveArtistId(artistId);
    setActiveTab("artist");
    window.scrollTo(0, 0);
  };

  const navigateToAlbum = (albumId) => {
    setActiveAlbumId(albumId);
    setActiveTab("album");
    window.scrollTo(0, 0);
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
            onSelectGenre={(genre) => setActiveGenre(genre)}
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
            handlePlayContext={handlePlayContext}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            openCreatePlaylistModal={() => setIsCreatingPlaylist(true)}
            activePlaylist={activePlaylist}
            setActivePlaylist={(p) => {
              setActivePlaylist(p);
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
          setActiveTab(tab);
          setIsSidebarOpen(false);
          setIsSearchVisible(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 md:ml-72 transition-all duration-500 relative">
        {/* Ambient background light */}
        <div
          className="fixed top-0 left-0 w-full h-[600px] opacity-20 pointer-events-none transition-all duration-1000 blur-[120px]"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${vibrantColor || "transparent"} 0%, transparent 70%)`,
          }}
        />

        {/* Top AppBar */}
        <header className="flex justify-between items-center px-6 py-4 w-full glass-effect z-[45] top-0 sticky">
          <div className="flex items-center gap-2 md:gap-5">
            <button
              className="p-2 -ml-2 md:hidden transition-all active:scale-75"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="material-symbols-outlined text-primary text-3xl">
                menu
              </span>
            </button>
            <h1 className="font-headline text-2xl font-black tracking-tighter uppercase italic md:hidden truncate max-w-[150px]">
              {activeTab === "home" ? "Spotiwoop" : activeTab}
            </h1>

            {/* Mobile Search Trigger */}
            <button
              className="p-2 md:hidden transition-all active:scale-75"
              onClick={() => setIsSearchVisible(true)}
            >
              <span className="material-symbols-outlined text-primary text-2xl">
                search
              </span>
            </button>

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
                className="w-full bg-[#1A1A1A] text-sm py-3 pl-12 pr-4 rounded-full border border-white/5 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                value={searchQuery}
                onFocus={() => setActiveTab("search")}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length > 0) setActiveTab("search");
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
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

          {/* Mobile Search Overlay */}
          {isSearchVisible && (
            <div className="fixed inset-0 bg-background z-[100] animate-in fade-in slide-in-from-top duration-500 p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-8">
                <button
                  className="p-2 -ml-2"
                  onClick={() => setIsSearchVisible(false)}
                >
                  <span className="material-symbols-outlined text-primary text-3xl">
                    arrow_back
                  </span>
                </button>
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-xl">
                    search
                  </span>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search music..."
                    className="w-full bg-white/5 text-lg py-4 pl-12 pr-4 rounded-xl border border-white/10 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim().length > 0) {
                        setActiveTab("search");
                      }
                    }}
                  />
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto no-scrollbar pt-4"
                onClick={() => setIsSearchVisible(false)}
              >
                <p className="text-secondary text-xs uppercase font-black tracking-widest opacity-40 mb-6">
                  Recent searches
                </p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 text-primary opacity-60">
                    <span className="material-symbols-outlined">history</span>
                    <span className="font-bold">Damso</span>
                  </div>
                  <div className="flex items-center gap-4 text-primary opacity-60">
                    <span className="material-symbols-outlined">history</span>
                    <span className="font-bold">Lush Life</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

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
        {currentTrack && (
          <div
            className="fixed bottom-24 left-3 right-3 md:left-6 md:right-6 z-50 transition-all duration-500 cursor-pointer"
            onClick={() => setShowFullPlayer(true)}
          >
            <div className="glass-effect rounded-lg px-4 py-3 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden group">
              <div
                className="absolute top-0 left-0 h-[1.5px] bg-primary transition-all duration-300"
                style={{
                  width: `${(currentTime / duration) * 100 || 0}%`,
                  boxShadow: vibrantColor
                    ? `0 0 15px ${vibrantColor}`
                    : "0 0 10px #fff",
                  backgroundColor: vibrantColor || "var(--primary)",
                }}
              ></div>
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img
                    className="w-full h-full rounded-md object-cover shadow-lg transition-transform duration-500 group-hover:scale-105"
                    src={
                      currentTrack.album?.cover_medium ||
                      currentTrack.album?.cover_small ||
                      currentTrack.cover_url ||
                      "https://e-cdns-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg"
                    }
                    alt={currentTrack.title}
                    onLoad={(e) => {
                      try {
                        const color = getVibrantColorFromImage(e.target);
                        setVibrantColor(color);
                      } catch (err) {
                        console.warn("Could not extract color (CORS?):", err);
                      }
                    }}
                    onError={(e) => {
                      e.target.src =
                        "https://e-cdns-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/10 rounded-md" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-bold text-primary truncate tracking-tight">
                    {currentTrack.title}
                  </span>
                  <span
                    className="text-xs text-secondary truncate uppercase tracking-widest opacity-80 mt-0.5 hover:text-primary transition-colors hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentTrack.artist?.id)
                        navigateToArtist(currentTrack.artist.id);
                    }}
                  >
                    {currentTrack.artist?.name || currentTrack.artist}
                  </span>
                </div>
              </div>
              <div
                className="flex items-center gap-5 px-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  className={`material-symbols-outlined text-2xl transition-all duration-300 cursor-pointer hover:scale-110 ${likedTrackIds.has(currentTrack.id?.toString()) ? "text-primary fill-icon" : "text-secondary hover:text-primary"}`}
                  onClick={() => toggleLike(currentTrack)}
                >
                  favorite
                </span>
                <div className="relative flex items-center justify-center">
                  {isLoadingTrack && (
                    <div className="absolute inset-[-4px] border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  )}
                  <button
                    className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all duration-300 ${isLoadingTrack ? "bg-white/10" : "bg-primary text-background hover:scale-105 shadow-lg shadow-white/5"}`}
                    onClick={togglePlay}
                    disabled={isLoadingTrack}
                  >
                    <span className="material-symbols-outlined fill-icon text-xl">
                      {isPlaying ? "pause" : "play_arrow"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
            onClose={() => setShowFullPlayer(false)}
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
