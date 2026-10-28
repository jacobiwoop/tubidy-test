// Package provider définit une interface commune aux sources audio et les interroge en parallèle.
package provider

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Query est la demande du client : le texte construit comme l'app ("<artistes> <titre>", noms Spotify)
// et la durée Spotify, qui sert à reconnaître le bon enregistrement.
type Query struct {
	Text        string
	DurationSec int // 0 : durée inconnue, aucune vérification
	// Artists sont les artistes Spotify, principal en premier (facultatif). Les invités servent à
	// distinguer « Alors on danse (feat. Erik Hassle) » de l'original, qui a la même durée.
	Artists []string
	// StrictFeatured : avec un invité, ne pas se rabattre sur une version qui ne le cite pas (l'app a
	// yt-dlp en secours ; le site, lui, préfère jouer l'original que rien).
	StrictFeatured bool
}

// MentionsFeatured est vrai si title cite chaque artiste invité (tous sauf le premier) de q.
// Sans invité, rien n'est à vérifier : faux, pour ne rien réordonner.
func MentionsFeatured(title string, q Query) bool {
	if len(q.Artists) < 2 {
		return false
	}
	for _, a := range q.Artists[1:] {
		if !ArtistMatches(a, title) {
			return false
		}
	}
	return true
}

// TitleWords rend les mots du titre demandé, sans parenthèses ni suffixe « - … » (« BURN (feat. Ava Max) »
// → [burn]). Le titre s'isole de Text quand Artists est connu (Text vaut "<artistes> <titre>") ; sinon nil.
func TitleWords(q Query) []string {
	if len(q.Artists) == 0 {
		return nil
	}
	prefix := strings.Join(q.Artists, ", ")
	if !strings.HasPrefix(q.Text, prefix) {
		return nil
	}
	title := strings.TrimSpace(strings.TrimPrefix(q.Text, prefix))
	title = parenRE.ReplaceAllString(title, "")
	title = dashRE.Split(title, 2)[0]
	return strings.Fields(normalize(title))
}

var (
	parenRE = regexp.MustCompile(`[(\[].*?[)\]]`)
	dashRE  = regexp.MustCompile(`\s+[-–—]\s+`)
)

// HasTitleWords est vrai si title contient tous les mots (sans liste, rien n'est vérifiable : vrai).
func HasTitleWords(title string, words []string) bool {
	t := " " + normalize(title) + " "
	for _, w := range words {
		if !strings.Contains(t, " "+w+" ") {
			return false
		}
	}
	return true
}

// SplitArtists découpe la liste d'artistes envoyée par l'app ("Stromae, Erik Hassle").
func SplitArtists(s string) []string {
	var out []string
	for _, a := range strings.Split(s, ",") {
		if a = strings.TrimSpace(a); a != "" {
			out = append(out, a)
		}
	}
	return out
}

// DurationToleranceSec est l'écart accepté entre la durée Spotify et celle d'un résultat.
// Mesuré le 09/10/2026 : même enregistrement à 0-4 s, reprises et autres versions à 8 s et plus.
const DurationToleranceSec = 5

// durationMatches est vrai si la durée est inconnue d'un côté ou dans la tolérance.
func durationMatches(q Query, sec int) bool {
	if q.DurationSec <= 0 || sec <= 0 {
		return true
	}
	d := sec - q.DurationSec
	return d >= -DurationToleranceSec && d <= DurationToleranceSec
}

// alteredMarkers repèrent les versions qui ne sont pas l'enregistrement original : souvent à la même
// durée que lui (un karaoké est calé dessus), la vérification de durée ne les distingue pas.
var alteredMarkers = []string{
	"432hz", "432 hz", "528hz", "528 hz", "slowed", "sped up", "speed up", "nightcore", "8d audio", "reverb",
	"remix", "karaoke", "instrumental", "cover", "acoustic", "originally performed", "bootleg", "mashup",
}

// ArtistMatches est vrai si au moins un mot significatif de artist figure dans la requête
// (qui contient les artistes Spotify). Un artiste vide n'est pas vérifiable : accepté.
func ArtistMatches(artist, query string) bool {
	words := strings.Fields(normalize(artist))
	if len(words) == 0 {
		return true
	}
	q := " " + normalize(query) + " "
	for _, w := range words {
		if len([]rune(w)) >= 3 && strings.Contains(q, " "+w+" ") {
			return true
		}
	}
	return false
}

