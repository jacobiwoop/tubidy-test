package spotify

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/binary"
	"fmt"
	"strings"
)

const (
	totpSecret  = "GM3TMMJTGYZTQNZVGM4DINJZHA4TGOBYGMZTCMRTGEYDSMJRHE4TEOBUG4YTCMRUGQ4DQOJUGQYTAMRRGA2TCMJSHE3TCMBY"
	TOTPVersion = 61
)

// TOTP generates the six-digit code expected by Spotify's web-player token endpoint.
func TOTP(unixMillis int64) (string, error) {
	key, err := base32Decode(totpSecret)
	if err != nil {
		return "", err
	}
	counter := uint64(unixMillis / 1000 / 30)
	msg := make([]byte, 8)
	binary.BigEndian.PutUint64(msg, counter)

	mac := hmac.New(sha1.New, key)
	if _, err := mac.Write(msg); err != nil {
		return "", err
	}
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	bin := (uint32(sum[offset])&0x7f)<<24 |
		(uint32(sum[offset+1])&0xff)<<16 |
		(uint32(sum[offset+2])&0xff)<<8 |
		(uint32(sum[offset+3]) & 0xff)
	return fmt.Sprintf("%06d", bin%1_000_000), nil
}

func base32Decode(input string) ([]byte, error) {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
	clean := strings.TrimRight(strings.ToUpper(strings.TrimSpace(input)), "=")
	out := make([]byte, 0, len(clean)*5/8)
	var buffer uint
	var bits uint
	for _, r := range clean {
		value := strings.IndexRune(alphabet, r)
		if value < 0 {
			return nil, fmt.Errorf("invalid base32 character %q", r)
		}
		buffer = (buffer << 5) | uint(value)
		bits += 5
		if bits >= 8 {
			bits -= 8
			out = append(out, byte((buffer>>bits)&0xff))
		}
	}
	return out, nil
}
