package spotify

import "testing"

func TestParseSearchTrack(t *testing.T) {
	root := map[string]any{
		"data": map[string]any{
			"searchV2": map[string]any{
				"tracksV2": map[string]any{
					"items": []any{
						map[string]any{
							"item": map[string]any{
								"data": map[string]any{
									"uri":  "spotify:track:abc123",
									"name": "Title",
									"duration": map[string]any{
										"totalMilliseconds": float64(123000),
									},
									"artists": map[string]any{
										"items": []any{
											map[string]any{"profile": map[string]any{"name": "Artist"}},
										},
									},
									"albumOfTrack": map[string]any{
										"name": "Album",
										"coverArt": map[string]any{
											"sources": []any{
												map[string]any{"url": "small", "width": float64(64), "height": float64(64)},
												map[string]any{"url": "medium", "width": float64(640), "height": float64(640)},
											},
										},
									},
									"contentRating": map[string]any{"label": "EXPLICIT"},
								},
							},
						},
					},
				},
			},
		},
	}

	results := ParseSearch(root)
	if len(results.Tracks) != 1 {
		t.Fatalf("tracks = %d, want 1", len(results.Tracks))
	}
	track := results.Tracks[0]
	if track.ID != "abc123" || track.Name != "Title" || track.Artists != "Artist" || track.Album != "Album" || track.Cover != "medium" || !track.Explicit {
		t.Fatalf("unexpected track: %+v", track)
	}
}
