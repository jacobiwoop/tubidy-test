// Package server expose le résolveur et le catalogue en HTTP. Il sert à la fois la commande locale
// (cmd/resolve -serve) et la fonction Vercel (api/index.go).
package server

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"online-resolve/audiomack"
	"online-resolve/lyrics"
	"online-resolve/provider"
	"online-resolve/spotify"
)

// Config regroupe les sources (dans l'ordre de préférence), le délai, la clé d'accès et les clients du catalogue.
type Config struct {
	Providers []provider.Provider
	Timeout   time.Duration
	APIKey    string // vide : accès libre ; sinon exigée dans X-Api-Key (sauf pour le site lui-même)

	AM     *audiomack.Client // catalogue et lecture, appels anonymes
	AMUser *audiomack.Client // compte de service, pour les suggestions ; nil si non configuré
	SP     *spotify.Client   // recherche, pages artiste et album, radio d'artiste
	Lyrics *lyrics.Races     // paroles : course entre toutes les sources, résultats gardés en mémoire

	// Relais de téléchargement (Cloudflare Worker, dossier relay/) et secret partagé pour signer ses liens ;
	// vides : pas de téléchargement.
	RelayURL, RelaySecret string
}

// DefaultProviders renvoie Audiomack, NetEase, Kuwo et QQ, plus JOOX si jooxToken est fourni, et Waptrick en dernier
// choix (Tubidy a fermé son accès aux programmes en octobre 2026).
func DefaultProviders(jooxToken string) []provider.Provider {
	out := []provider.Provider{
		provider.NewAudiomack(nil),
		provider.NewNetEase(nil),
		provider.NewKuwo(nil),
		provider.NewQQ(nil),
	}
	if jooxToken != "" {
		out = append(out, provider.NewJOOX(jooxToken))
	}
	return append(out, provider.NewWaptrick(nil))
}

// ConfigFromEnv lit RESOLVE_API_KEY, JOOX_TOKEN (facultatif), AUDIOMACK_TOKEN / AUDIOMACK_TOKEN_SECRET
// (session du compte de service, rendue par /v1/access_token ; valable un an) et RELAY_URL / RELAY_SECRET
// (relais de téléchargement).
func ConfigFromEnv() Config {
	cfg := Config{
		Providers:   DefaultProviders(os.Getenv("JOOX_TOKEN")),
		Timeout:     15 * time.Second,
		APIKey:      os.Getenv("RESOLVE_API_KEY"),
		AM:          audiomack.New(),
		SP:          spotify.New(),
		Lyrics:      lyrics.NewRaces(lyrics.New()),
		RelayURL:    strings.TrimRight(os.Getenv("RELAY_URL"), "/"),
		RelaySecret: os.Getenv("RELAY_SECRET"),
	}
	if tok, sec := os.Getenv("AUDIOMACK_TOKEN"), os.Getenv("AUDIOMACK_TOKEN_SECRET"); tok != "" && sec != "" {
		cfg.AMUser = audiomack.New(audiomack.WithUserToken(tok, sec))
	}
	return cfg
}

// allowed accepte la clé d'accès (appli), ou une requête du site lui-même : le navigateur marque
// Sec-Fetch-Site: same-origin et le site public ne peut pas cacher de clé. Hors navigateur, cet en-tête
// s'imite : il évite seulement qu'une autre page web appelle l'API à notre place.
func allowed(cfg Config, r *http.Request) bool {
	if cfg.APIKey == "" || r.Header.Get("Sec-Fetch-Site") == "same-origin" {
		return true
	}
	return subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Api-Key")), []byte(cfg.APIKey)) == 1
}

// Response est le JSON renvoyé par /resolve.
type Response struct {
	Query    string             `json:"query"`
	Duration int                `json:"duration,omitempty"`
	Mode     string             `json:"mode"` // "race" : premier lien gagnant ; "all" : toutes les sources
	Best     *provider.Result   `json:"best,omitempty"`
	Outcomes []provider.Outcome `json:"providers"`
	TotalMs  int64              `json:"totalMs"`
	// DownloadURL (avec download=1) : le lien de Best à travers le relais, qu'une page peut enregistrer.
	DownloadURL string `json:"downloadUrl,omitempty"`
}

