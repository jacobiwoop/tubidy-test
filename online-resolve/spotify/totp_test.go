package spotify

import "testing"

func TestBase32DecodesRFC4648Vector(t *testing.T) {
	got, err := base32Decode("MZXW6YTBOI======")
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "foobar" {
		t.Fatalf("decoded %q, want foobar", got)
	}
}

func TestTOTPIsSixDigitsAndStableWithinWindow(t *testing.T) {
	code, err := TOTP(1_700_000_010_000)
	if err != nil {
		t.Fatal(err)
	}
	next, err := TOTP(1_700_000_015_000)
	if err != nil {
		t.Fatal(err)
	}
	if len(code) != 6 {
		t.Fatalf("code length = %d, want 6", len(code))
	}
	if code != next {
		t.Fatalf("same window changed: %s != %s", code, next)
	}
}
