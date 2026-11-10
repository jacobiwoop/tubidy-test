package waptrick

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const searchPage = `<ul><li class="new_list"><div class="text_container"> <a href="https://pub.example/1" onclick="window.open('https://waptrick.com/fr/download/Burna-Boy/Last-Last/?type=FT&amp;id=445076'); x();" title="t"> <span class="uptext underline"> Last Last </span></a><div class="links"><a href="https://pub.example/2" onclick="window.open('/fr/free/mp3/Burna-Boy/?');" class="more underline">Burna Boy</a></div></div></li>
<li class="cent_list"><p>publicité</p></li>
<li class="new_list"><a href="#" onclick="window.open('https://waptrick.com/fr/download/Raybekah-feat-Kholi/Last-Last-Mashup/?type=FT&amp;id=445708');"><span class="uptext underline"> Last Last Mashup </span></a><div class="links"><a class="more underline">Raybekah</a> ft <a class="more underline">Kholi</a></div></li>
<li class="new_list"><a href="#"><span class="uptext underline">Se sentir chanceux?</span></a></li></ul>`

func TestParseSearchReadsTitleArtistsAndPage(t *testing.T) {
	got := parseSearch(searchPage, "https://waptrick.com")
	if len(got) != 2 {
		t.Fatalf("%d résultats : %+v", len(got), got)
	}
	want := Song{ID: "445076", Title: "Last Last", Artist: "Burna Boy", Page: "https://waptrick.com/fr/download/Burna-Boy/Last-Last/?type=FT&id=445076"}
	if got[0] != want {
		t.Fatalf("%+v", got[0])
	}
	if got[1].Artist != "Raybekah, Kholi" {
		t.Fatalf("artistes = %q", got[1].Artist)
	}
}

func TestBestFileTakesTheFirstQuality(t *testing.T) {
	body := `<a onclick="window.open('/fr/buffer_mwap.jsp?floc=%2Fload-file%2FFT%2F1%2Fringtones_new%2Ffullmp3best%2Fb%2FA.mp3');"></a>
<a onclick="window.open('/fr/buffer_mwap.jsp?floc=%2Fload-file%2FFT%2F1%2Fringtones_new%2Ffullmp3low%2Fb%2FA.mp3');"></a>`
	if got := bestFile(body); got != "/load-file/FT/1/ringtones_new/fullmp3best/b/A.mp3" {
		t.Fatalf("%q", got)
	}
}

func TestStreamURLFollowsLoadFileAndProbeSkipsID3(t *testing.T) {
	id3 := append([]byte("ID3\x03\x00\x00"), 0, 0, 0, 10) // tag de 10 octets après l'en-tête
	id3 = append(id3, make([]byte, 10)...)
	file := append(id3, frame128()...)
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/fr/download/"):
			w.Write([]byte(`floc=%2Fload-file%2FFT%2F1%2FA.mp3'`))
		case strings.HasPrefix(r.URL.Path, "/load-file/"):
			http.Redirect(w, r, srv.URL+"/files/A.mp3", http.StatusFound)
		case r.URL.Path == "/files/A.mp3":
			w.Header().Set("Content-Range", "bytes 0-23/2738532")
			w.WriteHeader(http.StatusPartialContent)
			w.Write(file)
		}
	}))
	defer srv.Close()
	c := New(WithBaseURL(srv.URL))
	link, err := c.StreamURL(context.Background(), Song{Page: srv.URL + "/fr/download/A/B/?type=FT&id=1"})
	if err != nil || link != srv.URL+"/files/A.mp3" {
		t.Fatalf("lien = %q, %v", link, err)
	}
	sec, err := c.Probe(context.Background(), link)
	if err != nil || sec != 171 {
		t.Fatalf("durée = %d, %v", sec, err)
	}
}
