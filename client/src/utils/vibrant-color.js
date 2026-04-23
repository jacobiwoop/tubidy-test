/**
 * Converts an RGB color value to HSL.
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

/**
 * Converts an HSL color value to RGB hex string.
 */
function hslToHex(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Extrait la couleur la plus "vibrante" d'une image (pochette d'album)
 * @param {HTMLImageElement} imgElement L'élément image HTML source
 * @returns {string|null} La couleur au format Hexadécimal (ex: "#ff0000")
 */
export function getVibrantColorFromImage(imgElement) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // On réduit la taille de l'image pour l'analyse (plus rapide)
  const maxDimension = 64;
  let w = imgElement.naturalWidth || imgElement.width || 64;
  let h = imgElement.naturalHeight || imgElement.height || 64;

  if (w > maxDimension || h > maxDimension) {
    const scale = Math.min(maxDimension / w, maxDimension / h);
    w = Math.floor(w * scale);
    h = Math.floor(h * scale);
  }

  canvas.width = w;
  canvas.height = h;

  // On dessine l'image en miniature sur le canvas
  ctx.drawImage(imgElement, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;
  const candidates = [];

  // Parcourt les pixels
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a < 125) continue; // Ignore la transparence

    const [hue, s, l] = rgbToHsl(r, g, b);

    // On cherche les couleurs vibrantes : saturation élevée et luminosité moyenne
    if (s >= 0.3 && l >= 0.3 && l <= 0.8) {
      candidates.push({ r, g, b, h: hue, s, l });
    }
  }

  // Si rien de très vibrant, on prend tout ce qui n'est pas noir ou blanc absolu
  if (candidates.length === 0) {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      if (a < 125) continue;
      const [hue, s, l] = rgbToHsl(r, g, b);
      if (l > 0.1 && l < 0.95) {
        candidates.push({ r, g, b, h: hue, s, l });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Trie par saturation puis par luminosité la plus proche du centre
  candidates.sort((c1, c2) => {
    return (
      c2.s - c1.s ||
      0.5 - Math.abs(c1.l - 0.5) - (0.5 - Math.abs(c2.l - 0.5))
    );
  });

  const best = candidates[0];
  return hslToHex(best.h, best.s, best.l);
}
