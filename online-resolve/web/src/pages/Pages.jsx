import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../useApi';
import { usePlayer } from '../player/PlayerContext';
import { createPlaylist, deletePlaylist, useLibrary } from '../library';
import { clearDownloads, storageInfo, useDownloads } from '../downloads';
import { clearSearches, pushSearch, removeSearch, useSearchHistory } from '../searchHistory';
import { CardGrid, Chips, DownloadAllButton, ErrorState, Explicit, Loading, Section, TrackList } from '../components/Common';
import { usePlayCard } from './Browse';
import { artistPath, compact, date, flag, full, totalDuration } from '../format';
import * as I from '../components/Icons';

// ---------- Recherche (Spotify) ----------

const TABS = [
  { value: 'all', label: 'Tout' }, { value: 'tracks', label: 'Titres' }, { value: 'albums', label: 'Albums' },
  { value: 'artists', label: 'Artistes' }, { value: 'playlists', label: 'Playlists' },
];

export function Search() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const tab = params.get('tab') || 'all';
  const { data, error, loading, retry } = useApi(q ? 'search' : null, { q });
  const playCard = usePlayCard();
  const player = usePlayer();
  if (!q) return <RecentSearches />;
  // Spotify n'ordonne pas toujours les artistes par pertinence : le meilleur résultat est l'artiste
  // nommé dans la recherche, sinon le premier titre.
  const norm = (s) => ` ${s.toLowerCase().normalize('NFD').replace(/\p{Mn}+/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
  const top = data?.artists?.find((a) => norm(q).includes(norm(a.title)));
  const topTrack = !top ? data?.tracks?.[0] : null;
  return (
    // Une recherche entre dans l'historique quand on ouvre un de ses résultats (ou par Entrée dans la barre),
    // pas à chaque étape de la frappe.
    <div style={{ display: 'contents' }} onClickCapture={() => pushSearch(q)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 className="page-title">Résultats pour « {q} »</h1>
        <Chips label="Type de résultat" items={TABS} value={tab} onChange={(t) => setParams({ q, ...(t !== 'all' && { tab: t }) })} />
      </div>
      {error && <ErrorState error={error} retry={retry} />}
      {loading && !data && <Loading rows={8} />}
      {data && tab === 'all' && (
        <>
          <div className="two-col">
            {top && (
              <section style={{ flex: '2 1 300px' }} aria-labelledby="h-best" className="section">
                <h2 className="section-title" id="h-best">Meilleur résultat</h2>
                <Link to={artistPath(top.ref)} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text)' }}>
                  {top.image && <img src={top.image} alt="" style={{ width: 120, height: 120, borderRadius: 999, objectFit: 'cover' }} />}
                  <span style={{ font: '800 30px var(--display)' }}>{top.title}</span>
                  <span className="chip" style={{ alignSelf: 'flex-start', height: 30, display: 'inline-flex', alignItems: 'center', fontSize: 12, letterSpacing: '0.06em' }}>ARTISTE</span>
                </Link>
              </section>
            )}
            {topTrack && (
              <section style={{ flex: '2 1 300px' }} aria-labelledby="h-best" className="section">
                <h2 className="section-title" id="h-best">Meilleur résultat</h2>
                <button type="button" className="panel" onClick={() => player.playList([topTrack], 0, { continuous: true, label: `Radio · ${topTrack.title}` })}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}>
                  {topTrack.image && <img src={topTrack.image} alt="" style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover' }} />}
                  <span style={{ font: '800 30px var(--display)' }}>{topTrack.title}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-2)' }}>
                    {topTrack.explicit && <Explicit />}{topTrack.artist}
                    <span className="chip" style={{ height: 30, display: 'inline-flex', alignItems: 'center', fontSize: 12, letterSpacing: '0.06em' }}>TITRE</span>
                  </span>
                </button>
              </section>
            )}
            <section style={{ flex: '3 1 440px' }} className="section" aria-labelledby="h-stracks">
              <div className="section-head"><h2 className="section-title" id="h-stracks">Titres</h2><Link className="section-link" to={`/search?q=${encodeURIComponent(q)}&tab=tracks`}>Tout voir</Link></div>
              <TrackList tracks={data.tracks.slice(0, 6)} showAlbum={false} numbered={false} solo />
            </section>
          </div>
          {data.albums.length > 0 && <Section title="Albums" id="h-salb"><CardGrid cards={data.albums.slice(0, 8)} onPlay={playCard} /></Section>}
          {data.artists.length > 1 && <Section title="Artistes" id="h-sart"><CardGrid cards={data.artists.slice(0, 8)} /></Section>}
          {data.playlists.length > 0 && <Section title="Playlists" id="h-spl"><CardGrid cards={data.playlists.slice(0, 8)} onPlay={playCard} /></Section>}
        </>
      )}
      {data && tab === 'tracks' && <TrackList tracks={data.tracks} solo />}
      {data && tab === 'albums' && <CardGrid cards={data.albums} onPlay={playCard} />}
      {data && tab === 'artists' && <CardGrid cards={data.artists} />}
      {data && tab === 'playlists' && <CardGrid cards={data.playlists} onPlay={playCard} />}
      {data && !data.tracks.length && !data.albums.length && !data.artists.length && <div className="state">Aucun résultat.</div>}
    </div>
  );
}

// Page Recherche sans terme : les recherches récentes de ce navigateur.
function RecentSearches() {
  const history = useSearchHistory();
  return (
    <div className="state" style={{ alignItems: 'stretch', textAlign: 'left' }}>
      <h1 className="page-title" style={{ marginBottom: 8 }}>Recherche</h1>
      {history.length === 0 ? <p>Cherche un titre, un artiste ou un album dans la barre en haut.</p> : (
        <section aria-labelledby="h-recent">
          <div className="recent-head">
            <h2 className="section-title" id="h-recent">Recherches récentes</h2>
            <button type="button" className="btn btn-ghost" onClick={clearSearches}>Tout effacer</button>
          </div>
          <ul className="recent-searches">
            {history.map((t) => (
              <li key={t}>
                <Link to={`/search?q=${encodeURIComponent(t)}`}><I.Clock size={18} /><span>{t}</span></Link>
                <button type="button" aria-label={`Retirer « ${t} » de l'historique`} onClick={() => removeSearch(t)}><I.Close size={16} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---------- Album et playlist ----------

