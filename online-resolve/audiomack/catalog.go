package audiomack

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// Item est un élément du catalogue Audiomack : titre, album, playlist ou artiste.
// L'API mêle nombres et chaînes pour les mêmes champs : les types flex les acceptent tous.
type Item struct {
	ID            flexInt64  `json:"id"`
	SongID        flexInt64  `json:"song_id"` // identifiant des titres dans un album
	Type          string     `json:"type"`    // song, album, playlist ; vide pour un artiste
	Title         flexString `json:"title"`
	Artist        flexString `json:"artist"` // texte, ou objet {name} dans les playlists
	Featuring     flexString `json:"featuring"`
	Album         flexString `json:"album"`
	Duration      flexInt    `json:"duration"`
	Image         string     `json:"image"`
	ImageBanner   string     `json:"image_banner"`
	Explicit      string     `json:"explicit"`
	URLSlug       string     `json:"url_slug"`
	Genre         string     `json:"genre"`
	Description   string     `json:"description"`
	Released      flexInt64  `json:"released"`
	GeoRestricted bool       `json:"geo_restricted"`
	PremiumOnly   string     `json:"premium_user_only"`
	TrackCount    flexInt    `json:"track_count"`
	Uploader      struct {
		Name     string `json:"name"`
		URLSlug  string `json:"url_slug"`
		Verified string `json:"verified"`
	} `json:"uploader"`
	Stats struct {
		Plays flexInt64 `json:"plays-raw"`
	} `json:"stats"`
	RankData *struct {
		Rank        int    `json:"rank"`
		DailyChange string `json:"dailyChange"`
	} `json:"rank_data"`
	Tracks []Item `json:"tracks"`

	// Champs des artistes.
	Name      string    `json:"name"`
	Followers flexInt64 `json:"followers_count"`
	Verified  string    `json:"verified"`
	Bio       string    `json:"bio"`
}

// Blocked est vrai quand Audiomack ne donnera pas de lien depuis le pays du serveur (région ou abonnement).
func (it Item) Blocked() bool { return it.GeoRestricted || it.PremiumOnly == "yes" }

// IsVerified couvre les deux formes du champ ("yes" et "verified").
func IsVerified(v string) bool { return v == "yes" || v == "verified" }

// Category est une catégorie de playlists (page Parcourir).
type Category struct {
	ID      flexInt64  `json:"id"`
	Title   flexString `json:"title"`
	URLSlug flexString `json:"url_slug"` // parfois false dans l'API
}

// Region est un pays proposé pour les charts.
type Region struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

// Trending rend les titres (ou albums si albums) en tendance, pour un genre ou tous.
func (c *Client) Trending(ctx context.Context, genre string, albums bool, limit int) ([]Item, error) {
	path := "/music/trending/page/1"
	if genre != "" {
		path = "/music/" + url.PathEscape(genre) + "/trending/page/1"
	}
	params := url.Values{"limit": {strconv.Itoa(clamp(limit, 1, 50, 20))}}
	if albums {
		params.Set("type", "album")
	}
	return c.list(ctx, path, params)
}

// Recent rend les dernières sorties.
func (c *Client) Recent(ctx context.Context, genre string, limit int) ([]Item, error) {
	path := "/music/recent/page/1"
	if genre != "" {
		path = "/music/" + url.PathEscape(genre) + "/recent/page/1"
	}
	return c.list(ctx, path, url.Values{"limit": {strconv.Itoa(clamp(limit, 1, 50, 20))}})
}

// ChartKinds sont les classements hebdomadaires disponibles.
var ChartKinds = map[string]bool{"songs": true, "albums": true, "playlists": true, "artists": true}

// Chart rend un classement hebdomadaire (songs, albums, playlists, artists) pour un pays (code ISO) et un genre.
func (c *Client) Chart(ctx context.Context, kind, country, genre string, limit int) ([]Item, error) {
	if !ChartKinds[kind] {
		return nil, fmt.Errorf("audiomack: classement %q inconnu", kind)
	}
	path := "/chart/" + kind + "/weekly/page/1"
	if genre != "" {
		path = "/chart/" + url.PathEscape(genre) + "/" + kind + "/weekly/page/1"
	}
	params := url.Values{"limit": {strconv.Itoa(clamp(limit, 1, 50, 20))}}
	if country != "" {
		params.Set("country", strings.ToUpper(country))
	}
	return c.list(ctx, path, params)
}

// Categories rend les catégories de playlists.
func (c *Client) Categories(ctx context.Context) ([]Category, error) {
	var resp struct {
		Results struct {
			Categories []Category `json:"categories"`
		} `json:"results"`
	}
	if err := c.get(ctx, "/playlist/categories", nil, &resp); err != nil {
		return nil, err
	}
	return resp.Results.Categories, nil
}

// CategoryPlaylists rend le titre d'une catégorie et ses playlists.
func (c *Client) CategoryPlaylists(ctx context.Context, slug string) (string, []Item, error) {
	var resp struct {
		Results struct {
			Title     string `json:"title"`
			Playlists []Item `json:"playlists"`
		} `json:"results"`
	}
	if err := c.get(ctx, "/playlist/categories", url.Values{"slug": {slug}}, &resp); err != nil {
		return "", nil, err
	}
	return resp.Results.Title, resp.Results.Playlists, nil
}

// Playlist rend une playlist et ses titres.
func (c *Client) Playlist(ctx context.Context, id int64) (Item, error) {
	return c.one(ctx, fmt.Sprintf("/playlist/%d", id), nil)
}