// normalize met en minuscules, retire les accents courants et remplace la ponctuation par des espaces.
func normalize(s string) string {
	s = strings.ToLower(s)
	s = strings.NewReplacer("é", "e", "è", "e", "ê", "e", "ë", "e", "à", "a", "â", "a", "ä", "a",
		"î", "i", "ï", "i", "ô", "o", "ö", "o", "ù", "u", "û", "u", "ü", "u", "ç", "c", "ñ", "n").Replace(s)
	return strings.Join(strings.FieldsFunc(s, func(r rune) bool {
		return !(r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r > 127)
	}), " ")
}

// IsAlteredVersion est vrai si title désigne une version retouchée que la requête ne demande pas.
func IsAlteredVersion(title, query string) bool {
	t, q := strings.ToLower(title), strings.ToLower(query)
	for _, m := range alteredMarkers {
		if strings.Contains(t, m) && !strings.Contains(q, m) {
			return true
		}
	}
	return false
}

// Result est un titre résolu en lien audio lisible directement (balise <audio>, ExoPlayer…).
type Result struct {
	Provider    string    `json:"provider"`
	Title       string    `json:"title"`
	Artist      string    `json:"artist,omitempty"`
	DurationSec int       `json:"durationSec,omitempty"`
	Format      string    `json:"format"`
	StreamURL   string    `json:"streamUrl"`
	ExpiresAt   time.Time `json:"expiresAt,omitzero"`
	Page        string    `json:"page,omitempty"`
}

// Provider est une source audio. Resolve doit respecter l'annulation du contexte.
type Provider interface {
	Name() string
	Resolve(ctx context.Context, q Query) (Result, error)
}

// ErrNotFound signale qu'une source n'a aucun titre exploitable pour la requête.
var ErrNotFound = errors.New("aucun titre exploitable")

// Outcome est la réponse d'une source : un résultat ou une erreur, avec la durée.
type Outcome struct {
	Provider string        `json:"provider"`
	Result   *Result       `json:"result,omitempty"`
	Error    string        `json:"error,omitempty"`
	Elapsed  time.Duration `json:"-"`
	Ms       int64         `json:"ms"`
}

// Race interroge toutes les sources en parallèle : la première qui fournit un lien gagne
// et les autres sont annulées. Les issues des sources déjà terminées sont rendues avec.
// Si toutes échouent, ok vaut false et outcomes contient chaque erreur.
func Race(ctx context.Context, q Query, providers ...Provider) (winner Outcome, outcomes []Outcome, ok bool) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	done := make(chan Outcome, len(providers)) // tamponné : les perdants ne bloquent jamais
	for _, p := range providers {
		go func(p Provider) {
			start := time.Now()
			res, err := p.Resolve(ctx, q)
			o := Outcome{Provider: p.Name(), Elapsed: time.Since(start)}
			o.Ms = o.Elapsed.Milliseconds()
			if err != nil {
				o.Error = err.Error()
			} else {
				o.Result = &res
			}
			done <- o
		}(p)
	}
	for range providers {
		o := <-done
		outcomes = append(outcomes, o)
		if o.Result != nil {
			return o, outcomes, true
		}
	}
	return Outcome{}, outcomes, false
}

// ResolveAll interroge toutes les sources en parallèle et attend chacune (ou l'échéance du contexte).
// Sert à comparer les sources ; pour répondre au client, Race est plus rapide.
// Les réponses sont rendues dans l'ordre des sources passées, qui sert d'ordre de préférence.
func ResolveAll(ctx context.Context, q Query, providers ...Provider) []Outcome {
	out := make([]Outcome, len(providers))
	var wg sync.WaitGroup
	for i, p := range providers {
		wg.Add(1)
		go func(i int, p Provider) {
			defer wg.Done()
			start := time.Now()
			res, err := p.Resolve(ctx, q)
			o := Outcome{Provider: p.Name(), Elapsed: time.Since(start)}
			o.Ms = o.Elapsed.Milliseconds()
			if err != nil {
				o.Error = err.Error()
			} else {
				o.Result = &res
			}
			out[i] = o
		}(i, p)
	}
	wg.Wait()
	return out
}

// Best rend le premier résultat réussi dans l'ordre de préférence des sources.
func Best(outcomes []Outcome) (Result, bool) {
	for _, o := range outcomes {
		if o.Result != nil {
			return *o.Result, true
		}
	}
	return Result{}, false
}
