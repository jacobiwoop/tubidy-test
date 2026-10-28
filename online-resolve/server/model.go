package server

import (
	"strconv"
	"strings"

	"online-resolve/audiomack"
	"online-resolve/provider"
	"online-resolve/spotify"
)

// Modèle commun renvoyé au site, quelle que soit la source.
// Les références (Ref) désignent la page à ouvrir : "sp:<id>" pour Spotify, "am:<…>" pour Audiomack,
// "name:<nom>" pour un artiste connu seulement par son nom.

// Track est un titre jouable. Le site le résout via /api/resolve (am=AmID si présent, sinon q+duration).
type Track struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Artist      string `json:"artist"`
	ArtistRef   string `json:"artistRef,omitempty"`
	Album       string `json:"album,omitempty"`
	AlbumRef    string `json:"albumRef,omitempty"`
	DurationSec int    `json:"duration,omitempty"`
	Image       string `json:"image,omitempty"`
	Explicit    bool   `json:"explicit,omitempty"`
	Plays       int64  `json:"plays,omitempty"`
	AmID        int64  `json:"amId,omitempty"`
	Blocked     bool   `json:"blocked,omitempty"` // Audiomack ne le jouera pas ici : Tubidy prendra le relais
	Rank        int    `json:"rank,omitempty"`
	Change      string `json:"change,omitempty"` // évolution du jour dans un classement : "+1", "-2", "0"
}

// Card est une vignette : album, playlist, artiste ou catégorie.
type Card struct {
	Kind      string `json:"kind"`
	Ref       string `json:"ref"`
	Title     string `json:"title"`
	Subtitle  string `json:"subtitle,omitempty"`
	Image     string `json:"image,omitempty"`
	Explicit  bool   `json:"explicit,omitempty"`
	Plays     int64  `json:"plays,omitempty"`
	Followers int64  `json:"followers,omitempty"`
	Count     int    `json:"count,omitempty"`
	Rank      int    `json:"rank,omitempty"`
	Change    string `json:"change,omitempty"`
	Verified  bool   `json:"verified,omitempty"`
}

// Collection est un album ou une playlist ouverts.
type Collection struct {
	Kind        string  `json:"kind"`
	Ref         string  `json:"ref"`
	Title       string  `json:"title"`
	Subtitle    string  `json:"subtitle,omitempty"`
	SubtitleRef string  `json:"subtitleRef,omitempty"`
	Image       string  `json:"image,omitempty"`
	Description string  `json:"description,omitempty"`
	Date        string  `json:"date,omitempty"`
	Label       string  `json:"label,omitempty"`
	Copyright   string  `json:"copyright,omitempty"`
	Color       string  `json:"color,omitempty"`
	Plays       int64   `json:"plays,omitempty"`
	Followers   int64   `json:"followers,omitempty"`
	TotalTracks int     `json:"totalTracks"`
	Tracks      []Track `json:"tracks"`
}

// ArtistView est une page artiste.
type ArtistView struct {
	Ref              string         `json:"ref"`
	Name             string         `json:"name"`
	Image            string         `json:"image,omitempty"`
	Banner           string         `json:"banner,omitempty"`
	Followers        int64          `json:"followers,omitempty"`
	MonthlyListeners int64          `json:"monthlyListeners,omitempty"`
	Bio              string         `json:"bio,omitempty"`
	TopCities        []spotify.City `json:"topCities,omitempty"`
	TopTracks        []Track        `json:"topTracks"`
	Albums           []Card         `json:"albums"`
	Singles          []Card         `json:"singles"`
	Related          []Card         `json:"related"`
	Links            []spotify.Link `json:"links,omitempty"`
}

// amImage demande une version réduite au CDN d'Audiomack (les originaux font 1600 px).
func amImage(u string, width int) string {
	if u == "" || !strings.Contains(u, "i.audiomack.com") || strings.Contains(u, "?") {
		return u
	}
	return u + "?width=" + strconv.Itoa(width)
}

