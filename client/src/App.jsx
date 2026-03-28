import React, { useState } from "react";
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Library,
  Play,
  Pause,
  Heart,
  Clock,
  Bell,
} from "lucide-react";
import "./App.css";

// Mock Data for initial design
const SHORTCUTS = [
  {
    id: 1,
    title: "Techno Bunker",
    img: "https://images.unsplash.com/photo-1514525253361-bee8718a74a7?w=300&h=300&fit=crop",
  },
  {
    id: 2,
    title: "Jazz Classics",
    img: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=300&h=300&fit=crop",
  },
  {
    id: 3,
    title: "Rock Anthems",
    img: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&h=300&fit=crop",
  },
  {
    id: 4,
    title: "Ambient",
    img: "https://images.unsplash.com/photo-1444464666168-49d633b867ad?w=300&h=300&fit=crop",
  },
  {
    id: 5,
    title: "Top 50 - Global",
    img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
  },
  {
    id: 6,
    title: "Mood Booster",
    img: "https://images.unsplash.com/photo-1517230878791-4d28214057c2?w=300&h=300&fit=crop",
  },
];

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [isPlaying, setIsPlaying] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="home-view">
            <header className="home-header">
              <div className="header-avatar"></div>
              <div className="header-icons">
                <Bell size={24} />
                <Clock size={24} />
              </div>
            </header>

            <div className="filter-pills">
              <button className="pill active">All</button>
              <button className="pill">Music</button>
              <button className="pill">Podcasts</button>
            </div>

            <h2 className="section-title">Good morning</h2>
            <div className="grid-shortcut">
              {SHORTCUTS.map((item) => (
                <div key={item.id} className="card-shortcut">
                  <img src={item.img} alt={item.title} />
                  <span className="text-truncate">{item.title}</span>
                </div>
              ))}
            </div>

            <h2 className="section-title">Made for you</h2>
            <div className="carousel">
              {/* Carousels will be implemented in detail later */}
              <div className="card-item placeholder"></div>
              <div className="card-item placeholder"></div>
            </div>
          </div>
        );
      case "search":
        return (
          <div className="placeholder-view">Search Screen (Coming Soon)</div>
        );
      case "library":
        return (
          <div className="placeholder-view">Library Screen (Coming Soon)</div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <main className="main-content">{renderContent()}</main>

      {/* MiniPlayer */}
      <div className="mini-player">
        <div className="mini-player-info">
          <img
            className="mini-player-img"
            src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop"
            alt="Playing"
          />
          <div className="mini-player-text">
            <p className="mini-player-title text-truncate">Levitating</p>
            <p className="mini-player-artist text-truncate">Dua Lipa</p>
          </div>
        </div>
        <div className="mini-player-controls">
          <Heart
            size={20}
            className="clickable"
            color="#1DB954"
            fill="#1DB954"
          />
          <button onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? (
              <Pause size={24} fill="white" />
            ) : (
              <Play size={24} fill="white" />
            )}
          </button>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: "35%" }}></div>
        </div>
      </div>

      {/* TabBar */}
      <nav className="tab-bar">
        <button
          className={`tab-item ${activeTab === "home" ? "active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          <HomeIcon size={24} />
          <span>Home</span>
        </button>
        <button
          className={`tab-item ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          <SearchIcon size={24} />
          <span>Search</span>
        </button>
        <button
          className={`tab-item ${activeTab === "library" ? "active" : ""}`}
          onClick={() => setActiveTab("library")}
        >
          <Library size={24} />
          <span>Your Library</span>
        </button>
        <button className="tab-item">
          <div className="premium-icon">P</div>
          <span>Premium</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
