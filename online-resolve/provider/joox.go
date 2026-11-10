package provider

import (
	"context"
	"fmt"

	"online-resolve/joox"
)

// maxJOOXCandidates : chaque essai demande un lien à l'API, qui limite le débit.
const maxJOOXCandidates = 3

// JOOX cherche sur joox, avec les mêmes contrôles que Waptrick.
type JOOX struct{ client *joox.Client }

// NewJOOX prend le jeton personnel JOOX_TOKEN.
func NewJOOX(token string) *JOOX { return &JOOX{client: joox.New(token)} }

func (p *JOOX) Name() string { return "joox" }

func (p *JOOX) Resolve(ctx context.Context, q Query) (Result, error) {
	songs, err := p.client.Search(ctx, searchTerm(q))
	if err != nil {
		return Result{}, err
	}
	tried, skippedDuration := 0, 0
	var lastErr error
	for _, s := range songs {
		if tried == maxJOOXCandidates {
			break
		}
		if !sameRecording(s.Title, s.Artist, q) {
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
