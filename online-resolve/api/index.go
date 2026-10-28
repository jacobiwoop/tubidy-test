// Fonction Vercel unique pour toute l'API : /api/<route> est réécrit vers /api/index?route=<route> (vercel.json).
// Variables : RESOLVE_API_KEY, TUBIDY_BASE_URL, AUDIOMACK_TOKEN, AUDIOMACK_TOKEN_SECRET.
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
