import React, { useState, useEffect } from "react";
import axios from "axios";
import Section from "../components/Section";
import TrackCard from "../components/TrackCard";

const ArtistScreen = ({
  artistId,
  onPlayTrack,
  onNavigateToArtist,
  likedTrackIds,
}) => {
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [relatedArtists, setRelatedArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBio, setShowBio] = useState(false);

  useEffect(() => {
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        const [artistRes, topRes, albumsRes, relatedRes] = await Promise.all([
          axios.get(`/api/deezer/artist/${artistId}`),
          axios.get(`/api/deezer/artist/${artistId}/top`),
          axios.get(`/api/deezer/artist/${artistId}/albums`),
          axios.get(`/api/deezer/artist/${artistId}/related`),
        ]);

        setArtist(artistRes.data);
        setTopTracks(topRes.data.data || []);
        setAlbums(albumsRes.data.data || []);
        setRelatedArtists(relatedRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch artist data", err);
      } finally {
        setLoading(false);
      }
    };

    if (artistId) fetchArtistData();
  }, [artistId]);

  if (loading) {
    return <ArtistSkeleton />;
  }

  if (!artist) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-5 duration-1000 pb-32">
      {/* Header Immersif */}
      <header className="relative mb-12 -mx-4 md:-mx-12 h-[400px] md:h-[500px] flex flex-col justify-end p-8 md:p-16 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-30"
          style={{ backgroundImage: `url(${artist.picture_xl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-10">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/5 ring-4 ring-primary/10">
            <img
              src={artist.picture_xl}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col items-center md:items-start flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary fill-icon text-sm">
                verified
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-70">
                Verified Artist
              </span>
            </div>
            <h1 className="font-headline font-black text-6xl md:text-8xl xl:text-[7rem] tracking-tighter uppercase italic leading-[0.8] mb-8 drop-shadow-2xl text-primary">
              {artist.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4">
              <button
                className="bg-primary text-background px-8 py-3.5 rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10"
                onClick={() => onPlayTrack(topTracks[0])}
              >
                Play Mixer
              </button>
              <button className="bg-surface border border-white/5 hover:border-white/10 text-primary px-8 py-3.5 rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all">
                Shuffle
              </button>
              <button className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-2xl">
                  favorite
                </span>
              </button>
              <button className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-2xl">
                  more_horiz
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-16">
          {/* Popular Tracks */}
          <Section title="Popular Tracks" onShowAll={() => {}}>
            <div className="space-y-1 w-full">
              {topTracks.map((track, i) => (
                <div
                  key={track.id}
                  className="flex items-center group cursor-pointer hover:bg-white/5 p-3 -mx-3 rounded-xl transition-all duration-300"
                  onClick={() => onPlayTrack(track)}
                >
                  <span className="w-8 text-xs font-black text-secondary/30 group-hover:text-primary transition-colors">
                    {i + 1}
                  </span>
                  <div className="w-12 h-12 rounded-lg overflow-hidden mr-5 shadow-lg">
                    <img
                      src={track.album.cover_small}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col flex-1 truncate">
                    <h4 className="font-bold text-base text-primary truncate tracking-tight">
                      {track.title}
                    </h4>
                    <span className="text-[10px] uppercase font-black tracking-widest text-secondary opacity-50">
                      {track.rank?.toLocaleString()} listens
                    </span>
                  </div>
                  <div className="flex items-center gap-10">
                    <span className="text-[11px] font-bold text-secondary opacity-30 hidden md:block">
                      {Math.floor(track.duration / 60)}:
                      {(track.duration % 60).toString().padStart(2, "0")}
                    </span>
                    <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-all hover:text-primary">
                      more_horiz
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Albums */}
          <Section title="Albums" onShowAll={() => {}}>
            {albums.map((album) => (
              <div
                key={album.id}
                className="w-40 md:w-48 flex-shrink-0 group cursor-pointer"
              >
                <div className="aspect-square rounded-xl overflow-hidden mb-4 shadow-2xl border border-white/5">
                  <img
                    src={album.cover_medium}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <h4 className="font-bold text-sm text-primary truncate tracking-tight mb-1">
                  {album.title}
                </h4>
                <p className="text-[10px] uppercase font-black tracking-widest text-secondary opacity-50">
                  {new Date(album.release_date).getFullYear()}
                </p>
              </div>
            ))}
          </Section>
        </div>

        {/* Sidebar Info */}
        <aside className="space-y-12">
          {/* Similar Artists */}
          <section>
            <h3 className="font-headline font-black text-xl tracking-tighter uppercase italic mb-6">
              Similar Artists
            </h3>
            <div className="space-y-6">
              {relatedArtists.slice(0, 5).map((related) => (
                <div
                  key={related.id}
                  className="flex items-center gap-4 group cursor-pointer"
                  onClick={() => onNavigateToArtist(related.id)}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg border border-white/5">
                    <img
                      src={related.picture_medium}
                      alt={related.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <span className="font-bold text-sm text-primary group-hover:text-[#E9FF00] transition-colors">
                    {related.name}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Stats / Info */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/5">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary opacity-50 block mb-1">
                  Fan Base
                </span>
                <p className="font-headline text-2xl font-black text-primary tracking-tighter italic uppercase">
                  {artist.nb_fan?.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary opacity-50 block mb-1">
                  Total Albums
                </span>
                <p className="font-headline text-2xl font-black text-primary tracking-tighter italic uppercase">
                  {artist.nb_album}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const ArtistSkeleton = () => (
  <div className="animate-pulse pb-32">
    <div className="h-[400px] md:h-[500px] bg-white/5 -mx-4 md:-mx-12 mb-12 flex flex-col justify-end p-8 md:p-16">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
        <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-white/5 shadow-2xl" />
        <div className="flex flex-col items-center md:items-start flex-1">
          <div className="h-6 w-32 bg-white/5 rounded-full mb-6" />
          <div className="h-20 w-3/4 bg-white/5 rounded-xl mb-10" />
          <div className="flex gap-4">
            <div className="h-12 w-32 bg-white/5 rounded-full" />
            <div className="h-12 w-32 bg-white/5 rounded-full" />
          </div>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
      <div className="lg:col-span-2 space-y-16">
        <div className="h-10 w-48 bg-white/5 rounded-md mb-8" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl w-full" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default ArtistScreen;
