import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const GENRES = [
  {
    id: 132,
    title: "Pop",
    color: "#8D67AB",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC-WsIioEdcZ6hL6gK-uarw5almCgfqoT6Yi683mr58BDF3i6Y9zEe75Kd30gtnzulXY45WVVcQkzC9vWKo4XY6ouK1YvO0VDpqObh67A7iN6wHoUqt0m0_MYuYRoQvkj2GJ_Owi4aLitpbqv2ut1Ati-n-OvdWNfn0e457J9V6Xb98nwSySqylhHWcl249tRnKYzPboz38TDQYrf1L4tPthS-V2K7p5CX3PM2_JeKYMhhKo2olxiz0qrhxyoIBX8iJvNbCpYctjXU",
  },
  {
    id: 116,
    title: "Hip-Hop",
    color: "#BA5D07",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCAgXDRs6X2ikF8j66WzR-033t2j-sgVN7dNpNhYHW-FnEHDCyR_7xYN9Jji1q7sRYhwiYAU4j_0tbX7UTcib9ZWwVTcLsE601HywHJssmgTMAUe-AcuL20_tJVC-ozyoCT0si77jEzm4RwGYRZJLPMTg7jcDH1G1UEabUSiFlC7T3WdmPvrQVZxxloNVGF0z2JMLLLSLBAHVBS3avZg1KqSArEdxBfM9hcxEIIZDVfMTATyZGbo4eACs4bjf0-o9Mc7QWnkgXponU",
  },
  {
    id: 152,
    title: "Rock",
    color: "#E91429",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-IJcQiTHUXIQY1mWGc9HYDfhg_YTz7qfYwiEzXUpwDRxeFHKnAIySmLDiLXSwEpZdvjkFe0_5F8TEVKgkrFzc3cz1l_pTNDBs0nV6ryUikbjr6YslL-kA03pKV51ejC-AtiJZobwzAqM_Hg-t5Ci1bw6iokI4lN68uvC99M_Pmcr3NbFFgKuASHATPGkKo_vGiYjbnigs2XYKWrYepIb3gZC5EA8EFfaNxCFHqixe7Rcy3sjgHtn6I0OS5qWsYkxwF-e8BOY0Tm8",
  },
  {
    id: 165,
    title: "R&B",
    color: "#E13300",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDqgg2X4zOzxNewffjIE3oxPbkBUN1fgQnxYALWOMPIoTfk-qkqsBSv2dXUKD--TZQlHyJk1Le5sMS01PPiZ2Ztu5NKqLsuh8ta3bK9FjHJE7GmRwIVGym6sNCoypLNSp730uWX1zIqiGVssbeA1zmZEvVCHTSYbv1MCLYA9Q_yHQlGev75C-v5mi4OUe_PEZoeXPYo9qic12mLb3XKffg7rAwX_aLsds19vD9pv9kwt5MmWgSn7zysPqiAZ87whn6UykiMir4dUrs",
  },
  {
    id: 113,
    title: "Dance",
    color: "#503750",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCpRLhra_kgCACBLofwwK6lD6qnQrOzI1-zXlnZJjh0xObcHAanrx2_yXybGyIE_kyxOzPAHMUfrynTLNNMP9uGGEAk3y_zUpPnFPEteGvicWzA1jrSnDpO87JAas3XAJTAyy0a5680XP9HworRRnT2bebdhsIUKfRRJ18rE00isvwFu2GwP9Z_LMtDnNUv2t-xLOlVxG1jgajfBQ6MZPKu-vRKEL6fbReVrqtyf4R2WnvWqHKU7ZT46yEBSlDrcqNnej3PSxQu8vw",
  },
  {
    id: 106,
    title: "Electro",
    color: "#27856A",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBG68LJsrCEmRQURVLv47-cv0I5L3fy1titEgtXkbzXiUbF17gdglm4Ddo8QmGXwPXfOvCc1kRFNAbNCE_p3z8Pp5-hD-7sbZPg1wc7xsMvm-fCQNJPSqM_QRUR4q0uTFFXz4JkO4ZnxgS-I8ERuAcJquxL-gBJITG-mv63oQ6z9DnybhbHBO5qbTGbCmbJHGNz3oQU5z5lN80eeCMBTy__jE01j0oEZqCm-mKODmd5LNG__Rzo2IzD2_Xizohnv_UYZMN_zyOpLBE",
  },
];

