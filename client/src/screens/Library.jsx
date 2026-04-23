import React, { useState, useEffect } from "react";
import axios from "axios";
import PlaylistView from "./PlaylistView";

function LibraryScreen({
  onPlayTrack,
  handlePlayContext,
  currentTrack,
  isPlaying,
  openCreatePlaylistModal,
  activePlaylist,
  setActivePlaylist,
  isSelectionMode,
  setIsSelectionMode,
}) {
  const [playlists, setPlaylists] = useState([]);
  const [likedCount, setLikedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const [pRes, lRes] = await Promise.all([
          axios.get("/api/playlists"),
          axios.get("/api/me/library"),
        ]);
        setPlaylists(pRes.data);
        setLikedCount(lRes.data.length);
      } catch (err) {
        console.error("Failed to fetch library", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, [activePlaylist]); // Re-fetch quand on revient pour maj les compteurs

  if (activePlaylist) {
    return (
      <PlaylistView
        playlist={activePlaylist}
        onBack={() => setActivePlaylist(null)}
        onPlayTrack={onPlayTrack}
        handlePlayContext={handlePlayContext}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        isSelectionMode={isSelectionMode}
        setIsSelectionMode={setIsSelectionMode}
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      {/* Filter Chips */}
      <div className="sticky top-[72px] bg-background/80 backdrop-blur-xl z-30 flex gap-3 overflow-x-auto no-scrollbar pb-6 mb-6">
        <button className="px-5 py-2 rounded-md bg-primary text-background font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
          Playlists
        </button>
        {["Artists", "Albums", "Podcasts"].map((filter) => (
          <button
            key={filter}
            className="px-5 py-2 rounded-md bg-surface text-secondary border border-white/5 font-black text-[10px] uppercase tracking-widest hover:border-white/20 hover:text-primary active:scale-95 transition-all"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Sorting */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3 text-secondary opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
          <span className="material-symbols-outlined text-lg">swap_vert</span>
          <span className="font-black text-[10px] uppercase tracking-[0.2em]">
            Recents
          </span>
        </div>
        <button className="text-secondary opacity-60 hover:opacity-100">
          <span className="material-symbols-outlined text-xl">grid_view</span>
        </button>
      </div>

      {/* Library List */}
      <div className="grid grid-cols-1 gap-2">
        {/* Liked Songs Card */}
        <div
          onClick={() =>
            setActivePlaylist({ id: "liked", name: "Liked Songs" })
          }
          className="flex items-center gap-5 group cursor-pointer hover:bg-white/5 p-3 -mx-3 rounded-md transition-all duration-300"
        >
          <div className="w-16 h-16 rounded-sm bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 flex items-center justify-center relative shadow-xl overflow-hidden shadow-black">
            <span className="material-symbols-outlined text-primary text-3xl fill-icon">
              favorite
            </span>
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <h3 className="font-bold text-base text-primary truncate tracking-tight">
              Liked Songs
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-primary text-[10px] opacity-70">
                push_pin
              </span>
              <p className="font-black text-[10px] opacity-60 uppercase tracking-widest text-secondary truncate">
                Playlist • {likedCount} tracks
              </p>
            </div>
          </div>
        </div>

        {/* Offline Downloads Card */}
        <div
          onClick={() =>
            setActivePlaylist({ id: "downloads", name: "Offline Downloads" })
          }
          className="flex items-center gap-5 group cursor-pointer hover:bg-white/5 p-3 -mx-3 rounded-md transition-all duration-300"
        >
          <div className="w-16 h-16 rounded-sm bg-background border border-white/10 flex items-center justify-center relative shadow-xl overflow-hidden shadow-black">
            <span className="material-symbols-outlined text-primary text-3xl">
              download_done
            </span>
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <h3 className="font-bold text-base text-primary truncate tracking-tight">
              Offline Downloads
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-primary text-[10px] opacity-70">
                offline_pin
              </span>
              <p className="font-black text-[10px] opacity-60 uppercase tracking-widest text-secondary truncate">
                Local Archive
              </p>
            </div>
          </div>
        </div>

        {/* Real Playlists from BDD */}
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            onClick={() => setActivePlaylist(playlist)}
            className="flex items-center gap-5 group cursor-pointer hover:bg-white/5 p-3 -mx-3 rounded-md transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-sm bg-surface border border-white/5 flex items-center justify-center shadow-lg shadow-black/40">
              <span className="material-symbols-outlined text-secondary text-3xl">
                music_note
              </span>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <h3 className="font-bold text-base text-primary truncate tracking-tight">
                {playlist.name}
              </h3>
              <p className="font-black text-[10px] opacity-60 uppercase tracking-widest text-secondary truncate mt-1">
                Playlist • Spotiwoop
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-center py-10">
            <div className="inline-block w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}

        {!loading && playlists.length === 0 && (
          <div className="text-center py-12 px-6 bg-surface border border-dashed border-white/10 rounded-md">
            <p className="text-secondary text-[10px] uppercase font-black tracking-[0.2em] opacity-50">
              Collection is empty
            </p>
          </div>
        )}

        {/* Add Button */}
        <div
          onClick={openCreatePlaylistModal}
          className="flex items-center gap-5 group cursor-pointer p-3 -mx-3 rounded-md hover:bg-white/5 transition-all duration-300"
        >
          <div className="w-16 h-16 rounded-sm bg-surface border border-dashed border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
            <span className="material-symbols-outlined text-secondary text-3xl group-hover:text-primary transition-colors">
              add
            </span>
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="font-black text-[10px] uppercase tracking-[0.4em] text-secondary group-hover:text-primary transition-colors">
              Create Playlist
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LibraryScreen;
