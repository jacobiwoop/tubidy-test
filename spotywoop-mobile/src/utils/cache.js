import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@spotywoop_cache_';

/**
 * Sauvegarde des données dans le cache persistant
 */
export const saveCache = async (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
  } catch (e) {
    console.error('[Cache] Save error:', e);
  }
};

/**
 * Récupère les données du cache
 * @param {string} key - Clé unique
 * @param {number} ttl - Time To Live en millisecondes (par défaut 2h)
 */
export const getCache = async (key, ttl = 2 * 60 * 60 * 1000) => {
  try {
    const value = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (value !== null) {
      const cacheData = JSON.parse(value);
      // On vérifie si le cache est encore valide (TTL)
      if (Date.now() - cacheData.timestamp < ttl) {
        return cacheData.data;
      }
    }
  } catch (e) {
    console.error('[Cache] Get error:', e);
  }
  return null;
};

/**
 * Supprime une entrée du cache
 */
export const clearCache = async (key) => {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch (e) {
    console.error('[Cache] Clear error:', e);
  }
};
