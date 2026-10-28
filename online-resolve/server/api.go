package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"online-resolve/audiomack"
	"online-resolve/lyrics"
	"online-resolve/provider"
	"online-resolve/spotify"
)

// route est une page de l'API : elle rend une valeur à encoder en JSON, ou une erreur.
type route struct {
	ttl time.Duration // durée de cache (mémoire de l'instance et CDN) ; 0 : jamais en cache
	fn  func(ctx context.Context, cfg Config, r *http.Request) (any, error)
}

// errNotFound donne un 404, errBadRequest un 400.
var (
	errNotFound   = errors.New("introuvable")
	errBadRequest = errors.New("paramètre manquant ou invalide")
)

var routes = map[string]route{
	"search":   {5 * time.Minute, apiSearch},
	"discover": {15 * time.Minute, apiDiscover},
	"charts":   {15 * time.Minute, apiCharts},
	"regions":  {24 * time.Hour, apiRegions},
	"browse":   {6 * time.Hour, apiBrowse},
	"category": {time.Hour, apiCategory},
	"playlist": {30 * time.Minute, apiPlaylist},
	"album":    {6 * time.Hour, apiAlbum},
	"artist":   {time.Hour, apiArtist},
	"radio":    {30 * time.Minute, apiRadio},
}

// API sert /api/<route> ; "resolve" garde son propre traitement (liens jamais mis en cache).
// La route se lit dans le chemin, ou dans ?route= quand Vercel réécrit /api/<route> vers /api/index.
func API(cfg Config) http.HandlerFunc {
	resolve := ResolveHandler(cfg)
	return func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.Query().Get("route")
		if name == "" {
			name = strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/"), "/")
		}
		if name == "resolve" {
			resolve(w, r)
			return
		}
		if name == "lyrics" && r.Method == http.MethodGet {
			if !allowed(cfg, r) {
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				writeError(w, http.StatusUnauthorized, "clé d'accès absente ou invalide")
				return
			}
			apiLyrics(cfg, w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "X-Api-Key")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		rt, ok := routes[name]
		if !ok {
			writeError(w, http.StatusNotFound, "route inconnue : "+name)
			return
		}
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "méthode GET attendue")
			return
		}
		if !allowed(cfg, r) {
			writeError(w, http.StatusUnauthorized, "clé d'accès absente ou invalide")
			return
		}

		key := name + "?" + canonicalQuery(r)
		if body, ok := apiCache.get(key); ok {
			writeCached(w, rt.ttl, body, "HIT")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
		defer cancel()
		start := time.Now()
		v, err := rt.fn(ctx, cfg, r)
		if err != nil {
			status := http.StatusBadGateway
			switch {
			case errors.Is(err, errNotFound):
				status = http.StatusNotFound
			case errors.Is(err, errBadRequest):
				status = http.StatusBadRequest
			}
			log.Printf("api %s : %v (%d ms)", key, err, time.Since(start).Milliseconds())
			writeError(w, status, err.Error())
			return
		}
		body, err := json.Marshal(v)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		apiCache.set(key, body, rt.ttl)
		writeCached(w, rt.ttl, body, "MISS")
	}
}

func writeCached(w http.ResponseWriter, ttl time.Duration, body []byte, state string) {
	if ttl > 0 {
		s := int(ttl.Seconds())
		w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=60, s-maxage=%d, stale-while-revalidate=%d", s, s))
	} else {
		w.Header().Set("Cache-Control", "no-store")
	}
	w.Header().Set("X-Cache", state)
	w.Write(body)
}

func canonicalQuery(r *http.Request) string {
	q := r.URL.Query()
	q.Del("route")
	return q.Encode()
}

// cache mémoire de l'instance : les requêtes identiques ne repartent pas vers les API sources.
type memCache struct {
	mu      sync.Mutex
	entries map[string]cacheEntry
}

type cacheEntry struct {
	body    []byte
	expires time.Time
}

var apiCache = &memCache{entries: map[string]cacheEntry{}}

func (c *memCache) get(key string) ([]byte, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[key]
	if !ok || time.Now().After(e.expires) {
		return nil, false
	}
	return e.body, true
}

func (c *memCache) set(key string, body []byte, ttl time.Duration) {
	if ttl <= 0 {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.entries) > 500 { // borne simple : on repart de zéro plutôt que de grossir sans fin
		c.entries = map[string]cacheEntry{}
	}
	c.entries[key] = cacheEntry{body: body, expires: time.Now().Add(ttl)}
}

