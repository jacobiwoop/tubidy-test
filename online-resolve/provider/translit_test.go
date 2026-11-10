package provider

import "testing"

func TestTransliterateKana(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"いきものがかり", "ikimonogakari"},
		{"ブルーバード", "burubado"},
		{"きっぷ", "kippu"},
		{"ロック", "rokku"},
		{"きゃべつ", "kyabetsu"},
		{"ショパン", "shopan"},
		{"YOASOBI", "YOASOBI"},
		{"Lemon", "Lemon"},
		{"NARUTO -ナルト- 疾風伝", "NARUTO -naruto- 疾風伝"},
	}

	for _, c := range cases {
		got := TransliterateKana(c.input)
		if got != c.want {
			t.Errorf("TransliterateKana(%q) = %q, attendu %q", c.input, got, c.want)
		}
	}
}

func TestContainsCJK(t *testing.T) {
	if !ContainsCJK("ブルーバード") {
		t.Error("ContainsCJK(ブルーバード) attendu true")
	}
	if !ContainsCJK("いきものがかり") {
		t.Error("ContainsCJK(いきものがかり) attendu true")
	}
	if !ContainsCJK("火影忍者") {
		t.Error("ContainsCJK(火影忍者) attendu true")
	}
	if !ContainsCJK("《疾风传》") {
		t.Error("ContainsCJK(《疾风传》) attendu true")
	}
	if ContainsCJK("Ikimonogakari Blue Bird") {
		t.Error("ContainsCJK(Ikimonogakari Blue Bird) attendu false")
	}
}
