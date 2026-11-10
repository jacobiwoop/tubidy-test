// Installation de l'appli (PWA), partagée entre le bouton de la barre du haut et le toast d'accueil.
// - Android et Chrome/Edge sur ordinateur : le navigateur donne un événement beforeinstallprompt, qu'on garde
//   pour ouvrir sa fenêtre d'installation au clic.
// - iPhone/iPad : aucun site ne peut lancer l'installation ; on montre les deux gestes (Partager, puis
//   « Sur l'écran d'accueil »).
import { useSyncExternalStore } from 'react';

const DISMISS_KEY = 'spotywoop.install.dismissed';
const DISMISS_FOR = 7 * 24 * 3600 * 1000; // le toast fermé ne revient pas avant une semaine

const ios = typeof navigator !== 'undefined'
  && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const standalone = () => typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);

// prompt : l'événement gardé ; steps : les gestes iPhone sont affichés.
let state = { prompt: null, installed: standalone(), ios, steps: false };
const listeners = new Set();
function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

// Écouté dès le chargement du module : l'événement peut arriver avant que React n'affiche quoi que ce soit.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); set({ prompt: e }); });
  window.addEventListener('appinstalled', () => set({ prompt: null, installed: true }));
}

export function useInstall() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}

// L'installation est-elle proposable ici ?
export const canInstall = (s) => !s.installed && (!!s.prompt || s.ios);

// Lance l'installation : la fenêtre du navigateur, ou les gestes à faire sur iPhone.
export async function install() {
  if (state.prompt) {
    const p = state.prompt;
    p.prompt();
    const { outcome } = await p.userChoice.catch(() => ({}));
    set({ prompt: null, installed: outcome === 'accepted' || state.installed });
    return;
  }
  if (state.ios) set({ steps: true });
}

export const hideSteps = () => set({ steps: false });

export function dismissedRecently() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_FOR;
  } catch {
    return false;
  }
}

export function dismiss() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* stockage indisponible */ }
  set({ steps: false });
}
