package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Suggestions YouTube Mix (playlist « RD<videoId> »), comme l'appli : première vidéo trouvée pour
// le titre, puis le mix que YouTube en tire. Préférées par l'utilisateur : vrais titres, variés.

var (
	ytHTTP     = &http.Client{Timeout: 8 * time.Second}
	ytNoiseRE  = regexp.MustCompile(`(?i)\s*[\(\[][^\)\]]*(Official|Video|Visuali[sz]er|Clip|Audio|Lyric|Paroles|HQ|HD|4K)[^\)\]]*[\)\]]`)
	ytDashRE   = regexp.MustCompile(`\s[-–—]\s`)
	ytSpacesRE = regexp.MustCompile(`\s+`)
	ytChanRE   = regexp.MustCompile(`(?i)(\s*-\s*Topic|VEVO|\s+Official|TV)$`)
)

const ytUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

func ytCall(ctx context.Context, endpoint string, body map[string]any, out any) error {
	body["context"] = map[string]any{"client": map[string]any{"clientName": "WEB", "clientVersion": "2.20240101.00.00", "hl": "fr", "gl": "FR"}}
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://www.youtube.com/youtubei/v1/"+endpoint, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", ytUA)
	resp, err := ytHTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("youtube %s : HTTP %d", endpoint, resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

type ytText struct {
	SimpleText string `json:"simpleText"`
	Runs       []struct {
		Text string `json:"text"`
	} `json:"runs"`
}

func (t ytText) String() string {
	if t.SimpleText != "" {
		return t.SimpleText
	}
	var sb strings.Builder
	for _, r := range t.Runs {
		sb.WriteString(r.Text)
	}
	return sb.String()
}

// youtubeMix rend jusqu'à limit suggestions pour q, sans la vidéo de départ.
func youtubeMix(ctx context.Context, q string, limit int) ([]Track, error) {
	var search struct {
		Contents struct {
			TwoColumnSearchResultsRenderer struct {
				PrimaryContents struct {
					SectionListRenderer struct {
						Contents []struct {
							ItemSectionRenderer struct {
								Contents []struct {
									VideoRenderer *struct {
										VideoID string `json:"videoId"`
									} `json:"videoRenderer"`
								} `json:"contents"`
							} `json:"itemSectionRenderer"`
						} `json:"contents"`
					} `json:"sectionListRenderer"`
				} `json:"primaryContents"`
			} `json:"twoColumnSearchResultsRenderer"`
		} `json:"contents"`
	}
	if err := ytCall(ctx, "search", map[string]any{"query": q}, &search); err != nil {
		return nil, err
	}
	seed := ""
	for _, sec := range search.Contents.TwoColumnSearchResultsRenderer.PrimaryContents.SectionListRenderer.Contents {
		for _, it := range sec.ItemSectionRenderer.Contents {
			if it.VideoRenderer != nil && it.VideoRenderer.VideoID != "" {
				seed = it.VideoRenderer.VideoID
				break
			}
		}
		if seed != "" {
			break
		}
	}
	if seed == "" {
		return nil, errNotFound
	}

	var next struct {
		Contents struct {
			TwoColumnWatchNextResults struct {
				Playlist struct {
					Playlist struct {
						Contents []struct {
							Video *struct {
								VideoID    string `json:"videoId"`
								Title      ytText `json:"title"`
								Byline     ytText `json:"shortBylineText"`
								LengthText ytText `json:"lengthText"`
							} `json:"playlistPanelVideoRenderer"`
						} `json:"contents"`
					} `json:"playlist"`
				} `json:"playlist"`
			} `json:"twoColumnWatchNextResults"`
		} `json:"contents"`
	}
	if err := ytCall(ctx, "next", map[string]any{"videoId": seed, "playlistId": "RD" + seed}, &next); err != nil {
		return nil, err
	}
	var out []Track
	for _, c := range next.Contents.TwoColumnWatchNextResults.Playlist.Playlist.Contents {
		v := c.Video
		if v == nil || v.VideoID == "" || v.VideoID == seed {
			continue
		}
		artist, title := splitVideoTitle(v.Title.String(), v.Byline.String())
		out = append(out, Track{
			ID:          "yt:" + v.VideoID,
			Title:       title,
			Artist:      artist,
			DurationSec: parseClock(v.LengthText.String()),
			Image:       "https://i.ytimg.com/vi/" + v.VideoID + "/hqdefault.jpg",
		})
		if len(out) == limit {
			break
		}
	}
	return out, nil
}

// splitVideoTitle : « Burna Boy - On The Low [Official Music Video] » → (« Burna Boy », « On The Low ») ;
// sans « - », la chaîne (sans « VEVO », « - Topic »…) sert d'artiste.
func splitVideoTitle(videoTitle, channel string) (string, string) {
	cleaned := strings.TrimSpace(ytSpacesRE.ReplaceAllString(ytNoiseRE.ReplaceAllString(videoTitle, ""), " "))
	if loc := ytDashRE.FindStringIndex(cleaned); loc != nil {
		left, right := strings.TrimSpace(cleaned[:loc[0]]), strings.TrimSpace(cleaned[loc[1]:])
		if left != "" && right != "" {
			return left, right
		}
	}
	artist := strings.TrimSpace(ytChanRE.ReplaceAllString(strings.TrimSpace(channel), ""))
	if artist == "" {
		artist = channel
	}
	if cleaned == "" {
		cleaned = videoTitle
	}
	return artist, cleaned
}

// parseClock : « 3:45 » → 225, « 1:02:03 » → 3723, 0 si illisible.
func parseClock(s string) int {
	total := 0
	for _, p := range strings.Split(strings.TrimSpace(s), ":") {
		n, err := strconv.Atoi(p)
		if err != nil {
			return 0
		}
		total = total*60 + n
	}
	return total
}
