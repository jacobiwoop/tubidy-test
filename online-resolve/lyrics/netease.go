package lyrics

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
)

// NetEase Cloud Music (music.163.com) : un service de streaming chinois dont l'API non officielle donne,
// sans compte, les paroles minutées de son catalogue, rap français et musique africaine compris. Elle peut
// changer ou nous bloquer : c'est une source de plus à comparer avec LRCLIB, jamais la seule.

const neteaseBaseURL = "https://music.163.com/api"

type neteaseSong struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Duration int    `json:"duration"` // millisecondes
	Artists  []struct {
		Name string `json:"name"`
	} `json:"artists"`
}

// Lignes de crédits que NetEase place en tête des paroles : « 作词 : Ninho » (paroles), « 作曲 : … » (musique)…
var neteaseCredit = regexp.MustCompile(`^(作词|作曲|编曲|制作人|混音|母带|和声|吉他|贝斯|鼓|录音|监制|出品|发行|词|曲)\s*[:：]`)

// neteaseVersions rend les paroles NetEase des morceaux de la bonne durée chantés par cet artiste
// (en général une seule version). Toute erreur donne simplement une liste vide.
func (c *Client) neteaseVersions(ctx context.Context, artist, clean string, durationSec int) []candidate {
	var search struct {
		Result struct {
			Songs []neteaseSong `json:"songs"`
		} `json:"result"`
	}
	q := url.Values{"s": {artist + " " + clean}, "type": {"1"}, "limit": {"10"}}
	if err := c.neteaseGet(ctx, "/search/get", q, &search); err != nil {
		return nil
	}
	want := strings.ToLower(strings.TrimSpace(strings.SplitN(artist, ",", 2)[0]))
	var songs []neteaseSong
	for _, s := range search.Result.Songs {
		if durationSec > 0 && abs((s.Duration+500)/1000-durationSec) > durationTolerance {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(CleanTitle(s.Name, artist)), clean) && !strings.Contains(strings.ToLower(s.Name), strings.ToLower(clean)) {
			continue
		}
		for _, a := range s.Artists {
			if n := strings.ToLower(a.Name); n == want || strings.Contains(n, want) || strings.Contains(want, n) {
				songs = append(songs, s)
				break
			}
		}
		if len(songs) == 2 {
			break // assez pour comparer, sans multiplier les appels
		}
	}
	// Les paroles des morceaux retenus en parallèle : NetEase met souvent plus d'une seconde à répondre.
	found := make([]*candidate, len(songs))
	var wg sync.WaitGroup
	for i, s := range songs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if lines := c.neteaseLyrics(ctx, s.ID); len(lines) > 0 {
				found[i] = &candidate{res: Result{Synced: true, Lines: lines, Source: "NetEase"}, duration: float64(s.Duration) / 1000}
			}
		}()
	}
	wg.Wait()
	var out []candidate
	for _, f := range found {
		if f != nil {
			out = append(out, *f)
		}
	}
	return out
}

// neteaseLyrics rend les lignes minutées d'un morceau, sans les crédits ; rien pour un instrumental.
func (c *Client) neteaseLyrics(ctx context.Context, id int64) []Line {
	var lyric struct {
		Lrc struct {
			Lyric string `json:"lyric"`
		} `json:"lrc"`
	}
	if err := c.neteaseGet(ctx, "/song/lyric", url.Values{"id": {strconv.FormatInt(id, 10)}, "lv": {"1"}}, &lyric); err != nil {
		return nil
	}
	var lines []Line
	for _, l := range ParseLRC(lyric.Lrc.Lyric) {
		if neteaseCredit.MatchString(l.Text) {
			continue
		}
		if strings.Contains(l.Text, "纯音乐") { // « morceau instrumental, bonne écoute »
			return nil
		}
		lines = append(lines, l)
	}
	return lines
}

func (c *Client) neteaseGet(ctx context.Context, path string, q url.Values, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.neteaseURL+path+"?"+q.Encode(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Referer", "https://music.163.com") // sans lui, NetEase refuse
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("netease %s : HTTP %d", path, resp.StatusCode)
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return err
	}
	return json.Unmarshal(b, out)
}
