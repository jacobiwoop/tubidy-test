package spotify

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// Réponses réelles du lecteur web, enregistrées le 09/10/2026.
func fixture(t *testing.T, name string) map[string]any {
	t.Helper()
	b, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func TestParseArtist(t *testing.T) {
	a := ParseArtist(fixture(t, "artist.json"))
	if a.ID != "6IflU2YrY5Cyw7YoBICosV" || a.Name != "Fally Ipupa" {
		t.Fatalf("artiste = %s %s", a.ID, a.Name)
	}
	if a.Followers != 2593291 || a.MonthlyListeners != 2379790 {
		t.Fatalf("stats = %d / %d", a.Followers, a.MonthlyListeners)
	}
	if len(a.TopCities) == 0 || a.TopCities[0].City != "Kinshasa" || a.TopCities[0].Listeners != 143492 {
		t.Fatalf("villes = %+v", a.TopCities)
	}
	if len(a.TopTracks) == 0 || a.TopTracks[0].Name != "Jam" || a.TopTracks[0].Playcount != 12133134 || a.TopTracks[0].DurationMS != 180386 {
		t.Fatalf("top titres = %+v", a.TopTracks)
	}
	if a.TopTracks[0].Cover == "" || a.TopTracks[0].ArtistID != "6IflU2YrY5Cyw7YoBICosV" {
		t.Fatalf("pochette ou artiste du top titre manquant : %+v", a.TopTracks[0])
	}
	if len(a.Albums) == 0 || a.Albums[0].Name != "XX : Délirium" || a.Albums[0].Year != 2026 {
		t.Fatalf("albums = %+v", a.Albums)
	}
	if len(a.Related) == 0 || a.Related[0].Name != "Gaz Mawete" {
		t.Fatalf("similaires = %+v", a.Related)
	}
	if !strings.HasPrefix(a.Avatar, "https://") || !strings.HasPrefix(a.Header, "https://") || a.Biography == "" || strings.Contains(a.Biography, "<") {
		t.Fatalf("visuels ou bio : avatar=%q header=%q bio=%.40q", a.Avatar, a.Header, a.Biography)
	}
}

func TestParseAlbum(t *testing.T) {
	al := ParseAlbum(fixture(t, "album.json"))
	if al.Name != "XX : Délirium" || al.Artists != "Fally Ipupa" || al.Label != "Elektra France" || al.Date != "2026-09-18" {
		t.Fatalf("album = %+v", al)
	}
	if al.TotalTracks != 51 || len(al.Tracks) == 0 {
		t.Fatalf("titres = %d / %d", al.TotalTracks, len(al.Tracks))
	}
	first := al.Tracks[0]
	if first.Name != "Wanna Dance" || first.DurationMS != 365053 || first.Playcount != 1111166 || first.Album != al.Name || first.Cover != al.Cover {
		t.Fatalf("1er titre = %+v", first)
	}
	if al.Color != "#D3442D" || !strings.Contains(al.Copyright, "Warner") {
		t.Fatalf("couleur %q, copyright %q", al.Color, al.Copyright)
	}
}

func TestParsePlaylist(t *testing.T) {
	p := ParsePlaylist(fixture(t, "playlist.json"))
	if p.Name != "OMAH LAY Radio" || p.Owner != "Spotify" || len(p.Tracks) != 50 {
		t.Fatalf("playlist = %s / %s / %d titres", p.Name, p.Owner, len(p.Tracks))
	}
	first := p.Tracks[0]
	if first.Name != "Bad Influence" || first.Artists != "OMAH LAY" || first.DurationMS != 138652 || !first.Explicit || first.Cover == "" {
		t.Fatalf("1er titre = %+v", first)
	}
}

func TestStripTags(t *testing.T) {
	if got := stripTags(`A <a href="x">true</a> superstar &amp; more`); got != "A true superstar & more" {
		t.Fatalf("stripTags = %q", got)
	}
}
