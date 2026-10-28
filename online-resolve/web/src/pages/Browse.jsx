import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../useApi';
import { usePlayer } from '../player/PlayerContext';
import { CardGrid, Chips, ErrorState, Explicit, Loading, Section, TrackList } from '../components/Common';
import * as I from '../components/Icons';

export const GENRES = [
  { value: '', label: 'Tout' },
  { value: 'afrobeats', label: 'Afrosounds' },
  { value: 'rap', label: 'Hip-Hop/Rap' },
  { value: 'rnb', label: 'R&B' },
  { value: 'dancehall', label: 'Dancehall' },
  { value: 'amapiano', label: 'Amapiano' },
  { value: 'gospel', label: 'Gospel' },
  { value: 'latin', label: 'Latin' },
  { value: 'pop', label: 'Pop' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'jazz', label: 'Jazz/Blues' },
  { value: 'instrumental', label: 'Instrumental' },
];

export const COUNTRIES = [
  { value: 'BJ', label: 'Bénin' }, { value: 'CI', label: "Côte d'Ivoire" }, { value: 'TG', label: 'Togo' },
  { value: 'SN', label: 'Sénégal' }, { value: 'CM', label: 'Cameroun' }, { value: 'CD', label: 'RD Congo' },
  { value: 'NG', label: 'Nigeria' }, { value: 'GH', label: 'Ghana' }, { value: 'FR', label: 'France' }, { value: 'US', label: 'États-Unis' },
];

// Joue un album ou une playlist depuis sa vignette.
export function usePlayCard() {
  const player = usePlayer();
  return async (card) => {
    try {
      const c = await api(card.kind === 'album' ? 'album' : 'playlist', { ref: card.ref });
      player.playList(c.tracks, 0, { continuous: true, label: c.title });
    } catch {
      player.notify('Impossible de charger ce contenu.');
    }
  };
}

// Vignettes de titres : un clic lance la liste à partir de ce titre.
export function TrackCards({ tracks, label, scroll }) {
  const player = usePlayer();
  return (
    <div className={scroll ? 'row-scroll' : 'grid'}>
      {tracks.map((t, i) => (
        <div className="card" key={`${t.id}-${i}`}>
          <div className="card-img">
            <button type="button" className="card-cover" aria-label={`Lire ${t.title}`} onClick={() => player.playList(tracks, i, { continuous: true, label })} style={{ border: 'none', padding: 0, background: 'none' }}>
              {t.image ? <img src={t.image} alt="" loading="lazy" /> : null}
            </button>
            <span className="card-play" aria-hidden="true"><I.Play size={18} /></span>
          </div>
          <div className="card-sub">{t.artist}</div>
          <div className="card-title" style={{ marginTop: -7 }}><span>{t.title}</span>{t.explicit && <Explicit />}</div>
        </div>
      ))}
    </div>
  );
}

export function Discover() {
  const [params, setParams] = useSearchParams();
  const genre = params.get('genre') || '';
  const { data, error, loading, retry } = useApi('discover', { genre, country: 'BJ' });
  const playCard = usePlayCard();
  return (
    <>
      <Chips label="Genres" items={GENRES} value={genre} onChange={(g) => setParams(g ? { genre: g } : {})} />
      {error && <ErrorState error={error} retry={retry} />}
      {loading && !data && <Loading grid rows={12} />}
      {data && (
        <>
          <Section title="Titres tendance" id="h-trend">
            <TrackCards tracks={data.trendingSongs.slice(0, 12)} label="Titres tendance" />
          </Section>
          {data.top.length > 0 && (
            <Section title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}><Flag />Top Bénin · cette semaine</span>} id="h-top" linkTo="/charts?country=BJ" link="Classement">
              <TrackList tracks={data.top.slice(0, 5)} showRank showAlbum={false} context="Top Bénin" />
            </Section>
          )}
          <Section title="Albums tendance" id="h-albums">
            <CardGrid cards={data.trendingAlbums} onPlay={playCard} />
          </Section>
          {data.recent.length > 0 && (
            <Section title="Nouveautés" id="h-new">
              <TrackCards tracks={data.recent} label="Nouveautés" scroll />
            </Section>
          )}
        </>
      )}
    </>
  );
}

export const Flag = () => <span className="flag-bj" aria-hidden="true"><span /><span><i /><i /></span></span>;

