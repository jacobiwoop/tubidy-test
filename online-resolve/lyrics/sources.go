package lyrics

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"math"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Les sources de paroles du composant <am-lyrics>, mêmes adresses et mêmes paramètres : lrc.red,
// BiniLyrics, Spicy Lyrics, Unison, LyricsPlus et Genius. LRCLIB et NetEase sont dans lrclib.go et netease.go.

// Query décrit le titre cherché ; ISRC et SpotifyID sont facultatifs et accélèrent certaines sources.
type Query struct {
	Artist, Title, Album string
	DurationSec          int
	ISRC, SpotifyID      string
}

const (
	sourceTimeout    = 8 * time.Second // FETCH_TIMEOUT_MS du composant
	spicyClientKey   = "sl_pk_8nNuJf0L-xFUv8L5uU-pfin69WU4j3IzzV2-T3GPWKY"
	spotifyTokenURL  = "https://flxgjwpkztgpdywkgckk.supabase.co/functions/v1/spotify-token"
	browserLikeAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
)

// geniusWorkerURL : variable pour les tests.
var geniusWorkerURL = "https://fetch-genius.samidy.workers.dev/"

// Miroirs LyricsPlus, dans l'ordre du composant ; on les interroge tous en même temps.
var kpoeServers = []string{
	"https://lyricsplus.binimum.org",
	"https://lyricsplus-seven.vercel.app",
	"https://lyricsplus.prjktla.workers.dev",
	"https://lyrics-plus-backend.vercel.app",
}

// source : un nom pour le journal et une fonction qui rend zéro, une ou plusieurs versions.
type source struct {
	name  string
	fetch func(ctx context.Context, q Query) ([]Result, error)
}

func (c *Client) sources() []source {
	return []source{
		{"lrc.red", c.lrcRed},
		{"BiniLyrics", c.bini},
		{"Spicy Lyrics", c.spicy},
		{"Unison", c.unison},
		{"LyricsPlus", c.lyricsPlus},
		{"LRCLIB+NetEase", c.lrclibNetease},
		{"Genius", c.genius},
	}
}

// fetchJSON fait un GET (ou POST sans corps) et décode la réponse ; une réponse autre que 200 est une erreur.
func (c *Client) fetchJSON(ctx context.Context, method, u string, headers map[string]string, out any) error {
	body, err := c.fetchBody(ctx, method, u, headers)
	if err != nil {
		return err
	}
	return json.Unmarshal(body, out)
}

func (c *Client) fetchBody(ctx context.Context, method, u string, headers map[string]string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, sourceTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, method, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", browserLikeAgent)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 4<<20))
}

func durationParam(v url.Values, q Query) {
	if q.Album != "" {
		v.Set("album", q.Album)
	}
	if q.DurationSec > 0 {
		v.Set("duration", strconv.Itoa(q.DurationSec))
	}
}

func secondsToMs(v any, fallback int64) int64 {
	if f, ok := v.(float64); ok && !math.IsNaN(f) && !math.IsInf(f, 0) {
		return int64(math.Max(0, math.Round(f*1000)))
	}
	return fallback
}

// ---------- lrc.red ----------

// lrcRed : correspondance titre + artiste (match.json) → ISRC → paroles (/s/<ISRC>.song.json).
func (c *Client) lrcRed(ctx context.Context, q Query) ([]Result, error) {
	isrc := q.ISRC
	if isrc == "" {
		v := url.Values{"track": {q.Title}, "artist": {q.Artist}}
		durationParam(v, q)
		var m struct {
			Hits []struct {
				ISRC string `json:"isrc"`
			} `json:"hits"`
		}
		if err := c.fetchJSON(ctx, http.MethodGet, "https://lrc.red/match.json?"+v.Encode(), nil, &m); err != nil {
			return nil, err
		}
		if len(m.Hits) == 0 || strings.TrimSpace(m.Hits[0].ISRC) == "" {
			return nil, nil
		}
		isrc = strings.TrimSpace(m.Hits[0].ISRC)
	}
	var song map[string]any
	if err := c.fetchJSON(ctx, http.MethodGet, "https://lrc.red/s/"+url.PathEscape(isrc)+".song.json", nil, &song); err != nil {
		return nil, err
	}
	var rich []RichLine
	var writers string
	if ttml, ok := song["source"].(string); ok && ttml != "" {
		rich, writers = parseTTML(ttml)
	}
	if len(rich) == 0 {
		rich = parseLrcRedJSON(song)
	}
	if list, ok := song["songwriters"].([]any); ok {
		var names []string
		for _, n := range list {
			if s, ok := n.(string); ok {
				names = append(names, s)
			}
		}
		writers = strings.Join(names, ", ")
	}
	byModel, _ := song["byModel"].(bool)
	if r, ok := richResult("lrc.red", rich, byModel, writers); ok {
		return []Result{r}, nil
	}
	return nil, nil
}

