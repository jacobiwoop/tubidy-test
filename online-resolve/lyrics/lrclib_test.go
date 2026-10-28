package lyrics

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParseLRC(t *testing.T) {
	lines := ParseLRC("[ar: x]\n[00:12.50] Première ligne\n[01:02.03]Deuxième\nsans horodatage\n[02:00.00]")
	if len(lines) != 3 || lines[0].TimeMs != 12500 || lines[0].Text != "Première ligne" || lines[1].TimeMs != 62030 || lines[2].Text != "" {
		t.Fatalf("lignes = %+v", lines)
	}
}

func TestCleanTitle(t *testing.T) {
	for _, tc := range []struct{ title, artist, want string }{
		{"Essence (feat. Tems)", "Wizkid, Tems", "Essence"},
		{"Je suis béni - First King", "First King", "Je suis béni"},
		{"First King - Je suis béni", "First King", "Je suis béni"},
		{"Alors on danse - Radio Edit", "Stromae", "Alors on danse"},
		{"Let It Be [Remastered 2009]", "The Beatles", "Let It Be"},
	} {
		if got := CleanTitle(tc.title, tc.artist); got != tc.want {
			t.Errorf("CleanTitle(%q) = %q, attendu %q", tc.title, got, tc.want)
		}
	}
}

func TestFetchFallsBackToSearchAndChecksDuration(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/get":
			http.NotFound(w, r)
		case "/search":
			json.NewEncoder(w).Encode([]entry{
				{TrackName: "Autre version", Duration: 300, SyncedLyrics: "[00:01.00]mauvaise version"},
				{TrackName: "Jefe", Duration: 179, SyncedLyrics: "[00:05.00]bonne version"},
			})
		}
	}))
	defer srv.Close()
	c := New().WithBaseURL(srv.URL).WithNeteaseURL(srv.URL)

	r, err := c.Fetch(context.Background(), "Ninho", "Jefe", "", 178)
	if err != nil || !r.Synced || r.Lines[0].Text != "bonne version" {
		t.Fatalf("résultat = %+v, erreur = %v", r, err)
	}
	if _, err := c.Fetch(context.Background(), "Ninho", "Jefe", "", 600); !errors.Is(err, ErrNotFound) {
		t.Fatalf("aucune version à 600 s : erreur = %v", err)
	}
}

func TestFetchPrefersExactMatchAndPlainLyrics(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/get" && r.URL.Query().Get("duration") == "201" {
			json.NewEncoder(w).Encode(entry{PlainLyrics: "ligne 1\r\nligne 2"})
			return
		}
		http.NotFound(w, r)
	}))
	defer srv.Close()
	r, err := New().WithBaseURL(srv.URL).WithNeteaseURL(srv.URL).Fetch(context.Background(), "Taylor Swift", "Anti-Hero", "Midnights", 201)
	if err != nil || r.Synced || len(r.Lines) != 2 || r.Lines[1].Text != "ligne 2" {
		t.Fatalf("résultat = %+v, erreur = %v", r, err)
	}
}

func TestFetchKeepsTheMostCompleteVersion(t *testing.T) {
	// Trois versions de la bonne durée : un couplet manquant, une complète, une d'un autre enregistrement.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/search" {
			http.NotFound(w, r)
			return
		}
		json.NewEncoder(w).Encode([]entry{
			{ID: 1, Duration: 100, SyncedLyrics: "[00:05.00]a\n[00:10.00]b\n[00:50.00]c\n[01:30.00]d"},
			{ID: 2, Duration: 101, SyncedLyrics: "[00:05.00]a\n[00:10.00]b\n[00:20.00]couplet\n[00:30.00]suite\n[00:40.00]fin couplet\n[00:50.00]c\n[01:00.00]x\n[01:10.00]y\n[01:20.00]z\n[01:30.00]d"},
			{ID: 3, Duration: 240, SyncedLyrics: "[00:05.00]autre enregistrement"},
		})
	}))
	defer srv.Close()
	r, err := New().WithBaseURL(srv.URL).WithNeteaseURL(srv.URL).Fetch(context.Background(), "Uncle Waffles", "Yahyuppiyah", "", 100)
	if err != nil || len(r.Lines) != 10 || r.Lines[2].Text != "couplet" {
		t.Fatalf("résultat = %+v, erreur = %v", r, err)
	}
}

func TestMeasureCountsMiddleAndTailHoles(t *testing.T) {
	// Trou de 40 s au milieu, et la dernière ligne 50 s avant la fin du morceau de 100 s.
	v := measure(Result{Synced: true, Lines: ParseLRC("[00:05.00]a\n[00:10.00]b\n[00:50.00]c\n[00:55.00]")}, 100, 100)
	if v.lines != 3 || v.holesMs != 40_000+50_000 {
		t.Fatalf("version = %+v", v)
	}
	// Un silence de moins de 15 s n'est pas un trou.
	if v := measure(Result{Synced: true, Lines: ParseLRC("[00:05.00]a\n[00:19.00]b")}, 30, 30); v.holesMs != 0 {
		t.Fatalf("version = %+v", v)
	}
}

func TestFetchComparesNeteaseWithLrclib(t *testing.T) {
	// LRCLIB s'arrête à 0:50 d'un morceau de 100 s ; NetEase a tout, avec ses crédits chinois en tête.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/search":
			json.NewEncoder(w).Encode([]entry{{ID: 1, Duration: 100, SyncedLyrics: "[00:05.00]a\n[00:10.00]b\n[00:50.00]c"}})
		case "/search/get":
			w.Write([]byte(`{"result":{"songs":[
				{"id":7,"name":"Jefe","duration":100400,"artists":[{"name":"Ninho"}]},
				{"id":8,"name":"Jefe","duration":100000,"artists":[{"name":"Quelqu'un d'autre"}]}]}}`))
		case "/song/lyric":
			if r.URL.Query().Get("id") != "7" {
				t.Errorf("paroles demandées pour le morceau %s", r.URL.Query().Get("id"))
			}
			w.Write([]byte(`{"lrc":{"lyric":"[00:00.00] 作词 : Ninho\n[00:01.00] 作曲 : CHADY\n[00:05.00]a\n[00:10.00]b\n[00:30.00]c\n[00:50.00]d\n[01:10.00]e\n[01:30.00]f"}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()
	r, err := New().WithBaseURL(srv.URL).WithNeteaseURL(srv.URL).Fetch(context.Background(), "Ninho", "Jefe", "", 100)
	if err != nil || r.Source != "NetEase" || len(r.Lines) != 6 || r.Lines[0].Text != "a" {
		t.Fatalf("résultat = %+v, erreur = %v", r, err)
	}
}
