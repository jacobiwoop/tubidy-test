package qq

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestQQReportsPaidSongsWithoutLink(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("mid") == "paye" {
			w.Write([]byte(`{"song_play_time":195,"song_play_url":"","song_play_url_hq":""}`))
			return
		}
		w.Write([]byte(`{"song_play_time":217,"song_play_url_hq":"http://x/hq.m4a","song_play_url_standard":"http://x/std.m4a"}`))
	}))
	defer srv.Close()
	q := &Client{Base: srv.URL}
	if _, err := q.Stream(context.Background(), Song{ID: "paye"}); err == nil {
		t.Fatal("titre payant accepté")
	}
	st, err := q.Stream(context.Background(), Song{ID: "libre"})
	if err != nil || st.URL != "http://x/hq.m4a" || st.DurationSec != 217 {
		t.Fatalf("%+v, %v", st, err)
	}
}
