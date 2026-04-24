import React from "react";

const QueueSidebar = ({
  isOpen,
  onClose,
  queue,
  currentTrack,
  onPlayTrackAt,
  onRemoveTrackAt,
  onClearQueue,
}) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed right-0 top-0 h-screen w-full md:w-[450px] bg-[#0A0A0A]/95 border-l border-white/5 z-[110] flex flex-col transition-transform duration-500 ease-in-out shadow-2xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="font-headline font-black text-2xl uppercase tracking-tight italic">
            Queue
          </h2>
          <div className="flex items-center gap-4 text-secondary">
            <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors text-xl">
              download
            </span>
            <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors text-xl">
              favorite
            </span>
            <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors text-xl">
              edit_note
            </span>
            <span
              className="material-symbols-outlined hover:text-red-500 cursor-pointer transition-colors text-xl"
              onClick={onClearQueue}
            >
              delete
            </span>
            <span
              className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors text-2xl ml-4"
              onClick={onClose}
            >
              close
            </span>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
              <span className="material-symbols-outlined text-6xl mb-4">
                queue_music
              </span>
              <p className="font-black uppercase tracking-widest text-xs">
                Queue is empty
              </p>
            </div>
          ) : (
            queue.map((track, index) => {
              const isPlaying = currentTrack && track.id === currentTrack.id;

              return (
                <div
                  key={`${track.id}-${index}`}
                  className={`group flex items-center gap-4 p-3 rounded-xl transition-all duration-300 border border-transparent ${isPlaying ? "bg-white/10 border-white/10" : "hover:bg-white/5"}`}
                >
                  {/* Reorder Handle */}
                  <span className="material-symbols-outlined text-secondary opacity-20 group-hover:opacity-60 cursor-grab active:cursor-grabbing">
                    drag_handle
                  </span>

                  {/* Thumbnail */}
                  <div
                    className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden shadow-lg"
                    onClick={() => onPlayTrackAt(index)}
                  >
                    <img
                      src={
                        track.album?.cover_medium || track.album?.cover_small
                      }
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    {isPlaying && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => onPlayTrackAt(index)}
                  >
                    <p
                      className={`text-sm font-bold truncate ${isPlaying ? "text-primary" : "text-white"}`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-secondary truncate opacity-60 font-medium">
                      {track.artist?.name}
                    </p>
                  </div>

                  {/* Meta & Actions */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-secondary opacity-40 group-hover:hidden">
                      {Math.floor(track.duration / 60)}:
                      {(track.duration % 60).toString().padStart(2, "0")}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary hover:text-primary transition-colors text-lg cursor-pointer">
                        favorite
                      </span>
                      <span
                        className="material-symbols-outlined text-secondary hover:text-red-500 transition-colors text-lg cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrackAt(index);
                        }}
                      >
                        delete
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Now Playing Footer (Optional context) */}
        {currentTrack && (
          <div className="p-6 bg-white/5 border-t border-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary opacity-40 mb-3">
              Playing Now
            </p>
            <div className="flex items-center gap-4">
              <img
                src={currentTrack.album?.cover_small}
                className="w-8 h-8 rounded"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">
                  {currentTrack.title}
                </p>
                <p className="text-[10px] text-secondary truncate">
                  {currentTrack.artist?.name}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default QueueSidebar;
