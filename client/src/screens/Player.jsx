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
  const [showLyrics, setShowLyrics] = useState(true);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const lyricsScrollRef = React.useRef(null);

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

  const activeLyricIndex = parsedLyrics.findIndex((l, i) => {
    if (l.time === -1) return false;
    const next = parsedLyrics[i + 1];
    return currentTime >= l.time && (!next || currentTime < next.time);
  });

  useEffect(() => {
    if (showLyrics && activeLyricIndex !== -1 && lyricsScrollRef.current) {
      const activeElement = lyricsScrollRef.current.children[activeLyricIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeLyricIndex, showLyrics]);

  const handleOfflineAction = async () => {
    if (!track.preview) return;
    setIsSavingOffline(true);
    try {
      if (isOfflineSaved) {
        await removeTrackMetadata(track.id);
        await removeCachedAudio(track.preview);
        setIsOfflineSaved(false);
      } else {
        const success = await cacheAudioFile(
          track.preview,
          setDownloadProgress,
        );
        if (success) {
          await saveTrackMetadata(track);
          setIsOfflineSaved(true);
        }
      }
    } finally {
      setIsSavingOffline(false);
      setDownloadProgress(0);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onSeek((x / rect.width) * duration);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`/api/deezer/track/${track.id}/download`);
      if (res.data?.target?.link) {
        const link = document.createElement("a");
        link.href = res.data.target.link;
        link.download = `${track.title}.mp3`;
        link.click();
      }
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setDownloading(false);
      setShowMenu(false);
    }
  };

  if (!track) return null;

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-black z-[999] flex flex-col overflow-hidden select-none">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <img
          className="w-full h-full object-cover scale-125 blur-[100px] opacity-50 transition-opacity duration-1000"
          src={track.album?.cover_big || track.cover_url}
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black"></div>
      </div>

      {/* Floating Controls */}
      <div className="absolute top-10 left-6 right-6 z-30 flex justify-between items-center pointer-events-none">
        <button
          className="p-2 opacity-40 hover:opacity-100 transition-all pointer-events-auto"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-4xl text-white">
            keyboard_arrow_down
          </span>
        </button>
        <button
          className="p-2 opacity-40 hover:opacity-100 transition-all pointer-events-auto"
          onClick={() => setShowMenu(true)}
        >
          <span className="material-symbols-outlined text-3xl text-white">
            more_horiz
          </span>
        </button>
      </div>

      {/* Combined Main Content: Dual-Column Layout */}
      <main className="relative z-20 flex-1 overflow-hidden flex flex-col lg:flex-row max-w-[1500px] mx-auto w-full px-6 lg:px-12 py-10">
        {/* Left Column: Cover, Info & All Controls */}
        <section
          className={`flex-1 flex flex-col justify-center items-center lg:items-start transition-all duration-700 ${showLyrics ? "hidden lg:flex lg:w-1/2" : "w-full lg:max-w-xl mx-auto"}`}
        >
          {/* Album Cover */}
          <div className="relative w-full aspect-square max-w-[300px] md:max-w-[400px] lg:max-w-[450px] shadow-[0_40px_100px_rgba(0,0,0,0.7)] rounded-xl overflow-hidden mb-10 group">
            <img
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              src={track.album?.cover_big || track.cover_url}
              alt={track.title}
            />
          </div>

          {/* Metadata */}
          <div className="w-full max-w-[450px] space-y-2 mb-8 text-center lg:text-left">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-[0.9] truncate">
              {track.title}
            </h2>
            <p
              className="text-secondary uppercase font-black tracking-[0.3em] text-xs md:text-sm opacity-80 cursor-pointer hover:text-primary transition-colors inline-block"
              onClick={() =>
                track.artist?.id && onNavigateToArtist(track.artist.id)
              }
            >
              {track.artist?.name || track.artist}
            </p>
          </div>

          {/* Mini Lyric Preview */}
          <div className="w-full max-w-[450px] h-8 mb-4 flex items-center justify-center lg:justify-start overflow-hidden border-l-2 border-primary/20 pl-4">
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/50 italic truncate animate-in slide-in-from-bottom-2 duration-500">
              {activeLyricIndex !== -1
                ? parsedLyrics[activeLyricIndex].text
                : "..."}
            </p>
          </div>

          {/* Progress Section */}
          <div className="w-full max-w-[450px] mb-10 group">
            <div
              className="relative w-full h-[3px] bg-white/10 rounded-full cursor-pointer overflow-visible"
              onClick={handleProgressClick}
            >
              <div
                className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
                style={{
                  width: `${(currentTime / duration) * 100 || 0}%`,
                  backgroundColor: vibrantColor || "var(--primary)",
                  boxShadow: vibrantColor
                    ? `0 0-20px ${vibrantColor}`
                    : "0 0 15px white",
                }}
              >
                <div
                  className="absolute -right-2 -top-1.5 w-4 h-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ring-4 ring-black/20"
                  style={{ backgroundColor: vibrantColor || "white" }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Integrated Playback Controls */}
          <div className="w-full max-w-[450px] space-y-10">
            <div className="flex items-center justify-between">
              <button
                className={`p-2 transition-all active:scale-75 ${isShuffle ? "text-primary" : "text-white/30 hover:text-white"}`}
                onClick={onToggleShuffle}
              >
                <span className="material-symbols-outlined text-2xl">
                  shuffle
                </span>
              </button>

              <div className="flex items-center gap-6 md:gap-10">
                <button
                  className={`transition-all active:scale-75 ${hasPrev ? "text-white" : "text-white/10"}`}
                  onClick={onPrev}
                  disabled={!hasPrev}
                >
                  <span className="material-symbols-outlined text-5xl fill-icon">
                    skip_previous
                  </span>
                </button>

                <div className="relative">
                  {isLoadingTrack && (
                    <div className="absolute inset-[-8px] border-2 border-t-primary rounded-full animate-spin opacity-40"></div>
                  )}
                  <button
                    className="w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl"
                    style={{
                      backgroundColor: vibrantColor || "white",
                      color: "black",
                    }}
                    onClick={onTogglePlay}
                  >
                    <span className="material-symbols-outlined text-5xl fill-icon">
                      {isPlaying ? "pause" : "play_arrow"}
                    </span>
                  </button>
                </div>

                <button
                  className={`transition-all active:scale-75 ${hasNext ? "text-white" : "text-white/10"}`}
                  onClick={onNext}
                  disabled={!hasNext}
                >
                  <span className="material-symbols-outlined text-5xl fill-icon">
                    skip_next
                  </span>
                </button>
              </div>

              <button
                className={`p-2 transition-all active:scale-75 ${repeatMode !== "off" ? "text-primary" : "text-white/30 hover:text-white"}`}
                onClick={onToggleRepeat}
              >
                <span className="material-symbols-outlined text-2xl">
                  {repeatMode === "one" ? "repeat_one" : "repeat"}
                </span>
              </button>
            </div>

            {/* Utility Actions Row */}
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
              <button
                className={`flex items-center gap-3 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${isOfflineSaved ? "bg-white text-black border-white" : "border-white/10 text-white/50 hover:border-primary hover:text-primary"}`}
                onClick={handleOfflineAction}
              >
                <span className="material-symbols-outlined text-xl">
                  {isSavingOffline
                    ? "downloading"
                    : isOfflineSaved
                      ? "check_circle"
                      : "download_for_offline"}
                </span>
                <span className="hidden sm:inline">
                  {isSavingOffline
                    ? `${downloadProgress}%`
                    : isOfflineSaved
                      ? "Saved"
                      : "Offline"}
                </span>
              </button>

              <div className="flex items-center gap-3 md:gap-5">
                <button
                  className={`p-2 transition-all hover:scale-110 ${showLyrics ? "text-primary" : "text-white/40"}`}
                  onClick={() => setShowLyrics(!showLyrics)}
                >
                  <span className="material-symbols-outlined text-2xl">
                    mic
                  </span>
                </button>
                <button
                  className="p-2 text-white/40 hover:text-white transition-all hover:scale-110"
                  onClick={onOpenQueue}
                >
                  <span className="material-symbols-outlined text-2xl">
                    queue_music
                  </span>
                </button>
                <button
                  className={`p-2 transition-all hover:scale-110 ${isLiked ? "text-primary" : "text-white/40"}`}
                  onClick={onToggleLike}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${isLiked ? "fill-icon" : ""}`}
                  >
                    favorite
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Scrolling Lyrics */}
        <section
          className={`flex-1 relative transition-all duration-700 min-h-0 ${showLyrics ? "flex flex-col w-full h-full lg:w-1/2" : "hidden lg:flex lg:w-1/2 opacity-10 blur-md pointer-events-none"}`}
        >
          <div
            ref={lyricsScrollRef}
            className="flex-1 overflow-y-auto no-scrollbar mask-vertical-fade py-[35vh]"
          >
            {lyricsLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
              </div>
            ) : parsedLyrics.length > 0 ? (
              parsedLyrics.map((lyric, idx) => (
                <div
                  key={idx}
                  className={`py-6 px-4 transition-all duration-500 cursor-pointer origin-left hover:opacity-100 ${idx === activeLyricIndex ? "text-3xl md:text-5xl font-black text-white opacity-100 scale-105 italic lyric-glow" : "text-xl md:text-3xl font-bold text-white/10 opacity-20 hover:opacity-60 blur-[2px] hover:blur-0"}`}
                  onClick={() => lyric.time !== -1 && onSeek(lyric.time)}
                >
                  {lyric.text}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                <span className="material-symbols-outlined text-5xl">
                  sentiment_dissatisfied
                </span>
                <p className="font-black uppercase tracking-[0.4em] text-[10px]">
                  No Lyrics Available
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Menu Overlay (Z-Index Fix) */}
      {showMenu && (
        <div
          className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md p-6 flex flex-col justify-end"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="bg-[#121212] rounded-2xl p-6 space-y-4 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl cursor-pointer"
              onClick={handleDownload}
            >
              <span className="material-symbols-outlined text-2xl text-white">
                download
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                {downloading ? "Preparing..." : "Download MP3"}
              </span>
            </div>
            <div
              className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl cursor-pointer"
              onClick={() => {
                onOpenPlaylistModal();
                setShowMenu(false);
              }}
            >
              <span className="material-symbols-outlined text-2xl text-white">
                playlist_add
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                Add to playlist
              </span>
            </div>
            <button
              className="w-full py-4 font-black uppercase tracking-widest text-[10px] text-white/40"
              onClick={() => setShowMenu(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerScreen;