// parseLrcRedJSON lit les lignes JSON de lrc.red quand le TTML manque (parseLrcRedJson du composant).
func parseLrcRedJSON(song map[string]any) []RichLine {
	ly, _ := song["lyrics"].(map[string]any)
	entries, _ := ly["lines"].([]any)
	wordMode := ly["sync"] == "word"
	var out []RichLine
	for _, e := range entries {
		line, _ := e.(map[string]any)
		text, _ := line["text"].(string)
		if strings.TrimSpace(text) == "" {
			continue
		}
		ts := secondsToMs(line["begin"], 0)
		end := secondsToMs(line["end"], ts)
		words, _ := line["words"].([]any)
		word := wordMode && len(words) > 0
		var syl []Syllable
		if word {
			for wi, w := range words {
				parts, _ := w.([]any)
				for i, p := range parts {
					s, _ := p.(map[string]any)
					t, _ := s["text"].(string)
					part := i < len(parts)-1
					if !part && wi < len(words)-1 {
						t += " "
					}
					syl = append(syl, Syllable{Text: t, Part: part, Timestamp: secondsToMs(s["begin"], ts), Endtime: secondsToMs(s["end"], end)})
				}
			}
		} else {
			syl = []Syllable{{Text: text, Timestamp: ts, Endtime: end, LineSynced: true}}
		}
		if len(syl) == 0 {
			continue
		}
		voice, _ := line["voice"].(string)
		out = append(out, RichLine{
			Text: syl, BackgroundText: []Syllable{}, OppositeTurn: voice == "b", AgentID: voice,
			Timestamp: ts, Endtime: end, IsWordSynced: word,
		})
	}
	return out
}

// ---------- BiniLyrics ----------

// bini : lyrics-api.binimum.org (par ISRC, sinon titre + artiste) donne l'adresse d'un TTML.
func (c *Client) bini(ctx context.Context, q Query) ([]Result, error) {
	type found struct {
		Results []struct {
			LyricsURL string `json:"lyricsUrl"`
		} `json:"results"`
	}
	var data found
	if q.ISRC != "" {
		c.fetchJSON(ctx, http.MethodGet, "https://lyrics-api.binimum.org/?isrc="+url.QueryEscape(q.ISRC), nil, &data)
	}
	if len(data.Results) == 0 {
		v := url.Values{"track": {q.Title}, "artist": {q.Artist}}
		durationParam(v, q)
		if err := c.fetchJSON(ctx, http.MethodGet, "https://lyrics-api.binimum.org/?"+v.Encode(), nil, &data); err != nil {
			return nil, err
		}
	}
	if len(data.Results) == 0 || data.Results[0].LyricsURL == "" {
		return nil, nil
	}
	body, err := c.fetchBody(ctx, http.MethodGet, data.Results[0].LyricsURL, nil)
	if err != nil {
		return nil, err
	}
	rich, writers := parseTTML(string(body))
	if r, ok := richResult("BiniLyrics", rich, false, writers); ok {
		return []Result{r}, nil
	}
	return nil, nil
}

// ---------- Spicy Lyrics ----------

// Jeton Spotify anonyme, partagé et gardé jusqu'à peu avant son expiration (getSpotifyToken du composant).
var spotifyToken struct {
	sync.Mutex
	value   string
	expires time.Time
}

