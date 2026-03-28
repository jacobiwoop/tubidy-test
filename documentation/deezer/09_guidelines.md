# 09 — Guidelines, Règles & Droits

> ⚠️ Ces règles sont **obligatoires** pour utiliser l'API Deezer. Leur non-respect peut entraîner la révocation de votre accès.

---

## Utilisation commerciale

- L'API Deezer est **gratuite** pour tous les usages
- Il n'existe **pas d'API payante**
- Pour un usage commercial ou un partenariat, contactez Deezer : https://forms.gle/DXogJXou24x6xMbA6

---

## Ce que vous pouvez faire

✅ Intégrer les données musicales dans votre application  
✅ Afficher les métadonnées (titres, artistes, albums, durées)  
✅ Utiliser les URLs d'images Deezer **directement** (sans cache local)  
✅ Stocker les noms d'artistes et titres **en local** (sans audio)  
✅ Créer des expériences musicales pour vos utilisateurs  
✅ Intégrer le player JavaScript dans vos pages web

---

## Ce que vous ne pouvez pas faire

❌ Mettre en cache les **images** Deezer (interdit légalement)  
❌ Rendre les URLs audio complètes **accessibles ou téléchargeables** par l'utilisateur  
❌ Faire passer les titres complets via l'API (seulement via SDK)  
❌ Demander une **certification ou approbation** officielle (Deezer n'en délivre pas)  
❌ Faire whitelister votre app pour contourner les quotas (sauf accord commercial)  
❌ Créer un **bridge de paiement** avec la plateforme Deezer  
❌ Accéder aux données privées (genre des fans, etc.)  
❌ Partager les données de streaming avec des tiers  

---

## Droits de streaming par type d'utilisateur

| Fonctionnalité | Gratuit | Premium | HiFi/Family |
|---|---|---|---|
| Aperçus 30s | ✅ | ✅ | ✅ |
| Écoute complète mobile | ❌ | ✅ | ✅ |
| Écoute haute qualité | ❌ | ❌ | ✅ |
| Ajout aux favoris | ✅ | ✅ | ✅ |
| Création de playlists | ✅ | ✅ | ✅ |
| Accès hors-ligne | ❌ | ✅ | ✅ |

> ⚠️ Les droits de streaming peuvent être **mis à jour à tout moment** par Deezer.

---

## Droits régionaux

L'accès au contenu varie selon la **région géographique** de l'utilisateur final. Deezer négocie des droits séparément avec les ayants droit locaux dans chaque pays. En tant que développeur, vous devez respecter ces contraintes et ne pas contourner les restrictions géographiques.

---

## Gestion des applications

### Créer une application

1. Aller sur https://developers.deezer.com/myapps
2. Cliquer "New Application"
3. Remplir : nom, description, URL de redirection
4. Accepter les CGU

### Désactiver une application

Dans la page "Edit" de votre application, section "Basic info", mettez l'option **"Activate"** sur `false`. Cela invalide immédiatement tous les tokens générés par cette application.

### Publier sur l'App Store

Deezer **ne fournit pas de documentation** pour la soumission d'applications sur l'App Store ou le Play Store. Vous êtes responsable de ce processus.

---

## Conditions d'utilisation complètes

📜 https://developers.deezer.com/termsofuse

---

## Contact & Support

- **Support développeurs** : Chat disponible de 9h30 à 17h GMT (semaine) et 11h à 17h GMT (week-end)
- **Formulaire partenariat** : https://forms.gle/DXogJXou24x6xMbA6
- **Signaler un bug SDK** : https://forms.gle/QKdSbmrV8hXnmVyu9
- **Communauté** : https://en.deezercommunity.com
