const mappingService = require("./services/mapping.service");

async function testTurbo() {
  const deezerId = "106821360"; // Soprano - Cosmo
  console.log(`--- TEST TURBO START ---`);
  const start = Date.now();
  
  try {
    const result = await mappingService.getTubidyDownloadByDeezerId(deezerId);
    const end = Date.now();
    const duration = (end - start) / 1000;
    
    console.log(`\n✅ SUCCÈS !`);
    console.log(`⏱️ Temps total : ${duration.toFixed(2)} secondes`);
    console.log(`🎵 Titre trouvé : ${result.target.title}`);
    console.log(`🔗 Lien direct : ${result.target.link.substring(0, 80)}...`);
    
    if (duration < 5) {
      console.log(`\n🚀 PERFORMANCE INCROYABLE : On est sous les 5 secondes !`);
    } else {
      console.log(`\n📈 Amélioration constatée, mais peut encore mieux faire.`);
    }
  } catch (err) {
    console.error(`\n❌ ÉCHEC : ${err.message}`);
  }
  
  process.exit();
}

testTurbo();
