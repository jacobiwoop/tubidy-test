const chosicService = require('../services/chosic.service');
require('dotenv').config();

async function runTest() {
    try {
        console.log("--- TEST RECHERCHE ---");
        const searchRes = await chosicService.search("Damso", 1);
        const firstTrack = searchRes.tracks.items[0];
        
        if (firstTrack) {
            console.log(`[Succès] Trouvé : ${firstTrack.artist} - ${firstTrack.name} (ID: ${firstTrack.id})`);
            
            console.log("\n--- TEST RECOMMANDATIONS ---");
            const recRes = await chosicService.getRecommendations(firstTrack.id, 5);
            
            if (recRes.tracks && recRes.tracks.length > 0) {
                console.log(`[Succès] ${recRes.tracks.length} recommandations reçues !`);
                recRes.tracks.forEach((t, i) => {
                    console.log(`${i+1}. ${t.artists[0].name} - ${t.name}`);
                });
            }
        }
    } catch (err) {
        console.error("Le test a échoué :", err.message);
    }
}

runTest();
