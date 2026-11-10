// Package netease cherche et lit les titres de NetEase, via l'API Meting de api.qijieya.cn (tenue par un tiers, repérée dans MusicSquare).
package netease

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
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
	Title  string
	Artist string
	Link   string // lien Meting, redirigé vers le fichier
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

var noRedirect = &http.Client{
	Timeout:       20 * time.Second,
	CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
}

type Client struct{ Base string }

func New() *Client { return &Client{Base: "https://api.qijieya.cn/meting/"} }

func (n *Client) Name() string { return "netease" }

func (n *Client) Search(ctx context.Context, term string) ([]Song, error) {
	return twice(ctx, func() ([]Song, error) {
		var items []struct {
			Name   string `json:"name"`
			Artist string `json:"artist"`
			URL    string `json:"url"`
		}
		q := url.Values{"type": {"search"}, "limit": {"10"}, "server": {"netease"}, "id": {term}}
		if err := getJSON(ctx, n.Base+"?"+q.Encode(), &items); err != nil {
			return nil, err
		}
		songs := make([]Song, 0, len(items))
		for _, it := range items {
			songs = append(songs, Song{Title: it.Name, Artist: it.Artist, Link: it.URL})
		}
		return songs, nil
	})
}

// Stream suit la redirection du lien Meting vers music.126.net (https, lisible par une page web) et lit la durée.
func (n *Client) Stream(ctx context.Context, s Song) (Stream, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.Link, nil)
	if err != nil {
		return Stream{}, err
	}
	req.Header.Set("User-Agent", userAgent)
	res, err := noRedirect.Do(req)
	if err != nil {
		return Stream{}, err
	}
	res.Body.Close()
	loc := res.Header.Get("Location")
	if res.StatusCode/100 != 3 || loc == "" {
		return Stream{}, fmt.Errorf("netease : pas de fichier (HTTP %d)", res.StatusCode)
	}
	loc = strings.Replace(loc, "http://", "https://", 1)
	sec, err := probe(ctx, httpClient, userAgent, loc)
	if err != nil {
		return Stream{}, err
	}
	return Stream{URL: loc, Format: "mp3", DurationSec: sec}, nil
}
