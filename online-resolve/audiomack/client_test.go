package audiomack

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

// Vecteurs capturés sur audiomack.com (navigateur, 08/10/2026) : la signature
// recalculée doit être identique à celle envoyée par le lecteur web.
func TestSignatureMatchesCapturedWebRequests(t *testing.T) {
	cases := []struct {
		name     string
		endpoint string
		query    string
		want     string
	}{
		{
			name:     "music/play",
			endpoint: "https://api.audiomack.com/v1/music/play/7549933",
			query:    "environment=desktop-web&hq=true&oauth_consumer_key=audiomack-web&oauth_nonce=2baDVFe6010liAqZ5qx5dcJJaGdC59hu&oauth_signature_method=HMAC-SHA1&oauth_timestamp=1791477017&oauth_version=1.0&section=Search",
			want:     "6hiCCyROPpSw/i+y/Q/Ms6fVP0s=",
		},
		{
			name:     "livesearch",
			endpoint: "https://api.audiomack.com/v1/livesearch",
			query:    "limit=20&oauth_consumer_key=audiomack-web&oauth_nonce=LAet0sPY16OynVj1S4NF8rjgYevkAgCS&oauth_signature_method=HMAC-SHA1&oauth_timestamp=1791476977&oauth_version=1.0&page=1&q=ninho&show=music&sort=popular",
			want:     "vxJsw683RO2kBC40JvKS38h7uus=",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			params, err := url.ParseQuery(tc.query)
			if err != nil {
				t.Fatal(err)
			}
			if got := signature("GET", tc.endpoint, params, DefaultConsumerSecret); got != tc.want {
				t.Fatalf("signature = %s, want %s", got, tc.want)
			}
		})
	}
}

func TestSignUsesInjectedClockAndNonce(t *testing.T) {
	c := New()
	c.now = func() time.Time { return time.Unix(1791477017, 0) }
	c.nonce = func() string { return "2baDVFe6010liAqZ5qx5dcJJaGdC59hu" }
	params := url.Values{"environment": {"desktop-web"}, "hq": {"true"}, "section": {"Search"}}

	signed := c.sign("GET", "https://api.audiomack.com/v1/music/play/7549933", params)
	if got := signed.Get("oauth_signature"); got != "6hiCCyROPpSw/i+y/Q/Ms6fVP0s=" {
		t.Fatalf("oauth_signature = %s", got)
	}
	if params.Get("oauth_nonce") != "" {
		t.Fatal("sign a modifié les paramètres de l'appelant")
	}
}

func TestPercentEncodeFollowsRFC3986(t *testing.T) {
	if got := percentEncode("Pix'L & Anouchka ~é"); got != "Pix%27L%20%26%20Anouchka%20~%C3%A9" {
		t.Fatalf("percentEncode = %s", got)
	}
}

func TestSearchSongsKeepsOnlySongsAndParsesDurations(t *testing.T) {
	var gotQuery url.Values
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/livesearch" {
			t.Errorf("chemin = %s", r.URL.Path)
		}
		gotQuery = r.URL.Query()
		w.Write([]byte(`{"results":[
			{"id":7549933,"type":"song","title":"Mon étoile","artist":"Pix'L","duration":"237","url_slug":"mon-etoile","uploader":{"url_slug":"alitia-1"}},
			{"id":65783964,"type":"album","title":"Obliquity","duration":""},
			{"id":42,"type":"song","title":"Sans durée","duration":""}]}`))
	}))
	defer srv.Close()

	songs, err := New(WithBaseURL(srv.URL)).SearchSongs(context.Background(), "  pixl ", SearchOptions{Limit: 99})
	if err != nil {
		t.Fatal(err)
	}
	if len(songs) != 2 || songs[0].ID != 7549933 || songs[1].ID != 42 {
		t.Fatalf("titres = %+v", songs)
	}
	if songs[0].DurationSeconds() != 237 || songs[1].DurationSeconds() != 0 {
		t.Fatalf("durées = %d, %d", songs[0].DurationSeconds(), songs[1].DurationSeconds())
	}
	if songs[0].PageURL() != "https://audiomack.com/alitia-1/song/mon-etoile" {
		t.Fatalf("page = %s", songs[0].PageURL())
	}
	if gotQuery.Get("q") != "pixl" || gotQuery.Get("limit") != "20" || gotQuery.Get("show") != "music" || gotQuery.Get("oauth_signature") == "" {
		t.Fatalf("paramètres envoyés = %v", gotQuery)
	}
}

func TestStreamURLParsesExpiry(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/music/play/7549933" || r.URL.Query().Get("hq") != "true" {
			t.Errorf("requête = %s", r.URL)
		}
		w.Write([]byte(`{"signedUrl":"https:\/\/music.audiomack.com\/hq\/a\/b.m4a?Expires=1791491416&Signature=x&Key-Pair-Id=y","playUuid":"abc"}`))
	}))
	defer srv.Close()

	s, err := New(WithBaseURL(srv.URL)).StreamURL(context.Background(), 7549933, true)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(s.URL, "https://music.audiomack.com/hq/a/b.m4a?") || s.PlayUUID != "abc" || s.ExpiresAt.Unix() != 1791491416 {
		t.Fatalf("stream = %+v", s)
	}
}

func TestStreamURLReportsAPIErrorsAndMissingURL(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/1") {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"errorcode":1052,"message":"Invalid signature"}`))
			return
		}
		w.Write([]byte(`{}`))
	}))
	defer srv.Close()
	c := New(WithBaseURL(srv.URL))

	var apiErr *APIError
	if _, err := c.StreamURL(context.Background(), 1, true); !errors.As(err, &apiErr) || apiErr.Status != 401 {
		t.Fatalf("erreur = %v", err)
	}
	if _, err := c.StreamURL(context.Background(), 2, true); err == nil || !strings.Contains(err.Error(), "pas de lien audio") {
		t.Fatalf("erreur = %v", err)
	}
	if _, err := c.StreamURL(context.Background(), 0, true); err == nil {
		t.Fatal("identifiant 0 accepté")
	}
}
