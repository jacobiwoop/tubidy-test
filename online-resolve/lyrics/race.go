package lyrics

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"
)

// La course : toutes les sources sont interrogées en même temps. Une version mot par mot écrite par une
// personne arrête tout et part aussitôt ; sinon, au bout de firstAnswerAfter, on envoie la meilleure reçue,
// puis chaque version meilleure qui arrive ensuite, jusqu'à ce que toutes les sources aient répondu (ou
// raceLimit). Le résultat reste en mémoire : la même demande le reçoit directement, et deux demandes
// identiques en même temps partagent la même course.

// Délais de la course (variables pour les tests).
var (
	firstAnswerAfter = 3 * time.Second
	raceLimit        = 15 * time.Second
)

const (
	raceKeep      = 24 * time.Hour
	raceKeepEmpty = 10 * time.Minute // « rien trouvé » est retenté plus tôt
	maxRaces      = 2000
)

type Races struct {
	c  *Client
	mu sync.Mutex
	m  map[string]*Race
}

func NewRaces(c *Client) *Races { return &Races{c: c, m: map[string]*Race{}} }

// Race : les versions envoyées, de la première à la meilleure.
type Race struct {
	mu      sync.Mutex
	updates []Result
	done    bool
	ended   time.Time
	wake    chan struct{} // fermé à chaque nouvelle version ou à la fin
}

func raceKey(q Query) string {
	return strings.ToLower(strings.Join([]string{q.Artist, q.Title, q.Album, fmt.Sprint(q.DurationSec), q.ISRC, q.SpotifyID}, "|"))
}

// Join rejoint la course de ce titre, ou en lance une.
func (rs *Races) Join(q Query) *Race {
	key := raceKey(q)
	rs.mu.Lock()
	defer rs.mu.Unlock()
	if r, ok := rs.m[key]; ok && !r.expired() {
		return r
	}
	if len(rs.m) >= maxRaces {
		for k, r := range rs.m {
			if r.expired() || r.Done() {
				delete(rs.m, k)
			}
		}
	}
	r := &Race{wake: make(chan struct{})}
	rs.m[key] = r
	go rs.c.run(q, r)
	return r
}

func (r *Race) expired() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.done {
		return false
	}
	keep := raceKeep
	if len(r.updates) == 0 {
		keep = raceKeepEmpty
	}
	return time.Since(r.ended) > keep
}

// Done : toutes les sources ont répondu (ou la limite est passée) ; la dernière version est la meilleure.
func (r *Race) Done() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.done
}

// Next attend la version numéro i ; ok vaut false quand la course est finie sans autre version.
func (r *Race) Next(ctx context.Context, i int) (res Result, ok bool, err error) {
	for {
		r.mu.Lock()
		if i < len(r.updates) {
			res = r.updates[i]
			r.mu.Unlock()
			return res, true, nil
		}
		if r.done {
			r.mu.Unlock()
			return Result{}, false, nil
		}
		wake := r.wake
		r.mu.Unlock()
		select {
		case <-ctx.Done():
			return Result{}, false, ctx.Err()
		case <-wake:
		}
	}
}

// Latest rend la meilleure version envoyée jusqu'ici.
func (r *Race) Latest() (Result, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.updates) == 0 {
		return Result{}, false
	}
	return r.updates[len(r.updates)-1], true
}

func (r *Race) publish(res Result, final bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if res.Source != "" {
		r.updates = append(r.updates, res)
	}
	if final {
		r.done, r.ended = true, time.Now()
	}
	close(r.wake)
	r.wake = make(chan struct{})
}

func (c *Client) run(q Query, r *Race) {
	ctx, cancel := context.WithTimeout(context.Background(), raceLimit)
	defer cancel()
	q.Artist, q.Title, q.Album = strings.TrimSpace(q.Artist), strings.TrimSpace(q.Title), strings.TrimSpace(q.Album)
	name := q.Artist + " – " + q.Title
	start := time.Now()

	type answer struct {
		source  string
		results []Result
		err     error
		ms      int64
	}
	srcs := c.srcs
	if srcs == nil {
		srcs = c.sources()
	}
	answers := make(chan answer, len(srcs))
	for _, s := range srcs {
		go func() {
			t := time.Now()
			res, err := s.fetch(ctx, q)
			answers <- answer{s.name, res, err, time.Since(t).Milliseconds()}
		}()
	}

	var best, sent *Result
	send := func(final bool) {
		if best != nil && (sent == nil || Better(*best, *sent, q.DurationSec)) {
			v := *best
			sent = &v
			log.Printf("paroles « %s » : envoi %s (%s) après %d ms", name, v.Source, describe(v), time.Since(start).Milliseconds())
			r.publish(v, final)
			return
		}
		if final {
			r.publish(Result{}, true)
		}
	}
	first := time.NewTimer(firstAnswerAfter)
	defer first.Stop()
	waiting := true
	for pending := len(srcs); pending > 0; {
		select {
		case a := <-answers:
			pending--
			switch {
			case a.err != nil:
				log.Printf("paroles « %s » : %s en erreur après %d ms : %v", name, a.source, a.ms, a.err)
			case len(a.results) == 0:
				log.Printf("paroles « %s » : %s n'a rien (%d ms)", name, a.source, a.ms)
			}
			for _, res := range a.results {
				log.Printf("paroles « %s » : %s → %s, %s (%d ms)", name, a.source, res.Source, describe(res), a.ms)
				if best == nil || Better(res, *best, q.DurationSec) {
					v := res
					best = &v
				}
			}
			if best != nil && best.Word && !best.ByModel {
				send(true) // rien ne fera mieux
				return
			}
			if !waiting {
				send(false)
			}
		case <-first.C:
			waiting = false
			send(false)
		case <-ctx.Done():
			log.Printf("paroles « %s » : limite de %s atteinte, %d source(s) sans réponse", name, raceLimit, pending)
			pending = 0
		}
	}
	send(true)
}

func describe(r Result) string {
	kind := "texte seul"
	switch {
	case r.Word && r.ByModel:
		kind = "mot par mot (modèle)"
	case r.Word:
		kind = "mot par mot"
	case r.Synced:
		kind = "ligne par ligne"
	}
	return fmt.Sprintf("%s, %d lignes", kind, len(r.Lines))
}
