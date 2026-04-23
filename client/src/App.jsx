import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import SearchScreen from "./screens/Search";
import LibraryScreen from "./screens/Library";
import PlayerScreen from "./screens/Player";
import GenreView from "./screens/GenreView";
import AddToPlaylistModal from "./components/AddToPlaylistModal";
import { getDownloadedTracks } from "./utils/offlineDb";

// Temporary Mock Data for Home
const SHORTCUTS = [
  {
    id: 1,
    title: "Daily Mix 1",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCEyqaDlx0wWNMf5R2EL_ImEwf-d5CAdAiVs-Nqjpmoo3fPCN2MkU_CXsCMHwVLhTKrOTzmczA6dLC2MRoLhxUNQof59T4zUUvirmo8onuM1ex8oUBRAmJ_R8Y6VLew_9H8sJRO95p0OyYqso6aJLg9PwHA6Z0aSxx7ASay3rO_1hO9HLcj_5vjaETVfzzOTjAb9RqQUEpx9EIYraUvK0Hr8whePmv2pASTvAFnbAEKlFb2cpYlckE8gwKlBtJmksL7jfY_kzVVP5s",
  },
  {
    id: 2,
    title: "Jazz Vibes",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCb0KFqpG1I4wVfh43CEZDTDWk1AHu_9pWQCvxwdUCYxpDbFxOutc5vhmC738lM1MuTEWuUNg7hBxN9r0extZKbJO5NRx_KVVX63xER5B362B88OIce1ZJhtfkN867RRKbbQEOu6HkuVxce0Sy0qkCMjRJC0oO9pKSxw7JArbaBj_NIt0Szd_nOHy4ZIE-ipK3qzW5vHs2lzfkcKBddAllG7_BLxJSgiU_1_jthsirCqfL6vurwAWj4_3wGnRekES_AvCrqQmC_UHs",
  },
  {
    id: 3,
    title: "Top Hits 2024",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB919xlKhoiCIKStwWCi8HU4r6VkqR9YE29iD9a3vItYl8VDayhz7u4LO74uWJSJHNWSE71rozfilY3F8CyAhZ4O-GgV2LR-vh_pQ7TlIvbFuHE8_xCOnwM7BhisKXcE3c6Au9GWL_e6Ax3L2K9yN3o71h-zRu7a1ht9n3_CLID0LH7NwI6UV15ux-OgKQyW_wjCohRUuNYh-kPuiiz03r1Qp9k_RRFVENj9uTVQEmUzfEYuEvbO6BB5GYf-SmBULTK9zXJylv_j10",
  },
];

