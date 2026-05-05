/**
 * Formate le nom de l'artiste ou des contributeurs pour un morceau.
 * @param {Object} item L'objet track de Deezer
 * @returns {string} Le nom formaté (ex: "Daft Punk" ou "Daft Punk, Pharrell Williams")
 */
export const getArtistNames = (item, enrichedCache = {}) => {
  if (!item) return 'Artiste inconnu';
  
  // On regarde si on a des données enrichies pour ce morceau
  const enriched = enrichedCache[String(item.id)];
  const data = enriched || item;
  
  // Priorité aux contributeurs s'ils existent
  if (data.contributors && data.contributors.length > 0) {
    // On filtre pour éviter les doublons si l'artiste principal est aussi dans les contributeurs
    const names = data.contributors.map(c => c.name);
    return [...new Set(names)].join(', ');
  }
  
  // Sinon, on prend l'artiste principal
  return data.artist?.name || data.artist || 'Artiste inconnu';
};
