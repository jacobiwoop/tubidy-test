const lyricsService = require('../services/lyrics.service');

async function test() {
    try {
        const res = await lyricsService.getLyrics("Damso", "Macarena");
        console.log("RESULTAT:", JSON.stringify(res, null, 2).substring(0, 500));
    } catch (err) {
        console.error("ERREUR:", err.message);
        if (err.response) console.error("DATA:", err.response.data);
    }
}

test();
