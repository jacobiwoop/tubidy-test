package tubidy

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
)

// Défi capturé sur duesouth.co.za le 09/10/2026 : le navigateur a envoyé nonce=54.
const (
	capturedRandomData = "c21feb3a970f8f9fbad63944ee169c6071d9d8deff5222d70a08c7df3d707cc1f1866451955d990e8afe4ddaedea962bc61c99b5ca9a6e99bbe43422926189ed"
	capturedResponse   = "00c220a8422ffc30aef0debda81264ecd83ef89e932bfd3c5a811f9116332589"
)

func TestSolveAnubisMatchesCapturedBrowserProof(t *testing.T) {
	nonce, hash, err := SolveAnubis(context.Background(), capturedRandomData, 2)
	if err != nil {
		t.Fatal(err)
	}
	if nonce != 54 || hash != capturedResponse {
		t.Fatalf("nonce=%d hash=%s, attendu 54 / %s", nonce, hash, capturedResponse)
	}
}

func TestSolveAnubisRejectsAbsurdDifficultyAndHonoursContext(t *testing.T) {
	if _, _, err := SolveAnubis(context.Background(), "x", 99); err == nil {
		t.Fatal("difficulté 99 acceptée")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, _, err := SolveAnubis(ctx, "x", 8); err == nil {
		t.Fatal("contexte annulé ignoré")
	}
}

// card reproduit une carte de résultat de la page de recherche (titre, lien, durée ISO 8601).
func card(href, title, iso string) string {
	return `<div class="col-lg-6"><div class="item container h-100"><div class="d-flex align-items-center">` +
		`<a href="https://duesouth.co.za` + href + `" class="me-3 video-link"><img alt="x"></a>` +
		`<div class="title-container me-2"><h3><a href="` + href + `" class="title video-link" title="` + title + `">` + title + `</a></h3>` +
		`<div class="d-flex align-items-center"><time datetime="` + iso + `" class="duration"><span>x</span></time></div></div></div></div></div>`
}

// fakeMirror simule duesouth.co.za : Anubis, recherche, page, initiate, formats, play, p.php.
func fakeMirror(t *testing.T, challenges *atomic.Int32) *httptest.Server {
	t.Helper()
	const randomData = "abc123"
	var srv *httptest.Server
	mux := http.NewServeMux()
	authed := func(r *http.Request) bool {
		c, err := r.Cookie("anubis-auth")
		return err == nil && c.Value == "ok"
	}
	challengePage := func(w http.ResponseWriter) {
		challenges.Add(1)
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `<html><script id="anubis_challenge" type="application/json">{"rules":{"algorithm":"fast","difficulty":2},"challenge":{"id":"ch-1","randomData":%q}}</script></html>`, randomData)
	}
	mux.HandleFunc(anubisPassPath, func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		sum := sha256.Sum256([]byte(randomData + q.Get("nonce")))
		if q.Get("id") != "ch-1" || hex.EncodeToString(sum[:]) != q.Get("response") || !strings.HasPrefix(q.Get("response"), "00") {
			challengePage(w)
			return
		}
		http.SetCookie(w, &http.Cookie{Name: "anubis-auth", Value: "ok", Path: "/"})
		http.Redirect(w, r, q.Get("redir"), http.StatusFound)
	})
	mux.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		if !authed(r) {
			challengePage(w)
			return
		}
		switch r.URL.Query().Get("q") {
		case "introuvable":
			fmt.Fprint(w, `<html>aucun résultat</html>`)
			return
		case "anti-hero":
			// Cartes au format réel du site : le clip (309 s) vient avant l'audio officiel (201 s).
			fmt.Fprint(w, card("/download/anti-hero-official-music-video/video/clip1", "Taylor Swift - Anti-Hero (Official Music Video)", "PT5M9S")+
				`<a href="whatsapp://send?text=https://duesouth.co.za/download/anti-hero-official-music-video/video/clip1">partage</a>`+
				card("/download/damso-impardonnable/video/exu2-_PvFS0", "Taylor Swift - Anti-Hero (Official Audio)", "PT3M21S"))
			return
		case "retirée":
			fmt.Fprint(w, `<a href="/download/dead/video/dead1">x</a><a href="whatsapp://send?text=https://duesouth.co.za/download/dead/video/dead2">partage</a><a href="/download/dead/video/dead1">doublon</a><a href="/download/damso-impardonnable/video/exu2-_PvFS0">ok</a>`)
			return
		}
		fmt.Fprint(w, `<a href="/download/damso-impardonnable/video/exu2-_PvFS0">Damso</a><a href="/download/autre/video/zz">x</a>`)
	})
	mux.HandleFunc("/download/", func(w http.ResponseWriter, r *http.Request) {
		if !authed(r) {
			challengePage(w)
			return
		}
		http.SetCookie(w, &http.Cookie{Name: "XSRF-TOKEN", Value: "tok%3Den", Path: "/"})
		if strings.Contains(r.URL.Path, "/dead/") {
			fmt.Fprint(w, `<title>Retirée - Download - Tubidy</title><script>App.video('DEAD-PAYLOAD')</script>`)
			return
		}
		fmt.Fprint(w, `<title>DAMSO - Impardonnable (Clip Officiel) - Download - Tubidy</title><script>App.video('PAGE-PAYLOAD')</script>`)
	})
	api := func(path string, h func(body map[string]string) any) {
		mux.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost || r.Header.Get("X-XSRF-TOKEN") != "tok=en" || r.Header.Get("X-Requested-With") != "XMLHttpRequest" {
				http.Error(w, "csrf", 419)
				return
			}
			var body map[string]string
			json.NewDecoder(r.Body).Decode(&body)
			json.NewEncoder(w).Encode(h(body))
		})
	}
	api("/api/video/download/initiate", func(map[string]string) any { return map[string]string{"ads": "https://pub.example"} })
	api("/api/video/formats", func(b map[string]string) any {
		if b["payload"] == "DEAD-PAYLOAD" {
			return map[string]any{"status": "ERROR", "error": map[string]string{"code": "-4"}}
		}
		if b["payload"] != "PAGE-PAYLOAD" {
			return map[string]any{}
		}
		return map[string]any{"formats": []map[string]string{
			{"label": "MP4 video", "size": "9 MB", "payload": "MP4"},
			{"label": "MP3 audio", "size": "2,87 MB", "payload": "MP3-PAYLOAD"},
		}}
	})
	api("/api/video/play", func(b map[string]string) any {
		if b["payload"] != "MP3-PAYLOAD" {
			return map[string]any{}
		}
		return map[string]string{"link": srv.URL + "/p.php?s=abc"}
	})
	mux.HandleFunc("/p.php", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/tb/damso_impardonnable_mp3_1.mp3?play", http.StatusFound)
	})
	srv = httptest.NewServer(mux)
	return srv
}

