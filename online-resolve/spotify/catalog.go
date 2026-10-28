package spotify

import (
	"context"
	"fmt"
	"strconv"
	"strings"
)

// Empreintes des requêtes GraphQL du lecteur web (open.spotify.com). Spotify les change parfois :
// une requête refusée (HTTP 400 PersistedQueryNotFound) se corrige en relevant la nouvelle empreinte
// dans les scripts du lecteur web.
const (
	hashArtistOverview = "9f8134ef565e78621f1e1793555bd6633c5ac144ae0f89604ed3ae3f80b3c8e6"
	hashAlbum          = "11c9cad9cb24c4f9e25ef9456f68621cfd6006a90f679e729c1d2f2fd70dfe16"
	hashPlaylist       = "8964e8eafb21aa992a7d951d256d83285c04be2105d209262901de70cb97584a"
)

// RadioPrefix est le début des identifiants des radios générées par Spotify (« <Artiste> Radio »).
const RadioPrefix = "37i9dQZF1E"

// CatalogTrack est un titre d'une page artiste, album ou playlist.
type CatalogTrack struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Artists    string `json:"artists"`
	ArtistID   string `json:"artistId,omitempty"`
	Album      string `json:"album,omitempty"`
	AlbumID    string `json:"albumId,omitempty"`
	DurationMS int64  `json:"duration_ms"`
	Cover      string `json:"cover,omitempty"`
	Explicit   bool   `json:"explicit"`
	Playcount  int64  `json:"playcount,omitempty"`
}

type City struct {
	City      string `json:"city"`
	Country   string `json:"country"`
	Listeners int64  `json:"listeners"`
}

type Link struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type ArtistPage struct {
	ID               string         `json:"id"`
	Name             string         `json:"name"`
	Avatar           string         `json:"avatar,omitempty"`
	Header           string         `json:"header,omitempty"`
	Followers        int64          `json:"followers"`
	MonthlyListeners int64          `json:"monthlyListeners"`
	Biography        string         `json:"biography,omitempty"`
	TopCities        []City         `json:"topCities"`
	TopTracks        []CatalogTrack `json:"topTracks"`
	Albums           []Album        `json:"albums"`
	Singles          []Album        `json:"singles"`
	Related          []Artist       `json:"related"`
	Links            []Link         `json:"links"`
}

type AlbumPage struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Artists     string         `json:"artists"`
	ArtistID    string         `json:"artistId,omitempty"`
	Cover       string         `json:"cover,omitempty"`
	Type        string         `json:"type"`
	Date        string         `json:"date,omitempty"`
	Label       string         `json:"label,omitempty"`
	Copyright   string         `json:"copyright,omitempty"`
	Color       string         `json:"color,omitempty"`
	TotalTracks int            `json:"totalTracks"`
	Tracks      []CatalogTrack `json:"tracks"`
}

type PlaylistPage struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Owner       string         `json:"owner,omitempty"`
	Cover       string         `json:"cover,omitempty"`
	Followers   int64          `json:"followers"`
	TotalTracks int            `json:"totalTracks"`
	Tracks      []CatalogTrack `json:"tracks"`
}

func persisted(name, hash string, vars map[string]any) map[string]any {
	return map[string]any{
		"operationName": name,
		"variables":     vars,
		"extensions":    map[string]any{"persistedQuery": map[string]any{"version": 1, "sha256Hash": hash}},
	}
}

// Artist rend la page d'un artiste (statistiques, top titres, discographie, artistes similaires).
func (c *Client) Artist(ctx context.Context, id string) (ArtistPage, error) {
	if id == "" {
		return ArtistPage{}, fmt.Errorf("spotify: identifiant d'artiste vide")
	}
	var root map[string]any
	err := c.Query(ctx, persisted("queryArtistOverview", hashArtistOverview, map[string]any{
		"uri": "spotify:artist:" + id, "locale": "", "includePrerelease": true,
	}), &root)
	if err != nil {
		return ArtistPage{}, err
	}
	a := obj(obj(root, "data"), "artistUnion")
	if str(obj(a, "profile"), "name") == "" {
		return ArtistPage{}, fmt.Errorf("spotify: artiste %s introuvable", id)
	}
	return ParseArtist(a), nil
}

