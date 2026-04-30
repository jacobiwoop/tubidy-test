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
  nextTrack,
  activeDownloads = {},
  onUpdateDownload,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);
  const [mobileView, setMobileView] = useState("controls"); // 'controls' or 'lyrics'
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
        isAudioCached(track.id, track.preview),
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
      const container = lyricsScrollRef.current;
      const activeElement = container.children[activeLyricIndex];
      if (activeElement) {
        // Precise centering logic (Manual Smooth Scroll)
        const targetScroll =
          activeElement.offsetTop -
          container.offsetHeight / 2 +
          activeElement.offsetHeight / 2;

        container.scrollTo({
          top: targetScroll,
          behavior: "smooth",
        });
      }
    }
  }, [activeLyricIndex, showLyrics]);

  const handleOfflineAction = async () => {
    if (!track.preview) return;
    const isCurrentlyDownloading = !!activeDownloads[track.id];
    if (isCurrentlyDownloading || isOfflineSaved) return; // Don't download again if saved or downloading

    setIsSavingOffline(true);
    if (onUpdateDownload) onUpdateDownload(track.id, 0);

    try {
      const success = await cacheAudioFile(
        track.id,
        track.preview,
        (progress) => {
          setDownloadProgress(progress);
          if (onUpdateDownload) onUpdateDownload(track.id, progress);
        }
      );
      if (success) {
        await saveTrackMetadata(track);
        setIsOfflineSaved(true);
        if (onUpdateDownload) onUpdateDownload(track.id, 100);
      } else {
        if (onUpdateDownload) onUpdateDownload(track.id, -1);
      }
    } catch (err) {
      if (onUpdateDownload) onUpdateDownload(track.id, -1);
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
    <div className="fixed inset-0 h-[100dvh] w-full bg-black z-[1000] flex flex-col overflow-hidden select-none">
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

      {/* Combined Main Content: Responsive Layout */}
      <main className="relative z-20 flex-1 overflow-hidden flex flex-col lg:flex-row max-w-[1500px] mx-auto w-full px-6 lg:px-12 py-6 lg:py-10">
        {/* Mobile-Mode Mini Header (Only in Lyrics View) */}
        {mobileView === "lyrics" && (
          <div className="lg:hidden flex items-center gap-4 mb-6 animate-in slide-in-from-top duration-500">
            <div className="w-14 h-14 rounded-lg overflow-hidden shadow-lg shadow-black/40">
              <img
                src={track.album?.cover_medium || track.cover_url}
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white truncate">
                  {track.title}
                </span>
                <span className="px-1 py-0.5 rounded text-[8px] font-black bg-white/10 text-secondary border border-white/5 uppercase">
                  HD
                </span>
              </div>
              <span className="text-xs text-secondary font-bold truncate opacity-70 italic uppercase tracking-widest">
                {track.artist?.name || track.artist}
              </span>
            </div>
          </div>
        )}

        {/* 1. LEFT / CONTROL VIEW */}
        <section
          className={`flex-1 flex flex-col justify-center items-center transition-all duration-700 
          ${mobileView === "lyrics" ? "hidden lg:flex lg:w-1/2" : "w-full lg:max-w-xl mx-auto"}`}
        >
          {/* 1. Large Album Cover */}
          <div className="relative w-full aspect-square max-w-[320px] md:max-w-[420px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] rounded-[32px] overflow-hidden mb-6 lg:mb-8 group">
            <img
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              src={track.album?.cover_big || track.cover_url}
              alt={track.title}
            />
          </div>

          {/* 2. Metadata: Title & Artist */}
          <div className="w-full max-w-[420px] space-y-1 mb-6 lg:mb-8 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white truncate">
                {track.title}
              </h1>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-white/10 text-white/40 border border-white/5 uppercase flex-shrink-0">
                HD
              </span>
            </div>
            <p className="text-white/60 font-medium text-sm md:text-base opacity-80 italic tracking-widest uppercase truncate">
              {track.artist?.name || track.artist}
            </p>
          </div>

          {/* 3. Actions Row */}
          <div className="w-full max-w-[420px] flex items-center justify-between mb-6 lg:mb-8 px-2 text-white/60">
            <button
              className={`p-2 transition-all hover:text-white hover:scale-110 active:scale-95 ${isLiked ? "text-primary" : ""}`}
              onClick={onToggleLike}
            >
              <span
                className={`material-symbols-outlined text-2xl ${isLiked ? "fill-icon" : ""}`}
              >
                favorite
              </span>
            </button>
            <button
              className="p-2 transition-all hover:text-white hover:scale-110 active:scale-95"
              onClick={onOpenPlaylistModal}
            >
              <span className="material-symbols-outlined text-2xl">
                edit_square
              </span>
            </button>
            <button
              className={`p-2 transition-all hover:text-white hover:scale-110 active:scale-95 ${isOfflineSaved ? "text-primary" : ""}`}
              onClick={handleOfflineAction}
            >
              <span className="material-symbols-outlined text-2xl">
                {isSavingOffline ? "downloading" : "download"}
              </span>
            </button>
            <button className="p-2 transition-all hover:text-white hover:scale-110 active:scale-95">
              <span className="material-symbols-outlined text-2xl">cast</span>
            </button>
            <button
              className="p-2 transition-all hover:text-white hover:scale-110 active:scale-95"
              onClick={onOpenQueue}
            >
              <span className="material-symbols-outlined text-2xl">list</span>
            </button>
          </div>

          {/* 4. Up Next / Lyric Section (THE TOGGLE TRIGGER) */}
          <div
            className="w-full max-w-[420px] flex flex-col items-center mb-6 lg:mb-8 gap-1 cursor-pointer group"
            onClick={() => window.innerWidth < 1024 && setMobileView("lyrics")}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover:text-primary transition-colors duration-300">
              {activeLyricIndex !== -1 ? "Lyrics" : "Up Next"}
            </span>
            <p className="text-[11px] font-bold text-white/50 text-center truncate w-full px-4 italic group-hover:text-white transition-colors duration-300">
              {activeLyricIndex !== -1
                ? parsedLyrics[activeLyricIndex].text
                : nextTrack
                  ? `${nextTrack.title} • ${nextTrack.artist?.name || nextTrack.artist}`
                  : "End of Queue"}
            </p>
            <span className="lg:hidden material-symbols-outlined text-white/10 text-xs animate-bounce mt-1">
              expand_more
            </span>
          </div>

          {/* Persistent Footer Component (Visible only on Desktop here) */}
          <div className="hidden lg:block w-full">
            <PlayerFooter
              currentTime={currentTime}
              duration={duration}
              vibrantColor={vibrantColor}
              formatTime={formatTime}
              handleProgressClick={handleProgressClick}
              onToggleShuffle={onToggleShuffle}
              isShuffle={isShuffle}
              onPrev={onPrev}
              hasPrev={hasPrev}
              isPlaying={isPlaying}
              onTogglePlay={onTogglePlay}
              onNext={onNext}
              hasNext={hasNext}
              repeatMode={repeatMode}
              onToggleRepeat={onToggleRepeat}
              isLoadingTrack={isLoadingTrack}
            />
          </div>
        </section>

        {/* 2. RIGHT / LYRICS VIEW */}
        <section
          className={`flex-1 relative transition-all duration-700 min-h-0 flex flex-col
          ${mobileView === "controls" ? "hidden lg:flex lg:w-1/2" : "w-full lg:w-1/2"}`}
        >
          {/* Back to Controls (Mobile Only) */}
          {mobileView === "lyrics" && (
            <button
              className="lg:hidden absolute top-0 right-0 p-2 text-white/20 hover:text-white z-50"
              onClick={() => setMobileView("controls")}
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          )}

          <div
            ref={lyricsScrollRef}
            className="flex-1 overflow-y-auto no-scrollbar mask-vertical-fade py-[40vh]"
          >
            {lyricsLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
              </div>
            ) : parsedLyrics.length > 0 ? (
              parsedLyrics.map((lyric, idx) => {
                const distance = Math.abs(idx - activeLyricIndex);
                let variantClass = "";

                if (distance === 0) {
                  // Active Line: Clear, Large, Glow
                  variantClass =
                    "text-3xl md:text-5xl font-black text-white opacity-100 scale-105 italic blur-0 mb-4 lyric-glow";
                } else if (distance === 1) {
                  // Immediate neighbors
                  variantClass =
                    "text-2xl md:text-4xl font-bold text-white/40 opacity-50 scale-100 blur-[1px] mb-2";
                } else if (distance === 2) {
                  // Secondary neighbors
                  variantClass =
                    "text-xl md:text-3xl font-bold text-white/20 opacity-30 scale-[0.98] blur-[2px]";
                } else {
                  // Far lines
                  variantClass =
                    "text-lg md:text-2xl font-bold text-white/5 opacity-10 scale-[0.95] blur-[4px]";
                }

                return (
                  <div
                    key={idx}
                    className={`px-4 transition-all duration-700 ease-in-out cursor-pointer origin-left hover:scale-100 hover:opacity-100 hover:blur-0 ${variantClass}`}
                    onClick={() => lyric.time !== -1 && onSeek(lyric.time)}
                  >
                    {lyric.text}
                  </div>
                );
              })
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

          {/* Persistent Footer Component (Visible only on Mobile here when in lyrics view) */}
          <div className="lg:hidden w-full pt-4">
            <PlayerFooter
              currentTime={currentTime}
              duration={duration}
              vibrantColor={vibrantColor}
              formatTime={formatTime}
              handleProgressClick={handleProgressClick}
              onToggleShuffle={onToggleShuffle}
              isShuffle={isShuffle}
              onPrev={onPrev}
              hasPrev={hasPrev}
              isPlaying={isPlaying}
              onTogglePlay={onTogglePlay}
              onNext={onNext}
              hasNext={hasNext}
              repeatMode={repeatMode}
              onToggleRepeat={onToggleRepeat}
              isLoadingTrack={isLoadingTrack}
            />
          </div>
        </section>

        {/* Global Mobile Footer (Always visible in Controls view on Mobile) */}
        {mobileView === "controls" && (
          <div className="lg:hidden w-full">
            <PlayerFooter
              currentTime={currentTime}
              duration={duration}
              vibrantColor={vibrantColor}
              formatTime={formatTime}
              handleProgressClick={handleProgressClick}
              onToggleShuffle={onToggleShuffle}
              isShuffle={isShuffle}
              onPrev={onPrev}
              hasPrev={hasPrev}
              isPlaying={isPlaying}
              onTogglePlay={onTogglePlay}
              onNext={onNext}
              hasNext={hasNext}
              repeatMode={repeatMode}
              onToggleRepeat={onToggleRepeat}
              isLoadingTrack={isLoadingTrack}
            />
          </div>
        )}
      </main>

      {/* Menu Overlay (Z-Index Fix) */}
      {showMenu && (
        <div
          className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-md p-6 flex flex-col justify-end"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="bg-[#121212] rounded-2xl p-6 space-y-4 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isOfflineSaved ? "opacity-50 cursor-default" : "hover:bg-white/5 cursor-pointer"}`}
              onClick={handleOfflineAction}
            >
              <span className={`material-symbols-outlined text-2xl ${isOfflineSaved ? "text-primary" : "text-white"}`}>
                {isOfflineSaved ? "offline_pin" : isSavingOffline ? "sync" : "download_for_offline"}
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {isSavingOffline ? `Saving (${downloadProgress}%)` : isOfflineSaved ? "Available Offline" : "Save Offline"}
                </span>
                {isSavingOffline && (
                  <div className="w-32 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${downloadProgress}%` }}></div>
                  </div>
                )}
              </div>
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

// Sub-component for the Footer controls to keep code DRY and manageable
function PlayerFooter({
  currentTime,
  duration,
  vibrantColor,
  formatTime,
  handleProgressClick,
  onToggleShuffle,
  isShuffle,
  onPrev,
  hasPrev,
  isPlaying,
  onTogglePlay,
  onNext,
  hasNext,
  repeatMode,
  onToggleRepeat,
  isLoadingTrack,
}) {
  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
      {/* Progress Bar */}
      <div className="w-full px-2">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-white/30 tabular-nums w-8 text-right">
            {formatTime(currentTime)}
          </span>
          <div
            className="flex-1 relative h-4 flex items-center group/progress cursor-pointer"
            onClick={handleProgressClick}
          >
            <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${(currentTime / duration) * 100 || 0}%`,
                  backgroundColor: vibrantColor || "white",
                }}
              />
            </div>
            <div
              className="absolute h-3 w-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity ring-4 ring-black/20"
              style={{
                left: `calc(${(currentTime / duration) * 100 || 0}% - 6px)`,
              }}
            />
          </div>
          <span className="text-[10px] font-bold text-white/30 tabular-nums w-8">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between max-w-[420px] mx-auto w-full">
        <button
          className={`p-2 transition-all hover:text-white active:scale-75 ${isShuffle ? "text-primary" : "text-white/30"}`}
          onClick={onToggleShuffle}
        >
          <span className="material-symbols-outlined text-2xl">shuffle</span>
        </button>
        <button
          className={`p-2 transition-all hover:text-white active:scale-75 ${hasPrev ? "text-white" : "text-white/10"}`}
          onClick={onPrev}
          disabled={!hasPrev}
        >
          <span className="material-symbols-outlined text-3xl">
            skip_previous
          </span>
        </button>

        <button
          className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black transition-all hover:scale-105 active:scale-95 shadow-2xl relative"
          onClick={onTogglePlay}
        >
          {isLoadingTrack && (
            <div className="absolute inset-[-4px] border-2 border-t-black rounded-full animate-spin opacity-20"></div>
          )}
          <span className="material-symbols-outlined text-4xl fill-icon">
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </button>

        <button
          className={`p-2 transition-all hover:text-white active:scale-75 ${hasNext ? "text-white" : "text-white/10"}`}
          onClick={onNext}
          disabled={!hasNext}
        >
          <span className="material-symbols-outlined text-3xl">skip_next</span>
        </button>
        <button
          className={`p-2 transition-all hover:text-white active:scale-75 ${repeatMode !== "off" ? "text-primary" : "text-white/30"}`}
          onClick={onToggleRepeat}
        >
          <span className="material-symbols-outlined text-2xl">
            {repeatMode === "one" ? "repeat_one" : "repeat"}
          </span>
        </button>
      </div>
    </div>
  );
}

export default PlayerScreen;
