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
    <div className="fixed inset-0 bg-surface z-[60] flex flex-col animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar pb-32">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-primary active:scale-95 duration-200 hover:bg-[#393939] p-2 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline text-lg font-bold tracking-tight text-primary">
            {genre.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-primary-container font-black text-xl">
            Genre Explorer
          </span>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative h-64 w-full flex items-end px-6 pb-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover opacity-60"
            src={genre.img || genreInfo?.picture_xl}
            alt={genre.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent"></div>
        </div>
        <div className="relative z-10">
          <span className="label-sm text-on-surface-variant font-medium tracking-widest uppercase mb-2 block">
            Curation
          </span>
          <h2 className="text-display-lg font-headline font-extrabold text-5xl md:text-7xl tracking-tighter text-white">
            {genre.title}
          </h2>
        </div>
      </section>

      {/* Navigation Chips */}
      <div className="px-6 flex gap-3 overflow-x-auto hide-scrollbar my-8">
        {["All Playlists", "Trending", "New Releases", "Artists"].map(
          (chip, i) => (
            <button
              key={chip}
              className={`px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all active:scale-95 ${i === 0 ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface hover:bg-surface-bright"}`}
            >
              {chip}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Best of Genre: Horizontal Scroll */}
          <section className="mb-16">
            <div className="px-6 flex justify-between items-end mb-6">
              <h3 className="font-headline font-bold text-2xl tracking-tight text-white">
                Best of {genre.title}
              </h3>
              <button className="text-primary text-sm font-bold hover:underline">
                See all
              </button>
            </div>
            <div className="flex gap-6 overflow-x-auto px-6 hide-scrollbar">
              {playlists.map((pl) => (
                <div key={pl.id} className="flex-shrink-0 w-48">
                  <div className="relative group mb-4">
                    <img
                      className="w-48 h-48 rounded-xl object-cover shadow-2xl transition-transform duration-300 group-hover:scale-105"
                      src={pl.picture_medium}
                      alt={pl.title}
                    />
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                      <button className="w-12 h-12 bg-primary-container text-on-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-3xl fill-icon">
                          play_arrow
                        </span>
                      </button>
                    </div>
                  </div>
                  <h4 className="font-headline font-bold text-white mb-1 truncate">
                    {pl.title}
                  </h4>
                  <p className="font-label text-on-surface-variant text-[11px] font-medium tracking-wide uppercase">
                    {pl.nb_tracks} Tracks
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Popular Artists */}
          <section className="mb-16 bg-surface-container-low py-10">
            <div className="px-6 mb-8">
              <h3 className="font-headline font-bold text-2xl tracking-tight text-white">
                Popular Artists
              </h3>
            </div>
            <div className="flex gap-8 overflow-x-auto px-6 hide-scrollbar">
              {artists.map((artist) => (
                <div
                  key={artist.id}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-32 h-32 rounded-full overflow-hidden shadow-xl ring-2 ring-primary/20 hover:ring-primary transition-all duration-300">
                    <img
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                      src={artist.picture_medium}
                      alt={artist.name}
                    />
                  </div>
                  <span className="font-body font-bold text-sm text-white group-hover:text-primary transition-colors">
                    {artist.name}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* New Releases: Asymmetric Style inspired by template */}
          <section className="px-6 mb-16">
            <h3 className="font-headline font-bold text-2xl tracking-tight text-white mb-8">
              New Releases
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {releases.length > 0 && (
                <div
                  className="col-span-2 relative group rounded-xl overflow-hidden aspect-[16/9] bg-surface-container-high cursor-pointer"
                  onClick={() => onPlayTrack(releases[0])}
                >
                  <img
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                    src={releases[0].cover_xl || releases[0].album?.cover_xl}
                    alt={releases[0].title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                    <span className="bg-primary text-black text-[10px] font-bold px-2 py-1 rounded w-fit mb-2 uppercase">
                      Fresh Out
                    </span>
                    <h4 className="font-headline font-extrabold text-2xl text-white mb-1">
                      {releases[0].title}
                    </h4>
                    <p className="font-body text-sm text-on-surface-variant">
                      {releases[0].artist?.name || releases[0].artist} • New
                      Release
                    </p>
                  </div>
                </div>
              )}
              {releases.slice(1, 3).map((rel) => (
                <div
                  key={rel.id}
                  className="bg-surface-container rounded-xl p-4 flex flex-col gap-3 group cursor-pointer"
                  onClick={() => onPlayTrack(rel)}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:rotate-3 transition-transform"
                      src={rel.cover_medium || rel.album?.cover_medium}
                      alt={rel.title}
                    />
                  </div>
                  <div>
                    <h5 className="font-body font-bold text-white text-sm truncate">
                      {rel.title}
                    </h5>
                    <p className="font-label text-on-surface-variant text-xs truncate">
                      {rel.artist?.name || rel.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Trending Tracks */}
          <section className="px-6 mb-16">
            <h3 className="font-headline font-bold text-2xl tracking-tight text-white mb-8">
              Trending Tracks
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tracks.slice(0, 10).map((track, i) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-surface-bright transition-colors group cursor-pointer"
                  onClick={() => onPlayTrack(track)}
                >
                  <span className="font-body font-medium text-on-surface-variant w-4">
                    {i + 1}
                  </span>
                  <img
                    className="w-12 h-12 rounded-md object-cover shadow-sm bg-surface-container"
                    src={track.album?.cover_small || track.picture_small}
                    alt={track.title}
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-body font-bold text-white text-sm truncate">
                      {track.title}
                    </p>
                    <p className="font-label text-on-surface-variant text-xs truncate">
                      {track.artist?.name || track.artist}
                    </p>
                  </div>
                  <button className="text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                    <span className="material-symbols-outlined">
                      play_circle
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default GenreView;