func (c *Client) spotifyAccessToken(ctx context.Context, renew bool) string {
	spotifyToken.Lock()
	defer spotifyToken.Unlock()
	if !renew && spotifyToken.value != "" && time.Now().Before(spotifyToken.expires) {
		return spotifyToken.value
	}
	var t struct {
		AccessToken string  `json:"access_token"`
		ExpiresIn   float64 `json:"expires_in"`
	}
	asked := time.Now()
	if err := c.fetchJSON(ctx, http.MethodPost, spotifyTokenURL, nil, &t); err != nil || t.AccessToken == "" || t.ExpiresIn <= 0 {
		return ""
	}
	life := time.Duration(t.ExpiresIn * float64(time.Second))
	spotifyToken.value, spotifyToken.expires = t.AccessToken, asked.Add(life-min(30*time.Second, life/10))
	return spotifyToken.value
}

var spotifyID = regexp.MustCompile(`^[A-Za-z0-9]{22}$`)

func normalize(s string) string { return strings.Join(strings.Fields(strings.ToLower(s)), " ") }

// spicy : trouve l'identifiant Spotify du titre (sauf s'il est fourni) puis demande api.spicylyrics.org.
func (c *Client) spicy(ctx context.Context, q Query) ([]Result, error) {
	id := q.SpotifyID
	if id == "" {
		term := "track:" + q.Title + " artist:" + q.Artist
		limit := "5"
		if q.ISRC != "" {
			term, limit = "isrc:"+q.ISRC, "1"
		}
		u := "https://api.spotify.com/v1/search?" + url.Values{"q": {term}, "type": {"track"}, "limit": {limit}}.Encode()
		var res struct {
			Tracks struct {
				Items []struct {
					ID         string `json:"id"`
					Name       string `json:"name"`
					DurationMs int64  `json:"duration_ms"`
					Artists    []struct {
						Name string `json:"name"`
					} `json:"artists"`
					ExternalIDs struct {
						ISRC string `json:"isrc"`
					} `json:"external_ids"`
				} `json:"items"`
			} `json:"tracks"`
		}
		var err error
		for _, renew := range []bool{false, true} { // un jeton refusé (401) est renouvelé une fois
			token := c.spotifyAccessToken(ctx, renew)
			if token == "" {
				return nil, fmt.Errorf("jeton Spotify indisponible")
			}
			if err = c.fetchJSON(ctx, http.MethodGet, u, map[string]string{"Authorization": "Bearer " + token}, &res); err == nil || err.Error() != "HTTP 401" {
				break
			}
		}
		if err != nil {
			return nil, err
		}
		title := normalize(CleanTitle(q.Title, q.Artist))
		for _, t := range res.Tracks.Items {
			if q.ISRC != "" {
				if t.ExternalIDs.ISRC == "" || strings.EqualFold(t.ExternalIDs.ISRC, q.ISRC) {
					id = t.ID
					break
				}
				continue
			}
			if normalize(CleanTitle(t.Name, q.Artist)) != title {
				continue
			}
			if q.DurationSec > 0 && abs(int(t.DurationMs)-q.DurationSec*1000) > 3000 {
				continue
			}
			for _, a := range t.Artists {
				if normalize(a.Name) == normalize(q.Artist) {
					id = t.ID
					break
				}
			}
			if id != "" {
				break
			}
		}
	}
	if !spotifyID.MatchString(id) {
		return nil, nil
	}
	var payload map[string]any
	if err := c.fetchJSON(ctx, http.MethodGet, "https://api.spicylyrics.org/v1/lyrics/"+url.PathEscape(id),
		map[string]string{"Authorization": "Bearer " + spicyClientKey}, &payload); err != nil {
		return nil, err
	}
	if r, ok := parseSpicy(payload); ok {
		return []Result{r}, nil
	}
	return nil, nil
}