// ---------- Recherche (Spotify) ----------

type searchResult struct {
	Tracks    []Track `json:"tracks"`
	Albums    []Card  `json:"albums"`
	Artists   []Card  `json:"artists"`
	Playlists []Card  `json:"playlists"`
}

func apiSearch(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		return nil, fmt.Errorf("%w : q", errBadRequest)
	}
	res, err := cfg.SP.Search(ctx, q, 30, 0)
	if err != nil {
		return nil, err
	}
	out := searchResult{Tracks: []Track{}, Albums: []Card{}, Artists: []Card{}, Playlists: []Card{}}
	for _, t := range res.Tracks {
		out.Tracks = append(out.Tracks, fromSPSearchTrack(t))
	}
	for _, a := range res.Albums {
		sub := a.Artists
		if a.Year > 0 {
			sub += " · " + strconv.Itoa(a.Year)
		}
		out.Albums = append(out.Albums, Card{Kind: "album", Ref: "sp:" + a.ID, Title: a.Name, Subtitle: sub, Image: a.Cover})
	}
	for _, a := range res.Artists {
		out.Artists = append(out.Artists, Card{Kind: "artist", Ref: "sp:" + a.ID, Title: a.Name, Image: a.Cover})
	}
	for _, p := range res.Playlists {
		out.Playlists = append(out.Playlists, Card{Kind: "playlist", Ref: "sp:" + p.ID, Title: p.Name, Subtitle: p.Owner, Image: p.Cover})
	}
	return out, nil
}

// ---------- Découvrir, Charts, Parcourir (Audiomack) ----------

type discoverResult struct {
	Genre          string  `json:"genre,omitempty"`
	TrendingSongs  []Track `json:"trendingSongs"`
	TrendingAlbums []Card  `json:"trendingAlbums"`
	Recent         []Track `json:"recent"`
	Top            []Track `json:"top"`
	Country        string  `json:"country"`
}

func apiDiscover(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	genre := strings.TrimSpace(r.URL.Query().Get("genre"))
	country := countryParam(r)
	out := discoverResult{Genre: genre, Country: country}
	var songs, albums, recent, top []audiomack.Item
	errs := parallel(
		func() (err error) { songs, err = cfg.AM.Trending(ctx, genre, false, 12); return },
		func() (err error) { albums, err = cfg.AM.Trending(ctx, genre, true, 12); return },
		func() (err error) { recent, err = cfg.AM.Recent(ctx, genre, 12); return },
		func() (err error) { top, err = cfg.AM.Chart(ctx, "songs", country, genre, 10); return },
	)
	if songs == nil && albums == nil {
		return nil, errors.Join(errs...)
	}
	out.TrendingSongs = mapTracks(songs)
	out.TrendingAlbums = mapCards(albums, "album")
	out.Recent = mapTracks(recent)
	out.Top = mapTracks(top)
	return out, nil
}

type chartsResult struct {
	Country   string  `json:"country"`
	Genre     string  `json:"genre,omitempty"`
	Songs     []Track `json:"songs"`
	Albums    []Card  `json:"albums"`
	Artists   []Card  `json:"artists"`
	Playlists []Card  `json:"playlists"`
}

func apiCharts(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	country := countryParam(r)
	genre := strings.TrimSpace(r.URL.Query().Get("genre"))
	var songs, albums, artists, playlists []audiomack.Item
	errs := parallel(
		func() (err error) { songs, err = cfg.AM.Chart(ctx, "songs", country, genre, 50); return },
		func() (err error) { albums, err = cfg.AM.Chart(ctx, "albums", country, genre, 12); return },
		func() (err error) { artists, err = cfg.AM.Chart(ctx, "artists", country, genre, 12); return },
		func() (err error) { playlists, err = cfg.AM.Chart(ctx, "playlists", country, genre, 12); return },
	)
	if songs == nil {
		return nil, errors.Join(errs...)
	}
	return chartsResult{Country: country, Genre: genre, Songs: mapTracks(songs), Albums: mapCards(albums, "album"),
		Artists: mapCards(artists, "artist"), Playlists: mapCards(playlists, "playlist")}, nil
}

func apiRegions(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	return cfg.AM.Regions(ctx)
}

