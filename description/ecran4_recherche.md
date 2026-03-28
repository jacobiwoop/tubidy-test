# Écran 4 — Search (Recherche)

## Contexte général
Page de recherche de l'application. Fond noir. Divisée en deux grandes zones : recherches récentes (en haut) et navigation par genres/catégories (en bas, sous forme de grille colorée).

---

## Disposition (de haut en bas)

### 1. En-tête
- **Icône avatar** en haut à gauche : photo de profil (rond)
- **Titre de la page** : `Search` — en blanc, typographie grande et gras, aligné à gauche
- **Icône appareil photo** en haut à droite : permet la recherche par image/code (Spotify Codes)

---

### 2. Barre de recherche
- **Forme** : champ arrondi (pill), fond gris clair `#f0f0f0` ou blanc
- **Icône loupe** à gauche dans le champ
- **Texte placeholder** : `What do you want to listen to?` — en gris foncé, italique ou normal
- Le champ n'est pas encore activé (pas de clavier affiché)

---

### 3. Section "Recent searches" (Recherches récentes)
- **Titre** : `Recent searches` — en blanc, gras
- **Lien** : `See all` — en gris, à droite du titre

**3 éléments visibles** sous forme de cercles/avatars avec label :

#### Élément 1 — Techno Bunker
- **Vignette** : image ronde — silhouette urbaine sombre, tons foncés (même que la pochette du player)
- **Label** : `Techno Bunker`
- **Type** : Playlist

#### Élément 2 — Jazz Classics *(ou similaire)*
- **Vignette** : image ronde — instruments de jazz, tons chauds
- **Label** : `Jazz Classics` *(approximatif)*
- **Type** : Playlist ou Album

#### Élément 3 — Bunker *(ou artiste/genre)*
- **Vignette** : image ronde — micro ou scène, tons sombres
- **Label** : `Bunker`
- **Type** : Artiste ou Playlist

---

### 4. Section "Browse all" (Parcourir tout)
- **Titre** : `Browse all` — en blanc, gras
- **Disposition** : grille **2 colonnes × N rangées** de cartes rectangulaires colorées avec texte

Chaque carte = fond uni d'une couleur vive + texte du genre en blanc (gras) + image dans le coin inférieur droit (pochette/instrument inclinée à ~15-20°)

**Cartes visibles (de gauche à droite, haut en bas) :**

---

#### Rangée 1
**Carte gauche — Pop**
- Couleur fond : **violet** `#8b44ff` ou `#9b59b6`
- Texte : `Pop`
- Image : pochette d'album pop colorée (coins bas-droite, inclinée)

**Carte droite — Hip-Hop**
- Couleur fond : **orange foncé** `#e8640c` ou `#d4572a`
- Texte : `Hip-Hop`
- Image : micro ou artiste

---

#### Rangée 2
**Carte gauche — Rock**
- Couleur fond : **rouge/brique** `#c0392b` ou `#8b1a1a`
- Texte : `Rock`
- Image : guitare électrique, inclinée

**Carte droite — Mood**
- Couleur fond : **bleu nuit** `#1a3a6b` ou `#2c3e6e`
- Texte : `Mood`
- Image : photo d'ambiance (coucher de soleil, lumières de rue)

---

#### Rangée 3
**Carte gauche — Podcasts**
- Couleur fond : **violet foncé** `#4a1a6e` ou `#3d0a5e`
- Texte : `Podcasts`
- Image : micro de studio professionnel

**Carte droite — Made For You**
- Couleur fond : **bleu ciel/cyan foncé** `#0a5a8e` ou `#1565a0`
- Texte : `Made For You`
- Image : illustration laser/lumières (sabres laser bleu et rose)

---

#### Rangée 4
**Carte gauche — Dance**
- Couleur fond : **vert foncé** `#1a6b3a` ou `#2d7a4f`
- Texte : `Dance`
- Image : piste de danse ou DJ

**Carte droite — Chill**
- Couleur fond : **bordeaux/rose foncé** `#8b1a4a` ou `#a0254e`
- Texte : `Chill`
- Image : ambiance calme (coucher de soleil, plage)

---

### 5. Mini-Player (barre persistante)
Barre sombre entre le contenu et la tab bar :
- **Vignette** du titre actuel (petite image carrée)
- **Titre** : `Levitating`
- **Artiste** : `Dua Lipa`
- **Icônes** : cœur (favori) + bouton play/pause

---

### 6. Barre de navigation du bas (Tab Bar)
Quatre onglets :

| Icône | Label | État |
|---|---|---|
| Maison | `Home` | Inactif |
| Loupe | `Search` | **Actif** (blanc/souligné) |
| Bibliothèque | `Your Library` | Inactif |
| Premium | (icône spéciale) | Inactif |

---

## Palette de couleurs globale
| Élément | Couleur |
|---|---|
| Fond général | `#000000` (noir) |
| Texte titres sections | `#FFFFFF` (blanc) |
| Texte secondaire | `#b3b3b3` (gris) |
| Barre de recherche | `#f0f0f0` / `#e8e8e8` (gris clair, presque blanc) |
| Texte placeholder | `#a0a0a0` |
| Carte Pop | `#9b59b6` (violet) |
| Carte Hip-Hop | `#e8640c` (orange) |
| Carte Rock | `#c0392b` (rouge) |
| Carte Mood | `#1a3a6b` (bleu nuit) |
| Carte Podcasts | `#4a1a6e` (violet foncé) |
| Carte Made For You | `#1565a0` (bleu) |
| Carte Dance | `#1a6b3a` (vert) |
| Carte Chill | `#8b1a4a` (bordeaux) |

---

## Structure de la page (résumé)
```
Header (avatar + titre "Search" + icône appareil photo)
  └── Barre de recherche (champ texte inactif)
  └── [Section] Recent searches — avatars ronds + labels
  └── [Section] Browse all — grille 2 colonnes de cartes colorées
        ├── Pop | Hip-Hop
        ├── Rock | Mood
        ├── Podcasts | Made For You
        └── Dance | Chill
  └── Mini-player
  └── Tab Bar
```

---

## Notes pour l'IA
- La grille "Browse all" utilise des **couleurs de fond unies et distinctes** pour chaque genre — jamais deux cartes adjacentes de la même couleur
- Chaque carte de genre a une **image décorative inclinée** dans son coin inférieur droit (~15° de rotation), créant un effet visuel dynamique
- La barre de recherche est toujours visible et accessible en haut, **avant** les recherches récentes
- L'icône appareil photo en haut à droite correspond à la fonctionnalité de **scan de code Spotify** (QR-like)
- Les recherches récentes sont affichées sous forme de **cercles scrollables horizontalement**, avec le nom en dessous
- Les cartes de la grille ont des **coins légèrement arrondis** (~8-12px de border-radius)
- Les images sur les cartes sont légèrement **coupées/masquées** et débordent du bord inférieur droit de la carte