// parseSpicy : même lecture que parseSpicyLyrics du composant (types Syllable, Line et Static).
func parseSpicy(payload map[string]any) (Result, bool) {
	body, _ := payload["Body"].(map[string]any)
	typ, _ := body["Type"].(string)
	if typ != "Syllable" && typ != "Line" && typ != "Static" {
		return Result{}, false
	}
	word, untimed := typ == "Syllable", typ == "Static"
	key := "Content"
	if untimed {
		key = "Lines"
	}
	content, _ := body[key].([]any)
	syllables := func(group map[string]any) []Syllable {
		list, _ := group["Syllables"].([]any)
		var entries []map[string]any
		for _, e := range list {
			if s, ok := e.(map[string]any); ok {
				if t, _ := s["Text"].(string); t != "" {
					entries = append(entries, s)
				}
			}
		}
		out := make([]Syllable, 0, len(entries))
		for i, s := range entries {
			part, _ := s["IsPartOfWord"].(bool)
			t, _ := s["Text"].(string)
			if !part && i < len(entries)-1 {
				t += " "
			}
			out = append(out, Syllable{
				Text: t, Part: part,
				Timestamp: secondsToMs(s["StartTime"], secondsToMs(group["StartTime"], 0)),
				Endtime:   secondsToMs(s["EndTime"], secondsToMs(group["EndTime"], 0)),
			})
		}
		return out
	}
	var lines []RichLine
	for _, e := range content {
		entry, _ := e.(map[string]any)
		if entry == nil || (!untimed && entry["Type"] != "Vocal") {
			continue
		}
		lead := entry
		if word {
			lead, _ = entry["Lead"].(map[string]any)
		}
		if lead == nil {
			continue
		}
		var text []Syllable
		if word {
			text = syllables(lead)
		} else if t, _ := lead["Text"].(string); strings.TrimSpace(t) != "" {
			s := Syllable{Text: t, LineSynced: true}
			if !untimed {
				s.Timestamp, s.Endtime = secondsToMs(lead["StartTime"], 0), secondsToMs(lead["EndTime"], 0)
			}
			text = []Syllable{s}
		}
		if len(text) == 0 {
			continue
		}
		bg := []Syllable{}
		groups, _ := entry["Background"].([]any)
		for _, g := range groups {
			gm, _ := g.(map[string]any)
			if s := syllables(gm); len(s) > 0 {
				if len(bg) > 0 {
					bg[len(bg)-1].Text += " "
					bg[len(bg)-1].Part = false
				}
				bg = append(bg, s...)
			}
		}
		var ts, end int64
		if !untimed {
			first, last := text[0].Timestamp, text[0].Endtime
			for _, s := range text {
				first, last = min(first, s.Timestamp), max(last, s.Endtime)
			}
			ts, end = secondsToMs(lead["StartTime"], first), secondsToMs(lead["EndTime"], last)
		}
		opposite, _ := entry["OppositeAligned"].(bool)
		align := "start"
		if opposite {
			align = "end"
		}
		translation, _ := lead["TranslatedText"].(string)
		lines = append(lines, RichLine{
			Text: text, Background: len(bg) > 0, BackgroundText: bg, OppositeTurn: opposite, Alignment: align,
			Timestamp: ts, Endtime: max(ts, end), IsWordSynced: word, Translation: translation,
		})
	}
	label := "Spicy Lyrics"
	switch body["source"] {
	case "apple_music":
		label += " (Apple Music)"
	case "spotify":
		label += " (Spotify)"
	}
	var writers []string
	if list, ok := body["SongWriters"].([]any); ok {
		for _, w := range list {
			if s, ok := w.(string); ok {
				writers = append(writers, s)
			}
		}
	}
	return richResult(label, lines, false, strings.Join(writers, ", "))
}

// ---------- Unison ----------

func (c *Client) unison(ctx context.Context, q Query) ([]Result, error) {
	v := url.Values{"song": {q.Title}, "artist": {q.Artist}}
	durationParam(v, q)
	var data struct {
		Success bool `json:"success"`
		Data    struct {
			Lyrics   string `json:"lyrics"`
			Format   string `json:"format"`
			SyncType string `json:"syncType"`
		} `json:"data"`
	}
	if err := c.fetchJSON(ctx, http.MethodGet, "https://unison.boidu.dev/lyrics?"+v.Encode(), nil, &data); err != nil {
		if err.Error() == "HTTP 404" {
			return nil, nil // « Lyrics not found »
		}
		return nil, err
	}
	if !data.Success || data.Data.Lyrics == "" {
		return nil, nil
	}
	d := data.Data
	switch {
	case d.Format == "ttml":
		rich, writers := parseTTML(d.Lyrics)
		if r, ok := richResult("Unison", rich, false, writers); ok {
			return []Result{r}, nil
		}
	case d.SyncType == "plain":
		if r, ok := plainResult("Unison (unsynced)", d.Lyrics, nil); ok {
			return []Result{r}, nil
		}
	default:
		if lines := ParseLRC(d.Lyrics); len(lines) > 0 {
			return []Result{{Synced: true, Lines: lines, Source: "Unison"}}, nil
		}
	}
	return nil, nil
}

