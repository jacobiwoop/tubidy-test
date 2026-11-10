// Package kuwo cherche et lit les titres de Kuwo, via oiapi.net (tenue par un tiers, repérée dans MusicSquare).
package kuwo

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const (
	userAgent  = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
	maxBody    = 4 << 20
	emptyRetry = 1200 * time.Millisecond
)

var httpClient = &http.Client{Timeout: 20 * time.Second}

// Song est un résultat de recherche.
type Song struct {
	ID          string
	Title       string
	Artist      string
	DurationSec int
	Quality     string // valeur de br à demander, voir bestQuality
	Index       int    // position dans les résultats, à partir de 1 : le lien se demande par position
	Term        string // recherche d'origine, à redonner avec Index
}

// Stream est le lien audio prêt à lire.
type Stream struct {
	URL         string
	Format      string
	DurationSec int // 0 : inconnue
}

func getJSON(ctx context.Context, rawURL string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", userAgent)
	res, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d", res.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, maxBody))
	if err != nil {
		return err
	}
	return json.Unmarshal(body, out)
}

// twice appelle search, puis une seconde fois après une courte pause si la liste est vide : l'API rend 200 et une
// liste vide quand on l'appelle trop vite, ce qui ne prouve pas que le titre manque.
func twice(ctx context.Context, search func() ([]Song, error)) ([]Song, error) {
	songs, err := search()
	if err != nil || len(songs) > 0 {
		return songs, err
	}
	select {
	case <-time.After(emptyRetry):
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	return search()
}

type Client struct{ Base string }

func New() *Client { return &Client{Base: "https://oiapi.net/api/Kuwo"} }

func (k *Client) Name() string { return "kuwo" }

// kuwoType est une qualité disponible pour un titre.
type kuwoType struct {
	Bitrate string `json:"bitrate"`
	Format  string `json:"format"`
}

type kuwoSong struct {
	Song   string `json:"song"`
	Singer string `json:"singer"`
	Time   string `json:"time"`
	RID    string `json:"rid"`
	Format string `json:"format"`
	URL    string `json:"url"`

	Types []kuwoType `json:"types"`
}

// bestQuality rend le br du MP3 au meilleur débit, sinon de la première qualité qui n'est pas du FLAC (40 Mo par
// titre). br est la position dans la liste des qualités du titre, à partir de 1 : elle change d'un titre à l'autre
// (MP3 320 : br=4 pour « Formidable », br=5 pour « Last Last », mesuré le 30/10/2026).
func bestQuality(types []kuwoType) string {
	best, bestRate := 0, -1
	for i, t := range types {
		if rate, _ := strconv.Atoi(t.Bitrate); t.Format == "mp3" && rate > bestRate {
			best, bestRate = i+1, rate
		}
	}
	for i := 0; best == 0 && i < len(types); i++ {
		if types[i].Format != "flac" {
			best = i + 1
		}
	}
	return strconv.Itoa(best)
}

func (k *Client) Search(ctx context.Context, term string) ([]Song, error) {
	return twice(ctx, func() ([]Song, error) {
		var res struct {
			Data json.RawMessage `json:"data"`
		}
		q := url.Values{"msg": {term}, "page": {"1"}, "limit": {"10"}}
		if err := getJSON(ctx, k.Base+"?"+q.Encode(), &res); err != nil {
			return nil, err
		}
		var items []kuwoSong
		if json.Unmarshal(res.Data, &items) != nil { // « data » n'est une liste que s'il y a des résultats
			return nil, nil
		}
		songs := make([]Song, 0, len(items))
		for i, it := range items {
			sec, _ := strconv.Atoi(it.Time)
			songs = append(songs, Song{ID: it.RID, Title: it.Song, Artist: it.Singer, DurationSec: sec, Quality: bestQuality(it.Types), Index: i + 1, Term: term})
		}
		return songs, nil
	})
}

func (k *Client) Stream(ctx context.Context, s Song) (Stream, error) {
	var res struct {
		Data kuwoSong `json:"data"`
	}
	q := url.Values{"msg": {s.Term}, "n": {strconv.Itoa(s.Index)}, "br": {s.Quality}}
	if err := getJSON(ctx, k.Base+"?"+q.Encode(), &res); err != nil {
		return Stream{}, err
	}
	// Le lien se demande par position : si l'ordre a changé depuis la recherche, ce n'est plus le même titre.
	if res.Data.URL == "" || (s.ID != "" && res.Data.RID != s.ID) {
		return Stream{}, fmt.Errorf("kuwo : pas de lien pour %q", s.Title)
	}
	sec, _ := strconv.Atoi(res.Data.Time)
	return Stream{URL: res.Data.URL, Format: res.Data.Format, DurationSec: sec}, nil
}
