import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../player/PlayerContext';
import { isLiked, toggleLike, useLibrary } from '../library';
import { download, removeDownload, useDownloads } from '../downloads';
import { artistPath, compact, duration, pagePath } from '../format';
import * as I from './Icons';

export const Explicit = () => <span className="explicit" aria-label="Explicite" title="Explicite">E</span>;

export function Trend({ change }) {
  if (change === undefined || change === null || change === '') return null;
  const n = String(change).replace(/^[+-]/, '');
  if (String(change).startsWith('+')) return <span className="trend up" aria-label={`En hausse de ${n}`}><I.Up size={12} />{n}</span>;
  if (String(change).startsWith('-')) return <span className="trend down" aria-label={`En baisse de ${n}`}><I.Down size={12} />{n}</span>;
  return null; // position inchangée : rien à signaler
}

export function Section({ title, link, linkTo, children, id }) {
  return (
    <section className="section" aria-labelledby={id}>
      <div className="section-head">
        <h2 className="section-title" id={id}>{title}</h2>
        {linkTo && <Link className="section-link" to={linkTo}>{link || 'Tout voir'}</Link>}
      </div>
      {children}
    </section>
  );
}

export function Chips({ items, value, onChange, label, light }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.value} type="button" className={`chip${light ? ' light' : ''}${it.value === value ? ' active' : ''}`}
          aria-pressed={it.value === value} onClick={() => onChange(it.value)}>{it.label}</button>
      ))}
    </div>
  );
}

export function Loading({ rows = 6, grid = false }) {
  if (grid) {
    return (
      <div className="grid" aria-busy="true" aria-label="Chargement">
        {Array.from({ length: rows }, (_, i) => <div key={i}><div className="skeleton" style={{ aspectRatio: '1 / 1' }} /><div className="skeleton" style={{ height: 14, marginTop: 10, width: '70%' }} /></div>)}
      </div>
    );
  }
  return (
    <div aria-busy="true" aria-label="Chargement" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
    </div>
  );
}

export function ErrorState({ error, retry }) {
  return (
    <div className="state" role="alert">
      <p>{error?.status === 404 ? 'Rien trouvé ici.' : 'Impossible de charger cette page pour le moment.'}</p>
      {retry && <button type="button" className="btn btn-ghost" onClick={retry}>Réessayer</button>}
    </div>
  );
}

// ---------- Vignettes ----------

export function CardGrid({ cards, scroll = false, onPlay }) {
  return (
    <div className={scroll ? 'row-scroll' : 'grid'}>
      {cards.map((c, i) => <Card key={`${c.ref}-${i}`} card={c} onPlay={onPlay} />)}
    </div>
  );
}

const cardPath = (c) => (c.kind === 'artist' ? artistPath(c.ref, c.title) : c.kind === 'category' ? `/category/${encodeURIComponent(c.ref.replace(/^am:/, ''))}` : pagePath(c.kind, c.ref));

export function Card({ card, onPlay }) {
  const round = card.kind === 'artist';
  const meta = card.kind === 'artist'
    ? (card.followers ? `${compact(card.followers)} abonnés` : '')
    : card.plays ? `${compact(card.plays)} écoutes` : card.count ? `${card.count} titres` : '';
  return (
    <div className={`card${round ? ' round' : ''}${card.kind === 'album' ? ' stack' : ''}`}>
      <div className="card-img">
        <Link to={cardPath(card)} className="card-cover" aria-label={card.title}>
          {card.image ? <img src={card.image} alt="" loading="lazy" /> : null}
        </Link>
        {card.rank ? <span className="card-rank" aria-label={`Rang ${card.rank}`}>{card.rank}</span> : null}
        {onPlay && card.kind !== 'artist' && card.kind !== 'category' && (
          <button type="button" className="card-play" aria-label={`Écouter ${card.title}`} onClick={() => onPlay(card)}>
            <I.Play size={18} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, textAlign: round ? 'center' : 'left' }}>
        {card.subtitle && !round && <div className="card-sub">{card.subtitle}</div>}
        <Link to={cardPath(card)} className="card-title" style={{ justifyContent: round ? 'center' : 'flex-start', color: 'var(--text)' }}>
          <span>{card.title}</span>
          {card.verified && <I.Verified size={16} />}
          {card.explicit && <Explicit />}
        </Link>
        {meta && <div className="card-meta">{meta}</div>}
      </div>
    </div>
  );
}

// ---------- Titres ----------