// ---------- LyricsPlus ----------

// lyricsPlus interroge tous les miroirs en même temps ; chacun peut rendre une source différente
// (Apple, QQ, Musixmatch…), indiquée dans metadata.source.
func (c *Client) lyricsPlus(ctx context.Context, q Query) ([]Result, error) {
	v := url.Values{"title": {q.Title}, "artist": {q.Artist}}
	if q.ISRC != "" {
		v.Set("isrc", q.ISRC)
	}
	durationParam(v, q)
	results := make([]*Result, len(kpoeServers))
	errs := make([]error, len(kpoeServers))
	var wg sync.WaitGroup
	for i, base := range kpoeServers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var payload map[string]any
			if errs[i] = c.fetchJSON(ctx, http.MethodGet, base+"/v2/lyrics/get?"+v.Encode(), nil, &payload); errs[i] == nil {
				if r, ok := convertKPoe(payload); ok {
					results[i] = &r
				}
			}
		}()
	}
	wg.Wait()
	var out []Result
	for _, r := range results {
		if r != nil {
			out = append(out, *r)
		}
	}
	if len(out) == 0 && errs[0] != nil {
		return nil, errs[0] // l'erreur du miroir principal
	}
	return out, nil
}

// kpoeMs : un nombre entier est déjà en millisecondes, un décimal est en secondes (toMilliseconds du composant).
func kpoeMs(v any, fallback int64) int64 {
	var f float64
	switch n := v.(type) {
	case float64:
		f = n
	case string:
		var err error
		if f, err = strconv.ParseFloat(n, 64); err != nil {
			return fallback
		}
	default:
		return fallback
	}
	if f != math.Trunc(f) {
		return int64(math.Round(f * 1000))
	}
	return int64(math.Max(0, f))
}

