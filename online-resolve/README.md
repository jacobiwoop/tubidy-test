# online-resolve — résolveur audio (Audiomack + Tubidy)

Transforme un titre Spotify en lien audio lisible directement par le client (`<audio>`, ExoPlayer).
Les deux sources sont interrogées en parallèle : **la première qui fournit un lien gagne**.

## Contrat HTTP

```
GET /api/resolve?q=<artistes> <titre>&duration=<secondes>
X-Api-Key: <clé>          (si RESOLVE_API_KEY est défini)
```

- `q` : construit comme l'app, avec les noms Spotify : `"Wizkid, Tems Essence (feat. Tems)"`.
- `duration` : durée Spotify en secondes. Fortement recommandée : elle écarte les reprises
  et les autres versions (tolérance ± 5 s). Sans elle, aucune vérification.
- `all=1` : attend toutes les sources (comparaison, plus lent).

Réponse `200` :

```json
{
  "query": "Ninho Jefe", "duration": 178, "mode": "race", "totalMs": 560,
  "best": { "provider": "audiomack", "title": "Jefe", "artist": "Ninho", "durationSec": 178,
            "format": "m4a", "streamUrl": "https://music.audiomack.com/…", "expiresAt": "…" },
  "providers": [ { "provider": "audiomack", "ms": 560, "result": { … } } ]
}
```

`404` : aucune source n'a de lien. `400` : `q` absent ou `duration` invalide. `401` : clé absente ou fausse.

Les liens ne sont liés ni à l'IP ni aux cookies : le serveur les obtient, le client les lit.
Ils expirent (Audiomack ~4 h) : ne pas les garder longtemps.

## Sources

| | Audiomack | Tubidy (`duesouth.co.za`) |
|---|---|---|
| Flux | `livesearch` → `music/play` (OAuth 1.0, clé publique du site web) | Anubis → recherche → page → `formats` → `play` → `.mp3` |
| Vitesse | ~0,6 s | ~2 s |
| Format | AAC `.m4a`, jusqu'à 256 kbit/s | MP3 128 kbit/s |
| Reconnaissance | durée de la recherche, titres signalés bloqués | durée des cartes de recherche, puis durée réelle du fichier (en-tête MP3) |

Stratégie commune : premier résultat ; on ne passe au suivant (3 au plus) que si la résolution échoue
ou si la durée ne correspond pas. Les versions retouchées (432hz, slowed, sped up, nightcore…) sont écartées
sauf si la requête les demande.

## Utilisation locale

```sh
go test ./...
go run ./cmd/resolve -q "Ninho Jefe" -duration 178
go run ./cmd/resolve -serve :8090            # page de test sur http://localhost:8090
```

## Déploiement Vercel

`api/resolve.go` (runtime Go), région `cdg1` (`vercel.json`). Variables : `RESOLVE_API_KEY`, `TUBIDY_BASE_URL`
(miroir Tubidy, `https://duesouth.co.za` par défaut). La région détermine le catalogue Audiomack disponible.
