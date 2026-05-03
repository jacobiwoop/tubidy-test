require('dotenv').config();
const LastFM = require('last-fm');

if (!process.env.LASTFM_API_KEY) {
  console.error("ERREUR : LASTFM_API_KEY manquante dans le .env");
  process.exit(1);
}

const lastfm = new LastFM(process.env.LASTFM_API_KEY);

const testArtist = "The Weeknd";
const testTrack = "Starboy";

console.log(`\n--- Test de recommandation pour : ${testArtist} - ${testTrack} ---\n`);

lastfm.trackSimilar({ name: testTrack, artistName: testArtist, limit: 5 }, (err, data) => {
  if (err) {
    console.error("ÉCHEC DU TEST :", err.message);
    console.error("Détails complets :", err);
    return;
  }

  if (data && data.track) {
    console.log(`SUCCÈS : ${data.track.length} suggestions trouvées.\n`);
    data.track.forEach((t, i) => {
      console.log(`${i + 1}. ${t.name} (par ${t.artist.name})`);
    });
  } else {
    console.log("SUCCÈS : Aucune suggestion trouvée (mais pas d'erreur).");
  }
});
