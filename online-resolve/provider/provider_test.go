package provider

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"online-resolve/audiomack"
	"online-resolve/qq"
)

type fakeProvider struct {
	name  string
	delay time.Duration
	err   error
}

func (f fakeProvider) Name() string { return f.name }

func (f fakeProvider) Resolve(ctx context.Context, q Query) (Result, error) {
	select {
	case <-time.After(f.delay):
	case <-ctx.Done():
		return Result{}, ctx.Err()
	}
	if f.err != nil {
		return Result{}, f.err
	}
	return Result{Provider: f.name, Title: q.Text, StreamURL: "https://" + f.name + "/a.mp3"}, nil
}

func TestResolveAllRunsProvidersInParallelAndKeepsPreferenceOrder(t *testing.T) {
	start := time.Now()
	out := ResolveAll(context.Background(), Query{Text: "ninho jefe"},
		fakeProvider{name: "lent", delay: 150 * time.Millisecond, err: ErrNotFound},
		fakeProvider{name: "rapide", delay: 10 * time.Millisecond},
		fakeProvider{name: "moyen", delay: 100 * time.Millisecond},
	)
	if elapsed := time.Since(start); elapsed > 250*time.Millisecond {
		t.Fatalf("durée totale %s : les sources n'ont pas tourné en parallèle", elapsed)
	}
	if out[0].Provider != "lent" || out[1].Provider != "rapide" || out[2].Provider != "moyen" {
		t.Fatalf("ordre = %v", out)
	}
	if out[0].Result != nil || out[0].Error != ErrNotFound.Error() || out[1].Result == nil {
		t.Fatalf("issues = %+v", out)
	}
	best, ok := Best(out)
	if !ok || best.Provider != "rapide" {
		t.Fatalf("meilleur = %+v", best)
	}
}

func TestRaceReturnsFirstLinkAndCancelsTheOthers(t *testing.T) {
	start := time.Now()
	winner, outcomes, ok := Race(context.Background(), Query{Text: "Ninho Jefe"},
		fakeProvider{name: "préférée-mais-lente", delay: time.Hour},
		fakeProvider{name: "échoue-vite", delay: 5 * time.Millisecond, err: ErrNotFound},
		fakeProvider{name: "rapide", delay: 30 * time.Millisecond},
	)
	if elapsed := time.Since(start); elapsed > 500*time.Millisecond {
		t.Fatalf("Race a attendu %s : la source lente n'a pas été annulée", elapsed)
	}
	if !ok || winner.Provider != "rapide" || winner.Result == nil {
		t.Fatalf("gagnant = %+v", winner)
	}
	if len(outcomes) != 2 || outcomes[0].Provider != "échoue-vite" || outcomes[0].Error == "" {
		t.Fatalf("issues = %+v", outcomes)
	}
}

func TestRaceReportsEveryErrorWhenAllFail(t *testing.T) {
	_, outcomes, ok := Race(context.Background(), Query{Text: "x"},
		fakeProvider{name: "a", delay: 5 * time.Millisecond, err: ErrNotFound},
		fakeProvider{name: "b", delay: 10 * time.Millisecond, err: errors.New("HTTP 500")},
	)
	if ok || len(outcomes) != 2 || outcomes[0].Error == "" || outcomes[1].Error == "" {
		t.Fatalf("ok=%v issues=%+v", ok, outcomes)
	}
}

func TestResolveAllStopsAtContextDeadline(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	start := time.Now()
	out := ResolveAll(ctx, Query{Text: "x"}, fakeProvider{name: "bloqué", delay: time.Hour})
	if time.Since(start) > time.Second || out[0].Result != nil || out[0].Error == "" {
		t.Fatalf("issue = %+v", out[0])
	}
	if _, ok := Best(out); ok {
		t.Fatal("Best a rendu un résultat alors que tout a échoué")
	}
}

