const axios = require('axios');

async function testFetchTrack() {
  const trackId = '3135556';
  const url = `https://api.deezer.com/track/${trackId}`;
  
  console.log(`🧪 Test de récupération de données brutes pour l'ID: ${trackId}...`);
  console.log(`🔗 URL: ${url}\n`);

  try {
    const response = await axios.get(url);
    console.log('✅ DONNÉES RÉCUPÉRÉES :\n');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ ERREUR LORS DE LA RÉCUPÉRATION :', error.message);
  }
}

testFetchTrack();
