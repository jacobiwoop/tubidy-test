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
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"online-resolve/audiomack"
	"online-resolve/lyrics"
	"online-resolve/provider"
	"online-resolve/spotify"
	"online-resolve/tubidy"
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

// DefaultProviders renvoie Audiomack puis Tubidy (miroir tubidyBase, ou celui par défaut si vide).
func DefaultProviders(tubidyBase string) []provider.Provider {
	if tubidyBase == "" {
		tubidyBase = tubidy.DefaultBaseURL
	}
	return []provider.Provider{
		provider.NewAudiomack(nil),
		provider.NewTubidy(tubidy.New(tubidy.WithBaseURL(tubidyBase))),
	}
}

// ConfigFromEnv lit RESOLVE_API_KEY, TUBIDY_BASE_URL, AUDIOMACK_TOKEN / AUDIOMACK_TOKEN_SECRET
// (session du compte de service, rendue par /v1/access_token ; valable un an) et RELAY_URL / RELAY_SECRET
// (relais de téléchargement).
func ConfigFromEnv() Config {
	cfg := Config{
		Providers:   DefaultProviders(os.Getenv("TUBIDY_BASE_URL")),
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

// relayTTL : durée de validité d'un lien de téléchargement signé.
const relayTTL = 15 * time.Minute

// downloadURL signe le lien source pour le relais : s = HMAC-SHA256(secret, u + "\n" + e).
func downloadURL(cfg Config, src string) string {
	if cfg.RelayURL == "" || cfg.RelaySecret == "" || src == "" {
		return ""
	}
	e := strconv.FormatInt(time.Now().Add(relayTTL).Unix(), 10)
	mac := hmac.New(sha256.New, []byte(cfg.RelaySecret))
	mac.Write([]byte(src + "\n" + e))
	v := url.Values{"u": {src}, "e": {e}, "s": {hex.EncodeToString(mac.Sum(nil))}}
	return cfg.RelayURL + "/?" + v.Encode()
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

// ResolveHandler répond à GET ?q=<artistes> <titre>&duration=<s>[&all=1][&am=<id Audiomack>], quel que soit le chemin.
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

		resp := Resolve(r.Context(), cfg, provider.Query{Text: q, DurationSec: dur, Artists: provider.SplitArtists(params.Get("artist")), StrictFeatured: params.Get("strict") == "1"}, params.Get("all") == "1")
		for _, o := range resp.Outcomes {
			status := "lien"
			if o.Result == nil {
				status = o.Error
			}
			log.Printf("%q (%d s) %s %d ms : %s", q, dur, o.Provider, o.Ms, status)
		}
		if resp.Best == nil {
			w.WriteHeader(http.StatusNotFound)
		} else if params.Get("download") == "1" {
			resp.DownloadURL = downloadURL(cfg, resp.Best.StreamURL)
		}
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
