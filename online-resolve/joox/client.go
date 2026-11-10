// Package joox cherche et lit les titres de JOOX, via apicx.asia (tenue par un tiers, repérée dans MusicSquare).
package joox

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
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
	Index  int    // position dans les résultats, à partir de 1 : le lien se demande par position
	Term   string // recherche d'origine, à redonner avec Index
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

// JOOX demande un jeton personnel (variable JOOX_TOKEN). Sans jeton, la source n'est pas utilisée.
type Client struct {
	Base  string
	Token string
}

func New(token string) *Client {
	return &Client{Base: "https://apicx.asia/api/joox_music", Token: token}
}

func (j *Client) Name() string { return "joox" }

func (j *Client) Search(ctx context.Context, term string) ([]Song, error) {
	return twice(ctx, func() ([]Song, error) {
		var res struct {
			Code int `json:"code"`
			Data struct {
				Songs []struct {
					Title  string `json:"歌曲名称"`
					Artist string `json:"歌手"`
				} `json:"songs"`
			} `json:"data"`
		}
		q := url.Values{"msg": {term}, "token": {j.Token}, "br": {"4"}}
		if err := getJSON(ctx, j.Base+"?"+q.Encode(), &res); err != nil {
			return nil, safeErr(err, j.Token)
		}
		songs := make([]Song, 0, len(res.Data.Songs))
		for i, it := range res.Data.Songs {
			songs = append(songs, Song{Title: it.Title, Artist: it.Artist, Index: i + 1, Term: term})
		}
		return songs, nil
	})
}

func (j *Client) Stream(ctx context.Context, s Song) (Stream, error) {
	var res struct {
		Code int `json:"code"`
		Data struct {
			Links map[string]string `json:"播放链接"`
		} `json:"data"`
	}
	q := url.Values{"msg": {s.Term}, "n": {strconv.Itoa(s.Index)}, "token": {j.Token}, "br": {"4"}}
	if err := getJSON(ctx, j.Base+"?"+q.Encode(), &res); err != nil {
		return Stream{}, safeErr(err, j.Token)
	}
	for _, name := range []string{"MP3 320", "AAC 192", "MP3 128"} {
		if link := res.Data.Links[name]; link != "" {
			return Stream{URL: link, Format: strings.ToLower(strings.Fields(name)[0])}, nil
		}
	}
	return Stream{}, fmt.Errorf("joox : pas de lien pour %q", s.Title)
}

// safeErr retire le jeton d'une erreur réseau, dont le texte contient l'adresse appelée.
func safeErr(err error, token string) error {
	return fmt.Errorf("%s", strings.ReplaceAll(err.Error(), url.QueryEscape(token), "***"))
}
