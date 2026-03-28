import React, { useState, useEffect } from "react";
import axios from "axios";

function PlaylistView({
  playlist,
  onBack,
  onPlayTrack,
  handlePlayContext,
  currentTrack,
  isPlaying,
}) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracks = async () => {
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
          // La structure de retour diffère entre library et playlist/:id
          const tracksData =
            playlist.id === "liked" ? res.data : res.data.tracks;
          setTracks(tracksData || []);
        }
      } catch (err) {
        console.error("Failed to fetch tracks", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTracks();
  }, [playlist.id]);

  const handleTrackClick = (track) => {
    if (handlePlayContext) {
      handlePlayContext(track, tracks);
    } else {
      onPlayTrack(track);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      {/* Header / Back Navigation */}
      <div className="sticky top-0 bg-surface/90 backdrop-blur-md z-40 flex items-center p-4 -mx-4 mb-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/5 rounded-full transition-colors active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h2 className="ml-4 font-headline font-bold text-lg truncate">
          {playlist.name}
        </h2>
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
        <h1 className="font-headline text-3xl font-extrabold mb-2">
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
            return (
              <div
                key={track.id}
                onClick={() => handleTrackClick(track)}
                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${isCurrent ? "bg-primary/10" : "hover:bg-white/5"}`}
              >
                <span
                  className={`w-5 font-label text-sm text-center ${isCurrent ? "text-primary font-bold" : "text-on-surface-variant"}`}
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

                <button className="p-2 text-on-surface-variant hover:text-white">
                  <span className="material-symbols-outlined text-xl">
                    more_vert
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PlaylistView;