// ParseArtist lit artistUnion.
func ParseArtist(a map[string]any) ArtistPage {
	profile, stats, visuals, disco := obj(a, "profile"), obj(a, "stats"), obj(a, "visuals"), obj(a, "discography")
	p := ArtistPage{
		ID:               str(a, "id"),
		Name:             str(profile, "name"),
		Avatar:           largest(obj(visuals, "avatarImage")),
		Header:           largest(obj(obj(a, "headerImage"), "data")),
		Followers:        int64(num(stats, "followers")),
		MonthlyListeners: int64(num(stats, "monthlyListeners")),
		Biography:        stripTags(str(obj(profile, "biography"), "text")),
	}
	if p.Header == "" {
		p.Header = largest(obj(visuals, "headerImage"))
	}
	for _, it := range arr(obj(stats, "topCities"), "items") {
		m, _ := it.(map[string]any)
		p.TopCities = append(p.TopCities, City{City: str(m, "city"), Country: str(m, "country"), Listeners: int64(num(m, "numberOfListeners"))})
	}
	for _, it := range arr(obj(disco, "topTracks"), "items") {
		m, _ := it.(map[string]any)
		if t := parseCatalogTrack(obj(m, "track")); t.Name != "" {
			p.TopTracks = append(p.TopTracks, t)
		}
	}
	p.Albums = parseReleases(obj(disco, "albums"))
	p.Singles = parseReleases(obj(disco, "singles"))
	for _, it := range arr(obj(obj(a, "relatedContent"), "relatedArtists"), "items") {
		m, _ := it.(map[string]any)
		if name := str(obj(m, "profile"), "name"); name != "" {
			p.Related = append(p.Related, Artist{ID: idOf(m), Name: name, Cover: largest(obj(obj(m, "visuals"), "avatarImage"))})
		}
	}
	for _, it := range arr(obj(profile, "externalLinks"), "items") {
		m, _ := it.(map[string]any)
		p.Links = append(p.Links, Link{Name: str(m, "name"), URL: str(m, "url")})
	}
	return p
}

// Album rend un album et ses titres (avec leurs écoutes).
func (c *Client) Album(ctx context.Context, id string) (AlbumPage, error) {
	if id == "" {
		return AlbumPage{}, fmt.Errorf("spotify: identifiant d'album vide")
	}
	var root map[string]any
	err := c.Query(ctx, persisted("getAlbum", hashAlbum, map[string]any{
		"uri": "spotify:album:" + id, "locale": "", "offset": 0, "limit": 50,
	}), &root)
	if err != nil {
		return AlbumPage{}, err
	}
	al := obj(obj(root, "data"), "albumUnion")
	if str(al, "name") == "" {
		return AlbumPage{}, fmt.Errorf("spotify: album %s introuvable", id)
	}
	return ParseAlbum(al), nil
}

// ParseAlbum lit albumUnion.
func ParseAlbum(al map[string]any) AlbumPage {
	p := AlbumPage{
		ID:      idOf(al),
		Name:    str(al, "name"),
		Artists: artistNames(obj(al, "artists")),
		Cover:   largest(obj(al, "coverArt")),
		Type:    str(al, "type"),
		Date:    strings.SplitN(str(obj(al, "date"), "isoString"), "T", 2)[0],
		Label:   str(al, "label"),
		Color:   str(obj(obj(obj(al, "coverArt"), "extractedColors"), "colorDark"), "hex"),
	}
	if items := arr(obj(al, "artists"), "items"); len(items) > 0 {
		m, _ := items[0].(map[string]any)
		p.ArtistID = idOf(m)
	}
	if cr := arr(obj(al, "copyright"), "items"); len(cr) > 0 {
		m, _ := cr[0].(map[string]any)
		p.Copyright = str(m, "text")
	}
	tracks := obj(al, "tracksV2")
	if len(tracks) == 0 {
		tracks = obj(al, "tracks")
	}
	p.TotalTracks = int(num(tracks, "totalCount"))
	for _, it := range arr(tracks, "items") {
		m, _ := it.(map[string]any)
		t := parseCatalogTrack(obj(m, "track"))
		if t.Name == "" {
			continue
		}
		t.Album, t.AlbumID, t.Cover = p.Name, p.ID, p.Cover
		p.Tracks = append(p.Tracks, t)
	}
	return p
}

// Playlist rend une playlist et ses titres (jusqu'à 100).
func (c *Client) Playlist(ctx context.Context, id string) (PlaylistPage, error) {
	if id == "" {
		return PlaylistPage{}, fmt.Errorf("spotify: identifiant de playlist vide")
	}
	var root map[string]any
	err := c.Query(ctx, persisted("fetchPlaylist", hashPlaylist, map[string]any{
		"uri": "spotify:playlist:" + id, "offset": 0, "limit": 100, "enableWatchFeedEntrypoint": false,
	}), &root)
	if err != nil {
		return PlaylistPage{}, err
	}
	pl := obj(obj(root, "data"), "playlistV2")
	if str(pl, "name") == "" {
		return PlaylistPage{}, fmt.Errorf("spotify: playlist %s introuvable", id)
	}
	return ParsePlaylist(pl), nil
}

