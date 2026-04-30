import React from "react";

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, activeDownloads = {} }) => {
  const menuItems = [
    { id: "home", label: "Home", icon: "home" },
    { id: "library", label: "Library", icon: "library_music" },
    { id: "downloads", label: "Downloads", icon: "downloading" },
    { id: "recent", label: "Recent", icon: "history" },
    { id: "unreleased", label: "Unreleased", icon: "grid_view" },
    { id: "donate", label: "Donate", icon: "volunteer_activism" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  const socialItems = [
    { label: "Parties", icon: "groups" },
    { label: "About", icon: "info" },
    { label: "Discord", icon: "forum" },
    { label: "GitHub", icon: "code" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-[#0A0A0A] border-r border-white/5 z-[60] p-6 overflow-y-auto no-scrollbar transition-transform duration-500 w-72 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-xl fill-icon text-white">
                antigravity
              </span>
            </div>
            <h1 className="font-headline font-black text-xl tracking-tighter uppercase italic">
              Spotiwoop
            </h1>
          </div>
          <span
            className="material-symbols-outlined text-secondary hover:text-primary cursor-pointer transition-colors"
            onClick={onClose}
          >
            chevron_left
          </span>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1 mb-10">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${isActive ? "nav-item-active-accent" : ""}`}
              >
                <span
                  className={`material-symbols-outlined text-2xl ${isActive ? "fill-icon" : ""}`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.id === "downloads" && Object.keys(activeDownloads).length > 0 && (
                  <span className="ml-auto bg-primary text-background text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {Object.keys(activeDownloads).length}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        <div className="mt-auto">
          {/* Status Alert from screenshot */}
          <div className="bg-[#1C1800] border border-[#E9FF00]/20 rounded-xl p-4 mb-8 relative group">
            <span className="material-symbols-outlined text-[10px] absolute top-2 right-2 text-[#E9FF00]/50 hover:text-[#E9FF00] cursor-pointer">
              close
            </span>
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-[#E9FF00] text-sm mt-0.5">
                warning
              </span>
              <div className="flex flex-col">
                <span className="text-[#E9FF00] text-[10px] font-black uppercase tracking-widest leading-tight mb-1">
                  Services unstable
                </span>
                <p className="text-[#E9FF00]/70 text-[9px] leading-relaxed">
                  Use the extension for the best experience.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="flex flex-col gap-2">
            {socialItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-4 px-4 py-2 text-secondary hover:text-primary transition-all cursor-pointer group"
              >
                <span className="material-symbols-outlined text-xl opacity-60 group-hover:opacity-100">
                  {item.icon}
                </span>
                <span className="text-xs font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
