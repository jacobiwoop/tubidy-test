# Écran 1 — Player (Lecteur de musique)

## Contexte général
Écran de lecture de musique en plein écran sur application mobile. Fond sombre (noir/vert très foncé). Il s'agit d'une interface de type Spotify-like.

---

## Disposition (de haut en bas)

### 1. Barre supérieure
- **Texte en haut au centre** : "PLAYING FROM PLAYLIST" (en petit, grisé, majuscules)
- **Juste en dessous** : nom de la playlist — "Techno Bunker" (en blanc, légèrement plus grand)
- **Icône en haut à droite** : icône à trois points verticaux (menu "...") en blanc

---

### 2. Pochette d'album (zone centrale principale)
- **Forme** : carré avec coins légèrement arrondis, occupant ~60% de la largeur de l'écran
- **Image** : illustration sombre représentant une **silhouette de ville (skyline)** avec des bâtiments noirs sur fond ambré/orange brûlé, atmosphère post-apocalyptique ou industrielle
- **Texte superposé sur la pochette** (centré, en blanc, style grunge/texture) : `SAIFE EVA SKYE`

---

### 3. Zone d'informations sur le titre (sous la pochette)
- **Titre du morceau** : `Neon Pulse` — en blanc, grande typographie, gras
- **Nom de l'artiste** : `Synthetic Dreams` — en gris clair, taille plus petite
- **Icône cœur** à droite du bloc titre/artiste : couleur verte (titre aimé/favori)

---

### 4. Barre de progression
- **Barre horizontale fine** sur toute la largeur
- **Partie jouée** : couleur verte (Spotify green)
- **Partie restante** : gris foncé
- **Curseur** : petit cercle blanc sur la barre verte indiquant la position actuelle (~25% de la lecture)
- **Temps écoulé** : affiché à gauche en bas de la barre (ex: `0:45`)
- **Temps total** : affiché à droite en bas de la barre (ex: `3:20`) — *valeurs approximatives, peu lisibles*

---

### 5. Contrôles de lecture (rangée d'icônes)
Cinq icônes centrées horizontalement, de gauche à droite :

| Position | Icône | Fonction |
|---|---|---|
| 1 | Shuffle (deux flèches croisées) | Lecture aléatoire — couleur gris/inactif |
| 2 | Précédent (double triangle gauche) | Titre précédent — blanc |
| 3 | **Pause** (deux barres verticales) | **Bouton principal** — cercle vert rempli, icône blanche, plus grand |
| 4 | Suivant (double triangle droit) | Titre suivant — blanc |
| 5 | Répétition (flèche circulaire) | Répéter — gris/inactif |

---

### 6. Barre de navigation du bas (Tab Bar)
Quatre onglets en bas :

| Icône | Label |
|---|---|
| Maison | Home |
| Loupe | Search |
| Bibliothèque | Your Library |
| Premium/Plus | (icône spéciale) |

- Onglet actif : non clairement indiqué sur cet écran
- Fond de la barre : noir opaque

---

## Palette de couleurs
| Élément | Couleur |
|---|---|
| Fond général | `#0a0a0a` ou `#0d1a0f` (noir/vert très foncé) |
| Texte principal | `#FFFFFF` (blanc) |
| Texte secondaire | `#a0a0a0` (gris clair) |
| Accent / bouton play / barre progression | `#1DB954` (vert Spotify) |
| Pochette (tons dominants) | Ambre `#c07020`, noir `#1a1a1a` |

---

## Typographie observée
- Titre du morceau : **sans-serif gras, ~22px**
- Artiste : sans-serif léger, ~14px
- Texte "PLAYING FROM PLAYLIST" : sans-serif majuscule, ~10px, lettres espacées

---

## Notes pour l'IA
- Le bouton Play/Pause est l'élément dominant visuellement (cercle vert)
- L'interface suit un pattern **full-screen player** standard des apps de streaming
- Le cœur vert indique que ce titre est dans les favoris de l'utilisateur
- L'accent vert `#1DB954` est la couleur de marque principale utilisée sur tous les éléments interactifs clés
