/**
 * Script de test pour le service Tubidy.
 * Permet de vérifier la recherche et l'extraction de liens sans passer par l'UI.
 */
const tubidyService = require("./services/tubidy.service");

async function runTest() {
  const query = "Zara Larsson Lush Life";
  console.log(`\n--- TEST TUBIDY : "${query}" ---\n`);

  try {
    // 1. Test de Recherche
    console.log("[1/2] Test de la recherche...");
    const { results } = await tubidyService.search(query, { page: 1 });

    if (!results || results.length === 0) {
      console.error("❌ Aucun résultat trouvé.");
      return;
    }
    console.log(
      `✅ ${results.length} résultats trouvés. Premier titre : "${results[0].title}"`,
    );

    // 2. Test d'Extraction de Lien
    const firstResult = results[0];
    console.log(
      `\n[2/2] Test de l'extraction de lien pour : "${firstResult.title}"...`,
    );
    console.log(`URL : ${firstResult.download_page}`);

    const downloadData = await tubidyService.getDownloadLink(
      firstResult.download_page,
      "mp3",
    );

    if (downloadData && downloadData.link) {
      console.log("\n🚀 SUCCÈS ! Lien de téléchargement récupéré :");
      console.log(downloadData.link);
      console.log("\nNote : Ce lien peut expirer rapidement.");
    } else {
      console.error("\n❌ ÉCHEC : Le lien de téléchargement est vide.");
    }
  } catch (err) {
    console.error("\n❌ ERREUR FATALE pendant le test :");
    console.error(err.message);
    if (err.response) {
      console.error(
        "Détails HTTP :",
        err.response.status,
        err.response.statusText,
      );
    }
  }
}

runTest();
