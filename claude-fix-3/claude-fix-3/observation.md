Deux bonnes observations. On les traite ensemble.

---

## 1. Prefetch des 3 prochains liens

L'idée : dès que la queue est chargée, on pré-résout les liens des 3 prochaines musiques en arrière-plan et on les stocke dans un cache local. Quand RNTP passe au suivant → le lien est déjà là, pas d'attente.

## 2. Changement instantané depuis la recherche

Le problème actuel : quand tu cliques une nouvelle musique, `handlePlayTrack` fait `await TrackPlayer.reset()` — mais si une musique joue déjà, le `reset()` coupe le son seulement après que le lien soit résolu (1-3s). Donc l'ancienne continue pendant ce temps.

Le fix : appeler `TrackPlayer.reset()` **immédiatement** au clic, avant même l'appel réseau.

---

Laisse-moi lire le contexte actuel avant de coder.