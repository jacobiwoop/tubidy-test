import React from "react";

const TrackCard = ({
  track,
  onPlay,
  onNavigateToArtist,
  onNavigateToAlbum,
}) => {
  return (
    <div
      className="w-40 md:w-48 flex-shrink-0 group cursor-pointer"
      onClick={() => onPlay(track)}
    >
      <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-2xl border border-white/5">
        <img
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          src={
            track.album?.cover_medium ||
            track.cover_url ||
            "https://e-cdns-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg"
          }
          alt={track.title}
          loading="lazy"
          onClick={(e) => {
            if (track.album?.id && onNavigateToAlbum) {
              e.stopPropagation();
              onNavigateToAlbum(track.album.id);
            }
          }}
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500" />

        {/* Floating Play Button */}
        <div className="absolute bottom-3 right-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button className="bg-primary text-background p-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform">
            <span className="material-symbols-outlined fill-icon text-2xl">
              play_arrow
            </span>
          </button>
        </div>
      </div>

      <div className="px-1 flex justify-between items-start mt-3">
        <div className="truncate pr-2">
          <h3 className="font-bold text-sm truncate tracking-tight text-primary">
            {track.title}
          </h3>
          <p
            className="text-secondary text-[10px] uppercase tracking-widest mt-1 opacity-70 font-black truncate hover:text-primary transition-colors hover:underline decoration-1 underline-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              if (track.artist?.id && onNavigateToArtist) {
                onNavigateToArtist(track.artist.id);
              }
            }}
          >
            {track.artist?.name || track.artist}
          </p>
        </div>
        <button className="text-secondary hover:text-primary transition-colors p-1 -mr-1">
          <span className="material-symbols-outlined text-lg">more_vert</span>
        </button>
      </div>
    </div>
  );
};

export default TrackCard;
