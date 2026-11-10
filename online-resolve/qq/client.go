// Package qq cherche et lit les titres de QQ Music, via tang.api.s01s.cn (tenue par un tiers, repérée dans MusicSquare).
package qq

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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
	ID     string
	Title  string
	Artist string
	Term   string // recherche d'origine, redemandée avec l'identifiant
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

func New() *Client { return &Client{Base: "https://tang.api.s01s.cn/music_open_api.php"} }

func (q *Client) Name() string { return "qq" }

func (q *Client) Search(ctx context.Context, term string) ([]Song, error) {
	return twice(ctx, func() ([]Song, error) {
		var items []struct {
			Title  string `json:"song_title"`
			Mid    string `json:"song_mid"`
			Singer string `json:"singer_name"`
		}
		if err := getJSON(ctx, q.Base+"?"+url.Values{"msg": {term}, "type": {"json"}}.Encode(), &items); err != nil {
			return nil, err
		}
		songs := make([]Song, 0, len(items))
		for _, it := range items {
			songs = append(songs, Song{ID: it.Mid, Title: it.Title, Artist: it.Singer, Term: term})
		}
		return songs, nil
	})
}

// Stream : les titres payants n'ont aucun lien (chaînes vides) ; on prend la meilleure qualité non vide.
func (q *Client) Stream(ctx context.Context, s Song) (Stream, error) {
	var d struct {
		Time     int    `json:"song_play_time"`
		HQ       string `json:"song_play_url_hq"`
		Standard string `json:"song_play_url_standard"`
		Default  string `json:"song_play_url"`
	}
	v := url.Values{"msg": {s.Term}, "type": {"json"}, "mid": {s.ID}}
	if err := getJSON(ctx, q.Base+"?"+v.Encode(), &d); err != nil {
		return Stream{}, err
	}
	for _, link := range []string{d.HQ, d.Standard, d.Default} {
		if link != "" {
			return Stream{URL: link, Format: "m4a", DurationSec: d.Time}, nil
		}
	}
	return Stream{}, fmt.Errorf("qq : %q n'a pas de lien (titre payant)", s.Title)
}
