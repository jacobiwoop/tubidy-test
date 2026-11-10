package server

import "testing"

func TestSplitVideoTitle(t *testing.T) {
	cases := []struct{ title, channel, artist, song string }{
		{"Burna Boy - On The Low [Official Music Video]", "Burna Boy", "Burna Boy", "On The Low"},
		{"Pheelz - Finesse (ft. BNXN) [Official Music Video]", "Pheelz", "Pheelz", "Finesse (ft. BNXN)"},
		{"Last Last", "BurnaBoyVEVO", "BurnaBoy", "Last Last"},
		{"Ye (Official Audio)", "Burna Boy - Topic", "Burna Boy", "Ye"},
		{"Phénoménal // Clip officiel // 2025", "JuL", "JuL", "Phénoménal"},
		{`Zoo (From "Zootopia 2") Official Music Video`, "Shakira", "Shakira", "Zoo"},
		{"GIMS - Corazon ft. Lil Wayne & French Montana", "GIMS", "GIMS", "Corazon"},
		{"Lartiste - Chocolat feat. Awa Imani", "Lartiste", "Lartiste", "Chocolat"},
		{"Keblack Ft. Guy2Bezbar - Melrose Place", "Keblack", "Keblack Ft. Guy2Bezbar", "Melrose Place"},
		{"Paroles Paroles", "Dalida", "Dalida", "Paroles Paroles"},
	}
	for _, c := range cases {
		a, s := splitVideoTitle(c.title, c.channel)
		if a != c.artist || s != c.song {
			t.Errorf("splitVideoTitle(%q, %q) = (%q, %q), attendu (%q, %q)", c.title, c.channel, a, s, c.artist, c.song)
		}
	}
}

func TestParseClock(t *testing.T) {
	for in, want := range map[string]int{"3:45": 225, "1:02:03": 3723, "": 0, "x": 0} {
		if got := parseClock(in); got != want {
			t.Errorf("parseClock(%q) = %d, attendu %d", in, got, want)
		}
	}
}
