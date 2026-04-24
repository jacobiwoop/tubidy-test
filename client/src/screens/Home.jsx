import React, { useState, useEffect } from "react";
import axios from "axios";
import Section from "../components/Section";
import TrackCard from "../components/TrackCard";

const Home = ({ onPlayTrack, onNavigateToArtist, onNavigateToAlbum }) => {
  const [recommendations, setRecommendations] = useState({
    madeForYou: [],
    recentlyPlayed: [],
    trending: [],
    genres: [
      { id: "pop", name: "Pop", color: "from-pink-500 to-rose-500" },
      { id: "hiphop", name: "Hip Hop", color: "from-blue-600 to-indigo-600" },
      { id: "rock", name: "Rock", color: "from-red-600 to-orange-600" },
      { id: "jazz", name: "Jazz", color: "from-amber-500 to-orange-400" },
      {
        id: "electronic",
        name: "Electronic",
        color: "from-purple-600 to-blue-500",
      },
    ],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Fetch real data from user library for "Recently Played" simulation
        const historyRes = await axios.get("/api/me/library");

        // Mock data for "Trending" and "Made For You" (In a real app, these would come from an API)
        const mockTrending = [
          {
            id: "3135556",
            title: "Starboy",
            artist: "The Weeknd",
            cover_url:
              "https://e-cdns-images.dzcdn.net/images/cover/6a653765187766099ae5dc146522c7f0/250x250-000000-80-0-0.jpg",
          },
          {
            id: "1109731",
            title: "Lose Yourself",
            artist: "Eminem",
            cover_url:
              "https://e-cdns-images.dzcdn.net/images/cover/ed1a24d271f28b4931a7420e6f53ca28/250x250-000000-80-0-0.jpg",
          },
          {
            id: "14013444",
            title: "Blinding Lights",
            artist: "The Weeknd",
            cover_url:
              "https://e-cdns-images.dzcdn.net/images/cover/7778f5f64ee42674e2d36630f699f303/250x250-000000-80-0-0.jpg",
          },
          {
            id: "653112",
            title: "Shape of You",
            artist: "Ed Sheeran",
            cover_url:
              "https://e-cdns-images.dzcdn.net/images/cover/8592fc620ca11f759600a747754955b9/250x250-000000-80-0-0.jpg",
          },
        ];

        setRecommendations({
          ...recommendations,
          recentlyPlayed: historyRes.data.slice(0, 10),
          madeForYou: historyRes.data.reverse().slice(0, 5),
          trending: mockTrending,
        });
      } catch (err) {
        console.error("Failed to fetch home data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="h-12 w-48 bg-white/5 rounded-md mb-8 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square bg-white/5 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="mb-10">
        <h2 className="font-headline font-black text-4xl md:text-5xl tracking-tighter uppercase italic mb-2">
          Hello there
        </h2>
        <p className="text-secondary text-xs font-black uppercase tracking-[0.25em] opacity-60">
          Your daily dose of sound
        </p>
      </header>

      {/* Recommended Section */}
      <Section title="Made for you" onShowAll={() => {}}>
        {recommendations.madeForYou.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            onPlay={onPlayTrack}
            onNavigateToArtist={onNavigateToArtist}
            onNavigateToAlbum={onNavigateToAlbum}
          />
        ))}
        {recommendations.madeForYou.length === 0 && (
          <p className="text-secondary text-sm italic opacity-50">
            Start liking songs to see them here.
          </p>
        )}
      </Section>

      {/* Recently Played */}
      {recommendations.recentlyPlayed.length > 0 && (
        <Section title="Recently Played">
          {recommendations.recentlyPlayed.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              onPlay={onPlayTrack}
              onNavigateToArtist={onNavigateToArtist}
              onNavigateToAlbum={onNavigateToAlbum}
            />
          ))}
        </Section>
      )}

      {/* Trending Section */}
      <Section title="Global Trends">
        {recommendations.trending.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            onPlay={onPlayTrack}
            onNavigateToArtist={onNavigateToArtist}
            onNavigateToAlbum={onNavigateToAlbum}
          />
        ))}
      </Section>

      {/* Explore Genres - Grid style */}
      <section className="mt-12">
        <h2 className="font-headline font-black text-2xl md:text-3xl tracking-tighter uppercase italic mb-6">
          Explore Categories
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {recommendations.genres.map((genre) => (
            <div
              key={genre.id}
              className={`aspect-[16/9] md:aspect-square rounded-xl p-4 bg-gradient-to-br ${genre.color} flex flex-col justify-end cursor-pointer group hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden`}
            >
              <span className="font-headline font-black text-lg md:text-xl uppercase italic tracking-tighter z-10">
                {genre.name}
              </span>
              <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-30 transition-opacity">
                <span className="material-symbols-outlined text-6xl">
                  music_note
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
