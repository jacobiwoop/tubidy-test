package provider

import (
	"context"
	"fmt"

	"online-resolve/kuwo"
)

// maxKuwoCandidates : chaque essai demande un lien à l'API, qui limite le débit.
const maxKuwoCandidates = 3

// Kuwo cherche sur kuwo, avec les mêmes contrôles que Waptrick.
type Kuwo struct{ client *kuwo.Client }

// NewKuwo prend un client, ou celui par défaut si nil.
func NewKuwo(client *kuwo.Client) *Kuwo {
	if client == nil {
		client = kuwo.New()
	}
	return &Kuwo{client: client}
}

func (p *Kuwo) Name() string { return "kuwo" }

func (p *Kuwo) Resolve(ctx context.Context, q Query) (Result, error) {
	songs, err := p.client.Search(ctx, searchTerm(q))
	if err != nil {
		return Result{}, err
	}
	tried, skippedDuration := 0, 0
	var lastErr error
	for _, s := range songs {
		if tried == maxKuwoCandidates {
			break
		}
		if !sameRecording(s.Title, s.Artist, q) {
			continue
		}
		if !durationMatches(q, s.DurationSec) { // la recherche Kuwo donne déjà la durée : évite de demander le lien
			skippedDuration++
			continue
		}
		tried++
		st, err := p.client.Stream(ctx, s)
		if err != nil {
			if ctx.Err() != nil {
				return Result{}, err
			}
			lastErr = err
			continue
		}
		if !durationMatches(q, st.DurationSec) {
			skippedDuration++
			continue
		}
		return Result{Provider: p.Name(), Title: s.Title, Artist: s.Artist, DurationSec: st.DurationSec, Format: st.Format, StreamURL: st.URL}, nil
	}
	if lastErr != nil {
		return Result{}, lastErr
	}
	if skippedDuration > 0 {
		return Result{}, fmt.Errorf("%w : %d titres écartés, aucun à %d s ± %d", ErrNotFound, skippedDuration, q.DurationSec, q.tolerance())
	}
	return Result{}, ErrNotFound
}
