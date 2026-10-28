// Package lyrics récupère les paroles sur LRCLIB (lrclib.net) et NetEase, synchronisées quand elles existent.
// Parmi toutes les versions de la bonne durée, des deux sources, on garde celle qui a le moins de trous.
package lyrics

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	defaultBaseURL = "https://lrclib.net/api"
	userAgent      = "Spotywoop/1.0 (https://spotiwoop.vercel.app)"
	// durationTolerance écarte, en recherche approchée, les paroles d'une autre version du morceau.
	durationTolerance = 5
	// Un silence plus long que gapMs entre deux lignes, ou plus de tailMs entre la dernière ligne et la fin
	// du morceau, compte comme un trou : souvent un couplet que la personne n'a pas recopié.
	gapMs  = 15_000
	tailMs = 30_000
	// neteaseTimeout borne NetEase, interrogé en même temps que LRCLIB.
	neteaseTimeout = 3 * time.Second
)

// Line est une ligne de paroles ; TimeMs vaut 0 pour des paroles non synchronisées.
type Line struct {
	TimeMs int64  `json:"t"`
	Text   string `json:"text"`
}

type Result struct {
	Synced bool   `json:"synced"`
	Lines  []Line `json:"lines"`
	Source string `json:"source"` // "LRCLIB", "NetEase", "lrc.red", "Spicy Lyrics (Apple Music)"…
	// Word : minutées mot par mot ; Rich porte alors le détail (syllabes, chœurs, duos).
	Word        bool       `json:"word"`
	ByModel     bool       `json:"byModel,omitempty"` // minutage généré par un modèle, pas par une personne
	Rich        []RichLine `json:"rich,omitempty"`
	Songwriters string     `json:"songwriters,omitempty"`
	// Final : dernière réponse de la recherche ; sinon une meilleure version peut encore arriver.
	Final bool `json:"final"`
}

// ErrNotFound : LRCLIB n'a pas de paroles pour ce titre.
var ErrNotFound = errors.New("lyrics: paroles introuvables")

type Client struct {
	http       *http.Client
	baseURL    string
	neteaseURL string
	srcs       []source // remplace les vraies sources dans les tests de la course
}

func New() *Client {
	return &Client{http: &http.Client{Timeout: 10 * time.Second}, baseURL: defaultBaseURL, neteaseURL: neteaseBaseURL}
}

// WithBaseURL et WithNeteaseURL servent aux tests.
func (c *Client) WithBaseURL(u string) *Client { c.baseURL = strings.TrimRight(u, "/"); return c }

func (c *Client) WithNeteaseURL(u string) *Client { c.neteaseURL = strings.TrimRight(u, "/"); return c }

type entry struct {
	ID           int64   `json:"id"`
	TrackName    string  `json:"trackName"`
	ArtistName   string  `json:"artistName"`
	Duration     float64 `json:"duration"`
	Instrumental bool    `json:"instrumental"`
	PlainLyrics  string  `json:"plainLyrics"`
	SyncedLyrics string  `json:"syncedLyrics"`
}

// Fetch cherche les paroles. LRCLIB a souvent plusieurs versions d'un même titre, envoyées par des personnes
// différentes, et certaines sautent un couplet : on récupère toutes les versions d'un coup (deux recherches
// LRCLIB et NetEase en parallèle, paroles comprises), on écarte celles d'une autre durée et on garde la plus
// complète (voir better). Si rien n'est trouvé, on se rabat sur la correspondance exacte de LRCLIB.
func (c *Client) Fetch(ctx context.Context, artist, title, album string, durationSec int) (Result, error) {
	artist = strings.TrimSpace(artist)
	clean := CleanTitle(title, artist)
	if artist == "" || clean == "" {
		return Result{}, fmt.Errorf("%w : artiste ou titre manquant", ErrNotFound)
	}

	searches := []url.Values{
		{"track_name": {clean}, "artist_name": {artist}},
		{"q": {artist + " " + clean}}, // rattrape les titres mal orthographiés ou les artistes notés autrement
	}
	found := make([][]entry, len(searches))
	var fromNetease []candidate
	var wg sync.WaitGroup
	for i, q := range searches {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c.get(ctx, "/search", q, &found[i]) // une recherche en échec laisse simplement sa liste vide
		}()
	}
	wg.Add(1)
	go func() {
		defer wg.Done()
		nctx, cancel := context.WithTimeout(ctx, neteaseTimeout) // NetEase ne doit jamais faire attendre
		defer cancel()
		fromNetease = c.neteaseVersions(nctx, artist, clean, durationSec)
	}()
	wg.Wait()
	if ctx.Err() != nil {
		return Result{}, ctx.Err()
	}

	candidates := fromNetease
	seen := map[int64]bool{}
	for _, list := range found {
		for _, e := range list {
			if e.ID != 0 && seen[e.ID] {
				continue
			}
			seen[e.ID] = true
			if e.Instrumental || (durationSec > 0 && e.Duration > 0 && abs(int(e.Duration+0.5)-durationSec) > durationTolerance) {
				continue
			}
			if r, ok := toResult(e); ok {
				candidates = append(candidates, candidate{res: r, duration: e.Duration})
			}
		}
	}
	var best *version
	for _, cand := range candidates {
		v := measure(cand.res, cand.duration, durationSec)
		if best == nil || v.better(*best) {
			best = &v
		}
	}
	if best != nil {
		return best.res, nil
	}
	return c.exact(ctx, artist, clean, album, durationSec)
}

