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
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      {/* Header / Back Navigation */}
      <div className="sticky top-0 bg-surface/90 backdrop-blur-md z-40 flex items-center justify-between p-4 -mx-4 mb-4">
        <div className="flex items-center flex-1 overflow-hidden">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full transition-colors active:scale-90"
          >
            <span className="material-symbols-outlined text-2xl text-on-surface">
              arrow_back
            </span>
          </button>
          <h2 className="ml-4 font-headline font-bold text-lg truncate text-on-surface">
            {playlist.name}
          </h2>
        </div>

        {isSelectionMode && (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
            <span className="text-sm font-bold text-primary mr-2">
              {selectedIds.size} sélectionné(s)
            </span>
            <button
              onClick={handleDeleteConfirmed}
              disabled={selectedIds.size === 0 || isDeleting}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm transition-all active:scale-95 ${selectedIds.size > 0 ? "bg-error text-on-error shadow-lg" : "bg-white/10 text-on-surface-variant opacity-50"}`}
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-sm">
                  delete
                </span>
              )}
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="flex flex-col items-center text-center mb-8 pt-4">
        <div
          className={`w-48 h-48 rounded-2xl shadow-2xl mb-6 flex items-center justify-center overflow-hidden ${playlist.id === "liked" ? "bg-gradient-to-br from-[#450af5] to-[#c4efd9]" : "bg-surface-container-high"}`}
        >
          {playlist.id === "liked" ? (
            <span className="material-symbols-outlined text-white text-6xl fill-icon">
              favorite
            </span>
          ) : (
            <span className="material-symbols-outlined text-on-surface-variant text-6xl">
              music_note
            </span>
          )}
        </div>
        <h1 className="font-headline text-3xl font-extrabold mb-2 text-on-surface text-stroke-sm">
          {playlist.name}
        </h1>
        <p className="font-label text-on-surface-variant uppercase tracking-widest text-xs font-bold">
          {playlist.id === "liked"
            ? "Your Personal Collection"
            : "Spotiwoop Playlist"}{" "}
          • {tracks.length} TITRES
        </p>
      </div>

      {/* Tracks List */}
      <div className="space-y-1">
        {loading ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-on-surface-variant text-sm">Loading tracks...</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant italic">
            Cette playlist est vide.
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
                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${isSelected ? "bg-error/10" : isCurrent ? "bg-primary/10" : "hover:bg-white/5"}`}
              >
                {/* Selection Indicator or Index */}
                <div className="w-6 flex items-center justify-center">
                  {isSelectionMode ? (
                    <div
                      className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${isSelected ? "bg-error border-error" : "border-on-surface-variant"}`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-white text-xs font-bold">
                          check
                        </span>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`font-label text-sm text-center ${isCurrent ? "text-primary font-bold" : "text-on-surface-variant"}`}
                    >
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-3">
                          <div className="w-0.5 bg-primary animate-[music-bar_0.6s_ease-in-out_infinite] h-full"></div>
                          <div className="w-0.5 bg-primary animate-[music-bar_0.8s_ease-in-out_infinite] h-2/3"></div>
                          <div className="w-0.5 bg-primary animate-[music-bar_0.5s_ease-in-out_infinite] h-1/2"></div>
                        </div>
                      ) : (
                        index + 1
                      )}
                    </span>
                  )}
                </div>

                <img
                  src={
                    track.album?.cover_small ||
                    track.album?.cover_medium ||
                    track.cover_url ||
                    "https://e-cdns-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg"
                  }
                  alt={track.title}
                  className="w-12 h-12 rounded-md shadow-md bg-surface-container-high object-cover flex-shrink-0"
                  onError={(e) => {
                    e.target.src =
                      "https://e-cdns-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg";
                  }}
                />

                <div className="flex flex-col flex-1 overflow-hidden">
                  <h4
                    className={`font-body font-semibold text-sm truncate ${isCurrent ? "text-primary" : "text-on-surface"}`}
                  >
                    {track.title}
                  </h4>
                  <p className="font-label text-xs text-on-surface-variant truncate">
                    {track.artist?.name || track.artist}
                  </p>
                </div>

                {!isSelectionMode && (
                  <button className="p-2 text-on-surface-variant hover:text-white">
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