func TestAudiomackSkipsTracksTheSearchMarksAsBlocked(t *testing.T) {
	var played []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/livesearch":
			w.Write([]byte(`{"results":[
				{"id":1,"type":"song","title":"Essence","artist":"Wizkid","geo_restricted":true},
				{"id":2,"type":"song","title":"Essence","artist":"Wizkid","premium_user_only":"yes"},
				{"id":4,"type":"song","title":"Essence","artist":"Wizkid","duration":"249","url_slug":"essence","uploader":{"url_slug":"wizkid"}}]}`))
		case strings.HasPrefix(r.URL.Path, "/music/play/"):
			played = append(played, strings.TrimPrefix(r.URL.Path, "/music/play/"))
			w.Write([]byte(`{"signedUrl":"https://music.audiomack.com/a.m4a?Expires=1791491416&Signature=x"}`))
		}
	}))
	defer srv.Close()

	res, err := NewAudiomack(audiomack.New(audiomack.WithBaseURL(srv.URL))).Resolve(context.Background(), Query{Text: "wizkid essence"})
	if err != nil {
		t.Fatal(err)
	}
	if len(played) != 1 || played[0] != "4" {
		t.Fatalf("music/play appelé pour %v, attendu [4]", played)
	}
	if res.Artist != "Wizkid" || res.DurationSec != 249 || res.Format != "m4a" || res.Page != "https://audiomack.com/wizkid/song/essence" {
		t.Fatalf("résultat = %+v", res)
	}
}

func TestAudiomackSkipsOtherRecordingsByDuration(t *testing.T) {
	var played []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/livesearch" {
			w.Write([]byte(`{"results":[
				{"id":1,"type":"song","title":"The Weeknd - Blinding Lights","artist":"Esther","duration":"190"},
				{"id":2,"type":"song","title":"Blinding Lights","artist":"The Weeknd","duration":"201"}]}`))
			return
		}
		played = append(played, strings.TrimPrefix(r.URL.Path, "/music/play/"))
		w.Write([]byte(`{"signedUrl":"https://music.audiomack.com/a.m4a"}`))
	}))
	defer srv.Close()
	p := NewAudiomack(audiomack.New(audiomack.WithBaseURL(srv.URL)))

	res, err := p.Resolve(context.Background(), Query{Text: "The Weeknd Blinding Lights", DurationSec: 200})
	if err != nil || res.Artist != "The Weeknd" || len(played) != 1 || played[0] != "2" {
		t.Fatalf("résultat = %+v, appels = %v, erreur = %v", res, played, err)
	}
	if _, err := p.Resolve(context.Background(), Query{Text: "x", DurationSec: 400}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("erreur = %v, attendu ErrNotFound", err)
	}
}

func TestIsAlteredVersion(t *testing.T) {
	for title, want := range map[string]bool{
		"Drake - Gods Plan (432hz)":             true,
		"Anti-Hero (Sped Up)":                   true,
		"Last Last (slowed + reverb)":           true,
		"Blinding Lights - Nightcore":           true,
		"Drake - God's Plan":                    false,
		"Stromae - Alors On Danse (Radio Edit)": false,
		"Taylor Swift - Anti-Hero (Lyrics)":     false,
		"Djadja (feat. Maluma) [Remix]":         true,
	} {
		if got := IsAlteredVersion(title, "artiste titre"); got != want {
			t.Errorf("IsAlteredVersion(%q) = %v, attendu %v", title, got, want)
		}
	}
	if IsAlteredVersion("Djadja (feat. Maluma) [Remix]", "Aya Nakamura, Maluma Djadja (feat. Maluma) - Remix") {
		t.Error("remix demandé par le titre Spotify écarté")
	}
	if IsAlteredVersion("Last Last (Slowed)", "Burna Boy Last Last (Slowed)") {
		t.Error("version demandée explicitement par la requête écartée")
	}
}

func TestArtistMatches(t *testing.T) {
	q := "Kofs, Soso Maness, Elams, Jul, SCH, Naps, Solda, Houari, 13 Organisé Bande organisée"
	for artist, want := range map[string]bool{
		"13 Organisé":   true, // accent retiré des deux côtés
		"JuL":           true,
		"ZZang KARAOKE": false,
		"Esther":        false,
		"":              true,
	} {
		if got := ArtistMatches(artist, q); got != want {
			t.Errorf("ArtistMatches(%q) = %v, attendu %v", artist, got, want)
		}
	}
	if !ArtistMatches("Wizkid feat. Tems", "Wizkid, Tems Essence (feat. Tems)") || ArtistMatches("Esther", "The Weeknd Blinding Lights") {
		t.Error("cas Wizkid / Esther")
	}
	if !ArtistMatches("いきものがかり", "Ikimonogakari ブルーバード") {
		t.Error("ArtistMatches(いきものがかり, Ikimonogakari ブルーバード) attendu true via translittération")
	}
}

