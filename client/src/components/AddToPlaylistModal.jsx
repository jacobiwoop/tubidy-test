import React from "react";

function AddToPlaylistModal({
  track,
  playlists,
  isLiked,
  onClose,
  onToggleLike,
  onAddToPlaylist,
  onCreatePlaylist,
}) {
  if (!track) return null;

  return (
    <div
      className="fixed inset-0 z-[2200] bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#181818] w-full max-w-md sm:rounded-2xl rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-[100%] sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-surface-container-highest rounded-full mx-auto mb-6 opacity-50 sm:hidden"></div>

        <h2 className="font-headline text-xl font-bold mb-6 text-center text-white">
          Save to...
        </h2>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 mb-6">
          {/* Liked Songs Option */}
          <div
            onClick={() => {
              onToggleLike(track);
              onClose();
            }}
            className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl cursor-pointer transition-colors active:scale-95"
          >
            <div
              className={`w-14 h-14 rounded-lg flex items-center justify-center relative shadow-lg overflow-hidden transition-all ${isLiked ? "bg-gradient-to-br from-[#450af5] to-[#c4efd9]" : "bg-surface-container-high"}`}
            >
              <span
                className={`material-symbols-outlined text-3xl ${isLiked ? "text-white fill-icon" : "text-on-surface-variant"}`}
              >
                favorite
              </span>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <h3
                className={`font-body font-bold text-base truncate ${isLiked ? "text-primary" : "text-white"}`}
              >
                Liked Songs
              </h3>
              <p className="font-label text-sm text-on-surface-variant truncate">
                Private • Default List
              </p>
            </div>
            {isLiked && (
              <span className="material-symbols-outlined text-primary">
                check_circle
              </span>
            )}
          </div>

          <div className="h-px bg-white/5 mx-2 my-2"></div>

          {/* User Playlists */}
          {playlists.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4 text-sm italic">
              No custom playlists yet.
            </p>
          ) : (
            playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => {
                  onAddToPlaylist(pl.id, track);
                  onClose();
                }}
                className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl cursor-pointer transition-colors active:scale-95"
              >
                <div className="w-14 h-14 rounded-lg bg-surface-container-high flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-on-surface-variant text-3xl">
                    music_note
                  </span>
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  <h3 className="font-body text-base font-semibold text-on-surface truncate">
                    {pl.name}
                  </h3>
                  <p className="font-label text-sm text-on-surface-variant truncate">
                    Playlist • Spotiwoop
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Playlist Button */}
        <button
          onClick={() => {
            onClose();
            onCreatePlaylist();
          }}
          className="w-full bg-surface-container-high hover:bg-white/10 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          New Playlist
        </button>
      </div>
    </div>
  );
}

export default AddToPlaylistModal;
