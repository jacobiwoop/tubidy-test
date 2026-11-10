package provider

import (
	"context"
	"errors"
	"fmt"

	"online-resolve/waptrick"
)

// maxWaptrickCandidates : chaque essai coûte trois requêtes (page, redirection, début du fichier).
const maxWaptrickCandidates = 3

type Waptrick struct {
	client *waptrick.Client
}

func NewWaptrick(client *waptrick.Client) *Waptrick {
	if client == nil {
		client = waptrick.New()
	}
	return &Waptrick{client: client}
}

func (w *Waptrick) Name() string { return "waptrick" }

// LastResort : ses fichiers ne passent que par le relais Vercel, qui consomme le quota de tout le site.
func (w *Waptrick) LastResort() {}

// Resolve garde les résultats du bon artiste et du bon titre, puis vérifie la durée dans le fichier.
func (w *Waptrick) Resolve(ctx context.Context, q Query) (Result, error) {
	songs, err := w.client.Search(ctx, searchTerm(q))
	if err != nil {
		return Result{}, err
	}
	tried, skippedDuration := 0, 0
	var lastErr error
	for _, s := range songs {
		if tried == maxWaptrickCandidates {
			break
		}
		if !sameRecording(s.Title, s.Artist, q) {
			continue
		}
		tried++
		link, err := w.client.StreamURL(ctx, s)
		if err != nil {
			if ctx.Err() != nil {
				return Result{}, err
			}
			lastErr = err
			continue
		}
		sec, err := w.client.Probe(ctx, link)
		if err != nil {
			if ctx.Err() != nil {
				return Result{}, err
			}
			lastErr = err
			continue
		}
		if !durationMatches(q, sec) {
			skippedDuration++
			continue
		}
		return Result{
			Provider:    w.Name(),
			Title:       s.Title,
			Artist:      s.Artist,
			DurationSec: sec,
			Format:      "mp3",
			StreamURL:   link,
			Page:        s.Page,
		}, nil
	}
	if lastErr != nil && !errors.Is(lastErr, waptrick.ErrNoFile) {
		return Result{}, lastErr
	}
	if skippedDuration > 0 {
		return Result{}, fmt.Errorf("%w : %d titres écartés, aucun à %d s ± %d", ErrNotFound, skippedDuration, q.DurationSec, q.tolerance())
	}
	return Result{}, ErrNotFound
}
