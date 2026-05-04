const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api'; // On suppose que ton serveur tourne localement ou on utilise l'URL directe

async function testLastFM() {
    const artist = "Daft Punk";
    const track = "One More Time";
    
    console.log(`[Test] Recherche de morceaux similaires pour : ${artist} - ${track}...`);
    
    try {
        // Note: Si ton serveur n'est pas lancé localement, on peut appeler directement la logique si on veut,
        // mais tester la route API est plus complet.
        // Ici, je vais simuler l'appel à ton endpoint /recommend
        
        const response = await axios.get(`${BASE_URL}/recommend`, {
            params: { artist, track }
        });
        
        const tracks = response.data.track;
        
        if (tracks && tracks.length > 0) {
            console.log(`[Succès] ${tracks.length} suggestions Last.fm trouvées !`);
            tracks.forEach((t, i) => {
                console.log(`${i + 1}. ${t.artist.name} - ${t.title} (ID: ${t.id})`);
            });
        } else {
            console.log("[Info] Aucune suggestion trouvée ou clé API manquante.");
            if (response.data.error) console.log("Erreur rapportée :", response.data.error);
        }
        
    } catch (error) {
        console.error("[Erreur] Le serveur ne répond pas sur /api/recommend. Est-il lancé ?");
        console.error("Détail :", error.message);
    }
}

testLastFM();
