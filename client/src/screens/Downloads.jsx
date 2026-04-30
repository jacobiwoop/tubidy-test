import React from "react";

function DownloadsScreen({ activeDownloads, onPlayTrack, currentTrack, isPlaying }) {
  const downloadIds = Object.keys(activeDownloads);

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <div className="mb-10">
        <h1 className="font-headline text-5xl font-black tracking-tighter uppercase italic leading-none mb-2">
          Downloads
        </h1>
        <p className="font-black text-[10px] uppercase tracking-[0.4em] text-secondary opacity-60">
          Current activity & queue
        </p>
      </div>

      <div className="space-y-6">
        {downloadIds.length > 0 ? (
          <div className="space-y-4">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-primary mb-4">
              Active Tasks ({downloadIds.length})
            </h2>
            {downloadIds.map((id) => (
              <div key={id} className="bg-surface/50 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-primary">downloading</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">Track ID: {id}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300" 
                        style={{ width: `${activeDownloads[id]}%` }}
                      ></div>
                    </div>
                    <span className="text-primary font-black text-[10px] tabular-nums">
                      {activeDownloads[id]}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-surface/30 border border-dashed border-white/10 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-secondary opacity-20 mb-4">
              cloud_done
            </span>
            <p className="font-black text-[10px] uppercase tracking-[0.2em] text-secondary opacity-40">
              No active downloads
            </p>
          </div>
        )}
      </div>

      <div className="mt-12">
        <p className="text-secondary text-[9px] leading-relaxed opacity-40">
          Tip: You can find all your completed downloads in the <span className="text-primary">Library &gt; Offline Downloads</span> section.
        </p>
      </div>
    </div>
  );
}

export default DownloadsScreen;
