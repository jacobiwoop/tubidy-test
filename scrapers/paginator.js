const axios  = require('axios');
const config = require('../config/apis.config');

async function fetchPage(query, page = 1) {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set('page', page);
  const url = `${config.tubidy.baseUrl}/search?${params.toString()}`;
  const response = await axios.get(url, { headers: config.tubidy.headers, timeout: 15000 });
  return response.data;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = { fetchPage, sleep };
