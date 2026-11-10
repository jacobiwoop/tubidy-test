package netease

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSearchRetriesOnceWhenTheListIsEmpty(t *testing.T) {
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls == 1 {
			w.Write([]byte(`[]`)) // ce que l'API rend quand on l'appelle trop vite
			return
		}
		w.Write([]byte(`[{"name":"Fils de joie","artist":"Stromae","url":"http://x/1"}]`))
	}))
	defer srv.Close()
	songs, err := (&Client{Base: srv.URL + "/"}).Search(context.Background(), "Stromae Fils de joie")
	if err != nil || len(songs) != 1 || songs[0].Title != "Fils de joie" || calls != 2 {
		t.Fatalf("%+v, %v, %d appels", songs, err, calls)
	}
}
