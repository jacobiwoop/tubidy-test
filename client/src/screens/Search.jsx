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

function SearchScreen({ onPlayTrack, onSelectGenre }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchSource, setSearchSource] = useState("deezer"); // "ytmusic" or "deezer"
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const obsRef = useRef(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length > 2) {
        setOffset(0);
        setResults([]);
        setHasMore(true);
        performSearch(0, true);
      } else if (query.length === 0) {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Effect to re-search when source changes
  useEffect(() => {
    if (query.length > 2) {
      setOffset(0);
      setResults([]);
      setHasMore(true);
      performSearch(0, true);
    }
  }, [searchSource]);

  const performSearch = async (currentOffset = 0, isNew = false) => {
    if (isNew) setIsSearching(true);
    else setIsFetchingMore(true);

    const limit = 15;
    const endpoint =
      searchSource === "ytmusic"
        ? `/api/ytmusic/search?q=${encodeURIComponent(query)}&limit=${currentOffset + limit}`
        : `/api/deezer/search?q=${encodeURIComponent(query)}&limit=${limit}&index=${currentOffset}`;

    try {
      const resp = await axios.get(endpoint);
      const newItems = resp.data.data || [];

      if (searchSource === "ytmusic") {
        // YTMusic bridge currently returns the whole list, so we replace
        setResults(newItems);
        setHasMore(
          newItems.length >= currentOffset + limit && newItems.length < 50,
        );
      } else {
        setResults((prev) => {
          const combined = isNew ? newItems : [...prev, ...newItems];
          // Uniqueify by ID
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
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
      setIsFetchingMore(false);
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
        query.length > 2
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
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      {/* Search Bar Section */}
      <section className="mb-8">
        <div className="flex items-center bg-surface-container-lowest rounded-lg px-4 py-3 gap-3 focus-within:bg-surface-container-highest transition-all duration-300">
          <span className="material-symbols-outlined text-on-surface-variant">
            search
          </span>
          <input
            className="bg-transparent border-none focus:ring-0 w-full text-on-surface placeholder:text-on-surface-variant font-medium outline-none"
            placeholder="What do you want to listen to?"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <span
              className="material-symbols-outlined text-on-surface-variant cursor-pointer"
              onClick={() => setQuery("")}
            >
              close
            </span>
          )}
        </div>
      </section>

      {/* Source Selector Chips */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSearchSource("ytmusic")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            searchSource === "ytmusic"
              ? "bg-primary text-on-primary shadow-lg scale-105"
              : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          YouTube Music
        </button>
        <button
          onClick={() => setSearchSource("deezer")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            searchSource === "deezer"
              ? "bg-[#00C7F2] text-white shadow-lg scale-105"
              : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          Deezer
        </button>
      </div>

      {query.length > 2 ? (
        <div className="space-y-4">
          <h2 className="font-headline text-lg font-bold tracking-tight">
            Search results
          </h2>
          {isSearching ? (
            <div className="grid grid-cols-1 gap-1">
              {[...Array(6)].map((_, i) => (
                <TrackSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {results.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 group cursor-pointer hover:bg-surface-container-low/50 p-2 -mx-2 rounded-xl transition-all"
                  onClick={() => onPlayTrack(track)}
                >
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                      className="w-full h-full rounded-md object-cover shadow-md"
                      src={track.album.cover_small}
                      alt={track.title}
                    />
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <h3 className="font-body font-semibold text-sm text-on-surface truncate">
                      {track.title}
                    </h3>
                    <p className="font-label text-xs text-on-surface-variant truncate">
                      {track.artist.name}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                    more_vert
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel & Loader */}
          <div ref={obsRef} className="pb-10 pt-2 min-h-[100px]">
            {isFetchingMore && (
              <div className="grid grid-cols-1 gap-1">
                {[...Array(3)].map((_, i) => (
                  <TrackSkeleton key={i} />
                ))}
              </div>
            )}
            {!hasMore && results.length > 0 && (
              <div className="flex justify-center py-8">
                <span className="text-xs text-on-surface-variant/50 font-medium italic">
                  You've reached the end
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Recent Searches (Mock) */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-lg font-bold tracking-tight">
                Recent searches
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              <div className="flex flex-col items-center gap-2 min-w-[100px] group transition-transform active:scale-95">
                <div className="relative w-20 h-20">
                  <img
                    className="w-full h-full rounded-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWmuXF2XJABFSt_P_HTztxlDgZh_wVETOp-_-Bs0ygjWiCqMXv6dN8cQWJbFvsU7aC5_y5hZsqRwr11lEBt2RE-n-e7ok3gSA-LEKGgBWZszw3x7H8lnjpUZlHCckIXhji8exe9FROZjZFDrq4yE1oRF7F3LDJXuZe6vqGi0OQnHvNqr534L_HkLmavElN9u6gv1sL2E_LVL456lZxuQniNsYX6w6J5R0TBJ6WiO3_QM8l8ViELApE2WrzwqUsHbAy1c_35wGhnCs"
                    alt="Recent"
                  />
                </div>
                <span className="text-xs font-semibold text-on-surface text-center truncate w-full">
                  Techno Mix
                </span>
              </div>
              {/* Add more recent items here if needed */}
            </div>
          </section>

          {/* Genre Grid */}
          <section>
            <h2 className="font-headline text-xl font-extrabold tracking-tight mb-6">
              Browse all
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {GENRES.map((genre) => (
                <div
                  key={genre.id}
                  className="relative overflow-hidden rounded-xl h-40 md:h-48 p-4 group cursor-pointer active:scale-95 transition-transform"
                  style={{ backgroundColor: genre.color }}
                  onClick={() => onSelectGenre && onSelectGenre(genre)}
                >
                  <span className="font-headline text-xl font-bold text-white relative z-10">
                    {genre.title}
                  </span>
                  <img
                    className="absolute -right-4 -bottom-4 w-24 h-24 rotate-12 group-hover:scale-110 transition-transform duration-300 shadow-xl"
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
    <div className="flex items-center gap-4 p-2 -mx-2 rounded-xl animate-pulse">
      <div className="w-12 h-12 bg-surface-container-high rounded-md flex-shrink-0"></div>
      <div className="flex flex-col flex-1 gap-2">
        <div className="h-4 bg-surface-container-high rounded-full w-3/4"></div>
        <div className="h-3 bg-surface-container-high/50 rounded-full w-1/2"></div>
      </div>
    </div>
  );
}

export default SearchScreen;
