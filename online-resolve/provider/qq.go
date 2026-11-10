package provider

import (
	"context"
	"fmt"

	"online-resolve/qq"
)

// maxQQCandidates : chaque essai demande un lien à l'API, qui limite le débit.
const maxQQCandidates = 3

// QQ cherche sur qq, avec les mêmes contrôles que Waptrick.
type QQ struct{ client *qq.Client }

// NewQQ prend un client, ou celui par défaut si nil.
func NewQQ(client *qq.Client) *QQ {
	if client == nil {
		client = qq.New()
	}
	return &QQ{client: client}
}

func (p *QQ) Name() string { return "qq" }

func (p *QQ) Resolve(ctx context.Context, q Query) (Result, error) {
	songs, err := p.client.Search(ctx, searchTerm(q))
	if err != nil {
		return Result{}, err
	}
	tried, skippedDuration := 0, 0
	var lastErr error
	for _, s := range songs {
		if tried == maxQQCandidates {
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
