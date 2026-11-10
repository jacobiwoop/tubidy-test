// Icônes au trait (24×24), couleur héritée du texte.
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

function Svg({ size = 20, children, filled = false, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...(filled ? { fill: 'currentColor' } : stroke)} {...rest}>
      {children}
    </svg>
  );
}

// Logo officiel de Spotywoop (le « S » en onde sonore de l'appli Android).
export const Logo = () => <img src="/logo.png" alt="" width="71" height="38" />;

export const Discover = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></Svg>;
export const Charts = (p) => <Svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></Svg>;
export const Browse = (p) => <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>;
export const Search = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>;
export const Library = (p) => <Svg {...p}><path d="M4 4v16M9 4v16M14 4l6 16" /></Svg>;
export const Heart = ({ filled, ...p }) => <Svg {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={filled ? 'currentColor' : 'none'} /></Svg>;
export const Clock = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const Play = (p) => <Svg filled {...p}><path d="M8 5v14l11-7z" /></Svg>;
export const Pause = (p) => <Svg filled {...p}><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></Svg>;
export const Prev = (p) => <Svg filled {...p}><path d="M6 5h2v14H6zM19 5L9.5 12 19 19z" /></Svg>;
export const Next = (p) => <Svg filled {...p}><path d="M16 5h2v14h-2zM5 5l9.5 7L5 19z" /></Svg>;
export const Shuffle = (p) => <Svg {...p}><path d="M3 7h3c4 0 6 10 10 10h5M17 14l4 3-4 3M3 17h3c1.5 0 2.7-1.4 3.7-3M14.3 10C15.3 8.4 16.5 7 18 7h3M17 4l4 3-4 3" /></Svg>;
export const Repeat = ({ one, ...p }) => <Svg {...p}><path d="M4 12V9a3 3 0 0 1 3-3h13M17 3l3 3-3 3M20 12v3a3 3 0 0 1-3 3H4M7 21l-3-3 3-3" />{one && <path d="M11 10.5l1.5-1v5" strokeWidth="1.8" />}</Svg>;
export const Volume = ({ muted, ...p }) => <Svg {...p}><path d="M4 9v6h4l5 4V5L8 9z" />{muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}</Svg>;
export const Queue = (p) => <Svg {...p}><path d="M4 6h16M4 12h16M4 18h10" /></Svg>;
export const Radio = (p) => <Svg {...p}><circle cx="12" cy="12" r="2" /><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" /></Svg>;
export const More = (p) => <Svg filled {...p}><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></Svg>;
export const Close = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const ChevronDown = (p) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const Live = (p) => <Svg {...p} strokeWidth="2.5"><path d="M2 12h3l3-7 4 14 3-7h7" /></Svg>;
export const AddQueue = (p) => <Svg {...p}><path d="M4 6h12M4 12h12M4 18h8M18 14v6M15 17h6" /></Svg>;
export const Up = (p) => <Svg {...p} strokeWidth="3"><path d="M12 19V5M5 12l7-7 7 7" /></Svg>;
export const Down = (p) => <Svg {...p} strokeWidth="3"><path d="M12 5v14M5 12l7 7 7-7" /></Svg>;
export const Verified = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Vérifié" role="img" className="verified">
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Download = (p) => <Svg {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Svg>;
export const Downloaded = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.8 2.8L16 10" /></Svg>;
export const Offline = (p) => <Svg {...p}><path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.2-2.6M19 13a10 10 0 0 0-2.4-1.8M2 9.5a15 15 0 0 1 4.6-3M22 9.5A15 15 0 0 0 11 5.1" /><circle cx="12" cy="20" r="1" /></Svg>;
export const Mic = (p) => <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Svg>;
export const Share = (p) => <Svg {...p}><path d="M12 15V3M8 7l4-4 4 4M7 11H5v10h14V11h-2" /></Svg>;
export const AddSquare = (p) => <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" /></Svg>;