// Album rend un album et ses titres, d'après l'artiste (url_slug de l'uploader) et le slug de l'album.
func (c *Client) Album(ctx context.Context, artistSlug, albumSlug string) (Item, error) {
	return c.one(ctx, "/music/album/"+url.PathEscape(artistSlug)+"/"+url.PathEscape(albumSlug), nil)
}

// Artist rend la fiche d'un artiste d'après son url_slug.
func (c *Client) Artist(ctx context.Context, slug string) (Item, error) {
	return c.one(ctx, "/artist/"+url.PathEscape(slug), nil)
}

// ArtistUploads rend les dernières mises en ligne d'un artiste.
func (c *Client) ArtistUploads(ctx context.Context, slug string, limit int) ([]Item, error) {
	return c.list(ctx, "/artist/"+url.PathEscape(slug)+"/uploads", url.Values{"limit": {strconv.Itoa(clamp(limit, 1, 50, 20))}})
}

// SearchArtists rend les artistes correspondant à q.
func (c *Client) SearchArtists(ctx context.Context, q string, limit int) ([]Item, error) {
	return c.list(ctx, "/search", url.Values{"q": {q}, "show": {"artists"}, "limit": {strconv.Itoa(clamp(limit, 1, 20, 5))}})
}

// Regions rend les pays proposés pour les charts.
func (c *Client) Regions(ctx context.Context) ([]Region, error) {
	var raw json.RawMessage
	if err := c.get(ctx, "/region", nil, &raw); err != nil {
		return nil, err
	}
	var wrapped struct {
		Results []Region `json:"results"`
	}
	if err := json.Unmarshal(raw, &wrapped); err == nil && wrapped.Results != nil {
		return wrapped.Results, nil
	}
	var direct []Region
	if err := json.Unmarshal(raw, &direct); err != nil {
		return nil, fmt.Errorf("audiomack: régions illisibles: %w", err)
	}
	return direct, nil
}

// ErrNeedsAccount signale une route réservée aux comptes connectés.
var ErrNeedsAccount = errors.New("audiomack: compte requis (WithUserToken)")

// RelatedSongs rend les titres suggérés à partir d'un titre (la « radio » du titre). Compte requis.
func (c *Client) RelatedSongs(ctx context.Context, songID int64) ([]Item, error) {
	if !c.HasUserToken() {
		return nil, ErrNeedsAccount
	}
	return c.list(ctx, "/recommendations/related-songs", url.Values{"musicId": {strconv.FormatInt(songID, 10)}, "source": {"browse"}})
}

// RelatedArtists rend les artistes suggérés à partir d'un artiste (son id numérique). Compte requis.
func (c *Client) RelatedArtists(ctx context.Context, artistID int64) ([]Item, error) {
	if !c.HasUserToken() {
		return nil, ErrNeedsAccount
	}
	return c.list(ctx, fmt.Sprintf("/recommendations/related-artists/%d", artistID), nil)
}

// list décode une réponse dont "results" est une liste (ou la racine, pour les recommandations).
func (c *Client) list(ctx context.Context, path string, params url.Values) ([]Item, error) {
	var raw json.RawMessage
	if err := c.get(ctx, path, params, &raw); err != nil {
		return nil, err
	}
	var wrapped struct {
		Results []Item `json:"results"`
	}
	if err := json.Unmarshal(raw, &wrapped); err == nil && wrapped.Results != nil {
		return wrapped.Results, nil
	}
	var direct []Item
	if err := json.Unmarshal(raw, &direct); err == nil {
		return direct, nil
	}
	return nil, fmt.Errorf("audiomack: %s : liste attendue", path)
}

func (c *Client) one(ctx context.Context, path string, params url.Values) (Item, error) {
	var resp struct {
		Results Item `json:"results"`
	}
	if err := c.get(ctx, path, params, &resp); err != nil {
		return Item{}, err
	}
	return resp.Results, nil
}

func clamp(v, lo, hi, def int) int {
	if v <= 0 {
		return def
	}
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// flexInt64 accepte un nombre JSON ou une chaîne ("1791491416", "") : l'API mélange les deux.
type flexInt64 int64

func (f *flexInt64) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), `"`)
	if s == "" || s == "null" || s == "false" {
		*f = 0
		return nil
	}
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		if fl, ferr := strconv.ParseFloat(s, 64); ferr == nil {
			*f = flexInt64(fl)
			return nil
		}
		*f = 0 // valeur non numérique (ex. identifiant textuel) : ignorée plutôt que d'échouer
		return nil
	}
	*f = flexInt64(v)
	return nil
}

// String rend la valeur.
func (f flexString) String() string { return string(f) }

// Int64 rend la valeur.
func (f flexInt64) Int64() int64 { return int64(f) }

// flexString accepte une chaîne, un nombre, un booléen (false et null donnent "")
// ou un objet, dont il garde le champ name (ex. l'artiste d'une playlist).
type flexString string

func (f *flexString) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err == nil {
		*f = flexString(s)
		return nil
	}
	var o struct {
		Name string `json:"name"`
	}
	if strings.HasPrefix(strings.TrimSpace(string(b)), "{") {
		_ = json.Unmarshal(b, &o)
		*f = flexString(o.Name)
		return nil
	}
	switch v := strings.TrimSpace(string(b)); v {
	case "false", "true", "null":
		*f = ""
	default:
		*f = flexString(v)
	}
	return nil
}
