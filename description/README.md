# 📱 Description des écrans — Application de streaming musical (type Spotify)

> Documentation générée pour permettre à une IA de recréer ou comprendre l'interface de manière précise.

---

## Vue d'ensemble de l'application

Application mobile de **streaming musical** (dark mode intégral). Design system cohérent sur tous les écrans avec :
- Fond noir dominant (`#000000`)
- Accent vert (`#1DB954`) pour les éléments actifs/interactifs
- Typographie sans-serif blanche sur fond sombre
- Mini-player persistant en bas sur tous les écrans sauf le player plein écran

---

## Les 4 écrans documentés

| Fichier | Écran | Description courte |
|---|---|---|
| [`ecran1_player.md`](./ecran1_player.md) | 🎵 Player | Lecteur plein écran — pochette, progression, contrôles |
| [`ecran2_bibliotheque.md`](./ecran2_bibliotheque.md) | 📚 Your Library | Liste des playlists/albums/artistes sauvegardés |
| [`ecran3_accueil.md`](./ecran3_accueil.md) | 🏠 Home | Page d'accueil avec recommandations personnalisées |
| [`ecran4_recherche.md`](./ecran4_recherche.md) | 🔍 Search | Recherche avec historique et navigation par genres |

---

## Design System global

### Couleurs
```
--color-bg:          #000000   /* Fond principal */
--color-bg-card:     #282828   /* Fond des cartes/items */
--color-bg-filter:   #2a2a2a   /* Fond des filtres inactifs */
--color-accent:      #1DB954   /* Vert — actif, play, progression */
--color-text-primary:#FFFFFF   /* Texte principal */
--color-text-secondary:#b3b3b3 /* Texte secondaire, sous-titres */
--color-search-bar:  #f0f0f0   /* Fond barre de recherche */
```

### Typographie
```
Titres de page   : sans-serif, gras, ~24px
Titres sections  : sans-serif, gras, ~18-20px
Titre de piste   : sans-serif, gras, ~22px (player)
Sous-titres      : sans-serif, normal, ~12-14px, gris
Labels pills     : sans-serif, normal, ~12-13px
```

### Composants réutilisés
- **Tab Bar** (4 onglets) : Home, Search, Your Library, Premium
- **Mini-player** : barre persistante avec titre, artiste, cœur, play
- **Pills filtres** : scrollables horizontalement, actif = fond blanc
- **Vignettes** : carrées avec coins arrondis (~6px)

### Navigation
```
Tab Bar (bas) :
  ├── Home        → ecran3_accueil
  ├── Search      → ecran4_recherche
  ├── Your Library → ecran2_bibliotheque
  └── Premium     → (non documenté)

Tap sur un titre → ecran1_player (plein écran)
```

---

## Patterns d'interaction notables

1. **Carrousels horizontaux** : les sections de l'accueil scrollent horizontalement, la page principale verticalement
2. **Filtres pills** : sélection d'une catégorie met à jour la liste (filtre côté client ou serveur)
3. **Mini-player** : cliquer dessus ouvre le player plein écran (écran 1)
4. **Images décorations** : les cartes de genre (Search) ont des images inclinées ~15° dans leur coin inférieur droit
5. **Grille 2×3 (Home)** : raccourcis rapides vers les contenus récents — format compact avec vignette + texte tronqué
