// Fonction Vercel unique pour toute l'API : /api/<route> est réécrit vers /api/index?route=<route> (vercel.json).
// Variables : RESOLVE_API_KEY, AUDIOMACK_TOKEN, AUDIOMACK_TOKEN_SECRET, RELAY_URL, RELAY_SECRET, JOOX_TOKEN (facultatif).
package handler

import (
	"net/http"

	"online-resolve/server"
)

// Créé une fois par instance : clients, cookie Anubis de Tubidy et cache restent chauds entre deux appels.
var api = server.API(server.ConfigFromEnv())

func Handler(w http.ResponseWriter, r *http.Request) {
	api(w, r)
}
