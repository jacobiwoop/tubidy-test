Tu as raison. Pas besoin de recharger Last.fm à chaque morceau — on a déjà la liste, on avance dedans c'est tout.

```
DNA → sugg1 → sugg2 → sugg3 → ... → sugg10
                                        ↓
                              là seulement on recharge Last.fm
                              (ou on boucle, selon ce qu'on veut)
```

Le fix : `fetchRecommendations` ne se relance **que** quand la queue est épuisée. Sinon on avance juste dans la liste existante.

Le problème est là : `fetchRecommendations(track)` est appelé **à chaque** `handlePlayTrack`, même quand on avance dans la queue. Il faut le supprimer de là et le déplacer uniquement quand la queue est épuisée.

Maintenant on appelle `fetchRecommendations` uniquement au premier lancement (choix manuel) et quand on arrive au dernier morceau de la queue :

Maintenant dans le handler `PlaybackTrackChanged` — quand on est au dernier morceau, on recharge :

Et `fetchRecommendations` redevient simple — juste charger + mettre dans la queue, sans rechargement automatique à chaque morceau :

Attends — le `playTrackAtIndex(newQueue, 1)` dans `fetchRecommendations` est incorrect pour le cas initial (choix manuel). On doit distinguer les deux cas d'appel. On va séparer ça proprement :

Et passer `autoPlay = true` quand appelé en fin de queue :

Le flux final :

```
Clic DNA (recherche)
  → fetchRecommendations(DNA, false)
  → queue = [DNA, sugg1, sugg2, ..., sugg10]
  → DNA joue

DNA termine → sugg1 joue (idx=1)
sugg1 termine → sugg2 joue (idx=2)
...
sugg10 termine → queue épuisée (idx=10 = dernier)
  → fetchRecommendations(sugg10, true)
  → nouvelle liste Last.fm basée sur sugg10
  → autoPlay → sugg10_new1 joue
  → ... radio continue
```

Une seule requête Last.fm au départ, puis une autre seulement quand les 10 suggestions sont épuisées.







---
a testé 
---



Oui exactement. Deezer a une route radio native :

```
GET /track/:id/radio
```

Elle retourne des morceaux similaires — et l'avantage sur Last.fm c'est que **les IDs sont des vrais IDs Deezer**. Donc pas besoin du pipeline `lfm-` → `/search/play` → Tubidy pour résoudre le lien. On va directement sur `/deezer/track/:id/download`.

Tu veux qu'on switche sur la radio Deezer à la place de Last.fm ?


---
---

Les deux ont des avantages différents :

**Deezer Radio**
- IDs natifs → résolution du lien directe, pas de détour `/search/play`
- Suggestions basées sur l'algorithme Deezer (populaire, fiable)
- Déjà dans ton backend (`getTrackRadio` existe dans `deezer.service.js`)
- Limite : suggestions assez "mainstream", moins de découverte

**Last.fm**
- Meilleure découverte musicale — algorithme basé sur les écoutes de millions d'users
- Plus précis sur les artistes de niche
- Inconvénient : IDs temporaires `lfm-` → pipeline de résolution supplémentaire (~1-2s par morceau)
- Peut tomber en panne si la clé API expire

**En pratique pour Spotiwoop :**

La radio Deezer est clairement meilleure pour toi. Les IDs natifs éliminent le seul vrai problème de latence qui reste (la résolution `lfm-`). Et `getTrackRadio` est déjà codé côté serveur — c'est 30 minutes de travail pour switcher.

Tu veux qu'on remplace Last.fm par la radio Deezer ?
