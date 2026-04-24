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
  onNavigateToArtist,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const lyricsScrollRef = React.useRef(null);

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

      // Reset lyrics when track changes
      setParsedLyrics([]);
    }
    return () => (mounted = false);
  }, [track]);

  useEffect(() => {
    if (showLyrics && track && parsedLyrics.length === 0) {
      fetchLyrics();
    }
  }, [showLyrics, track]);

  const fetchLyrics = async () => {
    if (!track.id) return;
    setLyricsLoading(true);
    try {
      const res = await axios.get(`/api/deezer/track/${track.id}/lyrics`);
      if (res.data?.syncedLyrics) {
        setParsedLyrics(parseLRC(res.data.syncedLyrics));
      } else if (res.data?.plainLyrics) {
        // Fallback to plain lyrics if synced unavailable
        setParsedLyrics([{ time: 0, text: res.data.plainLyrics.split("\n") }]);
        // Actually, better to map plain lyrics to a simple format
        const lines = res.data.plainLyrics
          .split("\n")
          .map((l) => ({ time: -1, text: l }));
        setParsedLyrics(lines);
      }
    } catch (err) {
      console.error("Failed to fetch lyrics", err);
    } finally {
      setLyricsLoading(false);
    }
  };

  const parseLRC = (lrcString) => {
    if (!lrcString) return [];
    const lines = lrcString.split("\n");
    const parsed = [];
    const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    lines.forEach((line) => {
      const match = line.match(regex);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const milliseconds = parseInt(match[3]);
        const time = minutes * 60 + seconds + milliseconds / 1000;
        parsed.push({ time, text: match[4].trim() });
      }
    });
    return parsed;
  };

  // Scroll active lyric into view
  const activeLyricIndex = parsedLyrics.findIndex((l, i) => {
    if (l.time === -1) return false;
    const next = parsedLyrics[i + 1];
    return currentTime >= l.time && (!next || currentTime < next.time);
  });

  useEffect(() => {
    if (showLyrics && activeLyricIndex !== -1 && lyricsScrollRef.current) {
      const activeElement = lyricsScrollRef.current.children[activeLyricIndex];
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [activeLyricIndex, showLyrics]);

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
        <div className="flex items-center gap-2">
          <button
            className={`p-2 transition-all active:scale-75 hover:opacity-100 ${showLyrics ? "text-primary opacity-100" : "text-secondary opacity-60"}`}
            onClick={() => setShowLyrics(!showLyrics)}
          >
            <span className="material-symbols-outlined text-3xl">mic</span>
          </button>
          <button
            className="p-2 transition-all active:scale-75 hover:opacity-100 opacity-60"
            onClick={() => setShowMenu(true)}
          >
            <span className="material-symbols-outlined text-primary text-3xl">
              more_horiz
            </span>
          </button>
        </div>
      </header>

      <main
        className={`relative z-10 flex-1 px-8 md:px-20 pb-20 overflow-hidden max-w-[1400px] mx-auto w-full transition-all duration-700 ${showLyrics ? "grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24" : "flex flex-col justify-center items-center"}`}
      >
        {/* Left Section: Information & Controls */}
        <section
          className={`flex flex-col justify-center transition-all duration-700 ${showLyrics ? "items-start" : "items-center max-w-2xl"}`}
        >
          {/* Album Art Section */}
          <div
            className={`relative group shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-md overflow-hidden transition-all duration-700 mb-8 md:mb-12 ${showLyrics ? "w-48 h-48 md:w-64 md:h-64" : "w-full aspect-square max-w-[400px] md:max-w-none"}`}
          >
            <img
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              src={track.album?.cover_big || track.cover_url}
              alt={track.title}
            />
            <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:opacity-0" />
          </div>

          {/* Metadata */}
          <div
            className={`mb-10 w-full ${showLyrics ? "text-left" : "text-center"}`}
          >
            <div
              className={`flex items-start gap-4 ${showLyrics ? "justify-start" : "justify-between"}`}
            >
              <div className="space-y-1 overflow-hidden flex-1">
                <h2
                  className={`font-headline font-black tracking-tighter uppercase italic leading-[0.9] truncate transition-all duration-700 ${showLyrics ? "text-2xl md:text-3xl" : "text-4xl md:text-6xl"}`}
                >
                  {track.title}
                </h2>
                <p
                  className={`text-secondary uppercase font-black tracking-[0.3em] opacity-80 truncate hover:text-primary transition-colors hover:underline cursor-pointer transition-all duration-700 ${showLyrics ? "text-xs md:text-sm" : "text-sm md:text-lg"}`}
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

              {!showLyrics && (
                <button
                  className={`transition-all active:scale-125 p-3 rounded-full hover:bg-white/5 ${isLiked ? "text-primary" : "text-secondary"}`}
                  onClick={onToggleLike}
                >
                  <span
                    className={`material-symbols-outlined text-4xl ${isLiked ? "fill-icon" : ""}`}
                  >
                    favorite
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="w-full space-y-3 mb-10">
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
          <div
            className={`flex items-center justify-between w-full px-2 mb-10 ${showLyrics ? "gap-4" : "gap-12"}`}
          >
            <button
              className={`transition-all duration-300 active:scale-75 ${isShuffle ? "text-primary" : "text-secondary hover:text-white"}`}
              onClick={onToggleShuffle}
            >
              <span className="material-symbols-outlined text-2xl md:text-3xl">
                shuffle
              </span>
            </button>

            <div
              className={`flex items-center ${showLyrics ? "gap-6" : "gap-10 md:gap-14"}`}
            >
              <button
                className={`transition-all duration-300 active:scale-75 ${hasPrev ? "text-primary" : "text-secondary opacity-30 cursor-not-allowed"}`}
                onClick={onPrev}
                disabled={!hasPrev}
              >
                <span
                  className={`material-symbols-outlined fill-icon ${showLyrics ? "text-3xl md:text-4xl" : "text-5xl"}`}
                >
                  skip_previous
                </span>
              </button>

              <div className="relative flex items-center justify-center">
                {isLoadingTrack && (
                  <div
                    className={`absolute inset-[-6px] border-2 border-primary/20 border-t-primary rounded-full animate-spin`}
                  />
                )}
                <button
                  className={`rounded-full flex items-center justify-center transition-all duration-500 active:scale-95 accent-monochrome ${isLoadingTrack ? "opacity-40 animate-pulse" : "hover:scale-105"} ${showLyrics ? "w-16 h-16 md:w-20 md:h-20" : "w-24 h-24 md:w-28 md:h-28"}`}
                  style={{
                    backgroundColor: vibrantColor || "#E9FF00",
                    boxShadow: !vibrantColor
                      ? "0 20px 50px rgba(0,0,0,0.5)"
                      : `0 20px 50px ${vibrantColor}33`,
                  }}
                  onClick={onTogglePlay}
                  disabled={isLoadingTrack}
                >
                  <span
                    className={`material-symbols-outlined fill-icon ${showLyrics ? "text-4xl" : "text-6xl"}`}
                  >
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>
              </div>

              <button
                className={`transition-all duration-300 active:scale-75 ${hasNext ? "text-primary" : "text-secondary opacity-30 cursor-not-allowed"}`}
                onClick={onNext}
                disabled={!hasNext}
              >
                <span
                  className={`material-symbols-outlined fill-icon ${showLyrics ? "text-3xl md:text-4xl" : "text-5xl"}`}
                >
                  skip_next
                </span>
              </button>
            </div>

            <button
              className={`transition-all duration-300 active:scale-75 relative ${repeatMode !== "off" ? "text-primary" : "text-secondary hover:text-white"}`}
              onClick={onToggleRepeat}
            >
              <span className="material-symbols-outlined text-2xl md:text-3xl">
                {repeatMode === "one" ? "repeat_one" : "repeat"}
              </span>
              {repeatMode !== "off" && (
                <div className="absolute -bottom-1 left-1.5 right-1.5 h-[1.5px] bg-primary"></div>
              )}
            </button>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex justify-between items-center w-full">
            <button
              className={`flex items-center gap-3 px-6 py-3 rounded-md border transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em] ${isOfflineSaved ? "bg-primary text-background border-primary" : "bg-white/5 border-white/5 text-secondary hover:border-white/20 hover:text-primary"}`}
              onClick={handleOfflineAction}
            >
              <span
                className={`material-symbols-outlined text-2xl ${isSavingOffline ? "animate-pulse" : ""} ${isOfflineSaved ? "fill-icon" : ""}`}
              >
                {isSavingOffline ? "downloading" : "download_for_offline"}
              </span>
              <span className={showLyrics ? "hidden lg:inline" : ""}>
                {isOfflineSaved
                  ? "Saved"
                  : isSavingOffline
                    ? `${downloadProgress}%`
                    : "Offline"}
              </span>
            </button>

            <div className="flex gap-2">
              <button
                className="p-3 text-secondary hover:text-primary transition-all active:scale-75"
                onClick={onOpenQueue}
              >
                <span className="material-symbols-outlined text-2xl md:text-3xl">
                  queue_music
                </span>
              </button>
              {showLyrics && (
                <button
                  className={`p-3 transition-all active:scale-125 rounded-full hover:bg-white/5 ${isLiked ? "text-primary" : "text-secondary"}`}
                  onClick={onToggleLike}
                >
                  <span
                    className={`material-symbols-outlined text-3xl ${isLiked ? "fill-icon" : ""}`}
                  >
                    favorite
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Right Section: Lyrics Column */}
        {showLyrics && (
          <section className="flex flex-col h-full overflow-hidden relative">
            <div
              ref={lyricsScrollRef}
              className="flex-1 overflow-y-auto no-scrollbar scroll-smooth mask-vertical-fade py-[30vh]"
            >
              {lyricsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : parsedLyrics.length > 0 ? (
                parsedLyrics.map((lyric, idx) => (
                  <div
                    key={idx}
                    className={`py-4 px-4 transition-all duration-500 origin-left cursor-pointer hover:opacity-100 ${idx === activeLyricIndex ? "text-3xl md:text-5xl font-black text-white opacity-100 scale-105 lyric-glow" : "text-xl md:text-3xl font-bold text-white/20 opacity-40 hover:opacity-60 scale-95 blur-[2px] hover:blur-0"}`}
                    onClick={() => {
                      if (lyric.time !== -1) onSeek(lyric.time);
                    }}
                  >
                    {lyric.text}
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40 space-y-4">
                  <span className="material-symbols-outlined text-6xl">
                    sentiment_dissatisfied
                  </span>
                  <p className="font-headline italic font-black uppercase tracking-widest text-xs">
                    No Lyrics Found
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default PlayerScreen;
