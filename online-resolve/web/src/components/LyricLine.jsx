import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../player/PlayerContext';
import { useLyrics } from '../player/lyricsStore';
import { LyricsSearching } from './Lyrics';

// Ligne de paroles en cours, dans la barre du lecteur. Mot par mot quand on l'a : chaque syllabe se remplit
// de blanc à mesure qu'elle est chantée, comme dans le grand lecteur. Rend null quand il n'y a rien à
// montrer (la barre remet alors le volume).
export default function LyricLine({ onOpen }) {
  const { audio } = usePlayer();
  const lyrics = useLyrics();
  const [index, setIndex] = useState(-1);
  const box = useRef(null);
  const lines = lyrics.status === 'found' && lyrics.level < 2 ? lyrics.rich : null;

  // À chaque image : la ligne en cours (rendu React seulement quand elle change), et le remplissage des
  // syllabes écrit directement dans le style (pas de rendu par image).
  useEffect(() => {
    if (!lines) return undefined;
    let frame;
    const tick = () => {
      const now = audio.currentTime * 1000;
      let i = -1;
      for (let j = 0; j < lines.length && lines[j].timestamp <= now + 150; j++) i = j;
      if (i >= 0 && now > lines[i].endtime + 2000) i = -1; // passage instrumental : la note ♪
      setIndex(i);
      box.current?.querySelectorAll('[data-s]').forEach((el) => {
        const s = Number(el.dataset.s);
        const e = Number(el.dataset.e);
        const p = now <= s ? 0 : now >= e ? 100 : ((now - s) / Math.max(1, e - s)) * 100;
        el.style.setProperty('--p', `${p}%`);
      });
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [lines, audio]);

  if (lyrics.status === 'searching') return <div className="pb-lyric"><LyricsSearching compact /></div>;
  if (!lines) return null;
  const line = lines[index];
  const word = line?.isWordSynced;
  return (
    <button type="button" className="pb-lyric" ref={box} onClick={onOpen} aria-label="Ouvrir les paroles">
      {!line && <span className="pb-lyric-idle">♪</span>}
      {line && (word
        ? <span key={index} className="pb-lyric-line">{line.text.map((s, k) => (
          <span key={k} className="pb-syl" data-s={s.timestamp} data-e={s.endtime}>{s.text}</span>
        ))}</span>
        : <span key={index} className="pb-lyric-line on">{line.text.map((s) => s.text).join('')}</span>)}
    </button>
  );
}
