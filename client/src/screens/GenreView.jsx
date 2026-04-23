import React, { useState, useEffect } from "react";
import axios from "axios";

function GenreView({ genre, onClose, onPlayTrack }) {
  const [playlists, setPlaylists] = useState([]);
  const [artists, setArtists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [releases, setReleases] = useState([]);
  const [genreInfo, setGenreInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (genre) {
      fetchGenreData();
    }
  }, [genre]);

  const fetchGenreData = async () => {
    setLoading(true);
    try {
      const [infoRes, playlistsRes, artistsRes, tracksRes, releasesRes] =
        await Promise.all([
          axios.get(`/api/deezer/genre/${genre.id}`),
          axios.get(`/api/deezer/genre/${genre.id}/playlists`),
          axios.get(`/api/deezer/genre/${genre.id}/artists`),
          axios.get(`/api/deezer/genre/${genre.id}/tracks`),
          axios.get(`/api/deezer/genre/${genre.id}/releases`),
        ]);

      setGenreInfo(infoRes.data);
      setPlaylists(playlistsRes.data.data || []);
      setArtists(artistsRes.data.data || []);
      setTracks(tracksRes.data.data || []);
      setReleases(releasesRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch genre data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!genre) return null;

  return (
    <div className="fixed inset-0 bg-background z-[60] flex flex-col animate-in slide-in-from-bottom duration-700 overflow-y-auto no-scrollbar pb-32">
      {/* Immersive Hero Header */}
      <section className="relative h-[300px] md:h-[400px] w-full flex items-end px-8 pb-10 overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover scale-110 blur-[60px] opacity-40 translate-y-[-20%]"
            src={genre.img || genreInfo?.picture_xl}
            alt={genre.title}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background"></div>
        </div>

        {/* Back Button Container */}
        <div className="absolute top-10 left-8 z-20 flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-3 bg-white/5 border border-white/5 rounded-full hover:border-white/20 transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-primary text-2xl">
              arrow_back
            </span>
          </button>
          <h2 className="font-black text-[10px] uppercase tracking-[0.4em] text-secondary opacity-60">
            Genre Explorer
          </h2>
        </div>

        {/* Genre Title */}
        <div className="relative z-10 space-y-4">
          <span className="font-black text-xs uppercase tracking-[0.6em] text-primary">
            Curation
          </span>
          <h1 className="font-headline text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.85] text-white">
            {genre.title}
          </h1>
        </div>
      </section>

      {/* Navigation Chips */}
      <div className="px-8 flex gap-3 overflow-x-auto no-scrollbar mb-12">
        {["Playlists", "Trending", "New", "Artists"].map((chip, i) => (
          <button
            key={chip}
            className={`px-6 py-2 rounded-md font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border ${i === 0 ? "bg-primary text-background border-primary" : "bg-surface text-secondary border-white/5 hover:border-white/20 hover:text-primary"}`}
          >
            {chip}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="px-8 container mx-auto">
          {/* Best of Genre: Horizontal Scroll */}
          <section className="mb-20">
            <div className="flex justify-between items-center mb-10">
              <h3 className="font-headline text-xs font-black uppercase tracking-[0.3em] text-secondary">
                Best of {genre.title}
              </h3>
              <button className="font-black text-[10px] uppercase tracking-widest text-primary hover:opacity-80">
                View All
              </button>
            </div>
            <div className="flex gap-8 overflow-x-auto hide-scrollbar pb-4">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex-shrink-0 w-48 group cursor-pointer"
                >
                  <div className="relative mb-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden">
                    <img
                      className="w-full h-full aspect-square object-cover transition-transform duration-1000 group-hover:scale-110"
                      src={pl.picture_medium}
                      alt={pl.title}
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                      <button className="w-12 h-12 bg-primary text-background rounded-full flex items-center justify-center shadow-2xl hover:scale-110">
                        <span className="material-symbols-outlined text-3xl fill-icon">
                          play_arrow
                        </span>
                      </button>
                    </div>
                  </div>
                  <h4 className="font-bold text-sm text-primary mb-1 truncate tracking-tight">
                    {pl.title}
                  </h4>
                  <p className="font-black text-[9px] uppercase tracking-[0.2em] text-secondary opacity-60">
                    {pl.nb_tracks} Tracks
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* New Releases: Asymmetric Style */}
          <section className="mb-20">
            <h3 className="font-headline text-xs font-black uppercase tracking-[0.3em] text-secondary mb-10">
              LATEST RELEASES
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {releases.length > 0 && (
                <div
                  className="col-span-2 relative group rounded-sm overflow-hidden aspect-[16/9] md:aspect-auto md:h-full bg-surface cursor-pointer border border-white/5"
                  onClick={() => onPlayTrack(releases[0])}
                >
                  <img
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
                    src={releases[0].cover_xl || releases[0].album?.cover_xl}
                    alt={releases[0].title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <span className="bg-primary text-background text-[9px] font-black px-3 py-1 rounded-sm w-fit mb-4 uppercase tracking-widest leading-none">
                      Fresh Drop
                    </span>
                    <h4 className="font-headline font-black text-3xl md:text-5xl text-white mb-2 uppercase italic tracking-tighter leading-none">
                      {releases[0].title}
                    </h4>
                    <p className="font-black text-[10px] uppercase tracking-[0.3em] text-secondary">
                      {releases[0].artist?.name || releases[0].artist}
                    </p>
                  </div>
                </div>
              )}
              <div className="col-span-2 md:col-span-1 grid grid-cols-1 gap-6">
                {releases.slice(1, 3).map((rel) => (
                  <div
                    key={rel.id}
                    className="bg-surface border border-white/5 rounded-sm p-4 flex gap-5 group cursor-pointer hover:border-white/20 transition-all duration-500"
                    onClick={() => onPlayTrack(rel)}
                  >
                    <div className="w-20 h-20 rounded-sm overflow-hidden flex-shrink-0 shadow-lg shadow-black/40">
                      <img
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        src={rel.cover_medium || rel.album?.cover_medium}
                        alt={rel.title}
                      />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h5 className="font-bold text-sm text-primary truncate tracking-tight mb-1">
                        {rel.title}
                      </h5>
                      <p className="font-black text-[10px] uppercase tracking-widest text-secondary opacity-60 truncate">
                        {rel.artist?.name || rel.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Popular Artists */}
          <section className="mb-20">
            <h3 className="font-headline text-xs font-black uppercase tracking-[0.3em] text-secondary mb-10">
              Top Artists
            </h3>
            <div className="flex gap-10 overflow-x-auto hide-scrollbar pb-4">
              {artists.map((artist) => (
                <div
                  key={artist.id}
                  className="flex flex-col items-center gap-4 group cursor-pointer"
                >
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 group-hover:border-primary/50 transition-all duration-700">
                    <img
                      className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110"
                      src={artist.picture_medium}
                      alt={artist.name}
                    />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-[0.3em] text-secondary group-hover:text-primary transition-colors text-center max-w-[120px]">
                    {artist.name}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Trending Tracks */}
          <section className="pb-40">
            <h3 className="font-headline text-xs font-black uppercase tracking-[0.3em] text-secondary mb-10">
              Trending {genre.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              {tracks.slice(0, 10).map((track, i) => (
                <div
                  key={track.id}
                  className="flex items-center gap-5 p-3 -mx-3 rounded-md hover:bg-white/5 transition-all duration-300 group cursor-pointer"
                  onClick={() => onPlayTrack(track)}
                >
                  <span className="font-black text-[10px] text-secondary opacity-20 group-hover:opacity-100 w-6 italic">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                      className="w-full h-full rounded-sm object-cover shadow-lg group-hover:scale-105 transition-transform duration-500"
                      src={track.album?.cover_small || track.picture_small}
                      alt={track.title}
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-sm text-primary truncate tracking-tight mb-1">
                      {track.title}
                    </p>
                    <p className="font-black text-[10px] uppercase tracking-widest text-secondary opacity-60 truncate">
                      {track.artist?.name || track.artist}
                    </p>
                  </div>
                  <button className="text-secondary opacity-0 group-hover:opacity-100 hover:text-primary transition-all">
                    <span className="material-symbols-outlined text-xl">
                      play_circle
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default GenreView;
