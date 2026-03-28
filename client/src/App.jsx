import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import SearchScreen from "./screens/Search";
import LibraryScreen from "./screens/Library";
import PlayerScreen from "./screens/Player";

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
    <div className="animate-in fade-in duration-500">
      <h2 className="font-headline font-bold text-3xl tracking-tight mb-6">
        Good morning
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SHORTCUTS.map((item) => (
          <div
            key={item.id}
            className="group flex items-center bg-surface-container-low hover:bg-surface-container-high rounded-lg transition-colors overflow-hidden cursor-pointer"
          >
            <div className="w-16 h-16 flex-shrink-0">
              <img
                src={item.img}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="px-3 font-semibold text-sm truncate">
              {item.title}
            </span>
            <button className="ml-auto mr-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 bg-primary-container p-2 rounded-full shadow-lg">
              <span className="material-symbols-outlined text-on-primary text-xl fill-icon">
                play_arrow
              </span>
            </button>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <div className="flex justify-between items-end mb-6">
          <h2 className="font-headline font-bold text-2xl tracking-tight">
            Made for you
          </h2>
          <span className="text-on-surface-variant font-semibold text-sm hover:underline cursor-pointer">
            Show all
          </span>
        </div>
        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
          <div className="w-40 flex-shrink-0 group cursor-pointer">
            <div className="relative aspect-square mb-3">
              <img
                className="w-full h-full object-cover rounded-xl"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDXlG7gm85XOEDeF_yieOFgVOPsBEp-cwC8cjscW556q3ddHUnf_FxklbwRbmB6G7MSUckaMhRNEbILdGQLNaJAJ70pFjuE5VLPeJqzjr_Tr1YJAot1UbF1CK9Q9x5_w7_QSRJNSor6dLSqJ13tXbRJlcs7ujYWrUjQprxf_sjsEM1GN5XB2vEmcjldQkoQW6-oBOdyuwRamUzZ6CzBXCQrZipCNLGUKwgcAOW39cF95ILW0-aMcO6u6TInb0xqcrUmTz8z1_6vGY"
                alt="Mix"
              />
            </div>
            <h3 className="font-bold text-sm truncate">Discover Weekly</h3>
            <p className="text-on-surface-variant text-xs line-clamp-2 mt-1">
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
  // Global Axios Configuration for timeouts (Spotiwoop scraping can take time)
  axios.defaults.timeout = 20000;

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  const [likedTrackIds, setLikedTrackIds] = useState(new Set());
  const [playlists, setPlaylists] = useState([]);

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

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handlePlayTrack = async (track) => {
    const trackId = track.id.toString();
    activeTrackIdRef.current = trackId; // marquer ce morceau comme "actif"

    // Afficher le morceau tout de suite dans l'UI (sans jouer)
    setCurrentTrack({ ...track, preview: null, isFull: false });
    setIsPlaying(false);
    setIsLoadingTrack(true);
    setCurrentTime(0);

    // Vider la source audio immédiatement pour couper le son précédent
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
    }

    // Récupérer le lien complet Spotiwoop avant de jouer
    try {
      console.log(`[player] Fetching full stream for ${trackId}...`);
      const res = await axios.get(`/api/deezer/track/${trackId}/download`);

      // Si un autre morceau a été demandé entre temps, on abandonne
      if (activeTrackIdRef.current !== trackId) return;

      if (res.data?.target?.link) {
        console.log(`[player] Full stream ready: ${res.data.target.link}`);
        setCurrentTrack((prev) => {
          if (prev?.id?.toString() === trackId) {
            return { ...prev, preview: res.data.target.link, isFull: true };
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

  const handleAddToPlaylist = async (playlistId, track) => {
    try {
      await axios.post(`/api/playlists/${playlistId}/tracks`, track);
      alert("Added to playlist!");
    } catch (err) {
      console.error("Failed to add to playlist", err);
      alert("Error adding to playlist.");
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
        return <SearchScreen onPlayTrack={handlePlayTrack} />;
      case "library":
        return <LibraryScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen">
      {/* Top AppBar */}
      <header className="flex justify-between items-center px-4 py-3 w-full bg-[#131313]/90 backdrop-blur-xl z-40 top-0 sticky">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRogVdKoRnL9eXji2r65cXf8amitFG0mGjp-nzL8HgNGdAJcMidAlyCWHKRfnluU88XmE4vu80oF9G5EIg6A5nnM-4PqZQvMOd-j2tnUipBK_Pk0svmKGhnxc4iDtJgokLHrEFR94rATG2FyE_IHO5OYWwBhNACiO1hgiOAdvhBLiCIzGcZult4LsA7pDTX2mOTe6KsHB5Rhn4wAfd5COQ4rMAeTwKpRVL-t_LNPh1YLDERa4ia6G3mYGtLsMC6wW-MJV5TGMk6UA"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="font-plus-jakarta-sans text-2xl font-bold tracking-tight text-[#1DB954]">
            {activeTab === "home"
              ? "For You"
              : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-on-surface text-2xl clickable">
            notifications
          </span>
          <span className="material-symbols-outlined text-on-surface text-2xl clickable">
            settings
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-8 pb-40 mt-6 max-w-7xl mx-auto">
        {activeTab === "home" && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8">
            {["All", "Music", "Podcasts"].map((filter, i) => (
              <span
                key={filter}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${i === 0 ? "bg-primary text-on-primary" : "bg-surface-container-high text-white hover:bg-surface-bright"}`}
              >
                {filter}
              </span>
            ))}
          </div>
        )}
        {renderContent()}
      </main>

      {/* Global Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.preview}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Mini Player - Only shown when a track is selected */}
      {currentTrack && (
        <div
          className="fixed bottom-20 left-2 right-2 md:left-4 md:right-4 z-50 transition-all duration-300 cursor-pointer"
          onClick={() => setShowFullPlayer(true)}
        >
          <div className="glass-effect rounded-lg p-2 flex items-center justify-between shadow-2xl relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-[2px] bg-primary transition-all duration-100"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            ></div>
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                className="w-10 h-10 rounded-lg flex-shrink-0"
                src={
                  currentTrack.album?.cover_medium ||
                  currentTrack.album?.cover_small
                }
                alt={currentTrack.title}
              />
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold text-white truncate">
                  {currentTrack.title}
                </span>
                <span className="text-xs text-on-surface-variant truncate">
                  {currentTrack.artist?.name || currentTrack.artist}
                </span>
              </div>
            </div>
            <div
              className="flex items-center gap-4 px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined text-on-surface hover:text-primary transition-colors cursor-pointer">
                devices
              </span>
              <span
                className={`material-symbols-outlined transition-all cursor-pointer ${likedTrackIds.has(currentTrack.id?.toString()) ? "text-primary fill-icon scale-110" : "text-on-surface-variant"}`}
                onClick={() => toggleLike(currentTrack)}
              >
                favorite
              </span>
              <div className="relative flex items-center justify-center">
                {/* Spinner ring - visible only while loading */}
                {isLoadingTrack && (
                  <svg
                    className="absolute inset-0 w-full h-full animate-spin"
                    viewBox="0 0 36 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="#1DB954"
                      strokeWidth="3"
                      strokeDasharray="60 40"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                <button
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all ${isLoadingTrack ? "bg-white/30" : "bg-white"}`}
                  onClick={togglePlay}
                  disabled={isLoadingTrack}
                >
                  <span className="material-symbols-outlined text-black fill-icon text-base">
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
          onTogglePlay={togglePlay}
          onToggleLike={() => toggleLike(currentTrack)}
          onAddToPlaylist={handleAddToPlaylist}
          onSeek={handleSeek}
          onClose={() => setShowFullPlayer(false)}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-2 pb-6 px-4 backdrop-blur-md bg-[#201F1F]/70 z-50 rounded-t-xl shadow-2xl shadow-black">
        {[
          { id: "home", label: "Home", icon: "home" },
          { id: "search", label: "Search", icon: "search" },
          { id: "library", label: "Your Library", icon: "library_music" },
          { id: "premium", label: "Premium", icon: "workspace_premium" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.id !== "premium" && setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center transition-all duration-200 ${activeTab === tab.id ? "text-white scale-105" : "text-[#BCCBB9] opacity-70 hover:opacity-100 active:scale-90"}`}
          >
            <span
              className={`material-symbols-outlined ${activeTab === tab.id ? "fill-icon" : ""}`}
            >
              {tab.icon}
            </span>
            <span className="font-plus-jakarta-sans text-[10px] font-medium mt-1">
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
