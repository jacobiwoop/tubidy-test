import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './styles.css';
import { PlayerProvider } from './player/PlayerContext';
import Shell from './components/Shell';
import { BrowsePage, Category, Charts, Discover } from './pages/Browse';
import { Artist, CollectionPage, LibraryPage, Search } from './pages/Pages';

function NotFound() {
  return <div className="state"><h1 className="page-title">Page introuvable</h1></div>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PlayerProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Discover />} />
            <Route path="charts" element={<Charts />} />
            <Route path="browse" element={<BrowsePage />} />
            <Route path="category/:slug" element={<Category />} />
            <Route path="search" element={<Search />} />
            <Route path="album/:ref" element={<CollectionPage kind="album" />} />
            <Route path="playlist/:ref" element={<CollectionPage kind="playlist" />} />
            <Route path="artist/:ref" element={<Artist />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </PlayerProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Service worker (site disponible hors ligne) : seulement sur le site construit, pas avec le serveur de dev.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
