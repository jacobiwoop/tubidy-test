package spotify

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

const (
	defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
	searchHash       = "fcad5a3e0d5af727fb76966f06971c19cfa2275e6ff7671196753e008611873c"
)

var appServerConfigRE = regexp.MustCompile(`<script id="appServerConfig" type="text/plain">([^<]+)</script>`)

type Client struct {
	http             *http.Client
	userAgent        string
	openSpotify      string
	apiPartner       string
	clientTokenHost  string
	now              func() time.Time
	mu               sync.Mutex
	accessToken      string
	accessTokenUntil time.Time
	clientToken      string
	clientID         string
	deviceID         string
	clientVersion    string
	cookies          map[string]string
}

type Option func(*Client)

func WithHTTPClient(httpClient *http.Client) Option {
	return func(c *Client) {
		if httpClient != nil {
			c.http = httpClient
		}
	}
}

func WithBaseURLs(openSpotify, apiPartner, clientTokenHost string) Option {
	return func(c *Client) {
		if openSpotify != "" {
			c.openSpotify = strings.TrimRight(openSpotify, "/")
		}
		if apiPartner != "" {
			c.apiPartner = strings.TrimRight(apiPartner, "/")
		}
		if clientTokenHost != "" {
			c.clientTokenHost = strings.TrimRight(clientTokenHost, "/")
		}
	}
}

func New(opts ...Option) *Client {
	c := &Client{
		http:            &http.Client{Timeout: 30 * time.Second},
		userAgent:       defaultUserAgent,
		openSpotify:     "https://open.spotify.com",
		apiPartner:      "https://api-partner.spotify.com",
		clientTokenHost: "https://clienttoken.spotify.com",
		now:             time.Now,
		cookies:         map[string]string{},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

func (c *Client) Search(ctx context.Context, query string, limit, offset int) (SearchResults, error) {
	if strings.TrimSpace(query) == "" {
		return SearchResults{}, fmt.Errorf("empty search query")
	}
	if limit < 1 {
		limit = 1
	}
	if limit > 50 {
		limit = 50
	}
	payload := map[string]any{
		"variables": map[string]any{
			"searchTerm":                    query,
			"offset":                        offset,
			"limit":                         limit,
			"numberOfTopResults":            5,
			"includeAudiobooks":             true,
			"includeArtistHasConcertsField": false,
			"includePreReleases":            true,
			"includeAuthors":                false,
		},
		"operationName": "searchDesktop",
		"extensions": map[string]any{
			"persistedQuery": map[string]any{
				"version":    1,
				"sha256Hash": searchHash,
			},
		},
	}
	var root map[string]any
	if err := c.Query(ctx, payload, &root); err != nil {
		return SearchResults{}, err
	}
	return ParseSearch(root), nil
}

func (c *Client) Query(ctx context.Context, payload any, out any) error {
	c.mu.Lock()
	if !c.tokensValid() {
		if err := c.initializeLocked(ctx); err != nil {
			c.mu.Unlock()
			return err
		}
	}
	accessToken, clientToken, version := c.accessToken, c.clientToken, c.clientVersion
	c.mu.Unlock()

	code, body, err := c.postQuery(ctx, payload, accessToken, clientToken, version)
	if err != nil {
		return err
	}
	if code == http.StatusUnauthorized || code == http.StatusForbidden {
		c.mu.Lock()
		if c.accessToken == accessToken {
			c.accessToken = ""
			c.clientToken = ""
			err = c.initializeLocked(ctx)
		}
		accessToken, clientToken, version = c.accessToken, c.clientToken, c.clientVersion
		c.mu.Unlock()
		if err != nil {
			return err
		}
		code, body, err = c.postQuery(ctx, payload, accessToken, clientToken, version)
		if err != nil {
			return err
		}
	}
	if code != http.StatusOK {
		return fmt.Errorf("pathfinder failed: HTTP %d | %.200s", code, string(body))
	}
	return json.Unmarshal(body, out)
}

func (c *Client) PreviewURL(ctx context.Context, spotifyTrackID string) (string, error) {
	if spotifyTrackID == "" {
		return "", fmt.Errorf("empty Spotify track id")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.openSpotify+"/embed/track/"+url.PathEscape(spotifyTrackID), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")
	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("embed page failed: HTTP %d", resp.StatusCode)
	}
	re := regexp.MustCompile(`https://p\.scdn\.co/mp3-preview/[a-zA-Z0-9]+`)
	match := re.Find(body)
	if len(match) == 0 {
		return "", fmt.Errorf("preview unavailable for track %s", spotifyTrackID)
	}
	return string(match), nil
}

func (c *Client) tokensValid() bool {
	return c.accessToken != "" && c.clientToken != "" && c.now().Before(c.accessTokenUntil.Add(-30*time.Second))
}

func (c *Client) initializeLocked(ctx context.Context) error {
	if err := c.fetchSessionInfo(ctx); err != nil {
		return err
	}
	if err := c.fetchAccessToken(ctx); err != nil {
		return err
	}
	return c.fetchClientToken(ctx)
}

func (c *Client) fetchSessionInfo(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.openSpotify, nil)
	if err != nil {
		return err
	}
	c.applyCommonHeaders(req, false)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	c.storeCookies(resp)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("session init failed: HTTP %d", resp.StatusCode)
	}
	match := appServerConfigRE.FindSubmatch(body)
	if len(match) < 2 {
		return fmt.Errorf("appServerConfig not found")
	}
	decoded, err := decodeBase64Flexible(string(match[1]))
	if err != nil {
		return fmt.Errorf("appServerConfig decode: %w", err)
	}
	var cfg struct {
		ClientVersion string `json:"clientVersion"`
	}
	if err := json.Unmarshal(decoded, &cfg); err != nil {
		return fmt.Errorf("appServerConfig json: %w", err)
	}
	if cfg.ClientVersion == "" {
		return fmt.Errorf("clientVersion missing from appServerConfig")
	}
	c.clientVersion = cfg.ClientVersion
	return nil
}

