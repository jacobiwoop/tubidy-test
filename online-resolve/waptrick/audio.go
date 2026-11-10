package waptrick

import (
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

const probeBytes = 16 << 10

// probe rend la durée du MP3 en secondes, sans le télécharger : 0 si elle ne se calcule pas.
func probe(ctx context.Context, h *http.Client, userAgent, fileURL string) (int, error) {
	head, total, err := rangeGet(ctx, h, userAgent, fileURL, 0)
	if err != nil {
		return 0, err
	}
	// Une pochette dans le tag ID3 peut repousser l'audio bien après ce premier morceau.
	start := id3Size(head)
	if start >= len(head)-4 && int64(start) < total {
		head, _, err = rangeGet(ctx, h, userAgent, fileURL, int64(start))
		if err != nil {
			return 0, err
		}
		return mp3Duration(head, 0, total-int64(start)), nil
	}
	return mp3Duration(head, start, total-int64(start)), nil
}

func rangeGet(ctx context.Context, h *http.Client, userAgent, fileURL string, from int64) ([]byte, int64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fileURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Range", fmt.Sprintf("bytes=%d-%d", from, from+probeBytes-1))
	res, err := h.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusPartialContent && res.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("waptrick : fichier HTTP %d", res.StatusCode)
	}
	total := res.ContentLength
	if cr := res.Header.Get("Content-Range"); cr != "" {
		if i := strings.LastIndexByte(cr, '/'); i >= 0 {
			total, _ = strconv.ParseInt(cr[i+1:], 10, 64)
		}
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, probeBytes))
	return data, total, err
}

func id3Size(b []byte) int {
	if len(b) < 10 || string(b[:3]) != "ID3" {
		return 0
	}
	return 10 + int(b[6])<<21 + int(b[7])<<14 + int(b[8])<<7 + int(b[9])
}

var (
	bitratesV1 = [16]int{0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0}
	bitratesV2 = [16]int{0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0}
	rates      = [4]int{44100, 48000, 32000, 0}
)

// mp3Duration lit la première trame MPEG Layer III à partir de start. Avec un en-tête Xing/Info (débit variable),
// la durée vient du nombre de trames ; sinon de la taille audio et du débit.
func mp3Duration(b []byte, start int, audioBytes int64) int {
	for i := start; i+4 <= len(b); i++ {
		if b[i] != 0xFF || b[i+1]&0xE0 != 0xE0 {
			continue
		}
		version, layer := b[i+1]>>3&3, b[i+1]>>1&3
		brIdx, srIdx := b[i+2]>>4, b[i+2]>>2&3
		if version == 1 || layer != 1 || rates[srIdx] == 0 {
			continue
		}
		mpeg1 := version == 3
		kbps := bitratesV2[brIdx]
		rate, samples := rates[srIdx]/2, 576
		if version == 0 { // MPEG 2.5
			rate = rates[srIdx] / 4
		}
		if mpeg1 {
			kbps, rate, samples = bitratesV1[brIdx], rates[srIdx], 1152
		}
		if kbps == 0 {
			continue
		}
		mono := b[i+3]>>6 == 3
		side := map[[2]bool]int{{true, false}: 32, {true, true}: 17, {false, false}: 17, {false, true}: 9}[[2]bool{mpeg1, mono}]
		if x := i + 4 + side; x+12 <= len(b) && (string(b[x:x+4]) == "Xing" || string(b[x:x+4]) == "Info") && b[x+7]&1 == 1 {
			frames := binary.BigEndian.Uint32(b[x+8 : x+12])
			return int(int64(frames) * int64(samples) / int64(rate))
		}
		return int(audioBytes * 8 / int64(kbps*1000))
	}
	return 0
}