func amAlbumRef(it audiomack.Item) string {
	if it.Uploader.URLSlug == "" || it.URLSlug == "" {
		return ""
	}
	return "am:" + it.Uploader.URLSlug + "/" + it.URLSlug
}

func fromAMSong(it audiomack.Item) Track {
	id := it.ID.Int64()
	if id == 0 {
		id = it.SongID.Int64()
	}
	t := Track{
		ID:          "am:" + strconv.FormatInt(id, 10),
		Title:       it.Title.String(),
		Artist:      it.Artist.String(),
		ArtistRef:   "name:" + it.Artist.String(),
		Album:       it.Album.String(),
		DurationSec: int(it.Duration),
		Image:       amImage(it.Image, 300),
		Explicit:    it.Explicit == "yes",
		Plays:       it.Stats.Plays.Int64(),
		AmID:        id,
		Blocked:     it.Blocked(),
	}
	if f := it.Featuring.String(); f != "" && !strings.Contains(strings.ToLower(t.Artist), strings.ToLower(f)) {
		t.Artist += " feat. " + f
	}
	if it.RankData != nil {
		t.Rank, t.Change = it.RankData.Rank, it.RankData.DailyChange
	}
	return t
}

func fromAMCard(it audiomack.Item, kind string) Card {
	c := Card{
		Kind:     kind,
		Title:    it.Title.String(),
		Subtitle: it.Artist.String(),
		Image:    amImage(it.Image, 400),
		Explicit: it.Explicit == "yes",
		Plays:    it.Stats.Plays.Int64(),
		Count:    int(it.TrackCount),
	}
	switch kind {
	case "album":
		c.Ref = amAlbumRef(it)
	case "playlist":
		c.Ref = "am:" + strconv.FormatInt(it.ID.Int64(), 10)
		if c.Subtitle == "" {
			c.Subtitle = it.Uploader.Name
		}
	case "artist":
		c.Title, c.Subtitle = it.Name, ""
		c.Ref = "name:" + it.Name
		c.Followers = it.Followers.Int64()
		c.Verified = audiomack.IsVerified(it.Verified)
	}
	if it.RankData != nil {
		c.Rank, c.Change = it.RankData.Rank, it.RankData.DailyChange
	}
	return c
}

func fromSPTrack(t spotify.CatalogTrack) Track {
	tr := Track{
		ID:          "sp:" + t.ID,
		Title:       t.Name,
		Artist:      t.Artists,
		Album:       t.Album,
		DurationSec: int((t.DurationMS + 500) / 1000),
		Image:       t.Cover,
		Explicit:    t.Explicit,
		Plays:       t.Playcount,
	}
	if t.ArtistID != "" {
		tr.ArtistRef = "sp:" + t.ArtistID
	}
	if t.AlbumID != "" {
		tr.AlbumRef = "sp:" + t.AlbumID
	}
	return tr
}

func fromSPSearchTrack(t spotify.Track) Track {
	return Track{
		ID:          "sp:" + t.ID,
		Title:       t.Name,
		Artist:      t.Artists,
		ArtistRef:   "name:" + firstArtist(t.Artists),
		Album:       t.Album,
		DurationSec: int((t.DurationMS + 500) / 1000),
		Image:       t.Cover,
		Explicit:    t.Explicit,
	}
}

func firstArtist(artists string) string {
	return strings.TrimSpace(strings.SplitN(artists, ",", 2)[0])
}

// keepOriginals retire les versions retouchées (432 Hz, slowed, karaoké…) d'une liste de suggestions.
func keepOriginals(tracks []Track) []Track {
	out := tracks[:0:0]
	for _, t := range tracks {
		if !provider.IsAlteredVersion(t.Title+" "+t.Artist, "") {
			out = append(out, t)
		}
	}
	return out
}