// relayTTL : durée de validité d'un lien de téléchargement signé. playTTL est plus longue : le lecteur redemande le
// fichier par morceaux tout au long de l'écoute, et aussi après une longue pause.
var audioRangeRE = regexp.MustCompile(`^bytes=(\d+)-(\d*)$`)

const (
	relayTTL = 15 * time.Minute
	playTTL  = 6 * time.Hour
)

// downloadURL signe un lien de téléchargement pour le relais.
func downloadURL(cfg Config, src string) string { return signedRelayURL(cfg, src, relayTTL) }

// relayPlainHTTP fait passer par le relais les liens en http, qu'une page en https ne peut pas lire. À appeler après
// downloadURL, qui doit signer le lien d'origine. Sans relais configuré, les liens restent tels quels.
func relayPlainHTTP(cfg Config, apiBase string, resp *Response) {
	wrap := func(r *provider.Result) {
		if r != nil && strings.HasPrefix(r.StreamURL, "http://") {
			target := cfg
			if u, err := url.Parse(r.StreamURL); err == nil && net.ParseIP(u.Hostname()) != nil {
				target.RelayURL = apiBase + "/api/audio" // Cloudflare refuse les fichiers sur une adresse IP (Waptrick)
			}
			if signed := signedRelayURL(target, r.StreamURL, playTTL); signed != "" {
				r.StreamURL = signed
			}
		}
	}
	wrap(resp.Best)
	for _, o := range resp.Outcomes {
		wrap(o.Result)
	}
}

// audioChunk : taille maximale d'une réponse de /api/audio, sous la limite de 4,5 Mo des fonctions Vercel. Le
// navigateur redemande la suite tout seul, puisque la réponse annonce la plage servie et la taille totale.
const audioChunk = 4 << 20

// AudioHandler relaie par morceaux un lien signé par signedRelayURL. La signature tient lieu de clé d'accès : une
// balise audio ne peut pas envoyer d'en-tête, et sans elle ce serait un proxy ouvert.
func AudioHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		src, e := q.Get("u"), q.Get("e")
		exp, err := strconv.ParseInt(e, 10, 64)
		mac := hmac.New(sha256.New, []byte(cfg.RelaySecret))
		mac.Write([]byte(src + "\n" + e))
		if cfg.RelaySecret == "" || err != nil || !strings.HasPrefix(src, "http://") || time.Now().Unix() > exp ||
			!hmac.Equal([]byte(q.Get("s")), []byte(hex.EncodeToString(mac.Sum(nil)))) {
			writeError(w, http.StatusForbidden, "lien invalide ou expiré")
			return
		}
		start, end := int64(0), int64(audioChunk-1)
		if m := audioRangeRE.FindStringSubmatch(r.Header.Get("Range")); m != nil {
			start, _ = strconv.ParseInt(m[1], 10, 64)
			end = start + audioChunk - 1
			if asked, err := strconv.ParseInt(m[2], 10, 64); err == nil && asked < end {
				end = asked
			}
		}
		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, src, nil)
		if err != nil {
			writeError(w, http.StatusBadGateway, "lien source invalide")
			return
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36")
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-%d", start, end))
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			writeError(w, http.StatusBadGateway, "source injoignable")
			return
		}
		defer res.Body.Close()
		if res.StatusCode != http.StatusPartialContent {
			writeError(w, http.StatusBadGateway, fmt.Sprintf("source : HTTP %d", res.StatusCode))
			return
		}
		for _, h := range []string{"Content-Type", "Content-Length", "Content-Range"} {
			if v := res.Header.Get(h); v != "" {
				w.Header().Set(h, v)
			}
		}
		w.Header().Set("Accept-Ranges", "bytes")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Cache-Control", "private, no-store")
		w.WriteHeader(http.StatusPartialContent)
		io.Copy(w, res.Body)
	}
}