// apiBrowse rend les catégories, chacune illustrée par la pochette de sa première playlist.
func apiBrowse(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	cats, err := cfg.AM.Categories(ctx)
	if err != nil {
		return nil, err
	}
	// Audiomack en liste ~150 ; les premières sont les plus mises en avant. Une requête par catégorie
	// pour l'image : on borne pour garder un premier chargement court (le résultat reste 6 h en cache).
	const maxCategories = 48
	if len(cats) > maxCategories {
		cats = cats[:maxCategories]
	}
	out := make([]Card, 0, len(cats))
	var mu sync.Mutex
	var fns []func() error
	for _, c := range cats {
		slug, title := c.URLSlug.String(), c.Title.String()
		if slug == "" || title == "" {
			continue
		}
		i := len(out)
		out = append(out, Card{Kind: "category", Ref: "am:" + slug, Title: title})
		fns = append(fns, func() error {
			_, pls, err := cfg.AM.CategoryPlaylists(ctx, slug)
			if err != nil || len(pls) == 0 {
				return err
			}
			mu.Lock()
			out[i].Image, out[i].Count = amImage(pls[0].Image, 300), len(pls)
			mu.Unlock()
			return nil
		})
	}
	parallel(fns...)
	return out, nil
}

type categoryResult struct {
	Title     string `json:"title"`
	Playlists []Card `json:"playlists"`
}

func apiCategory(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	slug := strings.TrimPrefix(r.URL.Query().Get("ref"), "am:")
	if slug == "" {
		return nil, fmt.Errorf("%w : ref", errBadRequest)
	}
	title, pls, err := cfg.AM.CategoryPlaylists(ctx, slug)
	if err != nil {
		return nil, err
	}
	if len(pls) == 0 {
		return nil, errNotFound
	}
	return categoryResult{Title: title, Playlists: mapCards(pls, "playlist")}, nil
}

// ---------- Pages album, playlist, artiste ----------

func apiPlaylist(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	ref := r.URL.Query().Get("ref")
	switch {
	case strings.HasPrefix(ref, "sp:"):
		p, err := cfg.SP.Playlist(ctx, strings.TrimPrefix(ref, "sp:"))
		if err != nil {
			return nil, err
		}
		return spPlaylistView(p), nil
	case strings.HasPrefix(ref, "am:"):
		id, _ := strconv.ParseInt(strings.TrimPrefix(ref, "am:"), 10, 64)
		if id <= 0 {
			return nil, fmt.Errorf("%w : ref", errBadRequest)
		}
		p, err := cfg.AM.Playlist(ctx, id)
		if err != nil {
			return nil, err
		}
		return Collection{Kind: "playlist", Ref: ref, Title: p.Title.String(), Subtitle: p.Artist.String(), Image: amImage(p.Image, 640),
			Description: p.Description, Plays: p.Stats.Plays.Int64(), TotalTracks: len(p.Tracks), Tracks: mapTracks(p.Tracks)}, nil
	}
	return nil, fmt.Errorf("%w : ref", errBadRequest)
}

func spPlaylistView(p spotify.PlaylistPage) Collection {
	c := Collection{Kind: "playlist", Ref: "sp:" + p.ID, Title: p.Name, Subtitle: p.Owner, Image: p.Cover,
		Description: p.Description, Followers: p.Followers, TotalTracks: p.TotalTracks, Tracks: []Track{}}
	for _, t := range p.Tracks {
		c.Tracks = append(c.Tracks, fromSPTrack(t))
	}
	return c
}