// convertKPoe : même lecture que convertKPoeLyrics du composant.
func convertKPoe(payload map[string]any) (Result, bool) {
	raw, _ := payload["lyrics"].([]any)
	if raw == nil {
		if data, ok := payload["data"].(map[string]any); ok {
			raw, _ = data["lyrics"].([]any)
		} else {
			raw, _ = payload["data"].([]any)
		}
	}
	var entries []map[string]any
	for _, e := range raw {
		if m, ok := e.(map[string]any); ok {
			entries = append(entries, m)
		}
	}
	if len(entries) == 0 {
		return Result{}, false
	}
	lineType := payload["type"] == "Line" || payload["type"] == "line"
	meta, _ := payload["metadata"].(map[string]any)
	agentTypes := map[string]string{}
	if agents, ok := meta["agents"].(map[string]any); ok {
		for k, a := range agents {
			am, _ := a.(map[string]any)
			if alias, _ := am["alias"].(string); alias != "" {
				k = alias
			}
			agentTypes[k], _ = am["type"].(string)
		}
	}
	singers := make([]string, len(entries))
	for i, e := range entries {
		if el, ok := e["element"].(map[string]any); ok {
			singers[i], _ = el["singer"].(string)
		}
	}
	aligns := lineAlignments(singers, agentTypes)
	var lines []RichLine
	for i, e := range entries {
		text, _ := e["text"].(string)
		start := kpoeMs(e["time"], 0)
		end := kpoeMs(e["endTime"], 0)
		if end == 0 {
			end = start + kpoeMs(e["duration"], 0)
		}
		syllabus, _ := e["syllabus"].([]any)
		if syllabus == nil {
			syllabus, _ = e["words"].([]any)
		}
		var main, bg []Syllable
		if !lineType {
			for _, s := range syllabus {
				sm, ok := s.(map[string]any)
				if !ok {
					continue
				}
				ss := kpoeMs(sm["time"], start)
				sd := kpoeMs(sm["duration"], 0)
				se := ss + sd
				if sd == 0 && len(syllabus) == 1 {
					se = end
				}
				t, _ := sm["text"].(string)
				part, _ := sm["part"].(bool)
				syl := Syllable{Text: t, Part: part, Timestamp: ss, Endtime: se}
				if isBg, _ := sm["isBackground"].(bool); isBg {
					bg = append(bg, syl)
				} else {
					main = append(main, syl)
				}
			}
		}
		if len(main) == 0 && text != "" {
			main = []Syllable{{Text: text, Timestamp: start, Endtime: max(end, start), LineSynced: lineType}}
		}
		opposite := aligns[i] == "end"
		if el, ok := e["element"].([]any); ok {
			for _, x := range el {
				if x == "opposite" || x == "right" {
					opposite = true
				}
			}
		}
		songPart := ""
		if el, ok := e["element"].(map[string]any); ok {
			songPart, _ = el["songPart"].(string)
		}
		translation := ""
		if tr, ok := e["translation"].(map[string]any); ok {
			translation, _ = tr["text"].(string)
		}
		lines = append(lines, RichLine{
			Text: nonNil(main), Background: len(bg) > 0, BackgroundText: nonNil(bg), OppositeTurn: opposite,
			Timestamp: start, Endtime: end, IsWordSynced: !lineType && len(syllabus) > 0 && (len(main) > 0 || len(bg) > 0),
			Alignment: aligns[i], SongPart: songPart, Translation: translation,
		})
	}
	label := "LyricsPlus (KPoe)"
	if s, _ := meta["source"].(string); s != "" {
		label = s
	} else if s, _ := meta["provider"].(string); s != "" {
		label = s
	}
	var writers []string
	if list, ok := meta["songWriters"].([]any); ok {
		for _, w := range list {
			if s, ok := w.(string); ok {
				writers = append(writers, s)
			}
		}
	}
	return richResult(label, lines, false, strings.Join(writers, ", "))
}

// ---------- LRCLIB et NetEase ----------

// lrclibNetease : la meilleure version LRCLIB ou NetEase (voir Fetch).
func (c *Client) lrclibNetease(ctx context.Context, q Query) ([]Result, error) {
	r, err := c.Fetch(ctx, q.Artist, q.Title, q.Album, q.DurationSec)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return []Result{r}, nil
}

// ---------- Genius ----------

// genius : texte seul, sans minutage ; les repères « [Couplet 1] » sont retirés. Le service rend le morceau
// le plus proche qu'il trouve, parfois d'un autre artiste : on vérifie l'artiste et le titre.
func (c *Client) genius(ctx context.Context, q Query) ([]Result, error) {
	var data struct {
		Lyrics string `json:"lyrics"`
		Title  string `json:"title"`
		Artist string `json:"artist"`
	}
	if err := c.fetchJSON(ctx, http.MethodGet, geniusWorkerURL+"?"+url.Values{"title": {q.Title}, "artist": {q.Artist}}.Encode(), nil, &data); err != nil {
		return nil, err
	}
	// Le service rend le texte avec les entités HTML de la page (« I&#x27;ll », « &amp; »).
	data.Lyrics, data.Title, data.Artist = html.UnescapeString(data.Lyrics), html.UnescapeString(data.Title), html.UnescapeString(data.Artist)
	if !sameSong(data.Artist, data.Title, q) {
		return nil, nil
	}
	if r, ok := plainResult("Genius", data.Lyrics, func(l string) bool { return strings.HasPrefix(l, "[") }); ok {
		return []Result{r}, nil
	}
	return nil, nil
}

// sameSong : l'artiste trouvé contient le nôtre (ou l'inverse) et le titre nettoyé correspond.
func sameSong(artist, title string, q Query) bool {
	want, got := normalize(strings.SplitN(q.Artist, ",", 2)[0]), normalize(artist)
	if want == "" || got == "" || !(strings.Contains(got, want) || strings.Contains(want, got)) {
		return false
	}
	t, w := normalize(CleanTitle(title, artist)), normalize(CleanTitle(q.Title, q.Artist))
	return t != "" && (t == w || strings.Contains(t, w) || strings.Contains(w, t))
}