func TestResolvePassesAnubisOnceThenRunsTheLaravelFlow(t *testing.T) {
	var challenges atomic.Int32
	srv := fakeMirror(t, &challenges)
	defer srv.Close()
	c := New(WithBaseURL(srv.URL))

	tr, err := c.Resolve(context.Background(), "damso impardonnable", ResolveOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if tr.Title != "DAMSO - Impardonnable (Clip Officiel)" || tr.Format != "MP3 audio" || tr.Size != "2,87 MB" {
		t.Fatalf("titre = %+v", tr)
	}
	if tr.Page != srv.URL+"/download/damso-impardonnable/video/exu2-_PvFS0" {
		t.Fatalf("page = %s", tr.Page)
	}
	if tr.StreamURL != srv.URL+"/tb/damso_impardonnable_mp3_1.mp3?play" {
		t.Fatalf("lien = %s", tr.StreamURL)
	}

	// Le cookie Anubis est réutilisé : une deuxième recherche ne redemande pas de défi.
	if _, err := c.Resolve(context.Background(), "damso impardonnable", ResolveOptions{}); err != nil {
		t.Fatal(err)
	}
	if n := challenges.Load(); n != 1 {
		t.Fatalf("%d défis Anubis servis, attendu 1", n)
	}
}

func TestResolveSkipsUnavailableVideoDuplicatesAndShareLinks(t *testing.T) {
	var challenges atomic.Int32
	srv := fakeMirror(t, &challenges)
	defer srv.Close()

	tr, err := New(WithBaseURL(srv.URL)).Resolve(context.Background(), "retirée", ResolveOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(tr.Page, "/download/damso-impardonnable/video/exu2-_PvFS0") {
		t.Fatalf("page retenue = %s", tr.Page)
	}
}

func TestResolvePicksFirstResultWithMatchingDuration(t *testing.T) {
	var challenges atomic.Int32
	srv := fakeMirror(t, &challenges)
	defer srv.Close()
	c := New(WithBaseURL(srv.URL))

	tr, err := c.Resolve(context.Background(), "anti-hero", ResolveOptions{DurationSec: 201, ToleranceSec: 10})
	if err != nil {
		t.Fatal(err)
	}
	if tr.DurationSec != 201 || !strings.HasSuffix(tr.Page, "/video/exu2-_PvFS0") {
		t.Fatalf("retenu = %+v, attendu l'audio officiel de 201 s", tr)
	}

	// Sans durée de référence, la stratégie de base prend le premier résultat : le clip.
	tr, err = c.Resolve(context.Background(), "anti-hero", ResolveOptions{})
	if err != nil || !strings.HasSuffix(tr.Page, "/video/clip1") || tr.DurationSec != 309 {
		t.Fatalf("retenu = %+v, erreur = %v, attendu le clip de 309 s", tr, err)
	}

	// Un titre écarté d'office (ici l'audio officiel) ne peut plus être retenu.
	rejectAudio := func(title string) bool { return strings.Contains(title, "Official Audio") }
	if _, err := c.Resolve(context.Background(), "anti-hero", ResolveOptions{DurationSec: 201, ToleranceSec: 10, Reject: rejectAudio}); !errors.Is(err, ErrNoDurationMatch) {
		t.Fatalf("erreur = %v, attendu ErrNoDurationMatch une fois l'audio écarté", err)
	}

	if _, err := c.Resolve(context.Background(), "anti-hero", ResolveOptions{DurationSec: 500, ToleranceSec: 10}); !errors.Is(err, ErrNoDurationMatch) {
		t.Fatalf("erreur = %v, attendu ErrNoDurationMatch", err)
	}
}

func TestParseSearchReadsCardsAndDurations(t *testing.T) {
	c := New(WithBaseURL("https://duesouth.co.za"))
	got := c.parseSearch(card("/download/a/video/1", "Ninho - Jefe (Clip officiel)", "PT2M58S") +
		card("/download/b/video/2", "Long", "PT1H2M3S") + card("/download/a/video/1", "doublon", "PT1S"))
	if len(got) != 2 || got[0].Title != "Ninho - Jefe (Clip officiel)" || got[0].DurationSec != 178 || got[1].DurationSec != 3723 {
		t.Fatalf("résultats = %+v", got)
	}
	if got[0].Page != "https://duesouth.co.za/download/a/video/1" {
		t.Fatalf("page = %s", got[0].Page)
	}
	if parseISODuration("PT4M") != 240 || parseISODuration("bidon") != 0 {
		t.Fatal("parseISODuration")
	}
}

func TestResolveReportsNoResult(t *testing.T) {
	var challenges atomic.Int32
	srv := fakeMirror(t, &challenges)
	defer srv.Close()
	if _, err := New(WithBaseURL(srv.URL)).Resolve(context.Background(), "introuvable", ResolveOptions{}); err != ErrNoResult {
		t.Fatalf("erreur = %v", err)
	}
	if _, err := New().Resolve(context.Background(), "  ", ResolveOptions{}); err == nil {
		t.Fatal("recherche vide acceptée")
	}
}

func TestCleanTitle(t *testing.T) {
	for in, want := range map[string]string{
		"<title>Ninho - Jefe (Clip officiel) - Download - Tubidy</title>": "Ninho - Jefe (Clip officiel)",
		"<title>Pix&#039;L - Mon étoile</title>":                          "Pix'L - Mon étoile",
		"pas de titre": "",
	} {
		if got := cleanTitle(in); got != want {
			t.Errorf("cleanTitle(%q) = %q, attendu %q", in, got, want)
		}
	}
}

// fakeMP3 construit le début d'un MP3 128 kbit/s 44,1 kHz avec un en-tête Info annonçant sec secondes.
func fakeMP3(sec int) []byte {
	frames := sec * 44100 / 1152
	b := []byte("ID3\x04\x00\x00\x00\x00\x00\x00") // balise ID3 vide
	b = append(b, 0xff, 0xfb, 0x90, 0x64)          // MPEG-1 Layer III, 128 kbit/s, 44,1 kHz
	b = append(b, make([]byte, 32)...)             // informations annexes
	b = append(b, 'I', 'n', 'f', 'o', 0, 0, 0, 0x0f, byte(frames>>24), byte(frames>>16), byte(frames>>8), byte(frames))
	return append(b, make([]byte, 400)...)
}

func TestMP3HeaderDuration(t *testing.T) {
	for _, sec := range []int{178, 303} {
		if got := mp3HeaderDuration(fakeMP3(sec)); got < sec-1 || got > sec {
			t.Errorf("durée lue = %d, attendu %d", got, sec)
		}
	}
	if mp3HeaderDuration([]byte("pas un mp3")) != 0 {
		t.Error("durée lue dans un fichier qui n'est pas un MP3")
	}
}

func TestCheckFileDurationRejectsFileLongerThanAnnounced(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sec, _ := strconv.Atoi(r.URL.Query().Get("sec"))
		w.Header().Set("Content-Range", "bytes 0-8191/4850041")
		w.WriteHeader(http.StatusPartialContent)
		w.Write(fakeMP3(sec))
	}))
	defer srv.Close()
	c := New()
	opts := ResolveOptions{DurationSec: 172, ToleranceSec: 5}

	// Recherche annoncée à 2:54, fichier réel de 5:03 : le clip doit être refusé.
	clip := Track{StreamURL: srv.URL + "/a.mp3?sec=303", DurationSec: 174}
	if err := c.checkFileDuration(context.Background(), &clip, opts); !errors.Is(err, errDurationMismatch) {
		t.Fatalf("erreur = %v, attendu errDurationMismatch", err)
	}
	audio := Track{StreamURL: srv.URL + "/b.mp3?sec=173"}
	if err := c.checkFileDuration(context.Background(), &audio, opts); err != nil || audio.DurationSec < 172 {
		t.Fatalf("erreur = %v, durée = %d", err, audio.DurationSec)
	}
	// Sans durée de référence, aucune requête n'est faite et rien n'est refusé.
	if err := c.checkFileDuration(context.Background(), &clip, ResolveOptions{}); err != nil {
		t.Fatal(err)
	}
}

func TestPreferTitlesKeepsOrderWithinGroups(t *testing.T) {
	in := []SearchResult{{Title: "A original"}, {Title: "B feat X"}, {Title: "C original"}, {Title: "D feat X"}}
	feat := func(s string) bool { return strings.Contains(s, "feat X") }
	if only := preferTitles(in, feat, true); len(only) != 2 {
		t.Fatalf("PreferOnly : %v", only)
	}
	got := preferTitles(in, feat, false)
	want := []string{"B feat X", "D feat X", "A original", "C original"}
	for i, r := range got {
		if r.Title != want[i] {
			t.Fatalf("ordre = %v", got)
		}
	}
}
