// Package tubidy reproduit le flux du miroir Tubidy duesouth.co.za :
// défi Anubis, recherche, page du titre, puis API Laravel formats → play.
package tubidy

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	DefaultBaseURL   = "https://duesouth.co.za"
	defaultUserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
	anubisPassPath   = "/.within.website/x/cmd/anubis/api/pass-challenge"
)

var (
	anubisChallengeRE = regexp.MustCompile(`<script id="anubis_challenge" type="application/json">([^<]+)</script>`)
	downloadLinkRE    = regexp.MustCompile(`href="((?:https?://[^"/]+)?/download/[^"]+/video/[^"/?#]+)"`) // exclut les liens de partage whatsapp://
	videoPayloadRE    = regexp.MustCompile(`App\.video\(['"]([^'"]+)['"]\)`)
	titleRE           = regexp.MustCompile(`<title>([^<]*)</title>`)
	// Une carte de résultat : <div class="item container …">, avec son lien titre et <time datetime="PT4M23S">.
	resultCardRE   = regexp.MustCompile(`class="item container`)
	cardTitleRE    = regexp.MustCompile(`<a href="((?:https?://[^"/]+)?/download/[^"]+/video/[^"/?#]+)" class="title video-link" title="([^"]*)"`)
	cardDurationRE = regexp.MustCompile(`<time datetime="(PT[0-9HMS]+)"`)
	isoDurationRE  = regexp.MustCompile(`^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$`)
)

type Client struct {
	http      *http.Client // suit les redirections, garde les cookies (Anubis, XSRF, session)
	noFollow  *http.Client // pour lire la redirection p.php → .mp3 sans télécharger l'audio
	baseMu    sync.RWMutex
	baseURL   *url.URL // suit le miroir : remplacé par l'hôte où redirige la recherche
	userAgent string
	anubisMu  sync.Mutex // un seul défi Anubis à la fois, le cookie obtenu sert ensuite à tous
}

type Option func(*Client)

func WithBaseURL(raw string) Option {
	return func(c *Client) {
		if u, err := url.Parse(strings.TrimRight(raw, "/")); err == nil && u.Host != "" {
			c.baseURL = u
		}
	}
}

func WithTimeout(d time.Duration) Option {
	return func(c *Client) { c.http.Timeout, c.noFollow.Timeout = d, d }
}

