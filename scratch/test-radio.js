const deezerService = require("../services/deezer.service");

async function testRadio() {
    const trackId = "1109731"; // ID pour "Daft Punk - One More Time" (un classique)
    console.log(`[Test] Récupération de la radio pour le titre ID: ${trackId}...`);
    
    try {
        const track = await deezerService.getTrack(trackId);
        console.log(`[Test] Morceau trouvé : "${track.title}" par ${track.artist.name} (Artist ID: ${track.artist.id})`);
        
        const radio = await deezerService.getTrackRadio(trackId);
        
        if (radio && radio.data) {
            console.log(`[Succès] ${radio.data.length} morceaux suggérés trouvés !`);
            console.log("\nVoici les 5 premières suggestions :");
            radio.data.slice(0, 5).forEach((track, index) => {
                console.log(`${index + 1}. ${track.artist.name} - ${track.title} (ID: ${track.id})`);
            });
        } else {
            console.error("[Erreur] Format de réponse inattendu :", radio);
        }
    } catch (error) {
        console.error("[Erreur Fatale] Impossible de récupérer la radio :", error.message);
    }
}

testRadio();
