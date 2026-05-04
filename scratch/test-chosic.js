const chosicService = require('../services/chosic.service');

const SEED_US_RAP = "0NSSsLFk5txWb0I8bNNOKR"; 

async function runTests() {
    try {
        console.log("\n--- TEST 1 : DÉCOUVERTE PAR GENRE (Hip-Hop) ---");
        const genreData = await chosicService.getGenreRecommendations("hip-hop", 2);
        console.log(JSON.stringify(genreData, null, 2));

        console.log("\n--- TEST 2 : MIX MORCEAU + CATÉGORIE (Rap US + Anime) ---");
        const mixData = await chosicService.getRecommendations({
            seedTracks: [SEED_US_RAP],
            seedGenres: ["anime"],
            limit: 2
        });
        console.log(JSON.stringify(mixData, null, 2));

    } catch (err) {
        console.error("Erreur :", err.message);
    }
}

runTests();
