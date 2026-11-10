package provider

import (
	"strings"
	"unicode"
)

// ContainsCJK vérifie si la chaîne contient des caractères d'Asie orientale
// (Hiragana, Katakana, Hanzi/Kanji, Hangul).
func ContainsCJK(s string) bool {
	for _, r := range s {
		if unicode.Is(unicode.Han, r) ||
			unicode.Is(unicode.Hiragana, r) ||
			unicode.Is(unicode.Katakana, r) ||
			(r >= 0x3000 && r <= 0x303F) || // Symboles et ponctuation CJK (ex: 《 》 「 」)
			(r >= 0xAC00 && r <= 0xD7AF) { // Hangul coréen
			return true
		}
	}
	return false
}

// digraphs mappe les combinaisons de 2 caractères (yōon) en Romaji.
var digraphs = map[string]string{
	// Hiragana
	"きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
	"しゃ": "sha", "しゅ": "shu", "しょ": "sho",
	"ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
	"にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
	"ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
	"みゃ": "mya", "みゅ": "myu", "みょ": "myo",
	"りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
	"ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
	"じゃ": "ja", "じゅ": "ju", "じょ": "jo",
	"びゃ": "bya", "びゅ": "byu", "びょ": "byo",
	"ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
	// Katakana
	"キャ": "kya", "キュ": "kyu", "キョ": "kyo",
	"シャ": "sha", "シュ": "shu", "ショ": "sho",
	"チャ": "cha", "チュ": "chu", "チョ": "cho",
	"ニャ": "nya", "ニュ": "nyu", "ニョ": "nyo",
	"ヒャ": "hya", "ヒュ": "hyu", "ヒョ": "hyo",
	"ミャ": "mya", "ミュ": "myu", "ミョ": "myo",
	"リャ": "rya", "リュ": "ryu", "リョ": "ryo",
	"ギャ": "gya", "ギュ": "gyu", "ギョ": "gyo",
	"ジャ": "ja", "ジュ": "ju", "ジョ": "jo",
	"ビャ": "bya", "ビュ": "byu", "ビョ": "byo",
	"ピャ": "pya", "ピュ": "pyu", "ピョ": "pyo",
	"ファ": "fa", "フィ": "fi", "フェ": "fe", "フォ": "fo",
	"ティ": "ti", "ディ": "di", "トゥ": "tu", "ドゥ": "du",
	"ヴァ": "va", "ヴィ": "vi", "ヴェ": "ve", "ヴォ": "vo",
	"チェ": "che", "シェ": "she", "ジェ": "je",
}

