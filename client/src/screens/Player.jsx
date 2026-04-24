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
  vibrantColor,
  onOpenQueue,
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
    <div className="fixed inset-0 bg-background z-[100] flex flex-col animate-in slide-in-from-bottom duration-700 overflow-hidden">
      {/* Immersive Background Layer */}
      <div className="absolute inset-0 z-0">
        <img
          className="w-full h-full object-cover scale-150 blur-[120px] opacity-40 transition-opacity duration-1000"
          src={track.album?.cover_big || track.cover_url}
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-background/60 to-background"></div>
      </div>

      {/* Actions Menu Overlay */}
      {showMenu && (
        <div
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => {
            setShowMenu(false);
            setShowPlaylists(false);
          }}
        >
          <div
            className="absolute bottom-10 left-6 right-6 bg-surface border border-white/5 rounded-2xl p-8 space-y-2 animate-in slide-in-from-bottom-20 duration-500 shadow-2xl shadow-black/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-10"></div>

            {!showPlaylists ? (
              <div className="space-y-4">
                <div
                  className="flex items-center gap-5 p-4 hover:bg-white/5 rounded-md cursor-pointer transition-all uppercase tracking-widest text-[10px] font-black"
                  onClick={() => {
                    onToggleLike();
                    setShowMenu(false);
                  }}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${isLiked ? "text-primary fill-icon" : "text-secondary"}`}
                  >
                    favorite
                  </span>
                  <span>
                    {isLiked ? "Remove from Library" : "Add to Library"}
                  </span>
                </div>

                <div
                  className="flex items-center gap-5 p-4 hover:bg-white/5 rounded-md cursor-pointer transition-all uppercase tracking-widest text-[10px] font-black"
                  onClick={() => setShowPlaylists(true)}
                >
                  <span className="material-symbols-outlined text-2xl text-secondary">
                    playlist_add
                  </span>
                  <span>Add to Playlist</span>
                </div>

                <div
                  className="flex items-center gap-5 p-4 hover:bg-white/5 rounded-md cursor-pointer transition-all uppercase tracking-widest text-[10px] font-black"
                  onClick={handleDownload}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${downloading ? "text-primary animate-pulse" : "text-secondary"}`}
                  >
                    {downloading ? "downloading" : "download"}
                  </span>
                  <span>
                    {downloading ? "Preparing link..." : "Download MP3"}
                  </span>
                </div>

                <button
                  className="w-full py-6 mt-10 font-black uppercase tracking-[0.4em] text-[10px] border border-white/10 rounded-md hover:bg-white/5 transition-all"
                  onClick={() => setShowMenu(false)}
                >
                  Close
                </button>
              </div>
            ) : (
              // Playlists View
              <div className="flex flex-col max-h-[50vh]">
                <div className="flex items-center mb-8 pb-4 border-b border-white/5">
                  <button
                    onClick={() => setShowPlaylists(false)}
                    className="p-2 mr-4 hover:bg-white/5 rounded-full transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-2xl text-primary">
                      arrow_back
                    </span>
                  </button>
                  <h3 className="font-headline font-black text-xs uppercase tracking-[0.3em]">
                    Select Playlist
                  </h3>
                </div>

                <div className="overflow-y-auto space-y-3 pr-2 no-scrollbar">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      className="flex items-center gap-5 p-4 hover:bg-white/5 rounded-md cursor-pointer transition-all"
                      onClick={() => {
                        if (onAddToPlaylist) onAddToPlaylist(pl.id, track);
                        setShowPlaylists(false);
                        setShowMenu(false);
                      }}
                    >
                      <div className="w-12 h-12 bg-white/5 rounded-md flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary">
                          queue_music
                        </span>
                      </div>
                      <span className="font-black text-[10px] uppercase tracking-widest truncate">
                        {pl.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header Container */}
      <header className="relative z-20 w-full flex justify-between items-center px-8 py-10">
        <button
          className="p-2 transition-all active:scale-75 hover:opacity-100 opacity-60"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-primary text-4xl">
            keyboard_arrow_down
          </span>
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase font-black tracking-[0.4em] text-secondary">
            Now Playing
          </p>
        </div>
        <button
          className="p-2 transition-all active:scale-75 hover:opacity-100 opacity-60"
          onClick={() => setShowMenu(true)}
        >
          <span className="material-symbols-outlined text-primary text-3xl">
            more_horiz
          </span>
        </button>
      </header>

      <main className="relative z-10 flex flex-col flex-1 px-8 md:px-20 pb-20 justify-center max-w-7xl mx-auto w-full md:grid md:grid-cols-2 md:gap-24 md:items-center">
        {/* Album Art Section */}
        <section className="flex items-center justify-center mb-12 md:mb-0">
          <div className="relative w-full aspect-square max-w-[400px] md:max-w-none group shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-md overflow-hidden">
            <img
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              src={track.album?.cover_big || track.cover_url}
              alt={track.title}
            />
            <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:opacity-0" />
          </div>
        </section>

        {/* Info & Controls Section */}
        <section className="flex flex-col justify-center w-full">
          {/* Metadata */}
          <div className="mb-12">
            <div className="flex justify-between items-start gap-6">
              <div className="space-y-3 overflow-hidden flex-1">
                <h2 className="font-headline text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-[0.9] truncate">
                  {track.title}
                </h2>
                <p
                  className="text-sm md:text-lg text-secondary uppercase font-black tracking-[0.3em] opacity-80 truncate hover:text-primary transition-colors hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (track.artist?.id && onNavigateToArtist) {
                      onNavigateToArtist(track.artist.id);
                      onClose();
                    }
                  }}
                >
                  {track.artist?.name || track.artist}
                </p>
              </div>

              <button
                className={`transition-all active:scale-125 p-3 rounded-full hover:bg-white/5 ${isLiked ? "text-primary" : "text-secondary"}`}
                onClick={onOpenPlaylistModal}
              >
                <span
                  className={`material-symbols-outlined text-4xl ${isLiked ? "fill-icon" : ""}`}
                >
                  favorite
                </span>
              </button>
            </div>
          </div>

          {/* Progress Section */}
          <div className="w-full space-y-4 mb-14">
            <div
              className="relative w-full h-[1.5px] bg-white/10 rounded-full group cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
                style={{
                  width: `${(currentTime / duration) * 100 || 0}%`,
                  backgroundColor: vibrantColor || "var(--primary)",
                  boxShadow: vibrantColor
                    ? `0 0 15px ${vibrantColor}`
                    : "0 0 15px rgba(255,255,255,0.5)",
                }}
              >
                <div
                  className="absolute -right-2 -top-[6px] w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_#fff] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: vibrantColor || "var(--primary)" }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-[10px] uppercase font-black tracking-[0.2em] text-secondary opacity-60">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between px-2 mb-16">
            <button
              className={`transition-all duration-300 active:scale-75 ${isShuffle ? "text-primary" : "text-secondary hover:text-white"}`}
              onClick={onToggleShuffle}
            >
              <span className="material-symbols-outlined text-3xl">
                shuffle
              </span>
            </button>

            <div className="flex items-center gap-10 md:gap-14">
              <button
                className={`transition-all duration-300 active:scale-75 ${hasPrev ? "text-primary" : "text-secondary opacity-30 cursor-not-allowed"}`}
                onClick={onPrev}
                disabled={!hasPrev}
              >
                <span className="material-symbols-outlined text-5xl fill-icon">
                  skip_previous
                </span>
              </button>

              <div className="relative flex items-center justify-center">
                {isLoadingTrack && (
                  <div className="absolute inset-[-10px] border-2 border-white/20 border-t-accent-monochrome rounded-full animate-spin" />
                )}
                <button
                  className={`w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all duration-500 active:scale-95 accent-monochrome ${isLoadingTrack ? "opacity-40 animate-pulse" : "hover:scale-105"}`}
                  style={{
                    backgroundColor: vibrantColor || "#E9FF00",
                    boxShadow: !vibrantColor
                      ? "0 20px 50px rgba(0,0,0,0.5)"
                      : `0 20px 50px ${vibrantColor}33`, // 33 is ~20% opacity in hex
                  }}
                  onClick={onTogglePlay}
                  disabled={isLoadingTrack}
                >
                  <span className="material-symbols-outlined text-6xl fill-icon">
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>
              </div>

              <button
                className={`transition-all duration-300 active:scale-75 ${hasNext ? "text-primary" : "text-secondary opacity-30 cursor-not-allowed"}`}
                onClick={onNext}
                disabled={!hasNext}
              >
                <span className="material-symbols-outlined text-5xl fill-icon">
                  skip_next
                </span>
              </button>
            </div>

            <button
              className={`transition-all duration-300 active:scale-75 relative ${repeatMode !== "off" ? "text-primary" : "text-secondary hover:text-white"}`}
              onClick={onToggleRepeat}
            >
              <span className="material-symbols-outlined text-3xl">
                {repeatMode === "one" ? "repeat_one" : "repeat"}
              </span>
              {repeatMode !== "off" && (
                <div className="absolute -bottom-1 left-1.5 right-1.5 h-[1.5px] bg-primary"></div>
              )}
            </button>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex justify-between items-center px-1">
            <button
              className={`flex items-center gap-3 px-6 py-3 rounded-md border transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em] ${isOfflineSaved ? "bg-primary text-background border-primary" : "bg-white/5 border-white/5 text-secondary hover:border-white/20 hover:text-primary"}`}
              onClick={handleOfflineAction}
            >
              <span
                className={`material-symbols-outlined text-2xl ${isSavingOffline ? "animate-pulse" : ""} ${isOfflineSaved ? "fill-icon" : ""}`}
              >
                {isSavingOffline ? "downloading" : "download_for_offline"}
              </span>
              <span>
                {isOfflineSaved
                  ? "Downloaded"
                  : isSavingOffline
                    ? `Downloading ${downloadProgress}%`
                    : "Save Offline"}
              </span>
            </button>

            <div className="flex gap-4">
              <button
                className="p-3 text-secondary hover:text-primary transition-all active:scale-75"
                onClick={handleDownload}
              >
                <span
                  className={`material-symbols-outlined text-3xl ${downloading ? "animate-bounce" : ""}`}
                >
                  {downloading ? "downloading" : "output"}
                </span>
              </button>
              <button
                className="p-3 text-secondary hover:text-primary transition-all active:scale-75"
                onClick={onOpenQueue}
              >
                <span className="material-symbols-outlined text-3xl">
                  queue_music
                </span>
              </button>
              <button className="p-3 text-secondary hover:text-primary transition-all active:scale-75">
                <span className="material-symbols-outlined text-3xl">
                  lyrics
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
