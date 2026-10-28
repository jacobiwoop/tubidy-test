import { useEffect, useRef, useState } from 'react';
import '@uimaxbai/am-lyrics/am-lyrics.js'; // le paquet n'a pas son index.js
import { usePlayer } from '../player/PlayerContext';
import { getLyrics, tier, updateLyrics, useLyrics } from '../player/lyricsStore';

// Paroles du titre en cours, mot par mot comme Apple Music, par le composant <am-lyrics>.
//
// Deux recherches font la course :
// - notre serveur interroge toutes les sources en même temps et répond en général en moins d'une seconde,
//   puis envoie une meilleure version s'il en trouve une (lyricsStore, lancé dès que le titre démarre) ;
// - le composant cherche aussi de son côté, dans le navigateur (plus lent, mais il reste en secours).
// Le premier qui a des paroles s'affiche ; on ne remplace ensuite que par mieux (mot par mot > ligne par
// ligne > texte seul), jamais l'inverse. Deux <am-lyrics> : l'un cherche, l'autre affiche ce que le
// serveur a envoyé (sans chercher lui-même).
export default function Lyrics() {
  const { audio, current, seek } = usePlayer();
  const lyrics = useLyrics();
  const searcher = useRef(null); // <am-lyrics> qui cherche dans le navigateur
  const shower = useRef(null); // <am-lyrics> qui affiche les paroles du serveur
  const [browserDone, setBrowserDone] = useState(false); // le composant a fini sans rien trouver
  const sawLoading = useRef(false);

  // Nouveau titre : le composant relance sa recherche.
  useEffect(() => {
    setBrowserDone(false);
    sawLoading.current = false;
    const node = searcher.current;
    if (!node || !current) return;
    node.songTitle = current.title;
    node.songArtist = current.artist;
    node.songAlbum = current.album || '';
    node.songDurationMs = current.duration ? Math.round(current.duration * 1000) : undefined;
    node.spotifyId = current.id?.startsWith('sp:') ? current.id.slice(3) : undefined;
    node.query = `${current.title} ${current.artist}`;
  }, [current]);

  // Paroles du serveur : données telles quelles au second composant.
  const serverRich = lyrics.from === 'server' ? lyrics.rich : null;
  useEffect(() => {
    const out = shower.current;
    if (!out || !serverRich) return undefined;
    // À l'ouverture, le composant lance une recherche à vide qui, en finissant, efface ses paroles : on les
    // lui donne juste après (elle ne fait aucun appel réseau, elle finit avant le prochain tour).
    const t = setTimeout(() => {
      out.availableSources = [{ lines: serverRich, source: lyrics.source, songwriters: lyrics.songwriters }];
      out.hasFetchedAllProviders = true; // pas de recherche d'autres sources depuis ce composant
      out.lyricsSource = lyrics.source;
      out.songwriters = lyrics.songwriters;
      out.isLoading = false;
      out.lyrics = serverRich;
      out.currentTime = audio.currentTime * 1000;
    }, 0);
    return () => clearTimeout(t);
  }, [serverRich]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position de lecture à chaque image (l'événement timeupdate de l'audio ne vient que ~4 fois par seconde),
  // et passage aux paroles du composant quand elles valent mieux que celles affichées.
  useEffect(() => {
    let frame;
    const tick = () => {
      const node = searcher.current;
      const now = audio.currentTime * 1000;
      if (node) {
        node.currentTime = now;
        if (node.isLoading) sawLoading.current = true;
        const id = node.songTitle && getLyrics().id;
        if (!node.isLoading && node.lyrics?.length && id) {
          const level = tier(node.lyrics);
          const cur = getLyrics();
          if (cur.status !== 'found' || (cur.from === 'server' && level < cur.level)
            || (cur.from === 'browser' && cur.rich !== node.lyrics)) {
            updateLyrics(id, { status: 'found', rich: node.lyrics, source: node.lyricsSource, level, from: 'browser' });
          }
        } else if (sawLoading.current && !node.isLoading && !node.lyrics) {
          setBrowserDone(true);
        }
      }
      if (shower.current && getLyrics().from === 'server') shower.current.currentTime = now;
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [audio]);

  useEffect(() => {
    const nodes = [searcher.current, shower.current].filter(Boolean);
    const onLine = (e) => seek(e.detail.timestamp / 1000);
    nodes.forEach((n) => n.addEventListener('line-click', onLine));
    return () => nodes.forEach((n) => n.removeEventListener('line-click', onLine));
  }, [seek]);

  if (!current) return null;
  const found = lyrics.status === 'found';
  const serverShown = found && lyrics.from === 'server';
  const nothing = !found && lyrics.status === 'none' && browserDone;
  return (
    <div className="lyrics-stack">
      <am-lyrics ref={searcher} class={`am-lyrics${found && !serverShown ? '' : ' waiting'}`} highlight-color="#ffffff"
        font-family="Outfit, system-ui, sans-serif" autoscroll />
      <am-lyrics ref={shower} class={`am-lyrics over${serverShown ? '' : ' waiting'}`} highlight-color="#ffffff"
        font-family="Outfit, system-ui, sans-serif" autoscroll />
      {!found && (nothing
        ? <div className="lyrics-state"><p className="lyrics-state-title">Pas de paroles pour ce titre</p><p>Aucune des sources ne les a.</p></div>
        : <LyricsSearching />)}
    </div>
  );
}

// Attente stylée : une onde qui respire et le texte qui scintille, tant qu'aucune source n'a répondu.
export function LyricsSearching({ compact = false }) {
  return (
    <div className={`lyrics-state searching${compact ? ' compact' : ''}`} role="status">
      <span className="lyrics-wave" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</span>
      <p className="lyrics-state-title shimmer">Recherche des paroles…</p>
    </div>
  );
}
