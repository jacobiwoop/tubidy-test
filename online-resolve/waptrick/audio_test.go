package waptrick

import "testing"

func frame128() []byte { return []byte{0xFF, 0xFB, 0x90, 0x00} } // MPEG1 Layer III, 128 kbit/s, 44,1 kHz, stéréo

func TestMP3DurationFromBitrateAndFromXing(t *testing.T) {
	if got := mp3Duration(frame128(), 0, 2738512); got != 171 {
		t.Fatalf("débit constant : %d s, attendu 171", got)
	}
	vbr := append(frame128(), make([]byte, 32)...)
	vbr = append(vbr, "Xing"...)
	vbr = append(vbr, 0, 0, 0, 1, 0, 0, 0x1C, 0x20) // 7200 trames × 1152 / 44100 = 188 s
	if got := mp3Duration(vbr, 0, 999); got != 188 {
		t.Fatalf("Xing : %d s, attendu 188", got)
	}
	if got := mp3Duration([]byte("pas un mp3"), 0, 999); got != 0 {
		t.Fatalf("non MP3 : %d", got)
	}
}
