package provider

import (
	"context"
	"fmt"

	"online-resolve/netease"
)

// maxNetEaseCandidates : chaque essai demande un lien à l'API, qui limite le débit.
const maxNetEaseCandidates = 3

// NetEase cherche sur netease, avec les mêmes contrôles que Waptrick.
type NetEase struct{ client *netease.Client }

// NewNetEase prend un client, ou celui par défaut si nil.
func NewNetEase(client *netease.Client) *NetEase {
	if client == nil {
		client = netease.New()
	}
	return &NetEase{client: client}
}

func (p *NetEase) Name() string { return "netease" }

func (p *NetEase) Resolve(ctx context.Context, q Query) (Result, error) {
	songs, err := p.client.Search(ctx, searchTerm(q))
	if err != nil {
		return Result{}, err
	}
	tried, skippedDuration := 0, 0
	var lastErr error
	for _, s := range songs {
		if tried == maxNetEaseCandidates {
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
