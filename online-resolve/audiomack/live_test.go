package audiomack

import (
	"context"
	"os"
	"testing"
	"time"
)

// Appelle vraiment Audiomack : lancé seulement avec AUDIOMACK_LIVE=1.
// Les suggestions ne sont testées que si AUDIOMACK_TOKEN et AUDIOMACK_TOKEN_SECRET sont définis.
func TestLiveCatalog(t *testing.T) {
	if os.Getenv("AUDIOMACK_LIVE") != "1" {
		t.Skip("AUDIOMACK_LIVE=1 pour appeler Audiomack")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	c := New(WithUserToken(os.Getenv("AUDIOMACK_TOKEN"), os.Getenv("AUDIOMACK_TOKEN_SECRET")))

	check := func(name string, fetch func() ([]Item, error)) []Item {
		t.Helper()
		items, err := fetch()
		if err != nil || len(items) == 0 {
			t.Errorf("%s : %d éléments, erreur %v", name, len(items), err)
			return nil
		}
		t.Logf("%-22s %2d éléments, 1er : %s %s%s", name, len(items), items[0].Artist.String(), items[0].Title.String(), items[0].Name)
		return items
	}
	check("tendances titres", func() ([]Item, error) { return c.Trending(ctx, "", false, 5) })
	check("tendances albums", func() ([]Item, error) { return c.Trending(ctx, "", true, 5) })
	check("tendances afrobeats", func() ([]Item, error) { return c.Trending(ctx, "afrobeats", false, 5) })
	check("nouveautés", func() ([]Item, error) { return c.Recent(ctx, "", 5) })
	songs := check("chart titres BJ", func() ([]Item, error) { return c.Chart(ctx, "songs", "BJ", "", 5) })
	if len(songs) > 0 && songs[0].RankData == nil {
		t.Error("chart titres : rank_data absent")
	}
	check("chart artistes BJ", func() ([]Item, error) { return c.Chart(ctx, "artists", "BJ", "", 5) })

	cats, err := c.Categories(ctx)
	if err != nil || len(cats) == 0 {
		t.Fatalf("catégories : %v", err)
	}
	title, pls, err := c.CategoryPlaylists(ctx, string(cats[0].URLSlug))
	check("catégorie "+title+" ("+string(cats[0].Title)+")", func() ([]Item, error) { return pls, err })
	if len(pls) > 0 {
		pl, err := c.Playlist(ctx, pls[0].ID.Int64())
		check("playlist "+pl.Title.String(), func() ([]Item, error) { return pl.Tracks, err })
	}
	al, err := c.Album(ctx, "fally-ipupa", "xx-delirium-3956664")
	check("album "+al.Title.String(), func() ([]Item, error) { return al.Tracks, err })
	art, err := c.Artist(ctx, "fally-ipupa")
	if err != nil || art.Name == "" {
		t.Errorf("artiste : %v", err)
	}
	check("uploads artiste", func() ([]Item, error) { return c.ArtistUploads(ctx, "fally-ipupa", 5) })
	regions, err := c.Regions(ctx)
	if err != nil || len(regions) == 0 {
		t.Errorf("régions : %v", err)
	}

	if !c.HasUserToken() {
		t.Log("pas de compte : suggestions non testées")
		return
	}
	check("radio du titre", func() ([]Item, error) { return c.RelatedSongs(ctx, 8694074) })
	check("artistes similaires", func() ([]Item, error) { return c.RelatedArtists(ctx, art.ID.Int64()) })
}