// ParsePlaylist lit playlistV2.
func ParsePlaylist(pl map[string]any) PlaylistPage {
	p := PlaylistPage{
		ID:          idOf(pl),
		Name:        str(pl, "name"),
		Description: stripTags(str(pl, "description")),
		Followers:   int64(num(pl, "followers")),
	}
	if imgs := arr(obj(pl, "images"), "items"); len(imgs) > 0 {
		m, _ := imgs[0].(map[string]any)
		p.Cover = largest(m)
	}
	if members := arr(obj(pl, "members"), "items"); len(members) > 0 {
		m, _ := members[0].(map[string]any)
		p.Owner = str(obj(obj(m, "user"), "data"), "name")
	}
	content := obj(pl, "content")
	p.TotalTracks = int(num(content, "totalCount"))
	for _, it := range arr(content, "items") {
		m, _ := it.(map[string]any)
		if t := parseCatalogTrack(obj(obj(m, "itemV2"), "data")); t.Name != "" {
			p.Tracks = append(p.Tracks, t)
		}
	}
	return p
}

// ArtistRadio trouve la radio générée par Spotify pour un artiste (« <Artiste> Radio ») et la rend.
func (c *Client) ArtistRadio(ctx context.Context, artistName string) (PlaylistPage, error) {
	res, err := c.Search(ctx, artistName+" Radio", 10, 0)
	if err != nil {
		return PlaylistPage{}, err
	}
	want := strings.ToLower(strings.TrimSpace(artistName)) + " radio"
	var fallback string
	for _, p := range res.Playlists {
		if !strings.HasPrefix(p.ID, RadioPrefix) {
			continue
		}
		if strings.ToLower(p.Name) == want {
			return c.Playlist(ctx, p.ID)
		}
		if fallback == "" && strings.Contains(strings.ToLower(p.Name), "radio") {
			fallback = p.ID
		}
	}
	if fallback != "" {
		return c.Playlist(ctx, fallback)
	}
	return PlaylistPage{}, fmt.Errorf("spotify: pas de radio pour %q", artistName)
}

func parseCatalogTrack(t map[string]any) CatalogTrack {
	if len(t) == 0 {
		return CatalogTrack{}
	}
	dur := num(obj(t, "duration"), "totalMilliseconds")
	if dur == 0 {
		dur = num(obj(t, "trackDuration"), "totalMilliseconds")
	}
	album := obj(t, "albumOfTrack")
	ct := CatalogTrack{
		ID:         idOf(t),
		Name:       str(t, "name"),
		Artists:    artistNames(obj(t, "artists")),
		Album:      str(album, "name"),
		AlbumID:    idOf(album),
		DurationMS: int64(dur),
		Cover:      extractCover(obj(album, "coverArt")),
		Explicit:   str(obj(t, "contentRating"), "label") == "EXPLICIT",
	}
	if items := arr(obj(t, "artists"), "items"); len(items) > 0 {
		m, _ := items[0].(map[string]any)
		ct.ArtistID = idOf(m)
	}
	if pc, err := strconv.ParseInt(str(t, "playcount"), 10, 64); err == nil {
		ct.Playcount = pc
	}
	return ct
}

// parseReleases lit discography.albums|singles : items[].releases.items[0].
func parseReleases(section map[string]any) []Album {
	var out []Album
	for _, it := range arr(section, "items") {
		m, _ := it.(map[string]any)
		rel := arr(obj(m, "releases"), "items")
		if len(rel) == 0 {
			continue
		}
		r, _ := rel[0].(map[string]any)
		if name := str(r, "name"); name != "" {
			out = append(out, Album{ID: idOf(r), Name: name, Cover: extractCover(obj(r, "coverArt")), Year: int(num(obj(r, "date"), "year"))})
		}
	}
	return out
}

// largest rend l'URL de la plus grande image d'un objet {sources: [{url, width|maxWidth}]}.
func largest(img map[string]any) string {
	best, bestW := "", -1.0
	for _, s := range arr(img, "sources") {
		m, _ := s.(map[string]any)
		w := num(m, "width")
		if w == 0 {
			w = num(m, "maxWidth")
		}
		if u := str(m, "url"); u != "" && w > bestW {
			best, bestW = u, w
		}
	}
	return best
}

func stripTags(s string) string {
	var b strings.Builder
	in := false
	for _, r := range s {
		switch {
		case r == '<':
			in = true
		case r == '>':
			in = false
		case !in:
			b.WriteRune(r)
		}
	}
	return strings.TrimSpace(strings.NewReplacer("&amp;", "&", "&#x27;", "'", "&quot;", "\"", "&#39;", "'").Replace(b.String()))
}