func (c *Client) fetchAccessToken(ctx context.Context) error {
	var lastErr error
	for _, offset := range []time.Duration{0, -30 * time.Second, 30 * time.Second} {
		code, err := TOTP(c.now().Add(offset).UnixMilli())
		if err != nil {
			return err
		}
		u, err := url.Parse(c.openSpotify + "/api/token")
		if err != nil {
			return err
		}
		q := u.Query()
		q.Set("reason", "init")
		q.Set("productType", "web-player")
		q.Set("totp", code)
		q.Set("totpVer", fmt.Sprint(TOTPVersion))
		q.Set("totpServer", code)
		u.RawQuery = q.Encode()

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if err != nil {
			return err
		}
		c.applyCommonHeaders(req, true)
		req.Header.Set("Content-Type", "application/json;charset=UTF-8")
		resp, err := c.http.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		c.storeCookies(resp)
		if readErr != nil {
			return readErr
		}
		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("access token refused: HTTP %d | %.200s", resp.StatusCode, string(body))
			time.Sleep(400 * time.Millisecond)
			continue
		}
		var token struct {
			AccessToken                      string `json:"accessToken"`
			ClientID                         string `json:"clientId"`
			AccessTokenExpirationTimestampMs int64  `json:"accessTokenExpirationTimestampMs"`
		}
		if err := json.Unmarshal(body, &token); err != nil {
			return err
		}
		if token.AccessToken == "" || token.ClientID == "" {
			return fmt.Errorf("incomplete access token response")
		}
		c.accessToken = token.AccessToken
		c.clientID = token.ClientID
		if token.AccessTokenExpirationTimestampMs > 0 {
			c.accessTokenUntil = time.UnixMilli(token.AccessTokenExpirationTimestampMs)
		} else {
			c.accessTokenUntil = c.now().Add(55 * time.Minute)
		}
		return nil
	}
	return lastErr
}

func (c *Client) fetchClientToken(ctx context.Context) error {
	payload := map[string]any{
		"client_data": map[string]any{
			"client_version": c.clientVersion,
			"client_id":      c.clientID,
			"js_sdk_data": map[string]any{
				"device_brand": "unknown",
				"device_model": "unknown",
				"os":           "windows",
				"os_version":   "NT 10.0",
				"device_id":    c.deviceID,
				"device_type":  "computer",
			},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.clientTokenHost+"/v1/clienttoken", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("client token refused: HTTP %d | %.200s", resp.StatusCode, string(raw))
	}
	var data struct {
		ResponseType string `json:"response_type"`
		GrantedToken struct {
			Token string `json:"token"`
		} `json:"granted_token"`
	}
	if err := json.Unmarshal(raw, &data); err != nil {
		return err
	}
	if data.ResponseType != "RESPONSE_GRANTED_TOKEN_RESPONSE" || data.GrantedToken.Token == "" {
		return fmt.Errorf("invalid client token response")
	}
	c.clientToken = data.GrantedToken.Token
	return nil
}

func (c *Client) postQuery(ctx context.Context, payload any, accessToken, clientToken, version string) (int, []byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return 0, nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiPartner+"/pathfinder/v2/query", bytes.NewReader(body))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Client-Token", clientToken)
	req.Header.Set("Spotify-App-Version", version)
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, nil, err
	}
	return resp.StatusCode, raw, nil
}

func (c *Client) applyCommonHeaders(req *http.Request, includeCookies bool) {
	req.Header.Set("User-Agent", c.userAgent)
	if includeCookies && len(c.cookies) > 0 {
		req.Header.Set("Cookie", c.cookieHeader())
	}
}

func (c *Client) storeCookies(resp *http.Response) {
	for _, header := range resp.Header.Values("Set-Cookie") {
		pair := strings.SplitN(header, ";", 2)[0]
		name, value, ok := strings.Cut(pair, "=")
		if !ok || strings.TrimSpace(name) == "" {
			continue
		}
		c.cookies[strings.TrimSpace(name)] = strings.TrimSpace(value)
		if strings.TrimSpace(name) == "sp_t" {
			c.deviceID = strings.TrimSpace(value)
		}
	}
}

func (c *Client) cookieHeader() string {
	parts := make([]string, 0, len(c.cookies))
	for k, v := range c.cookies {
		parts = append(parts, k+"="+v)
	}
	return strings.Join(parts, "; ")
}

func decodeBase64Flexible(value string) ([]byte, error) {
	clean := strings.TrimSpace(value)
	if decoded, err := base64.StdEncoding.DecodeString(clean); err == nil {
		return decoded, nil
	}
	if decoded, err := base64.RawStdEncoding.DecodeString(clean); err == nil {
		return decoded, nil
	}
	if decoded, err := base64.URLEncoding.DecodeString(clean); err == nil {
		return decoded, nil
	}
	return nil, fmt.Errorf("unsupported base64 encoding")
}