export function TrackList({ tracks, showAlbum = true, showRank = false, numbered = true, context }) {
  const player = usePlayer();
  const lib = useLibrary();
  const dl = useDownloads();
  const [menu, setMenu] = useState(null);
  const play = (i) => player.playList(tracks, i, { continuous: true, label: context });
  return (
    <>
      <ol className={`tracks${showAlbum ? '' : ' no-album'}`}>
        {tracks.map((t, i) => {
          const isCurrent = player.current?.id === t.id;
          return (
            <li key={`${t.id}-${i}`} className={`track${isCurrent ? ' current' : ''}`}>
              <span className={`track-num${showRank ? ' rank' : ''}`}>
                {showRank ? t.rank || i + 1 : numbered ? i + 1 : ''}
              </span>
              <button type="button" onClick={() => play(i)} aria-label={`Lire ${t.title}`} style={{ padding: 0, border: 'none', background: 'none', position: 'relative' }}>
                {t.image ? <img className="track-img" src={t.image} alt="" loading="lazy" /> : <span className="track-img" style={{ display: 'block' }} />}
              </button>
              <div className="track-main">
                <button type="button" className="track-title" onClick={() => play(i)}>
                  <span>{t.title}</span>{t.explicit && <Explicit />}
                  {dl.items.has(t.id) && <I.Downloaded size={15} className="dl-mark" aria-label="Téléchargé" />}
                </button>
                <div className="track-artist">
                  {showRank && <><Trend change={t.change} />{' '}</>}
                  <Link to={artistPath(t.artistRef, t.artist.split(/,| feat\. /)[0])}>{t.artist}</Link>
                </div>
              </div>
              <span className="track-album">{t.albumRef ? <Link to={pagePath('album', t.albumRef)}>{t.album}</Link> : t.album}</span>
              <span className="track-plays">{t.plays ? compact(t.plays) : ''}</span>
              <span className="track-dur">{duration(t.duration)}</span>
              <span className="track-actions">
                <button type="button" className={`icon-btn hide-mobile${isLiked(lib, t.id) ? ' on' : ''}`} aria-pressed={isLiked(lib, t.id)}
                  aria-label={isLiked(lib, t.id) ? `Retirer ${t.title} des titres aimés` : `Aimer ${t.title}`} onClick={() => toggleLike(t)}>
                  <I.Heart size={18} filled={isLiked(lib, t.id)} />
                </button>
                <button type="button" className="icon-btn" aria-label={`Plus d'options pour ${t.title}`} aria-haspopup="menu"
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ track: t, x: r.right, y: r.bottom }); }}>
                  <I.More size={18} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {menu && <TrackMenu {...menu} onClose={() => setMenu(null)} />}
    </>
  );
}

export function TrackMenu({ track, x, y, onClose }) {
  const player = usePlayer();
  const lib = useLibrary();
  const dl = useDownloads();
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
    const away = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', onClose, { once: true });
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', onClose); };
  }, [onClose]);
  const left = Math.min(x - 220, window.innerWidth - 236);
  const top = Math.min(y + 4, window.innerHeight - 290);
  const act = (fn) => () => { fn(); onClose(); };
  return (
    <div className="menu" role="menu" ref={ref} style={{ left: Math.max(8, left), top }}>
      <button type="button" role="menuitem" onClick={act(() => player.playNext(track))}><I.AddQueue size={18} />Lire ensuite</button>
      <button type="button" role="menuitem" onClick={act(() => player.addToQueue(track))}><I.Queue size={18} />Ajouter à la file</button>
      <button type="button" role="menuitem" onClick={act(() => player.startRadio({ track }))}><I.Radio size={18} />Radio de ce titre</button>
      <button type="button" role="menuitem" onClick={act(() => player.startRadio({ artist: track.artist.split(/,| feat\. /)[0] }))}><I.Radio size={18} />Radio de l'artiste</button>
      <button type="button" role="menuitem" onClick={act(() => toggleLike(track))}><I.Heart size={18} filled={isLiked(lib, track.id)} />{isLiked(lib, track.id) ? 'Retirer des titres aimés' : 'Aimer'}</button>
      {dl.items.has(track.id)
        ? <button type="button" role="menuitem" onClick={act(() => removeDownload(track.id).then(() => player.notify(`« ${track.title} » retiré des téléchargements.`)))}><I.Downloaded size={18} />Supprimer le téléchargement</button>
        : <button type="button" role="menuitem" disabled={dl.progress.has(track.id)} onClick={act(() => startDownload(track, player.notify))}><I.Download size={18} />{dl.progress.has(track.id) ? 'Téléchargement…' : 'Télécharger'}</button>}
    </div>
  );
}

// Lance un téléchargement et dit comment il s'est terminé.
export function startDownload(track, notify) {
  notify(`Téléchargement de « ${track.title} »…`);
  download(track)
    .then(() => notify(`« ${track.title} » est disponible hors ligne.`))
    .catch((e) => notify(`Téléchargement impossible : ${e.message}`));
}

// Bouton de téléchargement : flèche, anneau de progression, puis coche (un appui retire le titre).
export function DownloadButton({ track, className = 'icon-btn', size = 20 }) {
  const player = usePlayer();
  const dl = useDownloads();
  const done = dl.items.has(track.id);
  const p = dl.progress.get(track.id);
  if (p !== undefined) {
    return (
      <span className={`${className} dl-ring`} role="progressbar" aria-label="Téléchargement" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}
        style={{ '--p': `${Math.round(p * 100)}%` }}>
        <span>{Math.round(p * 100)}</span>
      </span>
    );
  }
  return (
    <button type="button" className={`${className}${done ? ' on' : ''}`} aria-pressed={done}
      aria-label={done ? `Supprimer le téléchargement de ${track.title}` : `Télécharger ${track.title}`}
      onClick={() => (done ? removeDownload(track.id).then(() => player.notify(`« ${track.title} » retiré des téléchargements.`)) : startDownload(track, player.notify))}>
      {done ? <I.Downloaded size={size} /> : <I.Download size={size} />}
    </button>
  );
}
