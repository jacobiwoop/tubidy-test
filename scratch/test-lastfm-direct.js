const LastFM = require('last-fm');
require('dotenv').config();

const apiKey = process.env.LASTFM_API_KEY;

if (!apiKey) {
    console.error("[Erreur] LASTFM_API_KEY n'est pas définie dans l'environnement.");
    process.exit(1);
}

const lastfm = new LastFM(apiKey);

console.log("[Test Direct] Interrogation de Last.fm...");

lastfm.trackSimilar({ name: 'One More Time', artistName: 'Daft Punk', limit: 5 }, (err, data) => {
    if (err) {
        console.error("[Erreur LastFM]", err);
        return;
    }
    
    if (data && data.track) {
        console.log(`[Succès] ${data.track.length} morceaux trouvés.`);
        data.track.forEach((t, i) => {
            console.log(`${i+1}. ${t.artist.name} - ${t.name}`);
        });
    } else {
        console.log("[Info] Pas de résultats.");
    }
});
