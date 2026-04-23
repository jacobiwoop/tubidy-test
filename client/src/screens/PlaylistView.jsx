import React, { useState, useEffect } from "react";
import axios from "axios";

function PlaylistView({
  playlist,
  onBack,
  onPlayTrack,
  handlePlayContext,
  currentTrack,
  isPlaying,
  isSelectionMode,
  setIsSelectionMode,
}) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      if (playlist.id === "downloads") {
        const { getDownloadedTracks } = await import("../utils/offlineDb.js");
        const localTracks = await getDownloadedTracks();
        setTracks(localTracks || []);
      } else {
        let url =
          playlist.id === "liked"
            ? "/api/me/library"
            : `/api/playlists/${playlist.id}`;
        const res = await axios.get(url);
        const tracksData = playlist.id === "liked" ? res.data : res.data.tracks;
        setTracks(tracksData || []);
      }
    } catch (err) {
      console.error("Failed to fetch tracks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [playlist.id]);

  const handleTrackClick = (track) => {
    if (isSelectionMode) {
      toggleSelection(track.id);
    } else {
      if (handlePlayContext) {
        handlePlayContext(track, tracks);
      } else {
        onPlayTrack(track);
      }
    }
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteConfirmed = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Supprimer ${selectedIds.size} titres ?`)) return;

    setIsDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);

      if (playlist.id === "downloads") {
        // Suppression locale (IDB + Cache)
        const { deleteDownloadedTrack } = await import("../utils/offlineDb.js");
        const { removeCachedAudio } = await import("../utils/audioCache.js");

        for (const track of tracks) {
          if (selectedIds.has(track.id)) {
            await deleteDownloadedTrack(track.id);
            if (track.preview) await removeCachedAudio(track.preview);
          }
        }
      } else if (playlist.id === "liked") {
        // Suppression des favoris (un par un car l'API library est simple)
        await Promise.all(
          idsArray.map((id) => axios.delete(`/api/me/library/like/${id}`)),
        );
      } else {
        // Suppression d'une playlist custom (Vrac supporté par notre nouvelle route)
        await axios.delete(`/api/playlists/${playlist.id}/tracks`, {
          data: { trackIds: idsArray },
        });
      }

      // Refresh list
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      await fetchTracks();
    } catch (err) {
      console.error("Deletion failed", err);
      alert("Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      {/* Immersive Hero Header */}
      <div className="relative -mx-8 -mt-10 mb-12 h-[350px] md:h-[450px] overflow-hidden">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <div className={`absolute inset-0 blur-[100px] opacity-40 scale-125 ${playlist.id === 'liked' ? 'bg-gradient-to-br from-primary/40 to-blue-900/40' : 'bg-surface'}`}></div>
          {tracks.length > 0 && (
            <img 
               src={tracks[0].album?.cover_big || tracks[0].cover_url} 
               className="w-full h-full object-cover blur-[80px] opacity-30"
               alt=""
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background"></div>
        </div>

        {/* Header content */}
        <div className="relative z-10 h-full flex flex-col justify-end px-8 pb-10 container mx-auto">
          <div className="flex items-center gap-4 mb-8">
             <button
              onClick={onBack}
              className="p-3 bg-white/5 border border-white/5 rounded-full hover:border-white/20 transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-primary text-2xl">
                arrow_back
              </span>
            </button>
            <h2 className="font-black text-[10px] uppercase tracking-[0.4em] text-secondary opacity-60">
              Back to library
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-end gap-8">
            <div className={`w-40 h-40 md:w-56 md:h-56 rounded-sm shadow-[0_40px_100px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden flex-shrink-0 ${playlist.id === "liked" ? "bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10" : "bg-surface border border-white/5"}`}>
              {playlist.id === "liked" ? (
                <span className="material-symbols-outlined text-primary text-7xl fill-icon">
                  favorite
                </span>
              ) : (
                <span className="material-symbols-outlined text-secondary text-7xl">
                  music_note
                </span>
              )}
            </div>
            
            <div className="flex-1 space-y-3">
              <p className="font-black text-xs uppercase tracking-[0.5em] text-primary">
                {playlist.id === "liked" ? "Collection" : "Playlist"}
              </p>
              <h1 className="font-headline text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.85]">
                {playlist.name}
              </h1>
              <div className="flex items-center gap-4 mt-6">
                <p className="font-black text-[10px] uppercase tracking-[0.2em] text-secondary">
                   {tracks.length} tracks
                </p>
                <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                <p className="font-black text-[10px] uppercase tracking-[0.2em] text-secondary">
                   Spotiwoop
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-10 px-1">
        <div className="flex items-center gap-6">
           <button 
             className="w-16 h-16 rounded-full bg-primary text-background flex items-center justify-center shadow-xl shadow-primary/10 hover:scale-105 active:scale-95 transition-all"
             onClick={() => tracks.length > 0 && handleTrackClick(tracks[0])}
            >
             <span className="material-symbols-outlined text-4xl fill-icon ml-1">play_arrow</span>
           </button>
           
           <button className="text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-3xl">download_for_offline</span>
           </button>
        </div>

        {isSelectionMode && (
          <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-500">
            <span className="font-black text-[10px] uppercase tracking-widest text-primary">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleDeleteConfirmed}
              disabled={selectedIds.size === 0 || isDeleting}
              className={`flex items-center gap-3 px-6 py-3 rounded-md font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border ${selectedIds.size > 0 ? "bg-white text-background border-white" : "border-white/5 text-secondary opacity-30"}`}
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-lg">delete</span>
              )}
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Tracks List */}
      <div className="space-y-1">
        {loading ? (
          <div className="space-y-1">
             {[...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-md animate-pulse"></div>
             ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-20 text-secondary font-black text-[10px] uppercase tracking-widest opacity-40">
            This collection is empty
          </div>
        ) : (
          tracks.map((track, index) => {
            const isCurrent =
              currentTrack?.id?.toString() === track.id?.toString();
            const isSelected = selectedIds.has(track.id);

            return (
              <div
                key={track.id}
                onClick={() => handleTrackClick(track)}
                className={`flex items-center gap-5 p-3 -mx-3 rounded-md cursor-pointer transition-all duration-300 group ${isSelected ? "bg-white/10" : isCurrent ? "bg-white/5" : "hover:bg-white/5"}`}
              >
                {/* Selection Indicator or Index */}
                <div className="w-8 flex items-center justify-center">
                  {isSelectionMode ? (
                    <div
                      className={`w-5 h-5 rounded-sm border-2 transition-all flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-white/10"}`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-background text-xs font-black">
                          check
                        </span>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`text-[10px] font-black uppercase tracking-tighter ${isCurrent ? "text-primary" : "text-secondary opacity-40 group-hover:opacity-100"}`}
                    >
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-3">
                          <div className="w-0.5 bg-primary animate-[music-bar_0.6s_ease-in-out_infinite] h-full"></div>
                          <div className="w-0.5 bg-primary animate-[music-bar_0.8s_ease-in-out_infinite] h-2/3"></div>
                          <div className="w-0.5 bg-primary animate-[music-bar_0.5s_ease-in-out_infinite] h-1/2"></div>
                        </div>
                      ) : (
                        String(index + 1).padStart(2, '0')
                      )}
                    </span>
                  )}
                </div>

                <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                      src={
                        track.album?.cover_small ||
                        track.album?.cover_medium ||
                        track.cover_url ||
                        "https://e-cdns-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg"
                      }
                      alt={track.title}
                      className="w-full h-full rounded-sm shadow-lg object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                </div>

                <div className="flex flex-col flex-1 overflow-hidden">
                  <h4
                    className={`font-bold text-sm truncate tracking-tight ${isCurrent ? "text-primary" : "text-primary"}`}
                  >
                    {track.title}
                  </h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary truncate mt-1 opacity-60">
                    {track.artist?.name || track.artist}
                  </p>
                </div>

                {!isSelectionMode && (
                  <button className="p-2 text-secondary opacity-0 group-hover:opacity-100 hover:text-primary transition-all">
                    <span className="material-symbols-outlined text-xl">
                      more_vert
                    </span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PlaylistView;
