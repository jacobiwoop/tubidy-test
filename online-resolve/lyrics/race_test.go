package lyrics

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

const duoTTML = `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:itunes="http://music.apple.com/lyric-ttml-internal" xml:lang="en">
<head><metadata><ttm:agent type="person" xml:id="v1"/><ttm:agent type="person" xml:id="v2"/>
<songwriters><songwriter>A</songwriter><songwriter>B</songwriter></songwriters></metadata></head>
<body><div itunes:songPart="Verse">
<p begin="1.000" end="3.000" ttm:agent="v1"><span begin="1.000" end="1.500">Hel</span><span begin="1.500" end="2.000">lo</span> <span begin="2.000" end="3.000">you</span><span ttm:role="x-bg"><span begin="2.500" end="3.500">(ooh)</span></span></p>
<p begin="4.000" end="5.000" ttm:agent="v2">Line only</p>
</div></body></tt>`

func TestParseTTMLWordsChorusAndDuo(t *testing.T) {
	lines, writers := parseTTML(duoTTML)
	if writers != "A, B" || len(lines) != 2 {
		t.Fatalf("auteurs %q, %d lignes", writers, len(lines))
	}
	l := lines[0]
	if !l.IsWordSynced || len(l.Text) != 3 || l.Text[0].Text != "Hel" || !l.Text[0].Part || l.Text[1].Text != "lo " || l.Text[1].Part {
		t.Fatalf("syllabes = %+v", l.Text)
	}
	if !l.Background || l.BackgroundText[0].Text != "(ooh)" || l.Endtime != 3500 || l.SongPart != "Verse" {
		t.Fatalf("chœur, fin ou partie = %+v", l)
	}
	if lines[1].IsWordSynced || !lines[1].OppositeTurn || lines[1].Text[0].Text != "Line only" || !lines[1].Text[0].LineSynced {
		t.Fatalf("ligne du second chanteur = %+v", lines[1])
	}
	r, _ := richResult("x", lines, false, writers)
	if !r.Word || !r.Synced || r.Lines[0].Text != "Hello you" || r.Lines[0].TimeMs != 1000 {
		t.Fatalf("résultat = %+v", r.Lines)
	}
}

func TestParseRealSpicyAndLyricsPlusPayloads(t *testing.T) {
	var spicy, kpoe map[string]any
	for name, out := range map[string]*map[string]any{"spicy-lastlast.json": &spicy, "kpoe-lastlast.json": &kpoe} {
		b, err := os.ReadFile("testdata/" + name)
		if err != nil {
			t.Fatal(err)
		}
		json.Unmarshal(b, out)
	}
	s, ok := parseSpicy(spicy)
	if !ok || !s.Word || s.Source != "Spicy Lyrics (Apple Music)" || s.Lines[0].Text != "E don cast, last last" || s.Rich[0].Text[1].Timestamp != 200 {
		t.Fatalf("Spicy = %+v", s)
	}
	k, ok := convertKPoe(kpoe)
	if !ok || !k.Word || k.Source != "qApple" || k.Lines[0].Text != "E don cast, last last" || k.Rich[0].Text[0].Endtime != 220 {
		t.Fatalf("LyricsPlus = %+v", k)
	}
}

func fakeSource(name string, after time.Duration, res ...Result) source {
	return source{name, func(ctx context.Context, q Query) ([]Result, error) {
		select {
		case <-time.After(after):
			return res, nil
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}}
}

func collect(t *testing.T, r *Race) []Result {
	var out []Result
	for i := 0; ; i++ {
		res, ok, err := r.Next(context.Background(), i)
		if err != nil {
			t.Fatal(err)
		}
		if !ok {
			return out
		}
		out = append(out, res)
	}
}

func TestRaceSendsHumanWordSyncAtOnce(t *testing.T) {
	firstAnswerAfter, raceLimit = 200*time.Millisecond, 2*time.Second
	line := Result{Synced: true, Lines: []Line{{1000, "a"}}, Source: "LRCLIB"}
	word := Result{Synced: true, Word: true, Lines: []Line{{1000, "a"}}, Source: "lrc.red"}
	c := New()
	c.srcs = []source{fakeSource("lent", time.Hour, line), fakeSource("ligne", 10*time.Millisecond, line), fakeSource("mot", 50*time.Millisecond, word)}
	start := time.Now()
	got := collect(t, NewRaces(c).Join(Query{Artist: "a", Title: "b"}))
	if len(got) != 1 || got[0].Source != "lrc.red" || time.Since(start) > 150*time.Millisecond {
		t.Fatalf("versions = %+v en %s", got, time.Since(start))
	}
}

func TestRaceSendsBestSoFarThenUpgrades(t *testing.T) {
	firstAnswerAfter, raceLimit = 100*time.Millisecond, 2*time.Second
	plain := Result{Lines: []Line{{0, "a"}}, Source: "Genius"}
	line := Result{Synced: true, Lines: []Line{{1000, "a"}}, Source: "LRCLIB"}
	model := Result{Synced: true, Word: true, ByModel: true, Lines: []Line{{1000, "a"}}, Source: "lrc.red"}
	word := Result{Synced: true, Word: true, Lines: []Line{{1000, "a"}}, Source: "Spicy Lyrics"}
	c := New()
	c.srcs = []source{
		fakeSource("genius", 10*time.Millisecond, plain), fakeSource("lrclib", 20*time.Millisecond, line),
		fakeSource("modèle", 150*time.Millisecond, model), fakeSource("spicy", 250*time.Millisecond, word),
	}
	races := NewRaces(c)
	got := collect(t, races.Join(Query{Artist: "a", Title: "b"}))
	if len(got) != 3 || got[0].Source != "LRCLIB" || got[1].Source != "lrc.red" || got[2].Source != "Spicy Lyrics" {
		t.Fatalf("versions = %+v", got)
	}
	again := races.Join(Query{Artist: "A", Title: "B"})
	if best, _ := again.Latest(); !again.Done() || best.Source != "Spicy Lyrics" {
		t.Fatalf("la même demande doit retrouver la course finie, pas en relancer une")
	}
}

func TestSameSongRejectsAnotherArtist(t *testing.T) {
	q := Query{Artist: "Vano Baby, Bobo Wê", Title: "BANDIT"}
	if sameSong("Pailita", "Bendito (Soundtrack Baby Bandito: La Serie)", q) {
		t.Fatal("un autre artiste a été accepté")
	}
	if !sameSong("Burna Boy", "Last Last", Query{Artist: "Burna Boy", Title: "Last Last (Remix)"}) {
		t.Fatal("le bon morceau a été refusé")
	}
}

func TestGeniusDecodesHTMLEntities(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"title":"Location","artist":"Dave &amp; Burna Boy","lyrics":"[Intro]\nThen I&#x27;ll be right there\nI don&#x27;t need a Carti"}`))
	}))
	defer srv.Close()
	old := geniusWorkerURL
	geniusWorkerURL = srv.URL + "/"
	defer func() { geniusWorkerURL = old }()

	res, err := New().genius(context.Background(), Query{Artist: "Dave", Title: "Location"})
	if err != nil || len(res) != 1 {
		t.Fatalf("genius = %v, %v", res, err)
	}
	if got := res[0].Lines[0].Text; got != "Then I'll be right there" {
		t.Fatalf("première ligne = %q", got)
	}
}
