package lyrics

import (
	"strings"
)

// Paroles mot par mot, au format du composant <am-lyrics> du site (son type LyricsLine), pour qu'il les
// affiche tel quel. Les temps sont en millisecondes.

type Syllable struct {
	Text       string `json:"text"`
	Part       bool   `json:"part"` // morceau d'un mot : pas d'espace avec la syllabe suivante
	Timestamp  int64  `json:"timestamp"`
	Endtime    int64  `json:"endtime"`
	LineSynced bool   `json:"lineSynced,omitempty"`
}

type RichLine struct {
	Text           []Syllable `json:"text"`
	Background     bool       `json:"background"`
	BackgroundText []Syllable `json:"backgroundText"` // chœurs
	OppositeTurn   bool       `json:"oppositeTurn"`   // duo : ligne alignée à droite
	Timestamp      int64      `json:"timestamp"`
	Endtime        int64      `json:"endtime"`
	IsWordSynced   bool       `json:"isWordSynced"`
	Alignment      string     `json:"alignment,omitempty"`
	SongPart       string     `json:"songPart,omitempty"`
	Translation    string     `json:"translation,omitempty"`
	AgentID        string     `json:"agentId,omitempty"`
	Direction      string     `json:"direction,omitempty"`
}

// richResult remplit un Result à partir de lignes mot par mot : Lines (ligne par ligne) reste toujours
// rempli pour les clients qui ne lisent que lui.
func richResult(source string, rich []RichLine, byModel bool, songwriters string) (Result, bool) {
	var lines []Line
	synced := false
	for _, l := range rich {
		var b strings.Builder
		for _, s := range l.Text {
			b.WriteString(s.Text)
		}
		text := strings.Join(strings.Fields(b.String()), " ")
		if text == "" {
			continue
		}
		if l.Timestamp > 0 || l.Endtime > 0 {
			synced = true
		}
		lines = append(lines, Line{TimeMs: l.Timestamp, Text: text})
	}
	if len(lines) == 0 {
		return Result{}, false
	}
	return Result{
		Synced: synced, Lines: lines, Source: source,
		Word: hasWordSynced(rich), ByModel: byModel, Rich: rich, Songwriters: songwriters,
	}, true
}

// plainResult : des paroles sans minutage, une ligne par ligne de texte non vide.
func plainResult(source, text string, skip func(string) bool) (Result, bool) {
	var lines []Line
	for _, l := range strings.Split(strings.ReplaceAll(text, "\r", ""), "\n") {
		if l = strings.TrimSpace(l); l != "" && (skip == nil || !skip(l)) {
			lines = append(lines, Line{Text: l})
		}
	}
	return Result{Lines: lines, Source: source}, len(lines) > 0
}

// hasWordSynced : au moins une ligne minutée mot par mot (même règle que hasWordSyncedLyrics du composant).
func hasWordSynced(rich []RichLine) bool {
	for _, l := range rich {
		timed := false
		for _, s := range l.Text {
			if strings.TrimSpace(s.Text) != "" && (s.Timestamp > 0 || s.Endtime > 0) {
				timed = true
				break
			}
		}
		if timed && l.IsWordSynced {
			return true
		}
	}
	return false
}

// tier : 0 mot par mot, 1 ligne par ligne, 2 texte seul.
func (r Result) tier() int {
	switch {
	case r.Word:
		return 0
	case r.Synced:
		return 1
	default:
		return 2
	}
}

// sourceRank reprend l'ordre de préférence du composant (getRankForCollected) ; NetEase rejoint LRCLIB.
func sourceRank(source string) float64 {
	s := strings.ToLower(strings.TrimSpace(source))
	switch {
	case s == "lrc.red":
		return 0
	case strings.HasPrefix(s, "spicy lyrics"):
		return 2.5
	case strings.Contains(s, "apple"):
		return 1
	case strings.Contains(s, "bini"):
		return 2
	case strings.Contains(s, "unison"):
		return 3
	case strings.Contains(s, "qq"), strings.Contains(s, "lyricsplus"):
		return 4
	case strings.Contains(s, "musixmatch"):
		return 5
	case strings.Contains(s, "lrclib"), strings.Contains(s, "netease"):
		return 6
	case strings.Contains(s, "genius"):
		return 8
	}
	return 7
}

// Better dit si a est meilleur que b : mot par mot avant ligne par ligne avant texte seul, écrit par une
// personne avant généré par un modèle, puis (hors mot par mot) le moins de trous et le plus de lignes, puis
// la source préférée.
func Better(a, b Result, durationSec int) bool {
	if a.tier() != b.tier() {
		return a.tier() < b.tier()
	}
	if a.ByModel != b.ByModel {
		return !a.ByModel
	}
	if a.tier() > 0 {
		va, vb := measure(a, 0, durationSec), measure(b, 0, durationSec)
		if va.holesMs != vb.holesMs {
			return va.holesMs < vb.holesMs
		}
		if va.lines != vb.lines {
			return va.lines > vb.lines
		}
	}
	return sourceRank(a.Source) < sourceRank(b.Source)
}