func apiAlbum(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	ref := r.URL.Query().Get("ref")
	switch {
	case strings.HasPrefix(ref, "sp:"):
		a, err := cfg.SP.Album(ctx, strings.TrimPrefix(ref, "sp:"))
		if err != nil {
			return nil, err
		}
		c := Collection{Kind: "album", Ref: ref, Title: a.Name, Subtitle: a.Artists, Image: a.Cover, Date: a.Date,
			Label: a.Label, Copyright: a.Copyright, Color: a.Color, TotalTracks: a.TotalTracks, Tracks: []Track{}}
		if a.ArtistID != "" {
			c.SubtitleRef = "sp:" + a.ArtistID
		}
		for _, t := range a.Tracks {
			c.Tracks = append(c.Tracks, fromSPTrack(t))
		}
		return c, nil
	case strings.HasPrefix(ref, "am:"):
		artist, slug, ok := strings.Cut(strings.TrimPrefix(ref, "am:"), "/")
		if !ok || artist == "" || slug == "" {
			return nil, fmt.Errorf("%w : ref", errBadRequest)
		}
		a, err := cfg.AM.Album(ctx, artist, slug)
		if err != nil {
			return nil, err
		}
		c := Collection{Kind: "album", Ref: ref, Title: a.Title.String(), Subtitle: a.Artist.String(), SubtitleRef: "name:" + a.Artist.String(),
			Image: amImage(a.Image, 640), Description: a.Description, Plays: a.Stats.Plays.Int64(), TotalTracks: len(a.Tracks)}
		if a.Released > 0 {
			c.Date = time.Unix(a.Released.Int64(), 0).UTC().Format("2006-01-02")
		}
		for _, t := range a.Tracks {
			tr := fromAMSong(t)
			if tr.Image == "" {
				tr.Image = c.Image
			}
			c.Tracks = append(c.Tracks, tr)
		}
		return c, nil
	}
	return nil, fmt.Errorf("%w : ref", errBadRequest)
}

// apiArtist rend la page Spotify d'un artiste (ref=sp:<id>, ou name:<nom> retrouvé par la recherche),
// avec les artistes similaires d'Audiomack quand le compte de service est configuré.
func apiArtist(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	ref := r.URL.Query().Get("ref")
	id := strings.TrimPrefix(ref, "sp:")
	if strings.HasPrefix(ref, "name:") {
		name := strings.TrimSpace(strings.TrimPrefix(ref, "name:"))
		if name == "" {
			return nil, fmt.Errorf("%w : ref", errBadRequest)
		}
		res, err := cfg.SP.Search(ctx, name, 5, 0)
		if err != nil {
			return nil, err
		}
		id = ""
		for _, a := range res.Artists {
			if strings.EqualFold(a.Name, name) {
				id = a.ID
				break
			}
		}
		if id == "" && len(res.Artists) > 0 {
			id = res.Artists[0].ID
		}
		if id == "" {
			return nil, errNotFound
		}
	} else if !strings.HasPrefix(ref, "sp:") || id == "" {
		return nil, fmt.Errorf("%w : ref", errBadRequest)
	}

	a, err := cfg.SP.Artist(ctx, id)
	if err != nil {
		return nil, err
	}
	v := ArtistView{Ref: "sp:" + a.ID, Name: a.Name, Image: a.Avatar, Banner: a.Header, Followers: a.Followers,
		MonthlyListeners: a.MonthlyListeners, Bio: a.Biography, TopCities: a.TopCities, Links: a.Links,
		TopTracks: []Track{}, Albums: []Card{}, Singles: []Card{}, Related: []Card{}}
	for _, t := range a.TopTracks {
		v.TopTracks = append(v.TopTracks, fromSPTrack(t))
	}
	for _, al := range a.Albums {
		v.Albums = append(v.Albums, Card{Kind: "album", Ref: "sp:" + al.ID, Title: al.Name, Subtitle: strconv.Itoa(al.Year), Image: al.Cover})
	}
	for _, al := range a.Singles {
		v.Singles = append(v.Singles, Card{Kind: "album", Ref: "sp:" + al.ID, Title: al.Name, Subtitle: strconv.Itoa(al.Year), Image: al.Cover})
	}
	if related := audiomackRelatedArtists(ctx, cfg, a.Name); len(related) > 0 {
		v.Related = related
	} else {
		for _, ra := range a.Related {
			v.Related = append(v.Related, Card{Kind: "artist", Ref: "sp:" + ra.ID, Title: ra.Name, Image: ra.Cover})
		}
	}
	return v, nil
}

// audiomackRelatedArtists : suggestion par artiste du compte de service (vide si indisponible).
func audiomackRelatedArtists(ctx context.Context, cfg Config, name string) []Card {
	if cfg.AMUser == nil {
		return nil
	}
	found, err := cfg.AM.SearchArtists(ctx, name, 5)
	if err != nil {
		return nil
	}
	var id int64
	for _, a := range found {
		if strings.EqualFold(a.Name, name) {
			id = a.ID.Int64()
			break
		}
	}
	if id == 0 {
		return nil
	}
	rel, err := cfg.AMUser.RelatedArtists(ctx, id)
	if err != nil {
		log.Printf("artistes similaires à %q : %v", name, err)
		return nil
	}
	return mapCards(rel, "artist")
}