// kanaMap mappe chaque caractère Hiragana / Katakana vers sa prononciation latine (Hepburn).
var kanaMap = map[rune]string{
	// Hiragana
	'あ': "a", 'い': "i", 'う': "u", 'え': "e", 'お': "o",
	'か': "ka", 'き': "ki", 'く': "ku", 'け': "ke", 'こ': "ko",
	'さ': "sa", 'し': "shi", 'す': "su", 'せ': "se", 'そ': "so",
	'た': "ta", 'ち': "chi", 'つ': "tsu", 'て': "te", 'と': "to",
	'な': "na", 'に': "ni", 'ぬ': "nu", 'ね': "ne", 'の': "no",
	'は': "ha", 'ひ': "hi", 'ふ': "fu", 'へ': "he", 'ほ': "ho",
	'ま': "ma", 'み': "mi", 'む': "mu", 'め': "me", 'も': "mo",
	'や': "ya", 'ゆ': "yu", 'よ': "yo",
	'ら': "ra", 'り': "ri", 'る': "ru", 'れ': "re", 'ろ': "ro",
	'わ': "wa", 'ゐ': "wi", 'ゑ': "we", 'を': "o", 'ん': "n",
	'が': "ga", 'ぎ': "gi", 'ぐ': "gu", 'げ': "ge", 'ご': "go",
	'ざ': "za", 'じ': "ji", 'ず': "zu", 'ぜ': "ze", 'ぞ': "zo",
	'だ': "da", 'ぢ': "ji", 'づ': "zu", 'で': "de", 'ど': "do",
	'ば': "ba", 'び': "bi", 'ぶ': "bu", 'べ': "be", 'ぼ': "bo",
	'ぱ': "pa", 'ぴ': "pi", 'ぷ': "pu", 'ぺ': "pe", 'ぽ': "po",
	'ぁ': "a", 'ぃ': "i", 'ぅ': "u", 'ぇ': "e", 'ぉ': "o",

	// Katakana
	'ア': "a", 'イ': "i", 'ウ': "u", 'エ': "e", 'オ': "o",
	'カ': "ka", 'キ': "ki", 'ク': "ku", 'ケ': "ke", 'コ': "ko",
	'サ': "sa", 'シ': "shi", 'ス': "su", 'セ': "se", 'ソ': "so",
	'タ': "ta", 'チ': "chi", 'ツ': "tsu", 'テ': "te", 'ト': "to",
	'ナ': "na", 'ニ': "ni", 'ヌ': "nu", 'ネ': "ne", 'ノ': "no",
	'ハ': "ha", 'ヒ': "hi", 'フ': "fu", 'ヘ': "he", 'ホ': "ho",
	'マ': "ma", 'ミ': "mi", 'ム': "mu", 'メ': "me", 'モ': "mo",
	'ヤ': "ya", 'ユ': "yu", 'ヨ': "yo",
	'ラ': "ra", 'リ': "ri", 'ル': "ru", 'レ': "re", 'ロ': "ro",
	'ワ': "wa", 'ヰ': "wi", 'ヱ': "we", 'ヲ': "o", 'ン': "n",
	'ガ': "ga", 'ギ': "gi", 'グ': "gu", 'ゲ': "ge", 'ゴ': "go",
	'ザ': "za", 'ジ': "ji", 'ズ': "zu", 'ゼ': "ze", 'ゾ': "zo",
	'ダ': "da", 'ヂ': "ji", 'ヅ': "zu", 'デ': "de", 'ド': "do",
	'バ': "ba", 'ビ': "bi", 'ブ': "bu", 'ベ': "be", 'ボ': "bo",
	'パ': "pa", 'ピ': "pi", 'プ': "pu", 'ペ': "pe", 'ポ': "po",
	'ヴ': "vu",
	'ァ': "a", 'ィ': "i", 'ゥ': "u", 'ェ': "e", 'ォ': "o",
}

// TransliterateKana convertit les Hiraganas et Katakanas d'une chaîne en Romaji (alphabet latin).
// Les caractères déjà en alphabet latin ou les idéogrammes non-kana restent inchangés.
func TransliterateKana(s string) string {
	runes := []rune(s)
	n := len(runes)
	var b strings.Builder
	b.Grow(n * 2)

	for i := 0; i < n; i++ {
		// 1. Essai digramme (ex: きゃ, キョ)
		if i+1 < n {
			pair := string(runes[i : i+2])
			if rom, ok := digraphs[pair]; ok {
				b.WriteString(rom)
				i++
				continue
			}
		}

		r := runes[i]

		// 2. Sokuon (petit tsu っ / ッ) : double la consonne suivante
		if r == 'っ' || r == 'ッ' {
			if i+1 < n {
				nextRom := ""
				if i+2 <= n {
					if rom, ok := digraphs[string(runes[i+1:i+2])]; ok {
						nextRom = rom
					}
				}
				if nextRom == "" {
					nextRom = kanaMap[runes[i+1]]
				}
				if len(nextRom) > 0 {
					first := nextRom[0]
					if first == 'c' { // ex: っち -> tchi
						b.WriteByte('t')
					} else {
						b.WriteByte(first)
					}
				}
			}
			continue
		}

		// 3. Chōonpu (ー trait d'allongement katakana)
		if r == 'ー' {
			continue
		}

		// 4. Caractère kana simple
		if rom, ok := kanaMap[r]; ok {
			b.WriteString(rom)
			continue
		}

		// 5. Autre caractère (alphabet latin, chiffre, ponctuation, kanji)
		b.WriteRune(r)
	}

	return b.String()
}