export function CollectionPage({ kind }) {
  const { ref } = useParams();
  const { data, error, loading, retry } = useApi(kind, { ref });
  const player = usePlayer();
  if (error) return <ErrorState error={error} retry={retry} />;
  if (loading || !data) return <Loading rows={10} />;
  const meta = [
    data.subtitle && (data.subtitleRef || kind === 'album'
      ? <Link key="a" to={artistPath(data.subtitleRef, data.subtitle)} style={{ color: 'var(--text)', fontWeight: 700 }}>{data.subtitle}</Link>
      : <span key="a">{data.subtitle}</span>),
    data.date && <span key="d">{date(data.date)}</span>,
    <span key="n">{data.totalTracks || data.tracks.length} titres{data.tracks.length ? `, ${totalDuration(data.tracks)}` : ''}</span>,
    data.plays ? <span key="p">{compact(data.plays)} écoutes</span> : null,
    data.followers ? <span key="f">{full(data.followers)} abonnés</span> : null,
  ].filter(Boolean);
  const label = data.title;
  return (
    <>
      <section className="hero" aria-labelledby="h-coll">
        {data.image && <img className="hero-img" src={data.image} alt="" />}
        <div className="hero-body">
          <div className="hero-kicker">{kind === 'album' ? 'Album' : 'Playlist'}</div>
          <h1 id="h-coll" className="hero-title">{data.title}</h1>
          {data.description && <p className="muted" style={{ margin: 0 }}>{data.description}</p>}
          <div className="hero-meta">{meta.map((m, i) => <span key={i} style={{ display: 'contents' }}>{i > 0 && <span className="dot" aria-hidden="true">•</span>}{m}</span>)}</div>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => player.playList(data.tracks, 0, { continuous: true, label })} disabled={!data.tracks.length}><I.Play size={18} />Écouter</button>
            <button type="button" className="btn btn-ghost" onClick={() => { player.playList(data.tracks, Math.floor(Math.random() * data.tracks.length), { continuous: true, label }); if (!player.shuffle) player.toggleShuffle(); }} disabled={!data.tracks.length}><I.Shuffle size={18} />Aléatoire</button>
            <DownloadAllButton tracks={data.tracks} />
          </div>
          {data.label && <div className="faint" style={{ fontSize: 13 }}>{data.label}{data.copyright ? ` · ${data.copyright}` : ''}</div>}
        </div>
      </section>
      <TrackList tracks={data.tracks} showAlbum={kind !== 'album'} context={label} />
      {data.totalTracks > data.tracks.length && <p className="faint" style={{ textAlign: 'center' }}>{data.tracks.length} titres affichés sur {data.totalTracks}.</p>}
    </>
  );
}

// ---------- Artiste (Spotify + suggestions Audiomack) ----------

