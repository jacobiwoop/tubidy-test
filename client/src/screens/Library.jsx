import React, { useState, useEffect } from "react";
import axios from "axios";
import PlaylistView from "./PlaylistView";

function LibraryScreen({
  onPlayTrack,
  handlePlayContext,
  currentTrack,
  isPlaying,
  openCreatePlaylistModal,
}) {
  const [playlists, setPlaylists] = useState([]);
  const [likedCount, setLikedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activePlaylist, setActivePlaylist] = useState(null);

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
      />
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500 pb-20">
      {/* Filter Chips */}
      <div className="sticky top-[60px] bg-surface/90 backdrop-blur-md z-30 flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
        <button className="px-4 py-1.5 rounded-full bg-primary text-on-primary font-body font-semibold text-sm whitespace-nowrap active:scale-95 transition-all">
          Playlists
        </button>
        {["Artists", "Albums", "Podcasts"].map((filter) => (
          <button
            key={filter}
            className="px-4 py-1.5 rounded-full bg-surface-container-high text-on-surface font-body font-medium text-sm whitespace-nowrap hover:bg-surface-bright active:scale-95 transition-all"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Sorting */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-lg">swap_vert</span>
          <span className="font-label text-sm font-medium">Recents</span>
        </div>
        <button className="text-on-surface-variant">
          <span className="material-symbols-outlined text-lg">grid_view</span>
        </button>
      </div>

      {/* Library List */}
      <div className="flex flex-col gap-2">
        {/* Liked Songs Card */}
        <div
          onClick={() =>
            setActivePlaylist({ id: "liked", name: "Liked Songs" })
          }
          className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all active:scale-95"
        >
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center relative shadow-lg overflow-hidden">
            <span className="material-symbols-outlined text-white text-3xl fill-icon">
              favorite
            </span>
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <h3 className="font-body font-semibold text-base text-white truncate">
              Liked Songs
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-xs fill-icon">
                push_pin
              </span>
              <p className="font-label text-sm text-on-surface-variant truncate">
                Playlist • {likedCount} songs
              </p>
            </div>
          </div>
        </div>

        {/* Offline Downloads Card */}
        <div
          onClick={() =>
            setActivePlaylist({ id: "downloads", name: "Offline Downloads" })
          }
          className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all active:scale-95"
        >
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#1DB954] to-[#450af5] flex items-center justify-center relative shadow-lg overflow-hidden">
            <span className="material-symbols-outlined text-white text-3xl fill-icon">
              download_done
            </span>
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <h3 className="font-body font-semibold text-base text-white truncate">
              Offline Downloads
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-xs fill-icon">
                offline_pin
              </span>
              <p className="font-label text-sm text-on-surface-variant truncate">
                Local Storage
              </p>
            </div>
          </div>
        </div>

        {/* Real Playlists from BDD */}
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            onClick={() => setActivePlaylist(playlist)}
            className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all active:scale-95"
          >
            <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-on-surface-variant text-3xl">
                music_note
              </span>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <h3 className="font-body font-semibold text-base text-on-surface truncate">
                {playlist.name}
              </h3>
              <p className="font-label text-sm text-on-surface-variant truncate">
                Playlist • Spotiwoop
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-center py-4 text-on-surface-variant">
            Loading library...
          </div>
        )}

        {!loading && playlists.length === 0 && (
          <div className="text-center py-8 px-4 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant">
            <p className="text-on-surface-variant text-sm italic">
              No playlists yet. Create one to start your collection!
            </p>
          </div>
        )}

        {/* Add Button */}
        <div
          onClick={openCreatePlaylistModal}
          className="flex items-center gap-4 group cursor-pointer py-2 hover:bg-white/5 p-2 -mx-2 rounded-xl active:scale-95 transition-all"
        >
          <div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-3xl group-hover:text-white transition-colors">
              add
            </span>
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="font-body font-semibold text-base text-on-surface group-hover:text-white transition-colors">
              Create Playlist
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LibraryScreen;
