const axios = require('axios');

async function checkZazoo() {
  const query = 'Zazoo Zehh';
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}`;
  
  console.log(`🧪 Recherche de "${query}" sur Deezer...`);

  try {
    const response = await axios.get(url);
    const firstResult = response.data.data[0];
    
    if (firstResult) {
      console.log('✅ RÉSULTAT TROUVÉ :\n');
      console.log('Titre:', firstResult.title);
      console.log('Artiste Principal:', firstResult.artist.name);
      console.log('Contributeurs:', firstResult.contributors ? firstResult.contributors.map(c => c.name) : 'AUCUN');
      
      console.log('\n--- Détails de l\'objet ---');
      console.log(JSON.stringify(firstResult, null, 2));
    } else {
      console.log('❌ Aucun résultat trouvé.');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkZazoo();
