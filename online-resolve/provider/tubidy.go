package provider

import (
	"context"
	"errors"
	"fmt"

	"online-resolve/tubidy"
)

type Tubidy struct {
	client *tubidy.Client
}

func NewTubidy(client *tubidy.Client) *Tubidy {
	if client == nil {
		client = tubidy.New()
	}
	return &Tubidy{client: client}
}

func (t *Tubidy) Name() string { return "tubidy" }

func (t *Tubidy) Resolve(ctx context.Context, q Query) (Result, error) {
	words := TitleWords(q)
	tr, err := t.client.Resolve(ctx, q.Text, tubidy.ResolveOptions{
		DurationSec:  q.DurationSec,
		ToleranceSec: DurationToleranceSec,
		// Autre version, ou autre chanson à la même durée (mots du titre absents).
		Reject: func(title string) bool {
			return IsAlteredVersion(title, q.Text) || !HasTitleWords(title, words)
		},
		Prefer:     func(title string) bool { return MentionsFeatured(title, q) },
		PreferOnly: q.StrictFeatured,
	})
	if errors.Is(err, tubidy.ErrNoResult) {
		return Result{}, ErrNotFound
	}
	if errors.Is(err, tubidy.ErrNoDurationMatch) {
		return Result{}, fmt.Errorf("%w : %v", ErrNotFound, err)
	}
	if err != nil {
		return Result{}, err
	}
	return Result{
		Provider:    t.Name(),
		Title:       tr.Title,
		DurationSec: tr.DurationSec,
		Format:      "mp3",
		StreamURL:   tr.StreamURL,
		Page:        tr.Page,
	}, nil
}