// publicBase rend l'adresse par laquelle l'API a été appelée.
func publicBase(r *http.Request) string {
	scheme := "https"
	if r.TLS == nil && r.Header.Get("X-Forwarded-Proto") != "https" && strings.HasPrefix(r.Host, "localhost") {
		scheme = "http"
	}
	return scheme + "://" + r.Host
}

// signedRelayURL signe le lien source pour le relais : s = HMAC-SHA256(secret, u + "\n" + e).
func signedRelayURL(cfg Config, src string, ttl time.Duration) string {
	if cfg.RelayURL == "" || cfg.RelaySecret == "" || src == "" {
		return ""
	}
	e := strconv.FormatInt(time.Now().Add(ttl).Unix(), 10)
	mac := hmac.New(sha256.New, []byte(cfg.RelaySecret))
	mac.Write([]byte(src + "\n" + e))
	v := url.Values{"u": {src}, "e": {e}, "s": {hex.EncodeToString(mac.Sum(nil))}}
	return cfg.RelayURL + "?" + v.Encode()
}

// Resolve lance la course (ou toutes les sources si all) avec le délai de cfg.
func Resolve(ctx context.Context, cfg Config, q provider.Query, all bool) Response {
	if cfg.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, cfg.Timeout)
		defer cancel()
	}
	start := time.Now()
	resp := Response{Query: q.Text, Duration: q.DurationSec}
	if all {
		resp.Mode = "all"
		resp.Outcomes = provider.ResolveAll(ctx, q, cfg.Providers...)
		if best, ok := provider.Best(resp.Outcomes); ok {
			resp.Best = &best
		}
	} else {
		resp.Mode = "race"
		winner, outcomes, ok := provider.Race(ctx, q, cfg.Providers...)
		resp.Outcomes = outcomes
		if ok {
			resp.Best = winner.Result
		}
	}
	resp.TotalMs = time.Since(start).Milliseconds()
	return resp
}

// looseRetryMaxMs : au-delà, le second essai risquerait de dépasser les 25 s de la fonction Vercel.
const looseRetryMaxMs = 10000

// ResolveHandler répond à GET ?q=<artistes> <titre>&duration=<s>[&all=1][&am=<id Audiomack>][&loose=1], quel que soit le chemin.
// Avec am, le titre Audiomack est lu directement ; s'il est refusé, la course reprend sur q.
// 200 avec best, 404 si aucune source n'a de lien, 400 si q manque, 401 si l'accès est refusé.
func ResolveHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "X-Api-Key")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store") // les liens expirent : jamais de cache intermédiaire
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "méthode GET attendue")
			return
		}
		if !allowed(cfg, r) {
			writeError(w, http.StatusUnauthorized, "clé d'accès absente ou invalide")
			return
		}
		params := r.URL.Query()
		q := strings.TrimSpace(params.Get("q"))
		if am, _ := strconv.ParseInt(params.Get("am"), 10, 64); am > 0 && cfg.AM != nil {
			if resp, ok := resolveAudiomackID(r.Context(), cfg, am, q); ok {
				if params.Get("download") == "1" {
					resp.DownloadURL = downloadURL(cfg, resp.Best.StreamURL)
				}
				json.NewEncoder(w).Encode(resp)
				return
			}
		}
		if q == "" {
			writeError(w, http.StatusBadRequest, "paramètre q requis")
			return
		}
		dur := 0
		if raw := params.Get("duration"); raw != "" {
			d, err := strconv.Atoi(raw)
			if err != nil || d < 0 {
				writeError(w, http.StatusBadRequest, "paramètre duration invalide (secondes)")
				return
			}
			dur = d
		}

		query := provider.Query{Text: q, DurationSec: dur, Artists: provider.SplitArtists(params.Get("artist")), StrictFeatured: params.Get("strict") == "1"}
		logOutcomes := func(resp Response) {
			for _, o := range resp.Outcomes {
				status := "lien"
				if o.Result == nil {
					status = o.Error
				}
				log.Printf("%q (%d s) %s %d ms : %s", q, dur, o.Provider, o.Ms, status)
			}
		}
		resp := Resolve(r.Context(), cfg, query, params.Get("all") == "1")
		logOutcomes(resp)
		// Durée venue d'une vidéo YouTube : second essai plus souple, si le temps d'exécution le permet.
		if resp.Best == nil && dur > 0 && params.Get("loose") == "1" && resp.TotalMs < looseRetryMaxMs {
			query.ToleranceSec = provider.LooseToleranceSec
			resp = Resolve(r.Context(), cfg, query, params.Get("all") == "1")
			logOutcomes(resp)
		}
		if resp.Best == nil {
			w.WriteHeader(http.StatusNotFound)
		} else if params.Get("download") == "1" {
			resp.DownloadURL = downloadURL(cfg, resp.Best.StreamURL)
		}
		relayPlainHTTP(cfg, publicBase(r), &resp)
		json.NewEncoder(w).Encode(resp)
	}
}