func TestSameRecordingCJK(t *testing.T) {
	q := Query{
		Text:        "Ikimonogakari ブルーバード",
		Artists:     []string{"Ikimonogakari"},
		DurationSec: 216,
	}

	// Kuwo retourne souvent le titre avec le sous-titre de l'anime Naruto
	kuwoTitle := "ブルーバード-《火影忍者疾风传》TV动画第274-297集片头曲"
	kuwoArtist := "いきものがかり"

	if !sameRecording(kuwoTitle, kuwoArtist, q) {
		t.Errorf("sameRecording(%q, %q) attendu true pour requête %+v", kuwoTitle, kuwoArtist, q)
	}

	// Instrumental doit être rejeté
	if sameRecording("ブルーバード (Instrumental)", kuwoArtist, q) {
		t.Error("Instrumental doit être rejeté")
	}
}

func TestAudiomackSkipsKaraokeAndOtherArtists(t *testing.T) {
	var played []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/livesearch" {
			w.Write([]byte(`{"results":[
				{"id":1,"type":"song","title":"Anti-Hero (Acoustic Version)","artist":"ZZang KARAOKE","duration":"201"},
				{"id":2,"type":"song","title":"Anti-Hero","artist":"Some Singer","duration":"201"},
				{"id":3,"type":"song","title":"Anti-Hero","artist":"Taylor Swift","duration":"200"}]}`))
			return
		}
		played = append(played, strings.TrimPrefix(r.URL.Path, "/music/play/"))
		w.Write([]byte(`{"signedUrl":"https://music.audiomack.com/a.m4a"}`))
	}))
	defer srv.Close()

	res, err := NewAudiomack(audiomack.New(audiomack.WithBaseURL(srv.URL))).Resolve(context.Background(), Query{Text: "Taylor Swift Anti-Hero", DurationSec: 201})
	if err != nil || res.Artist != "Taylor Swift" || len(played) != 1 || played[0] != "3" {
		t.Fatalf("résultat = %+v, appels = %v, erreur = %v", res, played, err)
	}
}

func TestAudiomackFallsBackAfterNotAuthorized(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/livesearch":
			w.Write([]byte(`{"results":[{"id":10,"type":"song","title":"A"},{"id":11,"type":"song","title":"B"},{"id":12,"type":"song","title":"C"},{"id":13,"type":"song","title":"D"}]}`))
		case "/music/play/10", "/music/play/11":
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"errorcode":1005,"message":"Not authorized"}`))
		case "/music/play/12":
			w.Write([]byte(`{"signedUrl":"https://music.audiomack.com/c.m4a"}`))
		default:
			t.Errorf("appel inattendu %s", r.URL.Path)
		}
	}))
	defer srv.Close()
	p := NewAudiomack(audiomack.New(audiomack.WithBaseURL(srv.URL)))

	res, err := p.Resolve(context.Background(), Query{Text: "x"})
	if err != nil || res.Title != "C" {
		t.Fatalf("résultat = %+v, erreur = %v", res, err)
	}
}

func TestAudiomackReportsLastRefusalWhenAllCandidatesFail(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/livesearch" {
			w.Write([]byte(`{"results":[{"id":10,"type":"song","title":"A"}]}`))
			return
		}
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"errorcode":1005,"message":"Not authorized"}`))
	}))
	defer srv.Close()

	_, err := NewAudiomack(audiomack.New(audiomack.WithBaseURL(srv.URL))).Resolve(context.Background(), Query{Text: "x"})
	var apiErr *audiomack.APIError
	if !errors.As(err, &apiErr) || apiErr.Status != 403 {
		t.Fatalf("erreur = %v", err)
	}
}

func TestMentionsFeatured(t *testing.T) {
	q := Query{Text: "Stromae, Erik Hassle Alors On Danse - Featuring Erik Hassle", DurationSec: 208, Artists: []string{"Stromae", "Erik Hassle"}}
	for title, want := range map[string]bool{
		"Alors On Danse (Featuring Erik Hassle)":                 true,
		"Alors on danse - Stromae ft Erik Hassle (Lyrics Video)": true,
		"Stromae - Alors on Danse (Lyrics) [TikTok Song]":        false,
		"Stromae - Alors on danse (Radio Edit)":                  false,
	} {
		if got := MentionsFeatured(title, q); got != want {
			t.Errorf("MentionsFeatured(%q) = %v, attendu %v", title, got, want)
		}
	}
	if MentionsFeatured("Alors on danse", Query{Artists: []string{"Stromae"}}) {
		t.Error("sans invité, rien ne doit être préféré")
	}
}

