package audiomack

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Track est un titre tel que renvoyé par livesearch.
type Track struct {
	ID            int64   `json:"id"`
	Type          string  `json:"type"`
	Title         string  `json:"title"`
	Artist        string  `json:"artist"`
	Featuring     string  `json:"featuring"`
	Album         string  `json:"album"`
	Duration      flexInt `json:"duration"`
	URLSlug       string  `json:"url_slug"`
	Image         string  `json:"image"`
	Genre         string  `json:"genre"`
	Explicit      string  `json:"explicit"`
	GeoRestricted bool    `json:"geo_restricted"`
	PremiumOnly   string  `json:"premium_user_only"`
	Audiomod      string  `json:"audiomod"`
	Uploader      struct {
		Name     string `json:"name"`
		URLSlug  string `json:"url_slug"`
		Verified string `json:"verified"`
	} `json:"uploader"`
}

// DurationSeconds vaut 0 quand Audiomack ne renseigne pas la durée.
func (t Track) DurationSeconds() int { return int(t.Duration) }

// PageURL est la page publique du titre sur audiomack.com.
func (t Track) PageURL() string {
	return "https://audiomack.com/" + t.Uploader.URLSlug + "/song/" + t.URLSlug
}

// SearchOptions reprend les paramètres envoyés par la barre de recherche du site.
type SearchOptions struct {
	Limit int    // 1-20, 20 par défaut comme le site
	Page  int    // 1 par défaut
	Sort  string // "popular" par défaut
}

// SearchSongs renvoie uniquement les titres (type "song") de la recherche.
func (c *Client) SearchSongs(ctx context.Context, query string, opts SearchOptions) ([]Track, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, errors.New("audiomack: recherche vide")
	}
	if opts.Limit <= 0 || opts.Limit > 20 {
		opts.Limit = 20
	}
	if opts.Page <= 0 {
		opts.Page = 1
	}
	if opts.Sort == "" {
		opts.Sort = "popular"
	}
	params := url.Values{}
	params.Set("q", query)
	params.Set("show", "music")
	params.Set("sort", opts.Sort)
	params.Set("limit", strconv.Itoa(opts.Limit))
	params.Set("page", strconv.Itoa(opts.Page))

	var resp struct {
		Results []Track `json:"results"`
	}
	if err := c.get(ctx, "/livesearch", params, &resp); err != nil {
		return nil, err
	}
	songs := make([]Track, 0, len(resp.Results))
	for _, t := range resp.Results {
		if t.Type == "song" {
			songs = append(songs, t)
		}
	}
	return songs, nil
}

// Stream est le lien audio signé (CloudFront) renvoyé par music/play.
// Il n'est lié ni à l'IP ni aux cookies : seule l'expiration le limite.
type Stream struct {
	URL       string
	PlayUUID  string
	ExpiresAt time.Time
}

// StreamURL demande le lien audio comme le lecteur web au clic sur lecture.
// hq=true donne l'AAC haute qualité quand le titre en dispose.
func (c *Client) StreamURL(ctx context.Context, trackID int64, hq bool) (Stream, error) {
	if trackID <= 0 {
		return Stream{}, errors.New("audiomack: identifiant de titre invalide")
	}
	params := url.Values{}
	params.Set("environment", "desktop-web")
	params.Set("hq", strconv.FormatBool(hq))
	params.Set("section", "Search")

	var resp struct {
		SignedURL string `json:"signedUrl"`
		PlayUUID  string `json:"playUuid"`
	}
	if err := c.get(ctx, fmt.Sprintf("/music/play/%d", trackID), params, &resp); err != nil {
		return Stream{}, err
	}
	if resp.SignedURL == "" {
		return Stream{}, errors.New("audiomack: pas de lien audio (titre indisponible ou réservé aux abonnés)")
	}
	s := Stream{URL: resp.SignedURL, PlayUUID: resp.PlayUUID}
	if u, err := url.Parse(resp.SignedURL); err == nil {
		if exp, err := strconv.ParseInt(u.Query().Get("Expires"), 10, 64); err == nil {
			s.ExpiresAt = time.Unix(exp, 0)
		}
	}
	return s, nil
}

// flexInt accepte un nombre JSON ou une chaîne ("158", "") : l'API mélange les deux.
type flexInt int

func (f *flexInt) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), `"`)
	if s == "" || s == "null" {
		*f = 0
		return nil
	}
	var n json.Number = json.Number(s)
	v, err := n.Int64()
	if err != nil {
		return fmt.Errorf("audiomack: durée invalide %q", s)
	}
	*f = flexInt(v)
	return nil
}