function SearchScreen({ query, setQuery, onPlayTrack, onSelectGenre }) {
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchSource, setSearchSource] = useState("deezer"); // "ytmusic" or "deezer"
  const [activeCategory, setActiveCategory] = useState("Tracks");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const obsRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 2) {
        setOffset(0);
        setResults([]);
        setHasMore(true);
        performSearch(0, true);
      } else if (query.trim().length === 0) {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Effect to re-search when source changes
  useEffect(() => {
    if (query.trim().length > 2) {
      setOffset(0);
      setResults([]);
      setHasMore(true);
      performSearch(0, true);
    }
  }, [searchSource]);

  const performSearch = async (currentOffset = 0, isNew = false) => {
    if (isNew) {
      setIsSearching(true);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    } else {
      setIsFetchingMore(true);
    }

    const limit = 15;
    const endpoint =
      searchSource === "ytmusic"
        ? `/api/ytmusic/search?q=${encodeURIComponent(query)}&limit=${currentOffset + limit}`
        : `/api/deezer/search?q=${encodeURIComponent(query)}&limit=${limit}&index=${currentOffset}`;

    try {
      const resp = await axios.get(endpoint, {
        signal: isNew ? abortControllerRef.current.signal : undefined,
      });
      const newItems = resp.data.data || [];

      if (searchSource === "ytmusic") {
        setResults(newItems);
        setHasMore(
          newItems.length >= currentOffset + limit && newItems.length < 50,
        );
      } else {
        setResults((prev) => {
          const combined = isNew ? newItems : [...prev, ...newItems];
          const seen = new Set();
          return combined.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });
        setHasMore(newItems.length === limit);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Search request canceled", query);
      } else {
        console.error("Search failed:", err);
      }
    } finally {
      if (isNew) setIsSearching(false);
      else setIsFetchingMore(false);
    }
  };

  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (
        target.isIntersecting &&
        hasMore &&
        !isSearching &&
        !isFetchingMore &&
        query.trim().length > 2
      ) {
        const nextOffset = results.length;
        setOffset(nextOffset);
        performSearch(nextOffset, false);
      }
    },
    [hasMore, isSearching, isFetchingMore, query, results.length],
  );

  useEffect(() => {
    const option = { threshold: 0.1 };
    const observer = new IntersectionObserver(handleObserver, option);
    if (obsRef.current) observer.observe(obsRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="animate-in fade-in duration-700">
      {query.trim().length > 2 ? (
        <div className="space-y-10">
          {/* Header Title */}
          <div>
            <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tighter text-primary mb-8">
              Search Results for{" "}
              <span className="text-secondary opacity-60">"{query}"</span>
            </h1>

            {/* Category Tabs & Source Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-2">
              <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                {[
                  "Tracks",
                  "Videos",
                  "Albums",
                  "Artists",
                  "Playlists",
                  "Podcasts",
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`relative pb-3 text-sm font-black uppercase tracking-widest transition-all duration-300 ${
                      activeCategory === cat
                        ? "text-primary"
                        : "text-secondary opacity-50 hover:opacity-100"
                    }`}
                  >
                    {cat}
                    {activeCategory === cat && (
                      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#E9FF00] shadow-[0_0_10px_rgba(233,255,0,0.5)]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Source Selector (Subtle) */}
              <div className="flex bg-white/5 p-1 rounded-lg self-start">
                {["ytmusic", "deezer"].map((src) => (
                  <button
                    key={src}
                    onClick={() => setSearchSource(src)}
                    className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                      searchSource === src
                        ? "bg-white/10 text-primary shadow-xl"
                        : "text-secondary opacity-50 hover:opacity-100"
                    }`}
                  >
                    {src === "ytmusic" ? "YouTube Music" : "Deezer"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 pb-20">
            {isSearching ? (
              <div className="space-y-1">
                {[...Array(8)].map((_, i) => (
                  <TrackSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1">
                {results.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center group cursor-pointer hover:bg-white/5 p-3 rounded-xl transition-all duration-300 border border-transparent hover:border-white/5"
                    onClick={() => onPlayTrack(track)}
                  >
                    <div className="relative w-14 h-14 flex-shrink-0 mr-5">
                      <img
                        className="w-full h-full rounded-lg object-cover shadow-2xl group-hover:scale-105 transition-transform duration-500"
                        src={
                          track.album?.cover_medium || track.album?.cover_small
                        }
                        alt={track.title}
                      />
                      <div className="absolute inset-0 bg-black/20 rounded-lg group-hover:bg-black/0 transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white fill-icon">
                          play_arrow
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <h3 className="font-bold text-base text-primary truncate tracking-tight">
                        {track.title}
                      </h3>
                      <p className="text-[10px] uppercase font-black tracking-[0.2em] text-secondary truncate mt-1 opacity-70 group-hover:text-primary transition-colors">
                        {track.artist.name}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-8 px-4">
                      <span className="text-[11px] font-bold text-secondary opacity-30">
                        {track.album?.title || "Single"}
                      </span>
                      <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-all duration-300 hover:text-primary active:scale-90">
                        more_vert
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Infinite Scroll Sentinel & Loader */}
          <div ref={obsRef} className="pb-20 pt-4 min-h-[150px]">
            {isFetchingMore && (
              <div className="space-y-1">
                {[...Array(3)].map((_, i) => (
                  <TrackSkeleton key={i} />
                ))}
              </div>
            )}
            {!hasMore && results.length > 0 && (
              <div className="flex justify-center py-10">
                <span className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20">
                  End of results
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Genre Grid */}
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-1000">
            <h2 className="font-headline text-xs font-black uppercase tracking-[0.3em] text-secondary mb-8">
              Browse Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {GENRES.map((genre) => (
                <div
                  key={genre.id}
                  className="relative overflow-hidden rounded-md h-44 md:h-52 group cursor-pointer active:scale-[0.98] transition-all duration-500 border border-white/5"
                  style={{ backgroundColor: genre.color }}
                  onClick={() => onSelectGenre && onSelectGenre(genre)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent opacity-60 group-hover:opacity-20 transition-opacity" />
                  <span className="absolute top-4 left-4 font-black text-2xl uppercase tracking-tighter text-white z-10 drop-shadow-2xl">
                    {genre.title}
                  </span>
                  <img
                    className="absolute -right-6 -bottom-6 w-32 h-32 rotate-[15deg] group-hover:scale-125 group-hover:rotate-[25deg] transition-all duration-700 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
                    src={genre.img}
                    alt={genre.title}
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function TrackSkeleton() {
  return (
    <div className="flex items-center gap-5 p-3 -mx-3 rounded-md animate-pulse">
      <div className="w-12 h-12 bg-white/5 rounded-sm flex-shrink-0"></div>
      <div className="flex flex-col flex-1 gap-3">
        <div className="h-4 bg-white/5 rounded-full w-3/4"></div>
        <div className="h-2 bg-white/5 rounded-full w-1/4"></div>
      </div>
    </div>
  );
}

export default SearchScreen;
