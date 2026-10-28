// Package audiomack reproduit le flux de lecture du lecteur web audiomack.com :
// recherche (livesearch), puis lien audio signé (music/play), sans compte.
package audiomack

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Identifiants du client web, publiés en clair dans le bundle JavaScript d'audiomack.com
// (API_CONSUMER_KEY / API_CONSUMER_SECRET). Quand Audiomack les change, les appels
// renvoient 401 jusqu'à mise à jour de ces deux constantes.
const (
	DefaultConsumerKey    = "audiomack-web"
	DefaultConsumerSecret = "bd8a07e9f23fbe9d808646b730f89b8e"
	defaultBaseURL        = "https://api.audiomack.com/v1"
	defaultUserAgent      = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
)

type Client struct {
	http           *http.Client
	baseURL        string
	consumerKey    string
	consumerSecret string
	token          string // jeton de session d'un compte (oauth_token), vide : appels anonymes
	tokenSecret    string
	userAgent      string
	now            func() time.Time
	nonce          func() string
}

type Option func(*Client)

func WithHTTPClient(httpClient *http.Client) Option {
	return func(c *Client) {
		if httpClient != nil {
			c.http = httpClient
		}
	}
}

func WithBaseURL(baseURL string) Option {
	return func(c *Client) {
		if baseURL != "" {
			c.baseURL = strings.TrimRight(baseURL, "/")
		}
	}
}

func WithConsumer(key, secret string) Option {
	return func(c *Client) {
		if key != "" && secret != "" {
			c.consumerKey, c.consumerSecret = key, secret
		}
	}
}

// WithUserToken signe les appels avec la session d'un compte Audiomack (oauth_token et son secret,
// rendus par /v1/access_token). Nécessaire pour les suggestions (recommendations/…).
func WithUserToken(token, secret string) Option {
	return func(c *Client) {
		if token != "" && secret != "" {
			c.token, c.tokenSecret = token, secret
		}
	}
}

// HasUserToken indique si le client est connecté à un compte.
func (c *Client) HasUserToken() bool { return c.token != "" }

func New(opts ...Option) *Client {
	c := &Client{
		http:           &http.Client{Timeout: 15 * time.Second},
		baseURL:        defaultBaseURL,
		consumerKey:    DefaultConsumerKey,
		consumerSecret: DefaultConsumerSecret,
		userAgent:      defaultUserAgent,
		now:            time.Now,
		nonce:          randomNonce,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// APIError est une réponse non 2xx de l'API Audiomack.
type APIError struct {
	Status int
	Body   string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("audiomack: HTTP %d: %s", e.Status, e.Body)
}

// get signe la requête en OAuth 1.0 (HMAC-SHA1, sans jeton utilisateur) et décode le JSON.
func (c *Client) get(ctx context.Context, path string, params url.Values, out any) error {
	endpoint := c.baseURL + path
	signed := c.sign(http.MethodGet, endpoint, params)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint+"?"+signed.Encode(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", c.userAgent)
	req.Header.Set("Referer", "https://audiomack.com/")
	req.Header.Set("Accept", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return &APIError{Status: resp.StatusCode, Body: truncate(string(body), 200)}
	}
	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("audiomack: réponse illisible: %w", err)
	}
	return nil
}

// sign renvoie params complétés des champs oauth_* et de la signature.
func (c *Client) sign(method, endpoint string, params url.Values) url.Values {
	signed := url.Values{}
	for k, v := range params {
		signed[k] = append([]string(nil), v...)
	}
	signed.Set("oauth_consumer_key", c.consumerKey)
	if c.token != "" {
		signed.Set("oauth_token", c.token)
	}
	signed.Set("oauth_nonce", c.nonce())
	signed.Set("oauth_signature_method", "HMAC-SHA1")
	signed.Set("oauth_timestamp", strconv.FormatInt(c.now().Unix(), 10))
	signed.Set("oauth_version", "1.0")
	signed.Set("oauth_signature", signatureWithToken(method, endpoint, signed, c.consumerSecret, c.tokenSecret))
	return signed
}

// signature applique RFC 5849 §3.4 : base = METHODE&url&paramètres triés, clé = secret&.
func signature(method, endpoint string, params url.Values, consumerSecret string) string {
	return signatureWithToken(method, endpoint, params, consumerSecret, "")
}

// signatureWithToken : clé = secret_client&secret_jeton (vide pour un appel anonyme).
func signatureWithToken(method, endpoint string, params url.Values, consumerSecret, tokenSecret string) string {
	pairs := make([]string, 0, len(params))
	for k, values := range params {
		if k == "oauth_signature" {
			continue
		}
		for _, v := range values {
			pairs = append(pairs, percentEncode(k)+"="+percentEncode(v))
		}
	}
	sort.Strings(pairs)
	base := strings.ToUpper(method) + "&" + percentEncode(endpoint) + "&" + percentEncode(strings.Join(pairs, "&"))
	mac := hmac.New(sha1.New, []byte(percentEncode(consumerSecret)+"&"+percentEncode(tokenSecret)))
	mac.Write([]byte(base))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// percentEncode suit RFC 3986 : seuls A-Z a-z 0-9 - . _ ~ restent en clair.
func percentEncode(s string) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		ch := s[i]
		if ('A' <= ch && ch <= 'Z') || ('a' <= ch && ch <= 'z') || ('0' <= ch && ch <= '9') ||
			ch == '-' || ch == '.' || ch == '_' || ch == '~' {
			b.WriteByte(ch)
			continue
		}
		fmt.Fprintf(&b, "%%%02X", ch)
	}
	return b.String()
}

func randomNonce() string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	for i := range buf {
		buf[i] = alphabet[int(buf[i])%len(alphabet)]
	}
	return string(buf)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
