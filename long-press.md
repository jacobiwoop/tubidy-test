Voici une proposition complète des paramètres et variations que nous pourrions implémenter selon la situation :

1. Pour les Morceaux (Tracks)
   Partout : Recherche, Playlists, Album, Likes

Lire ensuite : Ajoute le titre juste après la chanson actuelle.
Ajouter à la file d'attente : Place le titre à la toute fin de la liste de lecture.
Ajouter à une playlist : Ouvre le modal pour choisir une de tes playlists.
Voir l'artiste : Navigation directe vers le profil de l'artiste.
Voir l'album : Navigation vers la page de l'album.
Télécharger / Supprimer le téléchargement : Gestion rapide du stockage.
Partager : Copier le lien du morceau.
Supprimer de cette playlist : (Uniquement visible quand on est à l'intérieur d'une playlist personnalisée). 2. Pour les Albums
Recherche, Profil Artiste

Lire l'album : Remplace la file actuelle par l'album complet.
Ajouter à la file d'attente : Ajoute tous les titres de l'album à la suite.
Enregistrer dans la bibliothèque : Suit l'album pour le retrouver dans "Ma Musique".
Voir l'artiste : Retour au profil de l'artiste.
Télécharger tout l'album : Lance le téléchargement en masse.
Partager l'album. 3. Pour les Artistes
Recherche

Voir le profil : Navigation vers sa page.
Suivre / Ne plus suivre : Gestion de l'abonnement.
Lancer la Radio de l'artiste : Crée un mix basé sur cet artiste. 4. Pour les Playlists
Bibliothèque / Library

Lire la playlist.
Renommer : Modifie le titre (si c'est une playlist que tu as créée).
Supprimer la playlist : Action irréversible avec confirmation.
Partager la playlist.
🎨 Variations Visuelles (Design)
Pour l'implémentation, je suggère d'utiliser un "Bottom Sheet" (un menu qui glisse depuis le bas) car c'est plus facile à utiliser avec le pouce que des petits menus surgissants.

Le design inclurait :

En-tête du menu : Image miniature (pochette) + Titre + Sous-titre pour confirmer quel élément on modifie.
Haptique : Une petite vibration (impactLight) lors de l'appui long pour confirmer l'action.
Flou (Blur) : Fond en verre poli (Glassmorphism) pour rester dans l'esthétique premium de Tubidy.
