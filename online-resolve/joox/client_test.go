package joox

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestJOOXParsesLinksAndHidesTheTokenInErrors(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("n") != "" {
			w.Write([]byte(`{"code":200,"data":{"播放链接":{"MP3 128":"http://x/128.mp3","MP3 320":"http://x/320.mp3"}}}`))
			return
		}
		w.Write([]byte(`{"code":200,"data":{"songs":[{"songmid":"m1","歌曲名称":"Eloko Oyo","歌手":"Fally Ipupa"}]}}`))
	}))
	j := &Client{Base: srv.URL, Token: "secret-jeton"}
	songs, err := j.Search(context.Background(), "Eloko Oyo")
	if err != nil || len(songs) != 1 || songs[0].Artist != "Fally Ipupa" {
		t.Fatalf("%+v, %v", songs, err)
	}
	st, err := j.Stream(context.Background(), songs[0])
	if err != nil || st.URL != "http://x/320.mp3" {
		t.Fatalf("%+v, %v", st, err)
	}
	srv.Close()
	_, err = j.Stream(context.Background(), songs[0])
	if err == nil || strings.Contains(err.Error(), "secret-jeton") {
		t.Fatalf("erreur = %v", err)
	}
}
