import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { usePlayer } from '../player/PlayerContext';
import { isLiked, toggleLike, useLibrary } from '../library';
import { pushSearch, useSearchHistory } from '../searchHistory';
import { artistPath, duration } from '../format';
import * as I from './Icons';
import { DownloadButton } from './Common';
import Lyrics from './Lyrics';
import LyricLine from './LyricLine';
import { useLyrics, useServerLyrics } from '../player/lyricsStore';

const NAV = [
  { to: '/', label: 'Découvrir', icon: I.Discover, end: true },
  { to: '/charts', label: 'Charts', icon: I.Charts },
  { to: '/browse', label: 'Parcourir', icon: I.Browse },
  { to: '/search', label: 'Recherche', icon: I.Search },
];

export default function Shell() {
  const [panel, setPanel] = useState(null); // 'queue' | null
  const [npOpen, setNpOpen] = useState(null); // null | 'cover' | 'lyrics' (vue de départ sur téléphone)
  const { toast, current } = usePlayer();
  const { pathname } = useLocation();
  useServerLyrics(current); // paroles cherchées dès le début du titre, pour la barre comme pour le grand lecteur
  useEffect(() => { window.scrollTo(0, 0); setNpOpen(null); }, [pathname]);

  return (
    <div className="app">
      <TopBar />
      <OfflineBanner />
      <div className="body">
        <nav className="sidebar" aria-label="Navigation principale">
          <div className="nav-group">
            <div className="nav-label">PARCOURIR</div>
            {NAV.map(({ to, label, icon, end }) => {
              const Icon = icon;
              return <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={22} />{label}</NavLink>;
            })}
          </div>
          <div className="nav-group" style={{ borderTop: '1px solid #1c1c1c', paddingTop: 20 }}>
            <div className="nav-label">MA MUSIQUE</div>
            <NavLink to="/library" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} style={{ fontSize: 15 }}><I.Heart size={20} />Titres aimés</NavLink>
            <NavLink to="/library?tab=recent" className="nav-link" style={{ fontSize: 15 }}><I.Clock size={20} />Écoutés récemment</NavLink>
          </div>
        </nav>
        <main className="main" id="contenu">
          <Outlet />
        </main>
      </div>
      <nav className="bottomnav" aria-label="Navigation">
        {NAV.map(({ to, label, icon, end }) => {
          const Icon = icon;
          return <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}><Icon size={22} />{label}</NavLink>;
        })}
        <NavLink to="/library" className={({ isActive }) => (isActive ? 'active' : '')}><I.Library size={22} />Biblio</NavLink>
      </nav>
      <PlayerBar panel={panel} onPanel={(p) => setPanel((cur) => (cur === p ? null : p))} onExpand={(view) => setNpOpen(view)} />
      {panel === 'queue' && <QueueDrawer onClose={() => setPanel(null)} />}
      {npOpen && <NowPlaying startOnLyrics={npOpen === 'lyrics'} onClose={() => setNpOpen(null)} onQueue={() => { setNpOpen(null); setPanel('queue'); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function TopBar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const [q, setQ] = useState(pathname === '/search' ? params.get('q') || '' : '');
  useEffect(() => { if (pathname === '/search') setQ(params.get('q') || ''); }, [pathname, params]);
  // Recherche au fil de la frappe, une fois la saisie posée.
  useEffect(() => {
    const term = q.trim();
    if (!term || (pathname === '/search' && term === (params.get('q') || ''))) return;
    const t = setTimeout(() => navigate(`/search?q=${encodeURIComponent(term)}`, { replace: pathname === '/search' }), 450);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  // Recherches récentes sous la barre, tant qu'elle a le focus ; filtrées par ce qui est tapé.
  const history = useSearchHistory();
  const [open, setOpen] = useState(false);
  const typed = q.trim().toLowerCase();
  const suggestions = history.filter((s) => s.toLowerCase().includes(typed) && s.toLowerCase() !== typed).slice(0, 8);
  const go = (term) => {
    setQ(term);
    setOpen(false);
    pushSearch(term);
    document.activeElement?.blur();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };
  return (
    <header className="topbar">
      <Link to="/" className="logo" aria-label="Spotywoop, accueil"><I.Logo /><span>spotywoop</span></Link>
      <form role="search" className="searchbox" onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(q.trim()); }}>
        <label htmlFor="q" className="sr-only">Rechercher</label>
        <I.Search size={20} />
        <input id="q" type="search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} placeholder="Artistes, titres, albums…" autoComplete="off"
          onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
          aria-expanded={open && suggestions.length > 0} aria-controls="search-suggest" />
        {open && suggestions.length > 0 && (
          <ul className="search-suggest" id="search-suggest" aria-label="Recherches récentes"
            onMouseDown={(e) => e.preventDefault() /* garde le focus dans la barre */}>
            {suggestions.map((t) => (
              <li key={t}><button type="button" onClick={() => go(t)}><I.Clock size={16} />{t}</button></li>
            ))}
          </ul>
        )}
      </form>
      <div className="topbar-actions">
        <InstallButton />
        <Link to="/library" className="btn btn-ghost" style={{ height: 44 }}><I.Heart size={18} />Ma musique</Link>
      </div>
    </header>
  );
}

function SourceLine({ source, status }) {
  if (status === 'loading') return <div className="pb-source loading">Recherche de la meilleure source…</div>;
  if (!source) return null;
  if (source.provider === 'local') return <div className="pb-source"><I.Download size={12} />Téléchargé · lu sans réseau</div>;
  const name = source.provider === 'audiomack' ? 'Audiomack' : source.provider === 'tubidy' ? 'Tubidy' : source.provider;
  const q = source.format === 'm4a' ? 'M4A jusqu\'à 256 kbit/s' : source.format === 'mp3' ? 'MP3 128 kbit/s' : source.format?.toUpperCase();
  return <div className="pb-source"><I.Live size={12} />En ligne · {name} · {q}</div>;
}

function Progress({ time, length, seek }) {
  const pct = length ? Math.min(100, (time / length) * 100) : 0;
  return (
    <div className="pb-progress">
      <span>{duration(time) || '0:00'}</span>
      <input type="range" className="range" min="0" max={length || 0} step="1" value={Math.min(time, length || 0)} style={{ '--pct': `${pct}%` }}
        aria-label="Position dans le titre" onChange={(e) => seek(Number(e.target.value))} disabled={!length} />
      <span>{duration(length) || '0:00'}</span>
    </div>
  );
}

function PlayerBar({ panel, onPanel, onExpand }) {
  const p = usePlayer();
  const lib = useLibrary();
  const lyrics = useLyrics();
  const t = p.current;
  if (!t) return null;
  const playing = p.status === 'playing' || p.status === 'loading';
  // La ligne en cours prend la place du curseur de volume quand il y a des paroles minutées (ou qu'on les cherche).
  const showLyric = lyrics.status === 'searching' || (lyrics.status === 'found' && lyrics.level < 2);
  // Un clic sur la barre, hors boutons et curseurs, ouvre le grand lecteur.
  const openFromBar = (e) => {
    if (!e.target.closest('button:not(.pb-expand), input, a, .pb-vol-pop')) onExpand('cover');
  };
  return (
    <footer className="playerbar" aria-label="Lecteur" onClick={openFromBar}>
      <div className="pb-track">
        <button type="button" className="pb-expand" aria-label="Ouvrir le lecteur" onClick={() => onExpand('cover')} />
        {t.image ? <img src={t.image} alt="" /> : <span style={{ width: 54, height: 54 }} />}
        <div className="pb-info">
          <span className="pb-title">{t.title}</span>
          <span className="pb-artist">{t.artist}</span>
          <SourceLine source={p.source} status={p.status} />
        </div>
        <button type="button" className={`icon-btn hide-mobile${isLiked(lib, t.id) ? ' on' : ''}`} style={{ position: 'relative', zIndex: 1 }}
          aria-pressed={isLiked(lib, t.id)} aria-label={isLiked(lib, t.id) ? 'Retirer des titres aimés' : 'Aimer ce titre'} onClick={() => toggleLike(t)}>
          <I.Heart size={18} filled={isLiked(lib, t.id)} />
        </button>
      </div>
      <div className="pb-center">
        <div className="pb-controls">
          <button type="button" className={`icon-btn hide-mobile${p.shuffle ? ' on' : ''}`} aria-pressed={p.shuffle} aria-label="Lecture aléatoire" onClick={p.toggleShuffle}><I.Shuffle size={18} /></button>
          <button type="button" className="icon-btn hide-mobile" aria-label="Titre précédent" onClick={p.prev}><I.Prev size={20} /></button>
          <button type="button" className="play-btn" aria-label={playing ? 'Pause' : 'Lecture'} onClick={p.toggle}>{playing ? <I.Pause size={20} /> : <I.Play size={20} />}</button>
          <button type="button" className="icon-btn" aria-label="Titre suivant" onClick={p.next}><I.Next size={20} /></button>
          <button type="button" className={`icon-btn hide-mobile${p.repeat !== 'off' ? ' on' : ''}`} aria-label={`Répétition : ${p.repeat === 'off' ? 'désactivée' : p.repeat === 'all' ? 'toute la file' : 'ce titre'}`} onClick={p.cycleRepeat}><I.Repeat size={18} one={p.repeat === 'one'} /></button>
        </div>
        <Progress time={p.time} length={p.length} seek={p.seek} />
      </div>
      <div className="pb-right">
        {showLyric && <LyricLine onOpen={() => onExpand('lyrics')} />}
        <div className={`pb-vol${showLyric ? ' pop' : ''}`}>
          <button type="button" className="icon-btn" aria-label={p.volume ? 'Couper le son' : 'Remettre le son'} onClick={() => p.setVolume(p.volume ? 0 : 1)}><I.Volume size={20} muted={!p.volume} /></button>
          <span className="pb-vol-pop">
            <input type="range" className="range pb-volume" min="0" max="1" step="0.02" value={p.volume} style={{ '--pct': `${p.volume * 100}%` }} aria-label="Volume" onChange={(e) => p.setVolume(Number(e.target.value))} />
          </span>
        </div>
        <button type="button" className="icon-btn" aria-label="Paroles" onClick={() => onExpand('lyrics')}><I.Mic size={20} /></button>
        <button type="button" className={`icon-btn${panel === 'queue' ? ' on' : ''}`} aria-pressed={panel === 'queue'} aria-label="File d'attente" onClick={() => onPanel('queue')}><I.Queue size={20} /></button>
      </div>
    </footer>
  );
}

function QueueDrawer({ onClose }) {
  const p = usePlayer();
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  const upcoming = p.queue.map((t, i) => ({ t, i })).filter(({ i }) => i > p.index);
  return (
    <aside className="drawer" aria-label="File d'attente">
      <div className="drawer-head">
        <div>
          <h2 style={{ fontSize: 18 }}>File d'attente</h2>
          {p.context?.label && <div className="faint" style={{ fontSize: 13 }}>{p.context.label}</div>}
        </div>
        <button type="button" className="icon-btn" aria-label="Fermer la file d'attente" onClick={onClose}><I.Close size={20} /></button>
      </div>
      <div className="drawer-body">
        {p.current && <div className="nav-label" style={{ padding: '8px 8px 4px' }}>EN COURS</div>}
        {p.current && <QueueItem t={p.current} current />}
        <div className="nav-label" style={{ padding: '14px 8px 4px' }}>ENSUITE</div>
        {upcoming.length === 0 && <p className="faint" style={{ padding: '4px 8px', margin: 0, fontSize: 14 }}>La radio prendra le relais à la fin de la file.</p>}
        {upcoming.map(({ t, i }) => (
          <div key={`${t.id}-${i}`} style={{ display: 'flex', alignItems: 'center' }}>
            <QueueItem t={t} onClick={() => p.playAt(i)} />
            <button type="button" className="icon-btn" aria-label={`Retirer ${t.title} de la file`} onClick={() => p.removeAt(i)}><I.Close size={16} /></button>
          </div>
        ))}
      </div>
    </aside>
  );
}

function QueueItem({ t, current, onClick }) {
  return (
    <button type="button" className={`qitem${current ? ' current' : ''}`} onClick={onClick} disabled={current}>
      {t.image ? <img src={t.image} alt="" /> : <span style={{ width: 44, height: 44 }} />}
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ font: '700 14px var(--display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: current ? 'var(--accent)' : 'var(--text)' }}>{t.title}</span>
        <span className="faint" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</span>
      </span>
      <span className="faint" style={{ marginLeft: 'auto', fontSize: 12 }}>{duration(t.duration)}</span>
    </button>
  );
}

function NowPlaying({ onClose, onQueue, startOnLyrics }) {
  const p = usePlayer();
  const lib = useLibrary();
  const t = p.current;
  // Sur téléphone, un seul des deux à la fois : la pochette ou les paroles.
  const [lyricsView, setLyricsView] = useState(startOnLyrics);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    // La page derrière ne défile plus tant que l'écran de lecture est ouvert.
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);
  if (!t) return null;
  const playing = p.status === 'playing' || p.status === 'loading';
  const cover = t.image?.replace('width=300', 'width=640');
  return (
    <div className={`nowplaying${lyricsView ? ' np-lyrics-view' : ''}`} role="dialog" aria-modal="true" aria-label="Lecteur">
      {cover && <img className="np-bg" src={cover} alt="" />}
      <div className="np-top">
        <button type="button" className="icon-btn" aria-label="Réduire le lecteur" onClick={onClose}><I.ChevronDown size={24} /></button>
        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <div className="nav-label" style={{ padding: 0 }}>{p.context?.label ? 'LECTURE EN COURS' : 'EN LECTURE'}</div>
          <div style={{ font: '700 14px var(--display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.context?.label || t.album || ''}</div>
        </div>
        <button type="button" className="icon-btn" aria-label="File d'attente" onClick={onQueue}><I.Queue size={20} /></button>
      </div>
      <div className="np-body">
        <div className="np-side">
          {cover && <img className="np-cover" src={cover} alt="" />}
          <div className="np-meta">
            {lyricsView && cover && <img className="np-thumb" src={cover} alt="" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="np-title">{t.title}</div>
              <Link to={artistPath(t.artistRef, t.artist)} className="np-artist" onClick={onClose}>{t.artist}</Link>
            </div>
            <button type="button" className={`icon-btn${isLiked(lib, t.id) ? ' on' : ''}`} aria-pressed={isLiked(lib, t.id)} aria-label="Aimer ce titre" onClick={() => toggleLike(t)}><I.Heart size={24} filled={isLiked(lib, t.id)} /></button>
          </div>
          <Progress time={p.time} length={p.length} seek={p.seek} />
          <div className="np-controls">
            <button type="button" className={`icon-btn${p.shuffle ? ' on' : ''}`} aria-pressed={p.shuffle} aria-label="Lecture aléatoire" onClick={p.toggleShuffle}><I.Shuffle size={22} /></button>
            <button type="button" className="icon-btn" aria-label="Titre précédent" onClick={p.prev}><I.Prev size={30} /></button>
            <button type="button" className="np-play" aria-label={playing ? 'Pause' : 'Lecture'} onClick={p.toggle}>{playing ? <I.Pause size={30} /> : <I.Play size={30} />}</button>
            <button type="button" className="icon-btn" aria-label="Titre suivant" onClick={p.next}><I.Next size={30} /></button>
            <button type="button" className={`icon-btn${p.repeat !== 'off' ? ' on' : ''}`} aria-label="Répétition" onClick={p.cycleRepeat}><I.Repeat size={22} one={p.repeat === 'one'} /></button>
          </div>
          <div className="np-actions">
            <SourceLine source={p.source} status={p.status} />
            <button type="button" className={`btn btn-ghost np-lyrics-toggle${lyricsView ? ' on' : ''}`} style={{ height: 40 }} aria-pressed={lyricsView} onClick={() => setLyricsView((v) => !v)}><I.Mic size={18} />Paroles</button>
            <button type="button" className="btn btn-ghost" style={{ height: 40 }} onClick={() => p.startRadio({ track: t })}><I.Radio size={18} />Radio</button>
            <DownloadButton track={t} />
          </div>
        </div>
        <section className="np-lyrics" aria-label="Paroles"><Lyrics /></section>
      </div>
    </div>
  );
}

// Bandeau quand le téléphone n'a plus de réseau : seuls les titres téléchargés se lisent.
function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <I.Offline size={16} />Hors ligne · <Link to="/library?tab=downloads">tes titres téléchargés</Link> restent disponibles
    </div>
  );
}

// « Installer l'appli » quand le navigateur le propose (Chrome, Edge, Android) ; sur iPhone, voir Ma musique.
function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  useEffect(() => {
    const keep = (e) => { e.preventDefault(); setPrompt(e); };
    const done = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', keep);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', keep); window.removeEventListener('appinstalled', done); };
  }, []);
  if (!prompt) return null;
  return (
    <button type="button" className="btn btn-ghost" style={{ height: 44 }} onClick={() => { prompt.prompt(); prompt.userChoice.finally(() => setPrompt(null)); }}>
      <I.Download size={18} />Installer l'appli
    </button>
  );
}
