// Package waptrick trouve les MP3 de waptrick.com : page de recherche, page du titre (chemins du fichier par
// qualité), puis /load-file/… qui redirige vers le fichier sur leur serveur (http, adresse IP).
//
// La recherche n'indique pas la durée : on la calcule d'après le fichier (probe).
package waptrick

import (
	"context"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

const (
	DefaultBaseURL   = "https://waptrick.com"
	defaultUserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
	maxPage          = 2 << 20
)

var (
	// Un résultat : le lien du titre (dans un onclick, le href étant une publicité), son nom, puis ses artistes.
	songRE   = regexp.MustCompile(`window\.open\('[^']*/download/[^']*\?type=FT&amp;id=(\d+)'\)`)
	nameRE   = regexp.MustCompile(`class="uptext underline">\s*([^<]*?)\s*</span>`)
	artistRE = regexp.MustCompile(`class="more underline">([^<]*)</a>`)
	pageRE   = regexp.MustCompile(`window\.open\('([^']*/download/[^']*\?type=FT&amp;id=\d+)'\)`)
	flocRE   = regexp.MustCompile(`floc=([^'&"]+)`)
)

// ErrNoFile signale une page de titre sans fichier MP3.
var ErrNoFile = errors.New("waptrick: pas de fichier pour ce titre")

// Client parle à waptrick.com. Il ne suit pas les redirections : celle de /load-file/ est le résultat attendu.
type Client struct {
	http      *http.Client
	baseURL   string
	userAgent string
}

type Option func(*Client)

func WithBaseURL(u string) Option {
	return func(c *Client) { c.baseURL = strings.TrimRight(u, "/") }
}

func New(opts ...Option) *Client {
	c := &Client{
		http: &http.Client{
			Timeout:       15 * time.Second,
			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		},
		baseURL:   DefaultBaseURL,
		userAgent: defaultUserAgent,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// Song est un résultat de recherche.
type Song struct {
	ID     string
	Title  string
	Artist string // « Raybekah, Kholi » quand ils sont plusieurs
	Page   string // adresse complète de la page du titre
}

func (c *Client) get(ctx context.Context, rawURL string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", c.userAgent)
	return c.http.Do(req)
}

func (c *Client) page(ctx context.Context, rawURL string) (string, error) {
	res, err := c.get(ctx, rawURL)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return "", fmt.Errorf("waptrick: HTTP %d", res.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, maxPage))
	return string(body), err
}

// Search rend les MP3 de la recherche, dans l'ordre du site.
func (c *Client) Search(ctx context.Context, q string) ([]Song, error) {
	body, err := c.page(ctx, c.baseURL+"/fr/_common/search/search.jsp?"+url.Values{"c": {q}, "type": {"full_mp3"}}.Encode())
	if err != nil {
		return nil, err
	}
	return parseSearch(body, c.baseURL), nil
}

func parseSearch(body, base string) []Song {
	var songs []Song
	for _, item := range strings.Split(body, `<li class="new_list">`)[1:] {
		id, name, page := songRE.FindStringSubmatch(item), nameRE.FindStringSubmatch(item), pageRE.FindStringSubmatch(item)
		if id == nil || name == nil || page == nil {
			continue
		}
		var artists []string
		for _, a := range artistRE.FindAllStringSubmatch(item, -1) {
			artists = append(artists, html.UnescapeString(strings.TrimSpace(a[1])))
		}
		link := html.UnescapeString(page[1])
		if !strings.HasPrefix(link, "http") {
			link = base + link
		}
		songs = append(songs, Song{ID: id[1], Title: html.UnescapeString(name[1]), Artist: strings.Join(artists, ", "), Page: link})
	}
	return songs
}

// StreamURL rend le lien du fichier dans la meilleure qualité proposée.
func (c *Client) StreamURL(ctx context.Context, s Song) (string, error) {
	body, err := c.page(ctx, s.Page)
	if err != nil {
		return "", err
	}
	path := bestFile(body)
	if path == "" {
		return "", ErrNoFile
	}
	res, err := c.get(ctx, c.baseURL+path)
	if err != nil {
		return "", err
	}
	res.Body.Close()
	loc := res.Header.Get("Location")
	if res.StatusCode/100 != 3 || loc == "" {
		return "", fmt.Errorf("waptrick: /load-file/ HTTP %d sans redirection", res.StatusCode)
	}
	return loc, nil
}

// bestFile choisit le chemin /load-file/… : les liens de la page vont de la meilleure qualité à la plus basse.
func bestFile(body string) string {
	for _, m := range flocRE.FindAllStringSubmatch(body, -1) {
		if p, err := url.QueryUnescape(m[1]); err == nil && strings.HasPrefix(p, "/load-file/") {
			return p
		}
	}
	return ""
}

// Probe rend la durée du MP3 en secondes, sans le télécharger : 0 si elle ne se calcule pas.
func (c *Client) Probe(ctx context.Context, fileURL string) (int, error) {
	return probe(ctx, c.http, c.userAgent, fileURL)
}