// exact demande à LRCLIB « la » version qui correspond (avec album et durée, puis sans).
func (c *Client) exact(ctx context.Context, artist, clean, album string, durationSec int) (Result, error) {
	attempts := []url.Values{{"artist_name": {artist}, "track_name": {clean}}}
	if album != "" || durationSec > 0 {
		q := url.Values{"artist_name": {artist}, "track_name": {clean}}
		if album != "" {
			q.Set("album_name", album)
		}
		if durationSec > 0 {
			q.Set("duration", strconv.Itoa(durationSec))
		}
		attempts = append([]url.Values{q}, attempts...)
	}
	for _, q := range attempts {
		var e entry
		if err := c.get(ctx, "/get", q, &e); err == nil {
			if r, ok := toResult(e); ok {
				return r, nil
			}
		} else if ctx.Err() != nil {
			return Result{}, ctx.Err()
		}
	}
	return Result{}, ErrNotFound
}

// candidate : des paroles trouvées, avec la durée du morceau d'après leur source.
type candidate struct {
	res      Result
	duration float64
}

// version est une version de paroles candidate, avec ce qui sert à la comparer aux autres.
type version struct {
	res      Result
	holesMs  int64 // durée totale des trous
	lines    int   // lignes avec du texte
	durDelta int   // écart de durée avec notre morceau, en secondes
}

func measure(r Result, entryDur float64, durationSec int) version {
	v := version{res: r}
	if durationSec > 0 && entryDur > 0 {
		v.durDelta = abs(int(entryDur+0.5) - durationSec)
	}
	var prev int64 = -1
	for _, l := range r.Lines {
		if l.Text == "" {
			continue // une ligne vide marque seulement la fin de la précédente
		}
		v.lines++
		if r.Synced && prev >= 0 && l.TimeMs-prev > gapMs {
			v.holesMs += l.TimeMs - prev
		}
		prev = l.TimeMs
	}
	if r.Synced && durationSec > 0 && prev >= 0 {
		if tail := int64(durationSec)*1000 - prev; tail > tailMs {
			v.holesMs += tail
		}
	}
	return v
}

// better : minutée avant non minutée, puis le moins de trous, le plus de lignes, la durée la plus proche.
func (v version) better(o version) bool {
	switch {
	case v.res.Synced != o.res.Synced:
		return v.res.Synced
	case v.holesMs != o.holesMs:
		return v.holesMs < o.holesMs
	case v.lines != o.lines:
		return v.lines > o.lines
	default:
		return v.durDelta < o.durDelta
	}
}

func toResult(e entry) (Result, bool) {
	if lines := ParseLRC(e.SyncedLyrics); len(lines) > 0 {
		return Result{Synced: true, Lines: lines, Source: "LRCLIB"}, true
	}
	if strings.TrimSpace(e.PlainLyrics) == "" {
		return Result{}, false
	}
	var lines []Line
	for _, l := range strings.Split(strings.ReplaceAll(e.PlainLyrics, "\r", ""), "\n") {
		lines = append(lines, Line{Text: strings.TrimSpace(l)})
	}
	return Result{Lines: lines, Source: "LRCLIB"}, true
}

var lrcLine = regexp.MustCompile(`^\[(\d+):(\d+(?:\.\d+)?)\](.*)$`)

// ParseLRC lit le format [mm:ss.xx] texte ; les lignes sans horodatage sont ignorées.
func ParseLRC(lrc string) []Line {
	var out []Line
	for _, raw := range strings.Split(strings.ReplaceAll(lrc, "\r", ""), "\n") {
		m := lrcLine.FindStringSubmatch(strings.TrimSpace(raw))
		if m == nil {
			continue
		}
		min, _ := strconv.Atoi(m[1])
		sec, _ := strconv.ParseFloat(m[2], 64)
		out = append(out, Line{TimeMs: int64(min)*60000 + int64(sec*1000+0.5), Text: strings.TrimSpace(m[3])})
	}
	return out
}

var bracketed = regexp.MustCompile(`\s*[\(\[][^\)\]]*[\)\]]`)

// CleanTitle retire « (feat. …) », « [Remastered] »… et la partie « - Artiste » des titres de charts.
func CleanTitle(title, artist string) string {
	t := strings.TrimSpace(bracketed.ReplaceAllString(title, ""))
	if before, after, ok := strings.Cut(t, " - "); ok {
		first := strings.ToLower(strings.TrimSpace(strings.SplitN(artist, ",", 2)[0]))
		switch {
		case first != "" && strings.Contains(strings.ToLower(after), first):
			t = before // « Je suis béni - First King »
		case first != "" && strings.Contains(strings.ToLower(before), first):
			t = after // « First King - Je suis béni »
		default:
			t = before // « Alors on danse - Radio Edit »
		}
	}
	return strings.TrimSpace(t)
}

func (c *Client) get(ctx context.Context, path string, q url.Values, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path+"?"+q.Encode(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", userAgent)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("lrclib %s : HTTP %d", path, resp.StatusCode)
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return err
	}
	return json.Unmarshal(b, out)
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}