func TestTitleWords(t *testing.T) {
	q := Query{Text: "BigXthaPlug, Ava Max BURN (feat. Ava Max)", Artists: []string{"BigXthaPlug", "Ava Max"}}
	w := TitleWords(q)
	if len(w) != 1 || w[0] != "burn" {
		t.Fatalf("mots = %v", w)
	}
	if HasTitleWords("BigXthaPlug - All The Way feat. Bailey Zimmerman (Official Music Video)", w) {
		t.Error("« All The Way » n'est pas « BURN »")
	}
	if !HasTitleWords("BigXthaPlug & Ava Max - BURN (Official Audio)", w) {
		t.Error("le bon titre doit passer")
	}
	q2 := Query{Text: "Stromae, Erik Hassle Alors On Danse - Featuring Erik Hassle", Artists: []string{"Stromae", "Erik Hassle"}}
	if w := TitleWords(q2); strings.Join(w, " ") != "alors on danse" {
		t.Fatalf("mots = %v", w)
	}
	if TitleWords(Query{Text: "Wizkid Essence"}) != nil {
		t.Error("sans artistes, pas de vérification")
	}
}

func TestSearchTermDropsGuestsAndBrackets(t *testing.T) {
	q := Query{Text: "Rema, Selena Gomez Calm Down (with Selena Gomez)", Artists: []string{"Rema", "Selena Gomez"}}
	if got := searchTerm(q); got != "Rema Calm Down" {
		t.Fatalf("%q", got)
	}
	if got := searchTerm(Query{Text: "Stromae Fils de joie"}); got != "Stromae Fils de joie" {
		t.Fatalf("%q", got)
	}
}

func TestSameRecordingKeepsTheSongAndRejectsNeighbours(t *testing.T) {
	q := Query{Text: "Burna Boy Last Last"}
	for _, r := range [][2]string{{"Last Last", "Burna Boy"}, {"Last Last (Explicit)", "Burna Boy"}} {
		if !sameRecording(r[0], r[1], q) {
			t.Errorf("%v refusé", r)
		}
	}
	for _, r := range [][2]string{{"Last Last Mashup", "Burna Boy"}, {"Last Last (Remix Zouk)", "Burna Boy"}, {"Last Last", "Raybekah"}, {"Last Christmas", "Burna Boy"}, {"Last Last", ""}} {
		if sameRecording(r[0], r[1], q) {
			t.Errorf("%v accepté", r)
		}
	}
}

func TestQQSkipsPaidAndWrongDuration(t *testing.T) {
	// « Fils de joie » sur QQ : payant sans lien, gratuit à 217 s, puis le bon à 195 s.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Query().Get("mid") {
		case "":
			w.Write([]byte(`[{"song_title":"Fils de joie","song_mid":"paye","singer_name":"Stromae"},{"song_title":"Fils de joie","song_mid":"autre","singer_name":"Stromae"},{"song_title":"Fils de joie","song_mid":"bon","singer_name":"Stromae"}]`))
		case "paye":
			w.Write([]byte(`{"song_play_time":195}`))
		case "autre":
			w.Write([]byte(`{"song_play_time":217,"song_play_url_hq":"http://x/autre"}`))
		case "bon":
			w.Write([]byte(`{"song_play_time":195,"song_play_url_hq":"http://x/bon"}`))
		}
	}))
	defer srv.Close()
	res, err := NewQQ(&qq.Client{Base: srv.URL}).Resolve(context.Background(), Query{Text: "Stromae Fils de joie", DurationSec: 195})
	if err != nil || res.StreamURL != "http://x/bon" {
		t.Fatalf("%+v, %v", res, err)
	}
}

type lastResortProvider struct{ fakeProvider }

func (lastResortProvider) LastResort() {}

func TestRaceKeepsLastResortForWhenAllOthersFail(t *testing.T) {
	reserve := lastResortProvider{fakeProvider{name: "reserve"}}
	winner, _, ok := Race(context.Background(), Query{}, reserve, fakeProvider{name: "lent", delay: 50 * time.Millisecond})
	if !ok || winner.Provider != "lent" {
		t.Fatalf("gagnant = %q, attendu la source normale même plus lente", winner.Provider)
	}
	winner, _, ok = Race(context.Background(), Query{}, reserve, fakeProvider{name: "ko", delay: 50 * time.Millisecond, err: ErrNotFound})
	if !ok || winner.Provider != "reserve" {
		t.Fatalf("gagnant = %q, attendu le dernier choix", winner.Provider)
	}
}