// ---------- Radio ----------

type radioResult struct {
	Seed   string  `json:"seed"`
	Source string  `json:"source"`
	Title  string  `json:"title"`
	Tracks []Track `json:"tracks"`
}

// apiRadio : seed=track (q + artist, am=<id> et duration pour Audiomack) → suggestions par titre :
// YouTube Mix, sinon radio Spotify de l'artiste, sinon titres liés d'Audiomack ;
// seed=artist (name=<nom>) → radio Spotify de l'artiste.
func apiRadio(ctx context.Context, cfg Config, r *http.Request) (any, error) {
	p := r.URL.Query()
	switch p.Get("seed") {
	case "track":
		q := strings.TrimSpace(p.Get("q"))
		dur, _ := strconv.Atoi(p.Get("duration"))
		name := strings.TrimSpace(p.Get("artist"))
		// Ordre voulu par l'utilisateur : YouTube Mix (vrais titres, variés), radio Spotify de
		// l'artiste, puis titres liés d'Audiomack. sources= restreint la liste (l'appli fait YouTube elle-même).
		sources := strings.Split(p.Get("sources"), ",")
		if p.Get("sources") == "" {
			sources = []string{"youtube", "spotify", "audiomack"}
		}
		for _, src := range sources {
			switch strings.TrimSpace(src) {
			case "youtube":
				if q == "" {
					continue
				}
				tracks, err := youtubeMix(ctx, q, 25)
				if err == nil && len(tracks) > 0 {
					return radioResult{Seed: "track", Source: "youtube", Title: "Suggestions", Tracks: tracks}, nil
				}
				log.Printf("radio YouTube de %q : %v", q, err)
			case "spotify":
				if name == "" {
					continue
				}
				pl, err := cfg.SP.ArtistRadio(ctx, firstArtist(name))
				if err != nil {
					log.Printf("radio Spotify de %q : %v", name, err)
					continue
				}
				var tracks []Track
				for _, t := range spPlaylistView(pl).Tracks {
					if !strings.EqualFold(strings.TrimSpace(firstArtist(t.Artist)+" "+t.Title), q) {
						tracks = append(tracks, t)
					}
				}
				if len(tracks) > 0 {
					return radioResult{Seed: "track", Source: "spotify", Title: pl.Name, Tracks: tracks}, nil
				}
			case "audiomack":
				id, _ := strconv.ParseInt(p.Get("am"), 10, 64)
				if id == 0 && q != "" {
					id = findAudiomackSong(ctx, cfg, provider.Query{Text: q, DurationSec: dur})
				}
				if id == 0 || cfg.AMUser == nil {
					continue
				}
				songs, err := cfg.AMUser.RelatedSongs(ctx, id)
				if err == nil && len(songs) > 0 {
					return radioResult{Seed: "track", Source: "audiomack", Title: "Suggestions", Tracks: keepOriginals(mapTracks(songs))}, nil
				}
				log.Printf("radio du titre %d : %v", id, err)
			}
		}
		return nil, errNotFound
	case "artist":
		name := strings.TrimSpace(p.Get("name"))
		if name == "" {
			return nil, fmt.Errorf("%w : name", errBadRequest)
		}
		return artistRadio(ctx, cfg, name)
	}
	return nil, fmt.Errorf("%w : seed=track|artist", errBadRequest)
}

func artistRadio(ctx context.Context, cfg Config, name string) (any, error) {
	pl, err := cfg.SP.ArtistRadio(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("%w : %v", errNotFound, err)
	}
	return radioResult{Seed: "artist", Source: "spotify", Title: pl.Name, Tracks: spPlaylistView(pl).Tracks}, nil
}

// findAudiomackSong retrouve l'identifiant Audiomack d'un titre, avec la même reconnaissance que la lecture.
func findAudiomackSong(ctx context.Context, cfg Config, q provider.Query) int64 {
	songs, err := cfg.AM.SearchSongs(ctx, q.Text, audiomack.SearchOptions{Limit: 10})
	if err != nil {
		return 0
	}
	for _, s := range songs {
		d := s.DurationSeconds()
		if provider.IsAlteredVersion(s.Title+" "+s.Artist, q.Text) || !provider.ArtistMatches(s.Artist, q.Text) {
			continue
		}
		if q.DurationSec > 0 && d > 0 && (d-q.DurationSec > provider.DurationToleranceSec || q.DurationSec-d > provider.DurationToleranceSec) {
			continue
		}
		return s.ID
	}
	return 0
}

