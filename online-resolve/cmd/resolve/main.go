// Commande resolve : résout un titre sur toutes les sources en parallèle, ou lance le serveur HTTP.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"online-resolve/provider"
	"online-resolve/server"
	"online-resolve/tubidy"
	"online-resolve/waptrick"
)

func main() {
	query := flag.String("q", "", "recherche, au format de l'app : \"<artistes> <titre>\" (noms Spotify)")
	duration := flag.Int("duration", 0, "durée Spotify en secondes, pour reconnaître le bon enregistrement (0 : pas de vérification)")
	only := flag.String("providers", "audiomack,netease,kuwo,qq,waptrick", "sources à interroger, dans l'ordre de préférence")
	tubidyBase := flag.String("tubidy-base", tubidy.DefaultBaseURL, "miroir Tubidy à contacter")
	timeout := flag.Duration("timeout", 15*time.Second, "délai maximal par recherche")
	all := flag.Bool("all", false, "attendre toutes les sources au lieu de rendre le premier lien (comparaison)")
	asJSON := flag.Bool("json", false, "sortie JSON")
	serve := flag.String("serve", "", "lancer le serveur HTTP sur cette adresse (ex. :8090)")
	apiKey := flag.String("api-key", os.Getenv("RESOLVE_API_KEY"), "clé exigée dans l'en-tête X-Api-Key du serveur (vide : accès libre)")
	flag.Parse()

	providers, err := buildProviders(*only, *tubidyBase)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	cfg := server.ConfigFromEnv() // clients du catalogue (Audiomack, Spotify) et compte de service éventuel
	cfg.Providers, cfg.Timeout, cfg.APIKey = providers, *timeout, *apiKey

	if *serve != "" {
		log.Printf("serveur sur http://localhost%s (clé d'accès : %v)", *serve, cfg.APIKey != "")
		log.Fatal(http.ListenAndServe(*serve, server.Mux(cfg)))
	}
	if strings.TrimSpace(*query) == "" {
		fmt.Fprintln(os.Stderr, `usage: resolve -q "<artistes> <titre>" [-duration 249] [-providers audiomack,tubidy] [-all] [-json]`)
		fmt.Fprintln(os.Stderr, "       resolve -serve :8090 [-api-key …]")
		os.Exit(2)
	}

	resp := server.Resolve(context.Background(), cfg, provider.Query{Text: *query, DurationSec: *duration}, *all)
	if *asJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(resp)
	} else {
		printResponse(resp)
	}
	if resp.Best == nil {
		os.Exit(1)
	}
}

func printResponse(resp server.Response) {
	fmt.Printf("« %s » (%d s) — mode %s, %d ms au total\n", resp.Query, resp.Duration, resp.Mode, resp.TotalMs)
	for _, o := range resp.Outcomes {
		if o.Result == nil {
			fmt.Printf("  ✗ %-10s %5d ms  %s\n", o.Provider, o.Ms, o.Error)
			continue
		}
		r := o.Result
		name := r.Title
		if r.Artist != "" {
			name = r.Artist + " - " + r.Title
		}
		fmt.Printf("  ✓ %-10s %5d ms  %s [%s, %d s]\n                        %s\n", o.Provider, o.Ms, name, r.Format, r.DurationSec, r.StreamURL)
	}
	if resp.Best != nil {
		fmt.Printf("→ gagnant : %s\n", resp.Best.Provider)
	}
}

func buildProviders(list, tubidyBase string) ([]provider.Provider, error) {
	var out []provider.Provider
	for _, name := range strings.Split(list, ",") {
		switch strings.TrimSpace(name) {
		case "audiomack":
			out = append(out, provider.NewAudiomack(nil))
		case "netease":
			out = append(out, provider.NewNetEase(nil))
		case "kuwo":
			out = append(out, provider.NewKuwo(nil))
		case "qq":
			out = append(out, provider.NewQQ(nil))
		case "joox":
			out = append(out, provider.NewJOOX(os.Getenv("JOOX_TOKEN")))
		case "waptrick":
			out = append(out, provider.NewWaptrick(waptrick.New()))
		case "tubidy":
			out = append(out, provider.NewTubidy(tubidy.New(tubidy.WithBaseURL(tubidyBase))))
		case "":
		default:
			return nil, fmt.Errorf("source inconnue %q (disponibles : audiomack, netease, kuwo, qq, joox, waptrick, tubidy)", name)
		}
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("aucune source sélectionnée")
	}
	return out, nil
}
