package kuwo

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestKuwoRefusesALinkOfAnotherSong(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("br") != "5" {
			t.Errorf("br = %q", r.URL.Query().Get("br"))
		}
		w.Write([]byte(`{"data":{"song":"X","rid":"MUSIC_2","time":"195","format":"mp3","url":"http://x/a.mp3"}}`))
	}))
	defer srv.Close()
	k := &Client{Base: srv.URL}
	if _, err := k.Stream(context.Background(), Song{ID: "MUSIC_1", Quality: "5", Index: 1, Term: "x"}); err == nil {
		t.Fatal("lien d'un autre titre accepté")
	}
	st, err := k.Stream(context.Background(), Song{ID: "MUSIC_2", Quality: "5", Index: 1, Term: "x"})
	if err != nil || st.Format != "mp3" || st.DurationSec != 195 {
		t.Fatalf("%+v, %v", st, err)
	}
}

func TestBestQualityFollowsEachSongsList(t *testing.T) {
	cases := []struct {
		types []kuwoType
		want  string
	}{
		{[]kuwoType{{"2000", "flac"}, {"192", "ogg"}, {"100", "ogg"}, {"320", "mp3"}, {"128", "mp3"}}, "4"},
		{[]kuwoType{{"2000", "flac"}, {"300", "ogg"}, {"192", "ogg"}, {"100", "ogg"}, {"320", "mp3"}}, "5"},
		{[]kuwoType{{"2000", "flac"}, {"192", "ogg"}}, "2"},
	}
	for _, c := range cases {
		if got := bestQuality(c.types); got != c.want {
			t.Errorf("%v : br=%s, attendu %s", c.types, got, c.want)
		}
	}
}
