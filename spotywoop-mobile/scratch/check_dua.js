const axios = require('axios');

async function checkColdHeart() {
  const query = 'Dua Lipa Cold Heart';
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}`;
  
  console.log(`🧪 Recherche de "${query}"...`);

  try {
    const response = await axios.get(url);
    const firstResult = response.data.data[0];
    
    console.log('Titre:', firstResult.title);
    console.log('Artiste Principal:', firstResult.artist.name);
    console.log('Contributeurs:', firstResult.contributors ? firstResult.contributors.map(c => c.name) : 'AUCUN');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkColdHeart();