function HomeScreen() {
  return (
    <div className="animate-in fade-in duration-700">
      <h2 className="font-headline font-bold text-3xl tracking-tight mb-8">
        Good morning
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {SHORTCUTS.map((item) => (
          <div
            key={item.id}
            className="group flex items-center bg-surface border border-white/5 hover:bg-surface-muted hover:border-white/10 rounded-md transition-all duration-300 overflow-hidden cursor-pointer"
          >
            <div className="w-16 h-16 flex-shrink-0">
              <img
                src={item.img}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="px-4 font-semibold text-sm truncate uppercase tracking-wider opacity-90">
              {item.title}
            </span>
            <button className="ml-auto mr-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 bg-primary text-background p-2 rounded-full shadow-xl">
              <span className="material-symbols-outlined text-xl fill-icon">
                play_arrow
              </span>
            </button>
          </div>
        ))}
      </div>

      <section className="mt-16">
        <div className="flex justify-between items-end mb-8">
          <h2 className="font-headline font-bold text-2xl tracking-tight">
            Made for you
          </h2>
          <span className="text-secondary font-semibold text-xs uppercase tracking-widest hover:text-primary transition-colors cursor-pointer">
            Show all
          </span>
        </div>
        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
          <div className="w-44 flex-shrink-0 group cursor-pointer">
            <div className="relative aspect-square mb-4 overflow-hidden rounded-lg">
              <img
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDXlG7gm85XOEDeF_yieOFgVOPsBEp-cwC8cjscW556q3ddHUnf_FxklbwRbmB6G7MSUckaMhRNEbILdGQLNaJAJ70pFjuE5VLPeJqzjr_Tr1YJAot1UbF1CK9Q9x5_w7_QSRJNSor6dLSqJ13tXbRJlcs7ujYWrUjQprxf_sjsEM1GN5XB2vEmcjldQkoQW6-oBOdyuwRamUzZ6CzBXCQrZipCNLGUKwgcAOW39cF95ILW0-aMcO6u6TInb0xqcrUmTz8z1_6vGY"
                alt="Mix"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
            </div>
            <h3 className="font-bold text-sm truncate tracking-wide">
              Discover Weekly
            </h3>
            <p className="text-secondary text-xs line-clamp-2 mt-1.5 leading-relaxed">
              Your weekly mixtape of fresh music.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
      const res = await axios.get(`/api/deezer/track/${trackId}/download`);

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
      if (activeTrackIdRef.current === trackId) {
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

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen />;
      case "search":
        return (
          <SearchScreen
            onPlayTrack={handlePlayTrack}
            onSelectGenre={(genre) => setActiveGenre(genre)}
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
              setIsSelectionMode(false); // Reset selection mode when changing playlist
            }}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
          />
        );
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="bg-background text-primary font-sans min-h-screen selection:bg-primary selection:text-background transition-colors duration-500">
      {/* Top AppBar */}
      <header className="flex justify-between items-center px-6 py-4 w-full glass-effect z-40 top-0 sticky">
        <div className="flex items-center gap-5">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRogVdKoRnL9eXji2r65cXf8amitFG0mGjp-nzL8HgNGdAJcMidAlyCWHKRfnluU88XmE4vu80oF9G5EIg6A5nnM-4PqZQvMOd-j2tnUipBK_Pk0svmKGhnxc4iDtJgokLHrEFR94rATG2FyE_IHO5OYWwBhNACiO1hgiOAdvhBLiCIzGcZult4LsA7pDTX2mOTe6KsHB5Rhn4wAfd5COQ4rMAeTwKpRVL-t_LNPh1YLDERa4ia6G3mYGtLsMC6wW-MJV5TGMk6UA"
              alt="Avatar"
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
            />
          </div>
          <h1 className="font-headline text-2xl font-black tracking-tighter uppercase italic">
            {activeTab === "home" ? "Home" : activeTab}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          {activeTab === "library" && activePlaylist && (
            <button
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`p-2 rounded-full transition-all duration-300 active:scale-90 ${isSelectionMode ? "bg-primary text-background" : "text-primary hover:bg-white/10"}`}
            >
              <span className="material-symbols-outlined text-2xl">
                {isSelectionMode ? "close" : "delete"}
              </span>
            </button>
          )}
          {!isSelectionMode && (
            <>
              <span className="material-symbols-outlined text-primary text-2xl opacity-60 hover:opacity-100 transition-opacity clickable">
                notifications
              </span>
              <span className="material-symbols-outlined text-primary text-2xl opacity-60 hover:opacity-100 transition-opacity clickable">
                settings
              </span>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-8 pb-40 mt-6 max-w-7xl mx-auto">
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
              className="absolute top-0 left-0 h-[1.5px] bg-primary transition-all duration-300 shadow-[0_0_10px_#fff]"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
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
                <span className="text-xs text-secondary truncate uppercase tracking-widest opacity-80 mt-0.5">
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
          hasNext={currentIndex < queue.length - 1 || repeatMode === "all"}
          hasPrev={currentIndex > 0 || currentTime > 3 || repeatMode === "all"}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 px-6 glass-effect z-50 border-t border-white/5">
        {[
          { id: "home", label: "Home", icon: "home" },
          { id: "search", label: "Search", icon: "search" },
          { id: "library", label: "Library", icon: "library_music" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center transition-all duration-300 ${activeTab === tab.id ? "text-primary scale-110" : "text-secondary hover:text-primary opacity-60 hover:opacity-100"}`}
          >
            <span
              className={`material-symbols-outlined text-2xl ${activeTab === tab.id ? "fill-icon" : ""}`}
            >
              {tab.icon}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest mt-1.5">
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

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
  );
}

export default App;