export function Charts() {
  const [params, setParams] = useSearchParams();
  const country = params.get('country') || 'BJ';
  const genre = params.get('genre') || '';
  const set = (k, v) => { const p = Object.fromEntries(params); if (v) p[k] = v; else delete p[k]; setParams(p); };
  const { data, error, loading, retry } = useApi('charts', { country, genre });
  const player = usePlayer();
  const playCard = usePlayCard();
  const name = COUNTRIES.find((c) => c.value === country)?.label || country;
  return (
    <>
      <section className="hero" aria-labelledby="h-country" style={{ alignItems: 'center' }}>
        {country === 'BJ' ? <span className="flag-bj" style={{ width: 150, height: 100, borderRadius: 8 }} aria-hidden="true"><span /><span><i /><i /></span></span> : null}
        <div className="hero-body">
          <div className="hero-kicker">Charts de la semaine</div>
          <h1 id="h-country" className="hero-title">{name.toUpperCase()}</h1>
          <div className="muted">Classement Audiomack, mis à jour chaque jour.</div>
        </div>
        <Chips label="Pays" items={COUNTRIES} value={country} onChange={(c) => set('country', c)} light />
      </section>
      <Chips label="Genres" items={GENRES} value={genre} onChange={(g) => set('genre', g)} />
      {error && <ErrorState error={error} retry={retry} />}
      {loading && !data && <Loading rows={10} />}
      {data && (
        <>
          <Section title="Top titres" id="h-songs">
            <div><button type="button" className="btn btn-primary" onClick={() => player.playList(data.songs, 0, { continuous: true, label: `Top ${name}` })}><I.Play size={18} />Tout écouter</button></div>
            <TrackList tracks={data.songs} showRank context={`Top ${name}`} />
          </Section>
          {data.albums.length > 0 && <Section title="Top albums" id="h-calbums"><CardGrid cards={data.albums} onPlay={playCard} /></Section>}
          {data.artists.length > 0 && <Section title="Top artistes" id="h-cartists"><CardGrid cards={data.artists} /></Section>}
          {data.playlists.length > 0 && <Section title="Top playlists" id="h-cpl"><CardGrid cards={data.playlists} onPlay={playCard} /></Section>}
        </>
      )}
    </>
  );
}

const TILE_COLORS = ['#8A3B12', '#1F6B4A', '#6B2442', '#7A5A10', '#2E4A8A', '#5B3A7A', '#7A2E2E', '#16624F', '#8A4A1A', '#4A3A6B', '#1E4E79', '#6B4A2A'];

export function BrowsePage() {
  const { data, error, loading, retry } = useApi('browse');
  return (
    <>
      <h1 className="page-title">PARCOURIR</h1>
      {error && <ErrorState error={error} retry={retry} />}
      {loading && !data && <Loading grid rows={12} />}
      {data && (
        <div className="tiles">
          {data.map((c, i) => (
            <Link key={c.ref} to={`/category/${encodeURIComponent(c.ref.replace(/^am:/, ''))}`} className="tile" style={{ background: TILE_COLORS[i % TILE_COLORS.length] }}>
              <span className="tile-title">{c.title}</span>
              {c.count ? <span className="tile-count">{c.count} playlists</span> : <span />}
              {c.image && <img src={c.image} alt="" loading="lazy" />}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function Category() {
  const { slug } = useParams();
  const [filter, setFilter] = useState('');
  const { data, error, loading, retry } = useApi('category', { ref: `am:${slug}` });
  const playCard = usePlayCard();
  const shown = data?.playlists.filter((p) => !filter || p.title.toLowerCase().includes(filter.toLowerCase())) || [];
  return (
    <>
      <div className="section-head" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div className="hero-kicker">Catégorie</div>
          <h1 className="page-title">{data?.title || ' '}</h1>
        </div>
        {data && data.playlists.length > 8 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="sr-only">Filtrer les playlists</span>
            <input type="search" placeholder="Filtrer…" value={filter} onChange={(e) => setFilter(e.target.value)}
              style={{ height: 40, padding: '0 14px', borderRadius: 999, border: '1px solid #333', background: '#1a1a1a', color: 'var(--text)' }} />
          </label>
        )}
      </div>
      {error && <ErrorState error={error} retry={retry} />}
      {loading && !data && <Loading grid rows={12} />}
      {data && <CardGrid cards={shown} onPlay={playCard} />}
    </>
  );
}
