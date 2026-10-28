package spotify

import "fmt"

type Track struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Artists    string `json:"artists"`
	Album      string `json:"album"`
	DurationMS int64  `json:"duration_ms"`
	Cover      string `json:"cover,omitempty"`
	Explicit   bool   `json:"explicit"`
}

type Album struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Artists string `json:"artists"`
	Cover   string `json:"cover,omitempty"`
	Year    int    `json:"year,omitempty"`
}

type Artist struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Cover string `json:"cover,omitempty"`
}

type Playlist struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Cover string `json:"cover,omitempty"`
	Owner string `json:"owner,omitempty"`
}

type SearchResults struct {
	Tracks    []Track    `json:"tracks"`
	Albums    []Album    `json:"albums"`
	Artists   []Artist   `json:"artists"`
	Playlists []Playlist `json:"playlists"`
}

func ParseSearch(root map[string]any) SearchResults {
	search := obj(obj(root, "data"), "searchV2")
	if len(search) == 0 {
		return SearchResults{}
	}
	return SearchResults{
		Tracks:    parseTracks(search),
		Albums:    parseAlbums(search),
		Artists:   parseArtists(search),
		Playlists: parsePlaylists(search),
	}
}

func parseTracks(search map[string]any) []Track {
	items := section(search, "tracksV2", "tracks")
	out := make([]Track, 0, len(items))
	for _, item := range items {
		track := obj(obj(item, "item"), "data")
		if len(track) == 0 {
			track = obj(item, "track")
		}
		name := str(track, "name")
		if name == "" {
			continue
		}
		duration := num(obj(track, "duration"), "totalMilliseconds")
		if duration == 0 {
			duration = num(obj(track, "trackDuration"), "totalMilliseconds")
		}
		album := obj(track, "albumOfTrack")
		out = append(out, Track{
			ID:         idOf(track),
			Name:       name,
			Artists:    artistNames(obj(track, "artists")),
			Album:      str(album, "name"),
			DurationMS: int64(duration),
			Cover:      extractCover(obj(album, "coverArt")),
			Explicit:   str(obj(track, "contentRating"), "label") == "EXPLICIT",
		})
	}
	return out
}

func parseAlbums(search map[string]any) []Album {
	items := section(search, "albumsV2", "albums")
	out := make([]Album, 0, len(items))
	for _, item := range items {
		album := obj(item, "data")
		if len(album) == 0 {
			album = obj(item, "album")
		}
		name := str(album, "name")
		artists := artistNames(obj(album, "artists"))
		if name == "" || artists == "" {
			continue
		}
		out = append(out, Album{
			ID:      idOf(album),
			Name:    name,
			Artists: artists,
			Cover:   extractCover(obj(album, "coverArt")),
			Year:    int(num(obj(album, "date"), "year")),
		})
	}
	return out
}

func parseArtists(search map[string]any) []Artist {
	items := section(search, "artistsV2", "artists")
	out := make([]Artist, 0, len(items))
	for _, item := range items {
		artist := obj(item, "data")
		if len(artist) == 0 {
			artist = obj(item, "artist")
		}
		name := str(obj(artist, "profile"), "name")
		if name == "" {
			name = str(artist, "name")
		}
		if name == "" {
			continue
		}
		cover := extractCover(obj(artist, "visualIdentity"))
		if cover == "" {
			cover = extractCover(obj(obj(artist, "visuals"), "avatarImage"))
		}
		out = append(out, Artist{ID: idOf(artist), Name: name, Cover: cover})
	}
	return out
}

func parsePlaylists(search map[string]any) []Playlist {
	items := section(search, "playlistsV2", "playlists")
	out := make([]Playlist, 0, len(items))
	for _, item := range items {
		playlist := obj(item, "data")
		if len(playlist) == 0 {
			playlist = obj(item, "playlist")
		}
		name := str(playlist, "name")
		if name == "" {
			continue
		}
		images := obj(playlist, "images")
		if len(images) == 0 {
			images = obj(playlist, "imagesV2")
		}
		cover := ""
		if first := firstObj(arr(images, "items")); len(first) > 0 {
			cover = extractCover(map[string]any{"sources": arr(first, "sources")})
		}
		if cover == "" {
			cover = extractCover(images)
		}
		out = append(out, Playlist{
			ID:    idOf(playlist),
			Name:  name,
			Cover: cover,
			Owner: str(obj(obj(obj(playlist, "ownerV2"), "data"), "profile"), "name"),
		})
	}
	return out
}

func section(search map[string]any, v2, v1 string) []map[string]any {
	data := obj(search, v2)
	if len(data) == 0 {
		data = obj(search, v1)
	}
	raw := arr(data, "items")
	out := make([]map[string]any, 0, len(raw))
	for _, item := range raw {
		if m, ok := item.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

func idOf(item map[string]any) string {
	if id := str(item, "id"); id != "" {
		return id
	}
	uri := str(item, "uri")
	for i := len(uri) - 1; i >= 0; i-- {
		if uri[i] == ':' {
			return uri[i+1:]
		}
	}
	return ""
}

func artistNames(artists map[string]any) string {
	items := arr(artists, "items")
	names := ""
	for _, item := range items {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		name := str(obj(m, "profile"), "name")
		if name == "" {
			continue
		}
		if names != "" {
			names += ", "
		}
		names += name
	}
	return names
}

func extractCover(cover map[string]any) string {
	sources := arr(cover, "sources")
	if len(sources) == 0 {
		sources = arr(obj(obj(obj(cover, "squareCoverImage"), "image"), "data"), "sources")
	}
	bestURL := ""
	bestWidth := float64(-1)
	for _, source := range sources {
		src, ok := source.(map[string]any)
		if !ok {
			continue
		}
		u := str(src, "url")
		if u == "" {
			continue
		}
		width := num(src, "width")
		if width == 0 {
			width = num(src, "maxWidth")
		}
		height := num(src, "height")
		if height == 0 {
			height = num(src, "maxHeight")
		}
		if !((width > 64 && height > 64) || (width == 0 && height == 0)) {
			continue
		}
		if width == 640 {
			return u
		}
		if width > bestWidth {
			bestWidth = width
			bestURL = u
		}
	}
	return bestURL
}

func obj(m map[string]any, key string) map[string]any {
	if m == nil {
		return map[string]any{}
	}
	if child, ok := m[key].(map[string]any); ok {
		return child
	}
	return map[string]any{}
}

func arr(m map[string]any, key string) []any {
	if m == nil {
		return nil
	}
	if values, ok := m[key].([]any); ok {
		return values
	}
	return nil
}

func str(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	switch v := m[key].(type) {
	case string:
		return v
	case fmt.Stringer:
		return v.String()
	default:
		return ""
	}
}

func num(m map[string]any, key string) float64 {
	if m == nil {
		return 0
	}
	switch v := m[key].(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int64:
		return float64(v)
	default:
		return 0
	}
}

func firstObj(values []any) map[string]any {
	if len(values) == 0 {
		return map[string]any{}
	}
	if m, ok := values[0].(map[string]any); ok {
		return m
	}
	return map[string]any{}
}
