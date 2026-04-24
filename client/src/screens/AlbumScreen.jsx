import React, { useState, useEffect } from "react";
import axios from "axios";
import { getVibrantColorFromImage } from "../utils/vibrant-color";

function AlbumScreen({
  albumId,
  onPlayTrack,
  onNavigateToArtist,
  navigateToAlbum,
  likedTrackIds,
}) {
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vibrantColor, setVibrantColor] = useState(null);
  const [moreFromArtist, setMoreFromArtist] = useState([]);
  const [similarAlbums, setSimilarAlbums] = useState([]);
  const [similarArtists, setSimilarArtists] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function fetchAlbumData() {
      if (!albumId) return;
      setLoading(true);
      try {
        const albumRes = await axios.get(`/api/deezer/album/${albumId}`);
        const albumData = albumRes.data;

        if (isMounted) {
          setAlbum(albumData);

          // Parallel fetch for more content
          const [moreRes, similarAlbumsRes, relatedArtistsRes] =
            await Promise.all([
              albumData.artist?.id
                ? axios.get(
                    `/api/deezer/artist/${albumData.artist.id}/albums?limit=6`,
                  )
                : Promise.resolve({ data: { data: [] } }),
              axios.get(`/api/deezer/album/${albumId}/related?limit=6`),
              albumData.artist?.id
                ? axios.get(
                    `/api/deezer/artist/${albumData.artist.id}/related?limit=6`,
                  )
                : Promise.resolve({ data: { data: [] } }),
            ]);

          if (isMounted) {
            setMoreFromArtist(
              moreRes.data.data?.filter((a) => a.id !== parseInt(albumId)) ||
                [],
            );
            setSimilarAlbums(similarAlbumsRes.data.data || []);
            setSimilarArtists(relatedArtistsRes.data.data || []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch album details", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAlbumData();
    return () => {
      isMounted = false;
    };
  }, [albumId]);

  const handleImageLoad = (e) => {
    try {
      const color = getVibrantColorFromImage(e.target);
      if (color) setVibrantColor(color);
    } catch (err) {
      console.warn("Vibrant color extraction failed", err);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return "";
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateStr).toLocaleDateString("en-US", options);
  };

  if (loading) return <AlbumSkeleton />;
  if (!album) return null;

  return (
    <div className="flex flex-col animate-in fade-in duration-700 pb-24">
      {/* Dynamic Background */}
      <div
        className="fixed inset-0 z-[-1] transition-colors duration-1000 opacity-30 blur-[100px]"
        style={{
          background: vibrantColor
            ? `radial-gradient(circle at 20% 30%, ${vibrantColor}, transparent)`
            : "radial-gradient(circle at 20% 30%, var(--primary), transparent)",
        }}
      />

      {/* Header Section */}
      <section className="relative px-6 pt-12 pb-10 flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12 max-w-7xl mx-auto w-full">
        <div className="relative group w-64 h-64 md:w-80 md:h-80 flex-shrink-0 shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-md overflow-hidden">
          <img
            src={album.cover_big}
            alt={album.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            crossOrigin="anonymous"
            onLoad={handleImageLoad}
          />
          <div className="absolute inset-0 bg-black/10 group-hover:opacity-0 transition-opacity" />
        </div>

        <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
          <span className="text-[10px] uppercase font-black tracking-[0.4em] text-secondary mb-3 opacity-60">
            {album.record_type || "Album"}
          </span>

          <div className="flex items-center gap-3 max-w-full">
            <h1
              className={`font-headline font-black tracking-tighter uppercase italic leading-[0.85] mb-4 break-words ${album.title.length > 20 ? "text-4xl md:text-6xl" : "text-5xl md:text-8xl"}`}
            >
              {album.title}
            </h1>
            {album.explicit_lyrics && (
              <span className="flex-shrink-0 bg-secondary/20 text-secondary text-[10px] font-black px-1.5 py-0.5 rounded-sm mb-4">
                E
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-sm font-bold tracking-tight mb-8">
            <span
              className="text-primary hover:underline cursor-pointer"
              onClick={() => onNavigateToArtist(album.artist.id)}
            >
              {album.artist.name}
            </span>
            <span className="text-secondary opacity-40">•</span>
            <span className="text-secondary opacity-80">
              {new Date(album.release_date).getFullYear()}
            </span>
            <span className="text-secondary opacity-40">•</span>
            <span className="text-secondary opacity-80">
              {album.nb_tracks} tracks
            </span>
            <span className="text-secondary opacity-40">•</span>
            <span className="text-secondary opacity-80">
              {Math.floor(album.duration / 60)} min
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              className="px-8 py-3.5 bg-primary text-background rounded-full font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/10"
              onClick={() => onPlayTrack(album.tracks.data[0])}
            >
              <span className="material-symbols-outlined fill-icon text-xl">
                play_arrow
              </span>
              Play
            </button>
            <button className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-secondary hover:text-primary hover:border-primary transition-all active:scale-90">
              <span className="material-symbols-outlined">shuffle</span>
            </button>
            <button className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-secondary hover:text-primary hover:border-primary transition-all active:scale-90">
              <span className="material-symbols-outlined">favorite</span>
            </button>
            <button className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-secondary hover:text-primary hover:border-primary transition-all active:scale-90">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tracklist table */}
      <section className="px-6 max-w-7xl mx-auto w-full mt-10">
        <div className="w-full border-t border-white/5 pt-8">
          <div className="grid grid-cols-[40px_1fr_80px_50px] px-4 mb-4 text-[10px] uppercase font-black tracking-[0.3em] text-secondary opacity-40">
            <span>#</span>
            <span>Title</span>
            <span className="text-right">Duration</span>
            <span className="text-right"></span>
          </div>

          <div className="space-y-1">
            {album.tracks.data.map((track, idx) => (
              <div
                key={track.id}
                className="group grid grid-cols-[40px_1fr_80px_50px] items-center px-4 py-3 rounded-md hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => onPlayTrack(track)}
              >
                <span className="text-xs font-black text-secondary group-hover:text-primary transition-colors">
                  {idx + 1}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-primary truncate tracking-tight">
                    {track.title}
                  </span>
                  {track.explicit_lyrics && (
                    <span className="text-[8px] text-secondary opacity-50 uppercase font-black flex items-center gap-1 mt-0.5">
                      <span className="bg-secondary/20 px-1 rounded-sm">E</span>{" "}
                      Explicit
                    </span>
                  )}
                </div>
                <span className="text-right text-xs font-bold text-secondary opacity-60">
                  {formatDuration(track.duration)}
                </span>
                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-secondary hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">
                      more_horiz
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Album Info / Copyright */}
      <section className="px-10 max-w-7xl mx-auto w-full mt-16 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2">
          Released {formatFullDate(album.release_date)}
        </p>
        <p className="text-[10px] font-bold text-secondary italic">
          © {album.label || "Spotiwoop"}
        </p>
      </section>

      {/* Contextual Sections */}
      <div className="space-y-24 mt-20">
        {moreFromArtist.length > 0 && (
          <section className="px-6 max-w-7xl mx-auto w-full">
            <h2 className="font-headline font-black text-xs uppercase tracking-[0.4em] text-secondary mb-8 pl-4 opacity-50">
              More from {album.artist.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 px-4">
              {moreFromArtist.map((artAlbum) => (
                <div
                  key={artAlbum.id}
                  className="group cursor-pointer flex flex-col"
                  onClick={() => navigateToAlbum(artAlbum.id)}
                >
                  <div className="relative aspect-square rounded-md overflow-hidden shadow-lg mb-4">
                    <img
                      src={artAlbum.cover_medium}
                      alt={artAlbum.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-background scale-90 group-hover:scale-100 transition-transform shadow-xl">
                        <span className="material-symbols-outlined fill-icon text-3xl">
                          play_arrow
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary truncate mb-1">
                    {artAlbum.title}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40">
                    {new Date(artAlbum.release_date).getFullYear()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {similarAlbums.length > 0 && (
          <section className="px-6 max-w-7xl mx-auto w-full">
            <h2 className="font-headline font-black text-xs uppercase tracking-[0.4em] text-secondary mb-8 pl-4 opacity-50">
              Similar Albums
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 px-4">
              {similarAlbums.map((simAlbum) => (
                <div
                  key={simAlbum.id}
                  className="group cursor-pointer flex flex-col"
                  onClick={() => navigateToAlbum(simAlbum.id)}
                >
                  <div className="relative aspect-square rounded-md overflow-hidden shadow-lg mb-4">
                    <img
                      src={simAlbum.cover_medium}
                      alt={simAlbum.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-background scale-90 group-hover:scale-100 transition-transform shadow-xl">
                        <span className="material-symbols-outlined fill-icon text-3xl">
                          play_arrow
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary truncate mb-1">
                    {simAlbum.title}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40">
                    {simAlbum.artist?.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {similarArtists.length > 0 && (
          <section className="px-6 max-w-7xl mx-auto w-full">
            <h2 className="font-headline font-black text-xs uppercase tracking-[0.4em] text-secondary mb-8 pl-4 opacity-50">
              Similar Artists
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 px-4">
              {similarArtists.map((artist) => (
                <div
                  key={artist.id}
                  className="group cursor-pointer flex flex-col items-center text-center"
                  onClick={() => onNavigateToArtist(artist.id)}
                >
                  <div className="relative w-full aspect-square rounded-full overflow-hidden shadow-lg mb-4 border border-white/5 ring-4 ring-primary/0 group-hover:ring-primary/20 transition-all duration-500">
                    <img
                      src={artist.picture_medium}
                      alt={artist.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary truncate w-full">
                    {artist.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function AlbumSkeleton() {
  return (
    <div className="flex flex-col animate-pulse px-6 pt-12 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-12 mb-20">
        <div className="w-64 h-64 md:w-80 md:h-80 bg-white/5 rounded-md" />
        <div className="flex-1 space-y-4 w-full">
          <div className="h-2 w-20 bg-white/5" />
          <div className="h-16 w-3/4 bg-white/5" />
          <div className="h-4 w-1/2 bg-white/5" />
          <div className="h-12 w-40 bg-white/5 rounded-full" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 w-full bg-white/5 rounded-md" />
        ))}
      </div>
    </div>
  );
}

export default AlbumScreen;
