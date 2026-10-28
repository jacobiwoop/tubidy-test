package lyrics

import (
	"encoding/xml"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode"
)

// TTML, le format d'Apple Music repris par lrc.red, BiniLyrics et Unison : un <p> par ligne, un <span> par
// syllabe, les chœurs dans un <span ttm:role="x-bg">. Même lecture que parseTTML du composant.

type xnode struct {
	name     string // nom local, sans préfixe
	attrs    map[string]string
	children []*xnode
	text     string // nœud texte quand name == ""
	parent   *xnode
}

func (n *xnode) attr(local string) string { return n.attrs[local] }

func (n *xnode) textContent() string {
	if n.name == "" {
		return n.text
	}
	var b strings.Builder
	for _, c := range n.children {
		b.WriteString(c.textContent())
	}
	return b.String()
}

func (n *xnode) all(name string, out *[]*xnode) {
	for _, c := range n.children {
		if c.name == name {
			*out = append(*out, c)
		}
		c.all(name, out)
	}
}

func (n *xnode) find(name string) []*xnode {
	var out []*xnode
	n.all(name, &out)
	return out
}

// nextIsSpace : le nœud suivant est du texte qui commence par une espace (fin de mot).
func (n *xnode) nextIsSpace() bool {
	if n.parent == nil {
		return false
	}
	sib := n.parent.children
	for i, c := range sib {
		if c == n && i+1 < len(sib) {
			next := sib[i+1]
			return next.name == "" && next.text != "" && strings.TrimLeft(next.text, " \t\r\n") != next.text
		}
	}
	return false
}

func parseXML(s string) (*xnode, error) {
	d := xml.NewDecoder(strings.NewReader(s))
	d.Strict = false
	root := &xnode{name: "#root", attrs: map[string]string{}}
	cur := root
	for {
		tok, err := d.Token()
		if err != nil {
			if cur == root || err.Error() == "EOF" {
				break
			}
			return nil, err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			n := &xnode{name: t.Name.Local, attrs: map[string]string{}, parent: cur}
			for _, a := range t.Attr {
				n.attrs[a.Name.Local] = a.Value
			}
			cur.children = append(cur.children, n)
			cur = n
		case xml.EndElement:
			if cur.parent != nil {
				cur = cur.parent
			}
		case xml.CharData:
			cur.children = append(cur.children, &xnode{text: string(t), parent: cur})
		}
	}
	return root, nil
}

var ttmlUnit = regexp.MustCompile(`^(-?\d+(?:\.\d+)?)(ms|h|m|s)$`)

// ttmlTime lit « 1:02.5 », « 62.5 », « 62.5s », « 900ms »… ; fallback si vide ou illisible.
func ttmlTime(v string, fallback int64) int64 {
	v = strings.ToLower(strings.TrimSpace(v))
	if v == "" {
		return fallback
	}
	if m := ttmlUnit.FindStringSubmatch(v); m != nil {
		n, _ := strconv.ParseFloat(m[1], 64)
		mult := map[string]float64{"ms": 1, "s": 1000, "m": 60_000, "h": 3_600_000}[m[2]]
		return int64(math.Max(0, math.Round(n*mult)))
	}
	var secs float64
	parts := strings.Split(v, ":")
	if len(parts) > 3 {
		return fallback
	}
	for _, p := range parts {
		n, err := strconv.ParseFloat(p, 64)
		if err != nil {
			return fallback
		}
		secs = secs*60 + n
	}
	return int64(math.Max(0, math.Round(secs*1000)))
}

func isRTL(lang string) bool {
	primary, _, _ := strings.Cut(strings.ReplaceAll(strings.ToLower(lang), "_", "-"), "-")
	switch primary {
	case "ar", "dv", "fa", "he", "ku", "ps", "ur", "yi":
		return true
	}
	return false
}