// ---------- Paroles ----------

// apiLyrics : artist, title, album, duration (secondes), isrc et spotify (identifiant) facultatifs.
//
// Sans stream : la première version envoyée par la course (au plus ~3 s), ou la meilleure si la course est
// finie ; "final" dit laquelle. Avec stream=1 : une version JSON par ligne (NDJSON), chacune meilleure que la
// précédente, jusqu'à la fin de la course.
func apiLyrics(cfg Config, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	p := r.URL.Query()
	q := lyrics.Query{
		Artist: firstArtist(p.Get("artist")), Title: strings.TrimSpace(p.Get("title")), Album: strings.TrimSpace(p.Get("album")),
		ISRC: strings.TrimSpace(p.Get("isrc")), SpotifyID: strings.TrimPrefix(strings.TrimSpace(p.Get("spotify")), "sp:"),
	}
	q.DurationSec, _ = strconv.Atoi(p.Get("duration"))
	if q.Artist == "" || q.Title == "" {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		writeError(w, http.StatusBadRequest, "paramètre manquant ou invalide : artist et title")
		return
	}
	race := cfg.Lyrics.Join(q)
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	if p.Get("stream") != "1" {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		res, ok := race.Latest()
		if !ok || !race.Done() {
			var err error
			if res, ok, err = race.Next(ctx, 0); err != nil {
				writeError(w, http.StatusGatewayTimeout, err.Error())
				return
			}
		}
		if !ok {
			writeError(w, http.StatusNotFound, errNotFound.Error())
			return
		}
		if race.Done() {
			res, _ = race.Latest()
			res.Final = true
		}
		writeLyrics(w, res)
		return
	}

	w.Header().Set("Content-Type", "application/x-ndjson; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Accel-Buffering", "no")
	flusher, _ := w.(http.Flusher)
	if race.Done() { // déjà connue : seulement la meilleure
		if res, ok := race.Latest(); ok {
			res.Final = true
			json.NewEncoder(w).Encode(res)
			return
		}
	}
	for i := 0; ; i++ {
		res, ok, err := race.Next(ctx, i)
		if err != nil || !ok {
			if i == 0 {
				writeError(w, http.StatusNotFound, errNotFound.Error())
			}
			return
		}
		if _, more, _ := peek(race, i+1); !more && race.Done() {
			res.Final = true
		}
		json.NewEncoder(w).Encode(res)
		if flusher != nil {
			flusher.Flush()
		}
	}
}

// peek dit, sans attendre, si la version i existe déjà.
func peek(race *lyrics.Race, i int) (lyrics.Result, bool, error) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	return race.Next(ctx, i)
}

// writeLyrics : une version définitive se garde 24 h au CDN ; une version provisoire, à peine.
func writeLyrics(w http.ResponseWriter, res lyrics.Result) {
	if res.Final {
		writeCached(w, 24*time.Hour, mustJSON(res), "RACE")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Write(mustJSON(res))
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}

// ---------- Outils ----------

func mapTracks(items []audiomack.Item) []Track {
	out := make([]Track, 0, len(items))
	for _, it := range items {
		if it.Title.String() != "" {
			out = append(out, fromAMSong(it))
		}
	}
	return out
}

func mapCards(items []audiomack.Item, kind string) []Card {
	out := make([]Card, 0, len(items))
	for _, it := range items {
		c := fromAMCard(it, kind)
		if c.Title != "" {
			out = append(out, c)
		}
	}
	return out
}

// countryParam : code pays ISO, BJ par défaut. Sans pays, Audiomack classe selon le pays de l'appelant
// (celui du serveur) : on en impose toujours un.
func countryParam(r *http.Request) string {
	c := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("country")))
	if len(c) != 2 {
		return "BJ"
	}
	return c
}

// parallel lance les fonctions en même temps et rend leurs erreurs (nil exclus).
func parallel(fns ...func() error) []error {
	errs := make([]error, len(fns))
	var wg sync.WaitGroup
	for i, fn := range fns {
		wg.Add(1)
		go func(i int, fn func() error) {
			defer wg.Done()
			errs[i] = fn()
		}(i, fn)
	}
	wg.Wait()
	out := errs[:0]
	for _, e := range errs {
		if e != nil {
			out = append(out, e)
		}
	}
	return out
}