export function Artist() {
  const { ref } = useParams();
  const { data, error, loading, retry } = useApi('artist', { ref });
  const player = usePlayer();
  const playCard = usePlayCard();
  if (error) return <ErrorState error={error} retry={retry} />;
  if (loading || !data) return <Loading rows={10} />;
  return (
    <>
      <section className="artist-hero" aria-labelledby="h-artist">
        {data.banner && <img className="banner" src={data.banner} alt="" />}
        <div className="artist-hero-body">
          {data.image && <img className="artist-avatar" src={data.image} alt="" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="hero-kicker">Artiste</div>
            <h1 id="h-artist" className="hero-title">{data.name}</h1>
            <div style={{ color: '#e5e5e5' }}>
              {data.monthlyListeners ? `${full(data.monthlyListeners)} auditeurs mensuels` : ''}
              {data.followers ? ` · ${full(data.followers)} abonnés` : ''}
            </div>
          </div>
        </div>
      </section>
      <div className="hero-actions" style={{ marginTop: -16 }}>
        <button type="button" className="btn btn-primary" onClick={() => player.playList(data.topTracks, 0, { continuous: true, label: data.name })} disabled={!data.topTracks.length}><I.Play size={18} />Écouter</button>
        <button type="button" className="btn btn-ghost" onClick={() => player.startRadio({ artist: data.name })}><I.Radio size={18} />Radio de l'artiste</button>
      </div>
      <Section title="Titres populaires" id="h-pop"><TrackList tracks={data.topTracks} context={data.name} /></Section>
      {data.albums.length > 0 && <Section title="Albums" id="h-albums"><CardGrid cards={data.albums} onPlay={playCard} /></Section>}
      {data.singles.length > 0 && <Section title="Singles et EP" id="h-singles"><CardGrid cards={data.singles} onPlay={playCard} scroll /></Section>}
      {data.related.length > 0 && <Section title="Artistes similaires" id="h-related"><CardGrid cards={data.related.slice(0, 12)} /></Section>}
      {(data.bio || data.topCities?.length) && (
        <div className="two-col">
          {data.bio && (
            <Section title="À propos" id="h-about">
              <div className="panel" style={{ maxWidth: 760 }}>
                <p style={{ margin: 0, lineHeight: 1.6, color: '#d4d4d4', whiteSpace: 'pre-line' }}>{data.bio}</p>
                {data.links?.length > 0 && (
                  <div className="chips" style={{ marginTop: 16 }}>
                    {data.links.map((l) => <a key={l.url} className="chip" href={l.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center' }}>{l.name.charAt(0) + l.name.slice(1).toLowerCase()}</a>)}
                  </div>
                )}
              </div>
            </Section>
          )}
          {data.topCities?.length > 0 && (
            <Section title="Où on l'écoute" id="h-cities">
              <ol className="panel" style={{ margin: 0, paddingLeft: 40, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
                {data.topCities.map((c) => <li key={c.city}>{flag(c.country) && <span role="img" aria-label={c.country} style={{ marginRight: 8 }}>{flag(c.country)}</span>}<strong>{c.city}</strong> <span className="faint">· {full(c.listeners)} auditeurs</span></li>)}
              </ol>
            </Section>
          )}
        </div>
      )}
    </>
  );
}

// ---------- Bibliothèque locale ----------

export function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'liked';
  const lib = useLibrary();
  const dl = useDownloads();
  const downloaded = [...dl.items.values()].sort((a, b) => b.savedAt - a.savedAt).map((i) => i.track);
  const list = tab === 'recent' ? lib.recent : tab === 'downloads' ? downloaded : lib.liked;
  const player = usePlayer();
  const [newName, setNewName] = useState('');
  const empty = {
    recent: 'Rien écouté pour le moment.',
    liked: 'Aucun titre aimé. Touche le cœur à côté d\'un titre pour le retrouver ici.',
    downloads: 'Aucun titre téléchargé. Ouvre le menu ⋯ d\'un titre, ou la flèche du grand lecteur, pour l\'écouter sans réseau.',
  }[tab];
  return (
    <>
      <h1 className="page-title">MA MUSIQUE</h1>
      <Chips label="Bibliothèque" items={[
        { value: 'liked', label: `Titres aimés (${lib.liked.length})` },
        { value: 'downloads', label: `Téléchargés (${dl.items.size})` },
        { value: 'recent', label: 'Écoutés récemment' },
        { value: 'playlists', label: `Playlists (${lib.playlists.length})` },
      ]} value={tab} onChange={(t) => setParams(t === 'liked' ? {} : { tab: t })} />
      {tab === 'downloads' && <DownloadsInfo count={dl.items.size} />}
      {tab === 'playlists' && (
        <>
          <form className="modal-new" style={{ maxWidth: 480, margin: '18px 0' }} onSubmit={(e) => { e.preventDefault(); if (newName.trim()) { createPlaylist(newName); setNewName(''); } }}>
            <label className="sr-only" htmlFor="lib-pl-name">Nom de la nouvelle playlist</label>
            <input id="lib-pl-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nouvelle playlist" />
            <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>Créer</button>
          </form>
          {lib.playlists.length === 0
            ? <div className="state">Aucune playlist. Crée-en une ici, ou depuis le menu ⋯ d'un titre.</div>
            : <div className="pl-list">{lib.playlists.map((p) => (
              <Link key={p.id} to={`/my-playlist/${p.id}`} className="pl-row">
                {p.tracks[0]?.image ? <img src={p.tracks[0].image} alt="" loading="lazy" /> : <span className="pl-empty"><I.Queue size={24} /></span>}
                <span><strong>{p.name}</strong><span className="faint">{p.tracks.length} titre{p.tracks.length > 1 ? 's' : ''}</span></span>
              </Link>
            ))}</div>}
        </>
      )}
      {tab === 'liked' && lib.liked.length > 0 && (
        <div className="hero-actions" style={{ margin: '18px 0' }}>
          <button type="button" className="btn btn-primary" onClick={() => player.playList(lib.liked, 0, { continuous: true, label: 'Titres aimés' })}><I.Play size={18} />Lecture</button>
          <DownloadAllButton tracks={lib.liked} />
        </div>
      )}
      {tab !== 'playlists' && (list.length === 0
        ? <div className="state">{empty}</div>
        : <TrackList tracks={list} context={{ recent: 'Écoutés récemment', liked: 'Titres aimés', downloads: 'Téléchargés' }[tab]} />)}
      <p className="faint" style={{ fontSize: 13 }}>Ta bibliothèque et tes téléchargements sont enregistrés dans ce navigateur.</p>
    </>
  );
}

// Playlist de l'utilisateur : même page qu'un album.
export function UserPlaylistPage() {
  const { id } = useParams();
  const lib = useLibrary();
  const player = usePlayer();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const p = lib.playlists.find((x) => x.id === id);
  if (!p) return <div className="state">Cette playlist n'existe pas dans ce navigateur. <Link to="/library?tab=playlists">Mes playlists</Link></div>;
  const label = p.name;
  return (
    <>
      <section className="hero" aria-labelledby="h-mypl">
        {p.tracks[0]?.image ? <img className="hero-img" src={p.tracks[0].image} alt="" /> : <span className="hero-img pl-empty"><I.Queue size={64} /></span>}
        <div className="hero-body">
          <div className="hero-kicker">Playlist</div>
          <h1 id="h-mypl" className="hero-title">{p.name}</h1>
          <div className="hero-meta"><span>{p.tracks.length} titre{p.tracks.length > 1 ? 's' : ''}{p.tracks.length ? `, ${totalDuration(p.tracks)}` : ''}</span></div>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => player.playList(p.tracks, 0, { continuous: true, label })} disabled={!p.tracks.length}><I.Play size={18} />Lecture</button>
            <button type="button" className="btn btn-ghost" onClick={() => { player.playList(p.tracks, Math.floor(Math.random() * p.tracks.length), { continuous: true, label }); if (!player.shuffle) player.toggleShuffle(); }} disabled={!p.tracks.length}><I.Shuffle size={18} />Aléatoire</button>
            <DownloadAllButton tracks={p.tracks} />
            {confirming
              ? <button type="button" className="btn btn-ghost" style={{ color: '#ff6b6b' }} onClick={() => { deletePlaylist(p.id); navigate('/library?tab=playlists'); }}>Confirmer la suppression</button>
              : <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>Supprimer</button>}
          </div>
        </div>
      </section>
      {p.tracks.length === 0
        ? <div className="state">Aucun titre. Ajoute-en depuis le menu ⋯ d'un titre.</div>
        : <TrackList tracks={p.tracks} context={label} playlistId={p.id} />}
    </>
  );
}

const mb = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} Go` : `${Math.round(n / 1e6)} Mo`);

// Place occupée, place accordée par le navigateur, et comment installer l'appli (indispensable sur iPhone).
function DownloadsInfo({ count }) {
  const [info, setInfo] = useState(null);
  const player = usePlayer();
  useEffect(() => { storageInfo().then(setInfo); }, [count]);
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return (
    <div className="dl-info">
      {info && (
        <p>
          {count} titre{count > 1 ? 's' : ''} · {mb(info.used)}{info.quota ? ` sur ${mb(info.quota)} disponibles` : ''}
          {info.persisted === false && ' · le navigateur peut effacer ces fichiers s\'il manque de place'}
        </p>
      )}
      {ios && !installed && <p className="dl-tip">Sur iPhone, ajoute Spotywoop à l'écran d'accueil (bouton Partager, puis « Sur l'écran d'accueil ») : tes téléchargements y sont bien mieux gardés.</p>}
      {count > 0 && (
        <button type="button" className="btn btn-ghost" style={{ height: 36 }}
          onClick={() => { if (window.confirm('Supprimer tous les titres téléchargés de ce téléphone ?')) clearDownloads().then(() => player.notify('Téléchargements supprimés.')); }}>
          Tout supprimer
        </button>
      )}
    </div>
  );
}
