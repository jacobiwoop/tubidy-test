import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  saveTrackMetadata,
  removeTrackMetadata,
  isTrackDownloaded,
} from "../utils/offlineDb";
import {
  cacheAudioFile,
  removeCachedAudio,
  isAudioCached,
} from "../utils/audioCache";

function PlayerScreen({
  track,
  onClose,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  isLiked,
  onToggleLike,
  playlists = [],
  onAddToPlaylist,
  isLoadingTrack,
  isShuffle,
  repeatMode,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleRepeat,
  onOpenPlaylistModal,
  hasNext,
  hasPrev,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);

  // States pour le téléchargement hors-ligne (PWA Cache)
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (track) {
      Promise.all([
        isTrackDownloaded(track.id),
        isAudioCached(track.preview),
      ]).then(([inDb, inCache]) => {
        if (mounted) setIsOfflineSaved(inDb && inCache);
      });
    }
    return () => (mounted = false);
  }, [track]);

  const handleOfflineAction = async () => {
    if (!track.preview) {
      alert("Le flux audio n'est pas encore prêt. Patiente une seconde...");
      return;
    }

    setIsSavingOffline(true);
    setDownloadProgress(0);
    try {
      if (isOfflineSaved) {
        await removeTrackMetadata(track.id);
        await removeCachedAudio(track.preview);
        setIsOfflineSaved(false);
      } else {
        const success = await cacheAudioFile(track.preview, (progress) => {
          setDownloadProgress(progress);
        });
        if (success) {
          await saveTrackMetadata(track);
          setIsOfflineSaved(true);
        } else {
          alert("Erreur lors du téléchargement de l'audio.");
        }
      }
    } finally {
      setIsSavingOffline(false);
      setDownloadProgress(0);
    }
  };

  if (!track) return null;

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = (x / rect.width) * duration;
    onSeek(clickedTime);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`/api/deezer/track/${track.id}/download`);
      if (res.data?.target?.link) {
        // Create an anchor element to trigger download
        const link = document.createElement("a");
        link.href = res.data.target.link;
        link.setAttribute("download", `${track.title}.mp3`);
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Download failed", err);
      alert("Error fetching download link. Please try again.");
    } finally {
      setDownloading(false);
      setShowMenu(false);
      setShowPlaylists(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-surface z-[100] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-y-auto no-scrollbar">
      {/* Background Layer */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/30 to-surface z-0"></div>
      <div className="fixed inset-0 backdrop-blur-3xl z-0 bg-surface/40"></div>

      {/* Actions Menu Overlay */}
      {showMenu && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setShowMenu(false);
            setShowPlaylists(false);
          }}
        >
          <div
            className="absolute bottom-0 left-0 w-full bg-[#181818] rounded-t-3xl p-6 space-y-2 animate-in slide-in-from-bottom-full duration-300 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-surface-container-highest rounded-full mx-auto mb-8 opacity-50"></div>

            {!showPlaylists ? (
              <>
                <div
                  className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                  onClick={() => {
                    onToggleLike();
                    setShowMenu(false);
                  }}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${isLiked ? "text-primary fill-icon" : "text-on-surface"}`}
                  >
                    favorite
                  </span>
                  <span className="font-semibold">
                    {isLiked ? "Remove from Liked" : "Add to Liked"}
                  </span>
                </div>

                <div
                  className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                  onClick={() => setShowPlaylists(true)}
                >
                  <span className="material-symbols-outlined text-2xl text-on-surface">
                    playlist_add
                  </span>
                  <span className="font-semibold">Add to Playlist</span>
                </div>

                <div
                  className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                  onClick={handleDownload}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${downloading ? "text-primary animate-pulse" : "text-on-surface"}`}
                  >
                    {downloading ? "downloading" : "download"}
                  </span>
                  <span className="font-semibold">
                    {downloading ? "Preparing link..." : "Download MP3"}
                  </span>
                </div>

                <button
                  className="w-full py-4 mt-4 font-bold text-on-surface-variant hover:text-white transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              // Playlists View
              <div className="flex flex-col max-h-[50vh]">
                <div className="flex items-center mb-4 pb-2 border-b border-white/10">
                  <button
                    onClick={() => setShowPlaylists(false)}
                    className="p-2 mr-2 hover:bg-white/5 rounded-full transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-2xl text-on-surface">
                      arrow_back
                    </span>
                  </button>
                  <h3 className="font-headline font-bold text-xl">
                    Select Playlist
                  </h3>
                </div>

                <div className="overflow-y-auto space-y-2 pr-2 no-scrollbar">
                  {playlists.length === 0 ? (
                    <p className="text-on-surface-variant text-center py-8">
                      No playlists available.
                    </p>
                  ) : (
                    playlists.map((pl) => (
                      <div
                        key={pl.id}
                        className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                        onClick={() => {
                          if (onAddToPlaylist) {
                            onAddToPlaylist(pl.id, track);
                          }
                          setShowPlaylists(false);
                          setShowMenu(false);
                        }}
                      >
                        <div className="w-12 h-12 bg-surface-container-highest rounded-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-on-surface-variant">
                            queue_music
                          </span>
                        </div>
                        <span className="font-semibold flex-1 truncate">
                          {pl.name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="relative z-10 flex flex-col min-h-full max-w-lg mx-auto px-6 pt-4 pb-8 md:max-w-4xl md:px-12 md:flex-row md:items-center md:gap-16">
        {/* Header (Mobile) */}
        <header className="w-full flex justify-between items-center mb-4 md:hidden">
          <button
            className="p-2 transition-transform active:scale-90"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-on-surface text-3xl">
              expand_more
            </span>
          </button>
          <div className="text-center overflow-hidden">
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
              Playing from search
            </p>
            <h1 className="font-headline text-sm font-bold truncate max-w-[150px]">
              {track.title}
            </h1>
          </div>
          <button
            className="p-2 transition-transform active:scale-90"
            onClick={() => setShowMenu(true)}
          >
            <span className="material-symbols-outlined text-on-surface">
              more_vert
            </span>
          </button>
        </header>

        {/* Album Art */}
        <section className="flex-grow flex items-center justify-center mb-6 md:mb-0">
          <div className="relative w-full aspect-square max-w-[320px] md:max-w-[400px] group">
            <img
              className="w-full h-full object-cover rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-[1.02] bg-surface-container-high"
              src={
                track.album?.cover_big ||
                track.album?.cover_medium ||
                track.cover_url ||
                "https://e-cdns-images.dzcdn.net/images/cover//500x500-000000-80-0-0.jpg"
              }
              alt={track.title}
              onError={(e) => {
                e.target.src =
                  "https://e-cdns-images.dzcdn.net/images/cover//500x500-000000-80-0-0.jpg";
              }}
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/10 pointer-events-none"></div>
          </div>
        </section>

        {/* Controls & Metadata */}
        <section className="flex-shrink-0 flex flex-col justify-center w-full">
          <div className="flex justify-between items-end mb-4">
            <div className="space-y-0.5 overflow-hidden flex-1">
              <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight truncate">
                {track.title}
              </h2>
              <p className="font-body text-base md:text-lg text-on-surface-variant font-medium truncate">
                {track.artist?.name || track.artist}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                className={`transition-all active:scale-125 p-2 relative ${isOfflineSaved ? "text-[#1DB954]" : "text-on-surface-variant"}`}
                onClick={handleOfflineAction}
              >
                <span
                  className={`material-symbols-outlined text-3xl ${isSavingOffline ? "animate-pulse" : ""} ${isOfflineSaved ? "fill-icon" : ""}`}
                >
                  {isSavingOffline ? "downloading" : "download_for_offline"}
                </span>
                {isSavingOffline && downloadProgress > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-black text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                    {downloadProgress}
                  </span>
                )}
              </button>
              <button
                className={`transition-all active:scale-125 p-2 ${isLiked ? "text-primary" : "text-on-surface-variant"}`}
                onClick={onOpenPlaylistModal}
              >
                <span
                  className={`material-symbols-outlined text-3xl ${isLiked ? "fill-icon" : ""}`}
                >
                  favorite
                </span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-2 mb-6">
            <div
              className="relative w-full h-1.5 bg-surface-container-highest rounded-full group cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="absolute top-0 left-0 h-full bg-primary rounded-full"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              >
                <div className="absolute -right-2 -top-1.5 w-4.5 h-4.5 bg-on-surface rounded-full shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>
            <div className="flex justify-between font-label text-[10px] text-on-surface-variant font-semibold">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between mb-8 px-2">
            <button
              className={`transition-colors active:scale-95 ${isShuffle ? "text-primary" : "text-on-surface-variant hover:text-white"}`}
              onClick={onToggleShuffle}
            >
              <span className="material-symbols-outlined text-2xl">
                shuffle
              </span>
            </button>
            <div className="flex items-center gap-6 md:gap-12">
              <button
                className={`transition-colors active:scale-90 ${hasPrev ? "text-on-surface hover:text-primary" : "text-on-surface-variant/50 cursor-not-allowed"}`}
                onClick={onPrev}
                disabled={!hasPrev}
              >
                <span className="material-symbols-outlined text-4xl fill-icon">
                  skip_previous
                </span>
              </button>
              <div className="relative flex items-center justify-center">
                {isLoadingTrack && (
                  <svg
                    className="absolute inset-0 w-full h-full animate-spin text-primary"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray="180 100"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                <button
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 bg-gradient-to-br from-primary to-primary-container ${isLoadingTrack ? "opacity-50 cursor-not-allowed" : "text-on-primary shadow-primary/20"}`}
                  onClick={onTogglePlay}
                  disabled={isLoadingTrack}
                >
                  <span className="material-symbols-outlined text-4xl md:text-5xl fill-icon">
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>
              </div>
              <button
                className={`transition-colors active:scale-90 ${hasNext ? "text-on-surface hover:text-primary" : "text-on-surface-variant/50 cursor-not-allowed"}`}
                onClick={onNext}
                disabled={!hasNext}
              >
                <span className="material-symbols-outlined text-4xl fill-icon">
                  skip_next
                </span>
              </button>
            </div>
            <button
              className={`transition-colors active:scale-95 flex items-center justify-center relative ${repeatMode !== "off" ? "text-primary" : "text-on-surface-variant hover:text-white"}`}
              onClick={onToggleRepeat}
            >
              <span className="material-symbols-outlined text-2xl">
                {repeatMode === "one" ? "repeat_one" : "repeat"}
              </span>
              {repeatMode !== "off" && (
                <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"></div>
              )}
            </button>
          </div>

          {/* Footer Tools */}
          <div className="hidden md:flex justify-between items-center text-on-surface-variant">
            <div className="flex items-center gap-6">
              <button className="hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-2xl">
                  share
                </span>
              </button>
              <button
                className="hover:text-on-surface transition-colors"
                onClick={() => setShowMenu(true)}
              >
                <span className="material-symbols-outlined text-2xl">
                  more_vert
                </span>
              </button>
            </div>
            <div className="flex gap-8">
              <button
                className="hover:text-on-surface transition-colors"
                onClick={handleDownload}
              >
                <span
                  className={`material-symbols-outlined text-2xl ${downloading ? "animate-bounce text-primary" : ""}`}
                >
                  download
                </span>
              </button>
              <button className="hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-2xl">
                  playlist_play
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default PlayerScreen;
