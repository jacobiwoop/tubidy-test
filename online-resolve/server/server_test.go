package server

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"online-resolve/provider"
)

type stub struct {
	name string
	ok   bool
}

func (s stub) Name() string { return s.name }

func (s stub) Resolve(_ context.Context, q provider.Query) (provider.Result, error) {
	if !s.ok {
		return provider.Result{}, provider.ErrNotFound
	}
	return provider.Result{Provider: s.name, Title: q.Text, DurationSec: q.DurationSec, StreamURL: "https://cdn/a.mp3"}, nil
}

func call(t *testing.T, cfg Config, method, target string, header map[string]string) (*httptest.ResponseRecorder, Response) {
	t.Helper()
	req := httptest.NewRequest(method, target, nil)
	for k, v := range header {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	ResolveHandler(cfg).ServeHTTP(rec, req)
	var resp Response
	json.Unmarshal(rec.Body.Bytes(), &resp)
	return rec, resp
}

func TestResolveHandlerReturnsWinnerWithQueryAndDuration(t *testing.T) {
	cfg := Config{Providers: []provider.Provider{stub{"a", false}, stub{"b", true}}, Timeout: time.Second}
	rec, resp := call(t, cfg, http.MethodGet, "/api/resolve?q=Ninho%20Jefe&duration=178", nil)
	if rec.Code != 200 || resp.Best == nil || resp.Best.Provider != "b" || resp.Best.DurationSec != 178 || resp.Mode != "race" {
		t.Fatalf("code %d, réponse %+v", rec.Code, resp)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "*" || rec.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("en-têtes = %v", rec.Header())
	}
}

func TestResolveHandlerErrors(t *testing.T) {
	none := Config{Providers: []provider.Provider{stub{"a", false}}}
	for _, tc := range []struct {
		name, target string
		cfg          Config
		want         int
	}{
		{"q manquant", "/resolve", none, 400},
		{"durée invalide", "/resolve?q=x&duration=abc", none, 400},
		{"aucun lien", "/resolve?q=x", none, 404},
		{"clé absente", "/resolve?q=x", Config{Providers: none.Providers, APIKey: "secret"}, 401},
	} {
		if rec, _ := call(t, tc.cfg, http.MethodGet, tc.target, nil); rec.Code != tc.want {
			t.Errorf("%s : code %d, attendu %d", tc.name, rec.Code, tc.want)
		}
	}
	if rec, _ := call(t, none, http.MethodPost, "/resolve?q=x", nil); rec.Code != 405 {
		t.Errorf("POST : code %d", rec.Code)
	}
}

func TestResolveHandlerAcceptsValidKeyAndPreflight(t *testing.T) {
	cfg := Config{Providers: []provider.Provider{stub{"a", true}}, APIKey: "secret"}
	if rec, _ := call(t, cfg, http.MethodGet, "/resolve?q=x", map[string]string{"X-Api-Key": "faux"}); rec.Code != 401 {
		t.Fatalf("mauvaise clé : code %d", rec.Code)
	}
	if rec, _ := call(t, cfg, http.MethodGet, "/resolve?q=x", map[string]string{"X-Api-Key": "secret"}); rec.Code != 200 {
		t.Fatalf("bonne clé : code %d", rec.Code)
	}
	// Le préflight CORS d'un navigateur arrive sans clé : il doit passer.
	if rec, _ := call(t, cfg, http.MethodOptions, "/resolve?q=x", nil); rec.Code != 204 || rec.Header().Get("Access-Control-Allow-Headers") != "X-Api-Key" {
		t.Fatalf("préflight : code %d, en-têtes %v", rec.Code, rec.Header())
	}
}

func TestResolveAllModeKeepsEveryProvider(t *testing.T) {
	cfg := Config{Providers: []provider.Provider{stub{"a", false}, stub{"b", true}}}
	_, resp := call(t, cfg, http.MethodGet, "/resolve?q=x&all=1", nil)
	if resp.Mode != "all" || len(resp.Outcomes) != 2 || resp.Outcomes[0].Provider != "a" {
		t.Fatalf("réponse = %+v", resp)
	}
}

func callAPI(t *testing.T, cfg Config, target string, header map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, target, nil)
	for k, v := range header {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	API(cfg).ServeHTTP(rec, req)
	return rec
}

func TestAPIRoutingAndAccess(t *testing.T) {
	cfg := Config{APIKey: "secret"}
	sameOrigin := map[string]string{"Sec-Fetch-Site": "same-origin"}
	for _, tc := range []struct {
		name, target string
		header       map[string]string
		want         int
	}{
		{"route inconnue", "/api/nimporte", sameOrigin, 404},
		{"sans clé ni site", "/api/search?q=x", nil, 401},
		{"autre site", "/api/search?q=x", map[string]string{"Sec-Fetch-Site": "cross-site"}, 401},
		{"site : q manquant", "/api/search", sameOrigin, 400},
		{"clé : q manquant", "/api/search", map[string]string{"X-Api-Key": "secret"}, 400},
		{"route par paramètre (réécriture Vercel)", "/api/index?route=category", sameOrigin, 400},
		{"radio sans seed", "/api/radio", sameOrigin, 400},
	} {
		if rec := callAPI(t, cfg, tc.target, tc.header); rec.Code != tc.want {
			t.Errorf("%s : code %d, attendu %d (%s)", tc.name, rec.Code, tc.want, rec.Body.String())
		}
	}
}

func TestAPICacheServesSecondCallFromMemory(t *testing.T) {
	calls := 0
	routes["zz-test"] = route{ttl: time.Minute, fn: func(ctx context.Context, cfg Config, r *http.Request) (any, error) {
		calls++
		return map[string]int{"n": calls}, nil
	}}
	defer delete(routes, "zz-test")
	first := callAPI(t, Config{}, "/api/zz-test?a=1", nil)
	second := callAPI(t, Config{}, "/api/zz-test?a=1", nil)
	if calls != 1 || first.Header().Get("X-Cache") != "MISS" || second.Header().Get("X-Cache") != "HIT" || second.Body.String() != first.Body.String() {
		t.Fatalf("appels %d, caches %s/%s", calls, first.Header().Get("X-Cache"), second.Header().Get("X-Cache"))
	}
	if cc := first.Header().Get("Cache-Control"); cc != "public, max-age=60, s-maxage=60, stale-while-revalidate=60" {
		t.Fatalf("Cache-Control = %q", cc)
	}
}

func TestDownloadURLIsSignedForTheRelay(t *testing.T) {
	if downloadURL(Config{}, "https://a/b.m4a") != "" {
		t.Fatal("sans relais configuré, pas de lien")
	}
	got := downloadURL(Config{RelayURL: "https://relay.example", RelaySecret: "k"}, "https://a/b.m4a?x=1&y=2")
	u, err := url.Parse(got)
	if err != nil || u.Host != "relay.example" {
		t.Fatalf("lien = %q", got)
	}
	q := u.Query()
	mac := hmac.New(sha256.New, []byte("k"))
	mac.Write([]byte(q.Get("u") + "\n" + q.Get("e")))
	if q.Get("u") != "https://a/b.m4a?x=1&y=2" || q.Get("s") != hex.EncodeToString(mac.Sum(nil)) {
		t.Fatalf("paramètres = %v", q)
	}
}
