# Écran 3 — Home (Accueil)

## Contexte général
Page d'accueil personnalisée de l'application. Fond noir. Contenu scrollable verticalement avec plusieurs sections distinctes. Affiche du contenu adapté à l'heure de la journée ("Good morning").

---

## Disposition (de haut en bas)

### 1. En-tête
- **Icône avatar** en haut à gauche : photo de profil de l'utilisateur (rond)
- **Icône cloche (notifications)** en haut à droite
- **Icône horloge/récents** à côté de la cloche à droite
- Pas de titre texte visible dans la barre — l'en-tête est sobre

---

### 2. Filtres de catégorie (Pills horizontaux scrollables)
Sous l'en-tête, rangée de trois filtres :

| Filtre | État |
|---|---|
| `All` | **Actif** — fond vert `#1DB954`, texte blanc |
| `Music` | Inactif — fond gris foncé, texte blanc |
| `Podcasts` | Inactif — fond gris foncé, texte blanc |

---

### 3. Section "Good morning" (grille de raccourcis)
- **Titre de section** : `Good morning` — en blanc, gras, grand (~22px)
- **Disposition** : grille **2 colonnes × 3 rangées** = 6 cartes rectangulaires
- Chaque carte = vignette à gauche + texte titre à droite, fond gris foncé arrondi

Voici les 6 raccourcis visibles (lecture gauche→droite, haut→bas) :

| Position | Vignette | Titre |
|---|---|---|
| 1 (haut gauche) | Image sombre, tons orangés | `Dis...` *(tronqué)* |
| 2 (haut droite) | Image colorée multi | `Jaz...` *(tronqué)* |
| 3 (milieu gauche) | Image claire, tons froids | `Th...` *(tronqué)* |
| 4 (milieu droite) | *(non clairement visible)* | *(tronqué)* |
| 5 (bas gauche) | *(non clairement visible)* | *(tronqué)* |
| 6 (bas droite) | *(non clairement visible)* | *(tronqué)* |

> Les titres sont tronqués par manque de place dans la carte. Ce sont des playlists/albums récemment écoutés.

---

### 4. Section "Made for you" (carrousel horizontal)
- **Titre** : `Made for you` — en blanc, gras
- **Lien** : `Show all` — en gris, à droite du titre, cliquable
- **Disposition** : scroll horizontal de cartes carrées

Cartes visibles (gauche à droite) :

#### Carte 1 — Discover Weekly
- **Image** : photo urbaine nocturne, lampadaires flous, ambiance bokeh dorée
- **Titre** : `Discover Weekly`
- **Sous-titre** : `Your weekly mix of...` + nom d'artistes (tronqué)

#### Carte 2 — Daily Mix 2
- **Image** : lampadaires/lumières d'ambiance, tons chauds
- **Titre** : `Daily Mix 2`
- **Sous-titre** : `Ariana Madison, Sionné` + autres artistes (tronqué)

> Probablement d'autres cartes hors-écran à droite (scrollables)

---

### 5. Section "Recently played" (carrousel horizontal)
- **Titre** : `Recently played` — en blanc, gras
- **Disposition** : scroll horizontal de cartes carrées (~3 visibles)

#### Carte 1 — Inner Spaces *(ou nom similaire)*
- **Image** : photo intérieur design, tons neutres/crème
- **Titre** : `Inner Spaces` *(approximatif)*
- **Sous-titre** : `PLAYLIST` + durée ou infos

#### Carte 2 — Future Nostalgia
- **Image** : pochette d'album colorée, tons rose/violet
- **Titre** : `Future Nostalgia`
- **Sous-titre** : `ALBUM • Dua Lipa` *(approximatif)*

#### Carte 3 — Coffeine 03 *(ou similaire)*
- **Image** : pochette avec texte graphique, tons sombres
- **Titre** : `Coffeine 03` *(approximatif)*
- **Sous-titre** : `PLAYLIST`

---

### 6. Section "Your top mixes" (carrousel horizontal)
- **Titre** : `Your top mixes` — en blanc, gras
- **Disposition** : scroll horizontal, cartes légèrement plus larges, image portrait (taller)

#### Carte 1 — Techno Mix
- **Image** : texture verte abstraite (fougères/végétation dense)
- **Titre** : `Techno Mix`
- **Sous-titre** : `Orgue, Arras, Canx...` *(artistes listés)*
- Indicateur : `Playing` ou similaire (pastille verte)

#### Carte 2 — Summer Mix *(ou similaire)*
- **Image** : palmiers au coucher de soleil, tons orange/violet
- **Titre** : `Summer Mix` *(approximatif)*
- **Sous-titre** : artistes (tronqués)

---

### 7. Mini-Player (barre persistante)
Barre sombre entre le contenu et la tab bar :
- **Vignette** du titre actuel (petite)
- **Titre** : `Levitating`
- **Artiste** : `Dua Lipa`
- **Icônes** : cœur (favori) + bouton play

---

### 8. Barre de navigation du bas (Tab Bar)
Quatre onglets :

| Icône | Label | État |
|---|---|---|
| Maison | `Home` | **Actif** (blanc) |
| Loupe | `Search` | Inactif |
| Bibliothèque | `Your Library` | Inactif |
| Premium | (icône spéciale) | Inactif |

---

## Palette de couleurs
| Élément | Couleur |
|---|---|
| Fond général | `#000000` (noir) |
| Texte titres sections | `#FFFFFF` (blanc) |
| Texte secondaire/sous-titres | `#b3b3b3` (gris) |
| Filtre "All" actif | `#1DB954` (vert) |
| Filtres inactifs | `#2a2a2a` (gris foncé) |
| Cartes "Good morning" | `#282828` (gris très foncé) |
| Lien "Show all" | `#b3b3b3` (gris) |

---

## Structure des sections (résumé)
```
Header (avatar + icônes)
  └── Pills filtres (All / Music / Podcasts)
  └── [Section] Good morning — grille 2×3
  └── [Section] Made for you — carrousel horizontal
  └── [Section] Recently played — carrousel horizontal
  └── [Section] Your top mixes — carrousel horizontal
  └── Mini-player
  └── Tab Bar
```

---

## Notes pour l'IA
- La salutation `Good morning` est **dynamique** (change selon l'heure : Good afternoon, Good evening…)
- Les sections `Made for you` et `Your top mixes` sont des **recommandations algorithmiques** personnalisées
- La section `Good morning` (grille 2×3) représente les **raccourcis rapides** vers les contenus les plus consultés
- Toutes les sections à l'exception de la grille "Good morning" sont des **carrousels scrollables horizontalement**
- Le design privilégie une **densité d'information élevée** avec de nombreuses sections empilées verticalement