// resolveAudiomackID lit directement un titre Audiomack connu par son identifiant (~100 ms, sans recherche).
func resolveAudiomackID(ctx context.Context, cfg Config, id int64, q string) (Response, bool) {
	ctx, cancel := context.WithTimeout(ctx, 6*time.Second)
	defer cancel()
	start := time.Now()
	s, err := cfg.AM.StreamURL(ctx, id, true)
	if err != nil {
		log.Printf("audiomack %d refusé (%v), course sur %q", id, err, q)
		return Response{}, false
	}
	best := &provider.Result{Provider: "audiomack", Format: "m4a", StreamURL: s.URL, ExpiresAt: s.ExpiresAt}
	ms := time.Since(start).Milliseconds()
	return Response{Query: q, Mode: "direct", Best: best, TotalMs: ms,
		Outcomes: []provider.Outcome{{Provider: "audiomack", Result: best, Ms: ms}}}, true
}

// Mux sert /resolve, /api/…, /health et une page de test qui joue chaque source.
func Mux(cfg Config) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("/resolve", ResolveHandler(cfg))
	mux.Handle("/api/", API(cfg))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"status":"ok"}`)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		io.WriteString(w, testPage)
	})
	return mux
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

const testPage = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Test sources audio</title>
<style>body{font:15px system-ui;max-width:760px;margin:32px auto;padding:0 16px}input{padding:8px}#q{width:55%}#d{width:70px}button{padding:8px 14px}
.p{border:1px solid #ccc;border-radius:8px;padding:12px;margin:12px 0}.ko{color:#a00}audio{width:100%;margin-top:8px}small{color:#666}</style>
<h1>Test sources audio</h1>
<form id="f"><input id="q" value="Wizkid, Tems Essence (feat. Tems)"> <input id="d" value="249" title="durée Spotify (s)"> <button>Rechercher</button></form>
<p id="s"></p><div id="r"></div>
<script>
const $ = (id) => document.getElementById(id);
$("f").onsubmit = async (e) => {
  e.preventDefault(); $("s").textContent = "Recherche sur toutes les sources…"; $("r").innerHTML = "";
  const t = performance.now();
  const res = await fetch("/resolve?all=1&q=" + encodeURIComponent($("q").value) + "&duration=" + encodeURIComponent($("d").value)).then((x) => x.json());
  $("s").textContent = "Réponse en " + Math.round(performance.now() - t) + " ms" + (res.best ? " — retenu : " + res.best.provider : " — aucune source");
  for (const o of res.providers || []) {
    const d = document.createElement("div"); d.className = "p";
    if (!o.result) { d.innerHTML = "<b>" + o.provider + "</b> <small>" + o.ms + " ms</small><div class=ko></div>"; d.querySelector(".ko").textContent = o.error; }
    else {
      d.innerHTML = "<b>" + o.provider + "</b> <small>" + o.ms + " ms · " + o.result.format + "</small><div></div><audio controls preload=none></audio>";
      d.querySelector("div").textContent = (o.result.artist ? o.result.artist + " - " : "") + o.result.title;
      d.querySelector("audio").src = o.result.streamUrl;
    }
    $("r").appendChild(d);
  }
};
</script></html>`
