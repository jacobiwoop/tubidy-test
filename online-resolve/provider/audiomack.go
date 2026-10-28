package provider

import (
	"context"
	"errors"
	"fmt"

	"online-resolve/audiomack"
)

// maxAudiomackCandidates borne les appels music/play quand les premiers titres sont refusés.
const maxAudiomackCandidates = 3

type Audiomack struct {
	client *audiomack.Client
}

func NewAudiomack(client *audiomack.Client) *Audiomack {
	if client == nil {
		client = audiomack.New()
	}
	return &Audiomack{client: client}
}

func (a *Audiomack) Name() string { return "audiomack" }

// Resolve prend le premier résultat de la recherche et ne passe au suivant
// que si son lien audio ne peut pas être obtenu.
func (a *Audiomack) Resolve(ctx context.Context, q Query) (Result, error) {
	songs, err := a.client.SearchSongs(ctx, q.Text, audiomack.SearchOptions{Limit: 10})
	if err != nil {
		return Result{}, err
	}
	tried, skippedDuration := 0, 0
	var lastErr error
	for _, t := range songs {
		// La recherche annonce déjà ces refus : inutile de demander un lien qui renverra 403.
		if t.GeoRestricted || t.PremiumOnly == "yes" {
			continue
		}
		// Autre version (karaoké, remix…) ou autre artiste (reprise) : pas l'enregistrement demandé.
		if IsAlteredVersion(t.Title+" "+t.Artist, q.Text) || !ArtistMatches(t.Artist, q.Text) {
			continue
		}
		// Durée trop éloignée de Spotify : autre enregistrement (reprise, version live…).
		if !durationMatches(q, t.DurationSeconds()) {
			skippedDuration++
			continue
		}
		if tried == maxAudiomackCandidates {
			break
		}
		tried++
		s, err := a.client.StreamURL(ctx, t.ID, true)
		if err != nil {
			// 1005 « Not authorized » : droits du pays du serveur ou abonnement, on passe au suivant.
			var apiErr *audiomack.APIError
			if errors.As(err, &apiErr) && (apiErr.Status == 403 || apiErr.Status == 404) {
				lastErr = err
				continue
			}
			return Result{}, err
		}
		return Result{
			Provider:    a.Name(),
			Title:       t.Title,
			Artist:      t.Artist,
			DurationSec: t.DurationSeconds(),
			Format:      "m4a",
			StreamURL:   s.URL,
			ExpiresAt:   s.ExpiresAt,
			Page:        t.PageURL(),
		}, nil
	}
	if lastErr != nil {
		return Result{}, lastErr
	}
	if skippedDuration > 0 {
		return Result{}, fmt.Errorf("%w : %d titres écartés, aucun à %d s ± %d", ErrNotFound, skippedDuration, q.DurationSec, DurationToleranceSec)
	}
	return Result{}, ErrNotFound
}