func New(opts ...Option) *Client {
	jar, _ := cookiejar.New(nil)
	base, _ := url.Parse(DefaultBaseURL)
	c := &Client{
		http:      &http.Client{Jar: jar, Timeout: 20 * time.Second},
		baseURL:   base,
		userAgent: defaultUserAgent,
	}
	c.noFollow = &http.Client{
		Jar:           jar,
		Timeout:       20 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// Track est un titre résolu en MP3 direct sur d2mefast.net.
// Le lien n'est lié ni à l'IP ni aux cookies : il se lit depuis n'importe quel client.
type Track struct {
	Title       string
	Page        string
	DurationSec int    // durée annoncée par la recherche, 0 si inconnue
	Format      string // libellé Tubidy, ex. "MP3 audio"
	Size        string // ex. "2,87 MB"
	PlayLink    string // p.php?s=… renvoyé par /api/video/play
	StreamURL   string // .mp3 final après la redirection de p.php
}

// ResolveOptions décrit le titre attendu. Sans durée, aucun résultat n'est écarté.
type ResolveOptions struct {
	DurationSec  int                     // durée de référence (Spotify), 0 si inconnue
	ToleranceSec int                     // écart accepté avec DurationSec
	Reject       func(title string) bool // titres à écarter d'office (versions modifiées…), nil : aucun
	Prefer       func(title string) bool // titres à essayer en premier (ordre de Tubidy gardé sinon), nil : aucun
	// PreferOnly n'essaie que les titres préférés quand il y en a : mieux vaut échouer (le client a
	// une autre source) que rendre une autre version.
	PreferOnly bool
}

// SearchResult est une carte de la page de recherche.
type SearchResult struct {
	Title       string
	Page        string
	DurationSec int
}

// Resolve cherche q et rend le MP3 du premier résultat dont la durée correspond,
// en passant au suivant seulement si la résolution du lien échoue.
func (c *Client) Resolve(ctx context.Context, q string, opts ResolveOptions) (Track, error) {
	q = strings.TrimSpace(q)
	if q == "" {
		return Track{}, errors.New("tubidy: recherche vide")
	}
	searchURL := c.abs("/search?q=" + url.QueryEscape(q))
	body, final, err := c.page(ctx, searchURL, "")
	if err != nil {
		return Track{}, fmt.Errorf("tubidy: recherche: %w", err)
	}
	// Le miroir déménage (duesouth.co.za → drakensbergexperience.co.za) : les appels POST de l'API
	// ne suivent pas la redirection, on adopte donc l'hôte final pour la suite.
	if c.adoptHost(final) {
		searchURL = final.String()
	}
	results := c.parseSearch(body)
	if len(results) == 0 {
		return Track{}, ErrNoResult
	}
	candidates := preferTitles(matchDuration(rejectTitles(results, opts.Reject), opts), opts.Prefer, opts.PreferOnly)
	if len(candidates) == 0 {
		return Track{}, fmt.Errorf("%w (%d résultats, aucun à %d s ± %d)", ErrNoDurationMatch, len(results), opts.DurationSec, opts.ToleranceSec)
	}

	var lastErr error
	for i, r := range candidates {
		if i == maxCandidates {
			break
		}
		t, err := c.resolvePage(ctx, r.Page, searchURL)
		if err == nil {
			t.DurationSec = r.DurationSec
			err = c.checkFileDuration(ctx, &t, opts)
		}
		if err == nil {
			return t, nil
		}
		if ctx.Err() != nil {
			return Track{}, err
		}
		// Vidéo source retirée de YouTube ou sans MP3 : le résultat suivant est souvent une autre mise en ligne.
		lastErr = err
	}
	return Track{}, lastErr
}

// parseSearch lit les cartes de résultat (titre, page, durée). Si la mise en page change,
// il se rabat sur les seuls liens de téléchargement, sans durée.
func (c *Client) parseSearch(body string) []SearchResult {
	var out []SearchResult
	seen := map[string]bool{}
	add := func(r SearchResult) {
		if !seen[r.Page] {
			seen[r.Page] = true
			out = append(out, r)
		}
	}
	cards := resultCardRE.Split(body, -1)
	for _, card := range cards[1:] {
		m := cardTitleRE.FindStringSubmatch(card)
		if m == nil {
			continue
		}
		r := SearchResult{Page: c.abs(html.UnescapeString(m[1])), Title: html.UnescapeString(m[2])}
		if d := cardDurationRE.FindStringSubmatch(card); d != nil {
			r.DurationSec = parseISODuration(d[1])
		}
		add(r)
	}
	if len(out) == 0 {
		for _, m := range downloadLinkRE.FindAllStringSubmatch(body, -1) {
			add(SearchResult{Page: c.abs(html.UnescapeString(m[1]))})
		}
	}
	return out
}

// matchDuration garde, dans l'ordre du site, les résultats à la bonne durée ;
// ceux dont la durée est inconnue viennent ensuite, faute de pouvoir les vérifier.
func matchDuration(results []SearchResult, opts ResolveOptions) []SearchResult {
	if opts.DurationSec <= 0 {
		return results
	}
	var ok, unknown []SearchResult
	for _, r := range results {
		switch {
		case r.DurationSec == 0:
			unknown = append(unknown, r)
		case abs(r.DurationSec-opts.DurationSec) <= opts.ToleranceSec:
			ok = append(ok, r)
		}
	}
	return append(ok, unknown...)
}

// preferTitles place en tête les titres que prefer retient, sans changer l'ordre à l'intérieur des deux groupes.
func preferTitles(results []SearchResult, prefer func(string) bool, only bool) []SearchResult {
	if prefer == nil {
		return results
	}
	var first, rest []SearchResult
	for _, r := range results {
		if prefer(r.Title) {
			first = append(first, r)
		} else {
			rest = append(rest, r)
		}
	}
	if only && len(first) > 0 {
		return first
	}
	return append(first, rest...)
}

func rejectTitles(results []SearchResult, reject func(string) bool) []SearchResult {
	if reject == nil {
		return results
	}
	kept := results[:0:0]
	for _, r := range results {
		if !reject(r.Title) {
			kept = append(kept, r)
		}
	}
	return kept
}

func parseISODuration(s string) int {
	m := isoDurationRE.FindStringSubmatch(s)
	if m == nil {
		return 0
	}
	n := func(v string) int { i, _ := strconv.Atoi(v); return i }
	return n(m[1])*3600 + n(m[2])*60 + n(m[3])
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// ErrNoDurationMatch signale des résultats tous trop éloignés de la durée attendue.
var ErrNoDurationMatch = errors.New("tubidy: aucun résultat à la bonne durée")

// maxCandidates borne le nombre de résultats essayés quand les premiers sont indisponibles.
const maxCandidates = 3

// errAnubisOnAPI : Anubis a présenté un défi à un appel d'API (cookie expiré entre-temps).
var errAnubisOnAPI = errors.New("défi Anubis")

// errVideoUnavailable correspond à {"status":"ERROR","error":{"code":"-4"}} : vidéo source indisponible.
var errVideoUnavailable = errors.New("tubidy: vidéo source indisponible")

func (c *Client) resolvePage(ctx context.Context, pageURL, searchURL string) (Track, error) {
	body, _, err := c.page(ctx, pageURL, searchURL)
	if err != nil {
		return Track{}, fmt.Errorf("tubidy: page du titre: %w", err)
	}
	pm := videoPayloadRE.FindStringSubmatch(body)
	if pm == nil {
		return Track{}, errors.New("tubidy: payload App.video absent de la page")
	}
	t := Track{Page: pageURL, Title: cleanTitle(body)}

	// Le site appelle aussi /api/video/download/initiate, qui ne renvoie qu'une publicité : inutile.
	var formats struct {
		Status string `json:"status"`
		Error  struct {
			Code string `json:"code"`
		} `json:"error"`
		Formats []struct {
			Label   string `json:"label"`
			Size    string `json:"size"`
			Payload string `json:"payload"`
		} `json:"formats"`
	}
	if err := c.api(ctx, "/api/video/formats", pageURL, map[string]string{"payload": pm[1]}, &formats); err != nil {
		return Track{}, err
	}
	if formats.Status == "ERROR" {
		if formats.Error.Code == "-4" {
			return Track{}, errVideoUnavailable
		}
		return Track{}, fmt.Errorf("tubidy: formats en erreur (code %s)", formats.Error.Code)
	}
	idx := -1
	for i, f := range formats.Formats {
		if strings.Contains(strings.ToUpper(f.Label), "MP3") {
			idx = i
			break
		}
	}
	if idx < 0 {
		return Track{}, errors.New("tubidy: aucun format MP3")
	}
	t.Format, t.Size = formats.Formats[idx].Label, formats.Formats[idx].Size

	var play struct {
		Link string `json:"link"`
	}
	if err := c.api(ctx, "/api/video/play", pageURL, map[string]string{"payload": formats.Formats[idx].Payload}, &play); err != nil {
		return Track{}, err
	}
	if play.Link == "" {
		return Track{}, errors.New("tubidy: pas de lien dans /api/video/play")
	}
	t.PlayLink = play.Link
	t.StreamURL = c.followOnce(ctx, play.Link)
	return t, nil
}

// errDurationMismatch : la durée affichée par la recherche est parfois fausse (clip annoncé 2:54, fichier de 5:03).
var errDurationMismatch = errors.New("tubidy: durée du fichier différente de la durée attendue")

// checkFileDuration mesure le MP3 livré et le refuse s'il ne correspond pas à la durée attendue.
// Sans durée de référence, rien n'est vérifié. Si la mesure est impossible, le titre est gardé.
func (c *Client) checkFileDuration(ctx context.Context, t *Track, opts ResolveOptions) error {
	if opts.DurationSec <= 0 {
		return nil
	}
	sec, err := c.fileDuration(ctx, t.StreamURL)
	if err != nil || sec <= 0 {
		return nil
	}
	t.DurationSec = sec
	if abs(sec-opts.DurationSec) > opts.ToleranceSec {
		return fmt.Errorf("%w (%d s au lieu de %d s)", errDurationMismatch, sec, opts.DurationSec)
	}
	return nil
}

// fileDuration lit les 8 premiers Ko du MP3 : durée exacte via l'en-tête Xing/Info (nombre de trames),
// sinon estimation par la taille totale, les fichiers Tubidy étant en 128 kbit/s constant.
func (c *Client) fileDuration(ctx context.Context, streamURL string) (int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, streamURL, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Range", "bytes=0-8191")
	resp, err := c.noFollow.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	head, err := io.ReadAll(io.LimitReader(resp.Body, 8192))
	if err != nil {
		return 0, err
	}
	if resp.StatusCode != http.StatusPartialContent && resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	if sec := mp3HeaderDuration(head); sec > 0 {
		return sec, nil
	}
	cr := resp.Header.Get("Content-Range")
	if i := strings.LastIndex(cr, "/"); i >= 0 {
		if total, err := strconv.ParseInt(cr[i+1:], 10, 64); err == nil && total > 0 {
			return int(total * 8 / 128000), nil
		}
	}
	return 0, errors.New("durée inconnue")
}

// mp3HeaderDuration rend la durée annoncée par l'en-tête Xing/Info d'un MP3, 0 si absent.
func mp3HeaderDuration(b []byte) int {
	off := 0
	if len(b) >= 10 && string(b[:3]) == "ID3" {
		off = 10 + int(b[6]&0x7f)<<21 | int(b[7]&0x7f)<<14 | int(b[8]&0x7f)<<7 | int(b[9]&0x7f)
	}
	// Synchronisation sur la première trame MPEG pour connaître la fréquence d'échantillonnage.
	for ; off+4 <= len(b); off++ {
		if b[off] == 0xff && b[off+1]&0xe0 == 0xe0 {
			break
		}
	}
	if off+4 > len(b) {
		return 0
	}
	version := (b[off+1] >> 3) & 0x03 // 3 : MPEG-1, 2 : MPEG-2, 0 : MPEG-2.5
	rates := map[byte][3]int{3: {44100, 48000, 32000}, 2: {22050, 24000, 16000}, 0: {11025, 12000, 8000}}
	idx := (b[off+2] >> 2) & 0x03
	r, ok := rates[version]
	if !ok || idx == 3 {
		return 0
	}
	samplesPerFrame := 1152
	if version != 3 {
		samplesPerFrame = 576
	}
	end := off + 200
	if end > len(b) {
		end = len(b)
	}
	frame := b[off:end]
	for _, tag := range []string{"Xing", "Info"} {
		i := bytes.Index(frame, []byte(tag))
		if i < 0 || i+12 > len(frame) {
			continue
		}
		flags := uint32(frame[i+4])<<24 | uint32(frame[i+5])<<16 | uint32(frame[i+6])<<8 | uint32(frame[i+7])
		if flags&1 == 0 {
			return 0
		}
		frames := uint32(frame[i+8])<<24 | uint32(frame[i+9])<<16 | uint32(frame[i+10])<<8 | uint32(frame[i+11])
		return int(int64(frames) * int64(samplesPerFrame) / int64(r[idx]))
	}
	return 0
}

// ErrNoResult signale une recherche sans résultat.
var ErrNoResult = errors.New("tubidy: aucun résultat")

// page fait un GET HTML et passe le défi Anubis s'il apparaît, puis rejoue la requête.
func (c *Client) page(ctx context.Context, target, referer string) (string, *url.URL, error) {
	for attempt := 0; attempt < 2; attempt++ {
		body, final, err := c.get(ctx, target, referer)
		if err != nil {
			return "", nil, err
		}
		m := anubisChallengeRE.FindStringSubmatch(body)
		if m == nil {
			return body, final, nil
		}
		if err := c.passAnubis(ctx, m[1], final.String()); err != nil {
			return "", nil, err
		}
	}
	return "", nil, errors.New("Anubis redemande un défi après validation")
}

func (c *Client) get(ctx context.Context, target, referer string) (string, *url.URL, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return "", nil, err
	}
	c.headers(req, referer)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,*/*;q=0.8")
	resp, err := c.http.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "", nil, err
	}
	// Anubis répond parfois en 401/403 avec la page de défi : elle est traitée par l'appelant.
	if resp.StatusCode >= 400 && !anubisChallengeRE.Match(b) {
		return "", nil, fmt.Errorf("HTTP %d sur %s", resp.StatusCode, resp.Request.URL.Path)
	}
	return string(b), resp.Request.URL, nil
}

type anubisChallenge struct {
	Rules struct {
		Algorithm  string `json:"algorithm"`
		Difficulty int    `json:"difficulty"`
	} `json:"rules"`
	Challenge struct {
		ID         string `json:"id"`
		RandomData string `json:"randomData"`
	} `json:"challenge"`
}

func (c *Client) passAnubis(ctx context.Context, raw, pageURL string) error {
	c.anubisMu.Lock()
	defer c.anubisMu.Unlock()

	var ch anubisChallenge
	if err := json.Unmarshal([]byte(html.UnescapeString(raw)), &ch); err != nil {
		return fmt.Errorf("tubidy: défi Anubis illisible: %w", err)
	}
	if ch.Rules.Algorithm != "fast" && ch.Rules.Algorithm != "slow" {
		return fmt.Errorf("tubidy: algorithme Anubis %q non géré", ch.Rules.Algorithm)
	}
	start := time.Now()
	nonce, hash, err := SolveAnubis(ctx, ch.Challenge.RandomData, ch.Rules.Difficulty)
	if err != nil {
		return err
	}
	pass := c.abs(anubisPassPath)
	q := url.Values{}
	q.Set("id", ch.Challenge.ID)
	q.Set("response", hash)
	q.Set("nonce", strconv.Itoa(nonce))
	q.Set("redir", pageURL)
	q.Set("elapsedTime", strconv.FormatInt(time.Since(start).Milliseconds()+100, 10))
	body, _, err := c.get(ctx, pass+"?"+q.Encode(), pageURL)
	if err != nil {
		return fmt.Errorf("tubidy: validation Anubis: %w", err)
	}
	if anubisChallengeRE.MatchString(body) {
		return errors.New("tubidy: Anubis a refusé la preuve de travail")
	}
	return nil
}

// SolveAnubis cherche le plus petit nonce tel que sha256(randomData + nonce) commence par difficulty zéros hexadécimaux.
func SolveAnubis(ctx context.Context, randomData string, difficulty int) (int, string, error) {
	if difficulty < 0 || difficulty > 8 {
		return 0, "", fmt.Errorf("tubidy: difficulté Anubis %d hors limites", difficulty)
	}
	prefix := strings.Repeat("0", difficulty)
	for nonce := 0; ; nonce++ {
		if nonce%4096 == 0 && ctx.Err() != nil {
			return 0, "", ctx.Err()
		}
		sum := sha256.Sum256([]byte(randomData + strconv.Itoa(nonce)))
		hash := hex.EncodeToString(sum[:])
		if strings.HasPrefix(hash, prefix) {
			return nonce, hash, nil
		}
	}
}

// api appelle une route Laravel avec le jeton XSRF lu dans le cookie, comme axios dans le navigateur.
func (c *Client) api(ctx context.Context, path, referer string, payload any, out any) error {
	var body io.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.abs(path), body)
	if err != nil {
		return err
	}
	c.headers(req, referer)
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")
	base := c.base()
	req.Header.Set("Origin", base.Scheme+"://"+base.Host)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if xsrf := c.cookie("XSRF-TOKEN"); xsrf != "" {
		req.Header.Set("X-XSRF-TOKEN", xsrf)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("tubidy: %s: %w", path, err)
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("tubidy: %s: HTTP %d", path, resp.StatusCode)
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(b, out); err != nil {
		if anubisChallengeRE.Match(b) {
			return fmt.Errorf("tubidy: %s: %w", path, errAnubisOnAPI)
		}
		head := strings.Join(strings.Fields(string(b[:min(len(b), 120)])), " ")
		return fmt.Errorf("tubidy: %s: réponse non JSON (%s)", path, head)
	}
	return nil
}

// followOnce rend la cible de la redirection p.php → .mp3, ou le lien d'origine si elle échoue.
func (c *Client) followOnce(ctx context.Context, link string) string {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, link, nil)
	if err != nil {
		return link
	}
	req.Header.Set("User-Agent", c.userAgent)
	resp, err := c.noFollow.Do(req)
	if err != nil {
		return link
	}
	resp.Body.Close()
	loc := resp.Header.Get("Location")
	if loc == "" {
		return link
	}
	target, err := resp.Request.URL.Parse(loc)
	if err != nil {
		return link
	}
	return target.String()
}

func (c *Client) base() *url.URL {
	c.baseMu.RLock()
	defer c.baseMu.RUnlock()
	return c.baseURL
}

// adoptHost remplace l'hôte du miroir par celui de final s'il a changé ; rend true dans ce cas.
func (c *Client) adoptHost(final *url.URL) bool {
	if final == nil || final.Host == "" {
		return false
	}
	c.baseMu.Lock()
	defer c.baseMu.Unlock()
	if final.Host == c.baseURL.Host {
		return false
	}
	c.baseURL = &url.URL{Scheme: final.Scheme, Host: final.Host}
	return true
}

func (c *Client) headers(req *http.Request, referer string) {
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Accept-Language", "fr-FR,fr;q=0.9,en;q=0.8")
	if referer != "" {
		req.Header.Set("Referer", referer)
	}
}

func (c *Client) cookie(name string) string {
	for _, ck := range c.http.Jar.Cookies(c.base()) {
		if ck.Name == name {
			v, err := url.QueryUnescape(ck.Value)
			if err != nil {
				return ck.Value
			}
			return v
		}
	}
	return ""
}

func (c *Client) abs(ref string) string {
	base := c.base()
	u, err := base.Parse(ref)
	if err != nil {
		return base.String() + ref
	}
	return u.String()
}

func cleanTitle(page string) string {
	m := titleRE.FindStringSubmatch(page)
	if m == nil {
		return ""
	}
	t := strings.TrimSpace(html.UnescapeString(m[1]))
	return strings.TrimSpace(strings.TrimSuffix(t, " - Download - Tubidy"))
}