// parseTTML rend les lignes triées par heure de début et les auteurs.
func parseTTML(s string) ([]RichLine, string) {
	root, err := parseXML(s)
	if err != nil {
		return nil, ""
	}
	docLang := ""
	for _, c := range root.children {
		if c.name != "" {
			docLang = c.attr("lang")
			break
		}
	}
	agents := map[string]string{}
	for _, a := range root.find("agent") {
		if id, typ := a.attr("id"), a.attr("type"); id != "" && typ != "" {
			agents[id] = typ
		}
	}
	var writers []string
	for _, w := range root.find("songwriter") {
		if t := w.textContent(); t != "" {
			writers = append(writers, t)
		}
	}
	translations := map[string]string{}
	for _, tr := range root.find("translation") {
		for _, t := range tr.find("text") {
			if k := t.attr("for"); k != "" && t.textContent() != "" {
				translations[k] = t.textContent()
			}
		}
	}

	var lines []RichLine
	for _, p := range root.find("p") {
		begin := ttmlTime(p.attr("begin"), 0)
		end := ttmlTime(p.attr("end"), begin)
		lang := p.attr("lang")
		if lang == "" {
			lang = docLang
		}
		songPart := ""
		if p.parent != nil && p.parent.name == "div" {
			songPart = p.parent.attr("songPart")
		}
		spans := p.find("span")
		isBg := func(s *xnode) bool {
			return s.attr("role") == "x-bg" || (s.parent != nil && s.parent.attr("role") == "x-bg")
		}
		wordSync := false
		for _, s := range spans {
			if !isBg(s) && s.attr("begin") != "" && s.attr("end") != "" {
				wordSync = true
				break
			}
		}
		syl := func(s *xnode, lineBegin, lineEnd int64) Syllable {
			text := s.textContent()
			if s.nextIsSpace() && !strings.HasSuffix(text, " ") {
				text += " "
			}
			ts := ttmlTime(s.attr("begin"), lineBegin)
			return Syllable{
				Text: text, Timestamp: ts, Endtime: max(ts, ttmlTime(s.attr("end"), lineEnd)),
				Part: strings.TrimRightFunc(text, unicode.IsSpace) == text,
			}
		}
		var main, bg []Syllable
		for _, s := range spans {
			if s.attr("role") == "x-bg" {
				for _, inner := range s.find("span") {
					bg = append(bg, syl(inner, begin, end))
				}
				continue
			}
			if s.parent != nil && s.parent.attr("role") == "x-bg" {
				continue
			}
			main = append(main, syl(s, begin, end))
		}
		if len(main) == 0 {
			var b strings.Builder
			for _, c := range p.children {
				if !(c.name != "" && c.attr("role") == "x-bg") {
					b.WriteString(c.textContent())
				}
			}
			main = []Syllable{{Text: strings.TrimSpace(b.String()), Timestamp: begin, Endtime: end, LineSynced: true}}
		}
		if p.attr("begin") == "" {
			begin = main[0].Timestamp
			for _, s := range main {
				begin = min(begin, s.Timestamp)
			}
		}
		end = max(end, begin)
		for _, s := range append(append([]Syllable{}, main...), bg...) {
			end = max(end, s.Endtime)
		}
		key := p.attr("key")
		dir := ""
		if p.attr("dir") == "rtl" || (lang != "" && isRTL(lang)) {
			dir = "rtl"
		}
		lines = append(lines, RichLine{
			Text: main, Background: len(bg) > 0, BackgroundText: nonNil(bg), Timestamp: begin, Endtime: end,
			IsWordSynced: wordSync, SongPart: songPart, Translation: translations[key],
			AgentID: p.attr("agent"), Direction: dir,
		})
	}
	sort.SliceStable(lines, func(i, j int) bool { return lines[i].Timestamp < lines[j].Timestamp })
	singers := make([]string, len(lines))
	for i, l := range lines {
		singers[i] = l.AgentID
	}
	for i, a := range lineAlignments(singers, agents) {
		lines[i].Alignment = a
		lines[i].OppositeTurn = a == "end"
	}
	return lines, strings.Join(writers, ", ")
}

func nonNil(s []Syllable) []Syllable {
	if s == nil {
		return []Syllable{}
	}
	return s
}

// lineAlignments place les chanteurs d'un duo à gauche et à droite (calculateLineAlignments du composant) :
// on change de côté à chaque changement de chanteur ; un groupe reste à gauche.
func lineAlignments(singers []string, types map[string]string) []string {
	out := make([]string, len(singers))
	left, last := true, ""
	right, total := 0, 0
	for i, id := range singers {
		if id == "" {
			continue
		}
		typ := types[id]
		if typ == "" {
			switch id {
			case "v1000":
				typ = "group"
			case "v2000":
				typ = "other"
			default:
				typ = "person"
			}
		}
		side := "start"
		if typ != "group" {
			if last == "" {
				left = typ != "other"
			} else if id != last {
				left = !left
			}
			if !left {
				side = "end"
			}
			last = id
		}
		out[i] = side
		total++
		if side == "end" {
			right++
		}
	}
	if total > 0 && math.Round(float64(right)/float64(total)*100) >= 85 {
		for i, s := range out {
			switch s {
			case "start":
				out[i] = "end"
			case "end":
				out[i] = "start"
			}
		}
	}
	return out
}
