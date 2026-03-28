# Écran 2 — Your Library (Bibliothèque)

## Contexte général
Écran de bibliothèque personnelle de l'utilisateur. Fond noir. Interface liste avec filtres par catégorie en haut. Barre de mini-player visible en bas.

---

## Disposition (de haut en bas)

### 1. En-tête
- **Icône avatar utilisateur** : rond en haut à gauche — photo de profil (silhouette humaine colorée, tons chauds)
- **Titre de la page** : `Your Library` — en blanc, typographie grande, gras, aligné à gauche
- **Icône loupe** : en haut à droite — permet de rechercher dans la bibliothèque
- **Icône plus (+)** : à côté de la loupe, en haut à droite — pour créer une nouvelle playlist

---

### 2. Filtres de catégorie (Pills / Tags horizontaux)
Rangée de boutons-filtres scrollables horizontalement, juste sous le titre :

| Filtre | État |
|---|---|
| `Playlists` | **Actif** — fond blanc, texte noir |
| `Artists` | Inactif — fond gris foncé, texte blanc |
| `Albums` | Inactif — fond gris foncé, texte blanc |
| `Podcasts` | Inactif — fond gris foncé, texte blanc |

---

### 3. Sous-titre de section
- Texte : `Recents` (récents) — en blanc, avec une icône de tri/filtre à droite (grille ou liste)

---

### 4. Liste des éléments de la bibliothèque
Chaque élément = une rangée horizontale composée de :
- **Vignette carrée** à gauche (~50x50px)
- **Texte à droite** : titre en blanc (gras) + sous-titre en gris

Voici la liste des 6 éléments visibles (de haut en bas) :

---

#### Élément 1 — Liked Songs
- **Vignette** : dégradé violet/bleu avec icône cœur blanc au centre
- **Titre** : `Liked Songs`
- **Sous-titre** : `Playlist • 499 songs`

---

#### Élément 2 — New Episodes
- **Vignette** : image verte avec logo podcast (ondes sonores)
- **Titre** : `New Episodes`
- **Sous-titre** : `Updated 7 days ago`

---

#### Élément 3 — Late Night Techno
- **Vignette** : image sombre, ambiance nuit/urbaine
- **Titre** : `Late Night Techno`
- **Sous-titre** : `Playlist • Created by you`

---

#### Élément 4 — Jazz Essentials
- **Vignette** : image avec instruments de jazz, tons chauds ambrés
- **Titre** : `Jazz Essentials`
- **Sous-titre** : `Playlist • Created by Spotify`

---

#### Élément 5 — Daily Mix 2
- **Vignette** : collage carré de 4 mini-pochettes d'albums
- **Titre** : `Daily Mix 2`
- **Sous-titre** : `Playlist • Made for You`

---

#### Élément 6 — Fred again..
- **Vignette** : photo portrait de l'artiste (visage, tons sombres)
- **Titre** : `Fred again..`
- **Sous-titre** : `Artist`

---

#### Élément 7 — Acoustic Vibes *(partiellement visible)*
- **Vignette** : image guitare/nature, tons verts
- **Titre** : `Acoustic Vibes`
- **Sous-titre** : `Playlist • Created by you`

---

### 5. Bouton "Add Artists"
- Rangée spéciale avec une **icône + dans un cercle** à gauche
- **Texte** : `Add Artists` en blanc
- Sert à ajouter des artistes à la bibliothèque

---

### 6. Mini-Player (barre persistante en bas de contenu)
Barre sombre semi-transparente entre la liste et la tab bar :
- **Vignette** du titre en cours (petite, carré) à gauche
- **Titre** : `Levitating` (en blanc)
- **Artiste** : `Dua Lipa` (en gris)
- **Icône cœur** à droite (favori)
- **Icône play/pause** à droite
- **Barre de progression** très fine en bas du mini-player (vert)

---

### 7. Barre de navigation du bas (Tab Bar)
Quatre onglets :

| Icône | Label | État |
|---|---|---|
| Maison | `Home` | Inactif |
| Loupe | `Search` | Inactif |
| Bibliothèque | `Your Library` | **Actif** (blanc/souligné) |
| Premium | (icône spéciale) | Inactif |

---

## Palette de couleurs
| Élément | Couleur |
|---|---|
| Fond général | `#000000` (noir pur) |
| Texte principal | `#FFFFFF` (blanc) |
| Texte secondaire | `#b3b3b3` (gris moyen) |
| Filtre actif (pill) | `#FFFFFF` fond, `#000000` texte |
| Filtres inactifs | `#2a2a2a` fond, `#FFFFFF` texte |
| Vignette "Liked Songs" | Dégradé `#6644cc` → `#3366ff` |
| Accent progression | `#1DB954` (vert) |

---

## Typographie observée
- Titre de page "Your Library" : **sans-serif gras, ~24px**
- Titres des éléments : sans-serif gras, ~15px
- Sous-titres : sans-serif léger, ~12px, gris

---

## Notes pour l'IA
- La vue par défaut filtre sur **Playlists**
- Les items sont triés par **ordre de récence** (Recents)
- Chaque vignette a une apparence unique selon le type (playlist = image, artiste = photo, liked songs = dégradé violet avec cœur)
- La séparation entre "playlists créées par l'utilisateur" et "playlists Spotify" se fait via le sous-titre (`Created by you` vs `Created by Spotify`)
